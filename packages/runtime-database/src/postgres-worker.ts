import { serialize } from "node:v8";
import { parentPort, workerData } from "node:worker_threads";
import { Client, types } from "pg";

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

type WorkerRequest = {
  operation: "query" | "close";
  sql?: string;
  params?: unknown[];
  signal: SharedArrayBuffer;
  response: SharedArrayBuffer;
};

const configuration = workerData as { url: string; schema: string; statementTimeoutMs: number };
const client = new Client({ connectionString: configuration.url, statement_timeout: configuration.statementTimeoutMs });
const connected = connectAndConfigure();

async function connectAndConfigure() {
  await client.connect();
  await client.query("SELECT set_config('search_path', $1, false)", [`\"${configuration.schema}\", public`]);
}

if (!parentPort) throw new Error("PostgreSQL runtime worker requires a parent port.");

parentPort.on("message", async (request: WorkerRequest) => {
  const signal = new Int32Array(request.signal);
  try {
    await connected;
    if (request.operation === "close") {
      await client.end();
      writeResponse(request.response, signal, { ok: true, rows: [], rowCount: 0 });
      return;
    }
    const result = await client.query(request.sql ?? "SELECT 1", normalizeParameters(request.params ?? []));
    const lastResult = Array.isArray(result) ? result.at(-1) : result;
    writeResponse(request.response, signal, {
      ok: true,
      rows: lastResult?.rows ?? [],
      rowCount: lastResult?.rowCount ?? 0,
    });
  } catch (error) {
    const typed = error as Error & { code?: string };
    writeResponse(request.response, signal, { ok: false, error: typed.message, code: typed.code });
  }
});

function normalizeParameters(params: unknown[]) {
  return params.map((value) => value instanceof Uint8Array && !Buffer.isBuffer(value) ? Buffer.from(value) : value);
}

function writeResponse(response: SharedArrayBuffer, signal: Int32Array, value: unknown) {
  let encoded = serialize(value);
  if (encoded.byteLength > response.byteLength) {
    encoded = serialize({ ok: false, error: `PostgreSQL response exceeded the ${response.byteLength}-byte runtime buffer.` });
  }
  new Uint8Array(response, 0, encoded.byteLength).set(encoded);
  Atomics.store(signal, 1, encoded.byteLength);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
}

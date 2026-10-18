import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("a clean worker starts with the cx33-conservative serial recognition defaults", () => {
  const environment: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test", RUNTIME_DATABASE_PRIMARY: "sqlite" };
  delete environment.JOB_BROKER_CONCURRENCY;
  delete environment.MUSIC_ENGINE_MAX_CONCURRENCY;
  const code = `import { workerConfig } from './src/config.ts'; import { omrEngineCapacity } from './src/omr-engine-gate.ts'; console.log(JSON.stringify({broker:workerConfig.jobBrokerConcurrency,engine:omrEngineCapacity()}));`;
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", code], { cwd: new URL("..", import.meta.url), env: environment, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { broker: 1, engine: 1 });
});

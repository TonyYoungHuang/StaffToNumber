import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

test('production API proxy compresses JSON with gzip and preserves its content', { skip: !process.env.CADDY_BIN }, async () => {
  const template = await fs.readFile(new URL('../deploy/hetzner/scoretransposer.caddy', import.meta.url), 'utf8');
  const apiSite = template.slice(template.indexOf('api.scoretransposer.com {'), template.indexOf('collab.scoretransposer.com {'));
  const encode = apiSite.match(/^\s*(encode\s+zstd\s+gzip)\s*$/m)?.[1];
  assert.ok(encode, 'API site must carry the deployed compression directive');
  const payload = JSON.stringify({ score: { pendingRevision: { scoreJson: { parts: Array.from({ length: 10000 }, (_, id) => ({ id, pitch: 'C4', duration: 1 })) } } } });
  const upstream = http.createServer((_req, res) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(payload); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamPort = upstream.address().port;
  const reservation = http.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const proxyPort = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'api-compression-'));
  const configPath = path.join(workspace, 'Caddyfile');
  await fs.writeFile(configPath, `{\n admin off\n auto_https off\n persist_config off\n}\nhttp://127.0.0.1:${proxyPort} {\n ${encode}\n reverse_proxy 127.0.0.1:${upstreamPort}\n}\n`);
  const caddy = spawn(process.env.CADDY_BIN, ['run', '--config', configPath, '--adapter', 'caddyfile'], {
    windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, XDG_CONFIG_HOME: workspace, XDG_DATA_HOME: workspace },
  });
  let diagnostic = '';
  caddy.stderr.on('data', chunk => { diagnostic += chunk.toString(); });
  const response = () => new Promise((resolve, reject) => {
    const request = http.get(`http://127.0.0.1:${proxyPort}/api/scores/test`, { headers: { 'Accept-Encoding': 'gzip' } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })); res.on('error', reject);
    });
    request.on('error', reject);
  });
  try {
    let result;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { result = await response(); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 50)); }
    }
    assert.ok(result, diagnostic);
    assert.equal(result.status, 200);
    assert.equal(result.headers['content-encoding'], 'gzip');
    assert.match(result.headers.vary, /Accept-Encoding/i);
    assert.equal(gunzipSync(result.body).toString(), payload);
    assert.ok(result.body.length < Buffer.byteLength(payload) / 2);
    if (process.env.COMPRESSION_EVIDENCE) await fs.writeFile(process.env.COMPRESSION_EVIDENCE, JSON.stringify({ passed: true, caddy: '2.11.4', status: result.status, headers: result.headers, uncompressedBytes: Buffer.byteLength(payload), compressedBytes: result.body.length, contentPreserved: true, scope: 'local Caddy proxy using tracked API encode directive; production configuration unchanged' }, null, 2) + '\n');
  } finally {
    caddy.kill();
    await new Promise(resolve => caddy.once('close', resolve));
    await new Promise(resolve => upstream.close(resolve));
    await fs.rm(workspace, { recursive: true, force: true, maxRetries: 3 });
  }
});

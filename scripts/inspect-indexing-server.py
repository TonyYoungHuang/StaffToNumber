"""Read-only, redacted edge diagnostics. Run over SSH with python3 -."""
import collections
import datetime
import json
import subprocess
import urllib.parse

result = subprocess.run(
    ["sudo", "docker", "logs", "--since", "2026-09-27T00:00:00Z", "shared-edge-caddy-1"],
    capture_output=True, text=True, check=True,
)
rows = []
for line in (result.stdout + "\n" + result.stderr).splitlines():
    try:
        entry = json.loads(line)
    except (ValueError, TypeError):
        continue
    request = entry.get("request", {})
    if request.get("host", "").split(":")[0] != "scoretransposer.com":
        continue
    if not isinstance(entry.get("status"), int) or entry["status"] < 500:
        continue
    message = entry.get("msg", "")
    rows.append({
        "utc": datetime.datetime.fromtimestamp(entry["ts"], datetime.timezone.utc).isoformat(),
        "path": urllib.parse.urlsplit(request.get("uri", "")).path,
        "status": entry["status"],
        "error": "connection refused" if "connection refused" in message else message,
        "googlebotUserAgentClaim": any("Googlebot" in ua for ua in request.get("headers", {}).get("User-Agent", [])),
    })
print(json.dumps({
    "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "source": "retained Caddy runtime error logs, not complete access logs",
    "count": len(rows),
    "byError": dict(collections.Counter(row["error"] for row in rows)),
    "rows": rows,
}, indent=2))

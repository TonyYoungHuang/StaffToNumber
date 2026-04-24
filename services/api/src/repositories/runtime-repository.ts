import { db } from "../db.js";

type ServiceRuntimeRow = {
  service_name: string;
  status: string;
  message: string | null;
  details_json: string | null;
  last_heartbeat_at: string;
  updated_at: string;
};

export function findServiceRuntime(serviceName: string) {
  return db
    .prepare(
      `
        SELECT service_name, status, message, details_json, last_heartbeat_at, updated_at
        FROM service_runtime
        WHERE service_name = ?
      `,
    )
    .get(serviceName) as ServiceRuntimeRow | undefined;
}

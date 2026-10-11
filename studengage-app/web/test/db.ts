/** Test helper: close and forget the db() singleton (lives on globalThis) and delete the temp file. */
import fs from "node:fs";

export function resetTestDb() {
  const conn = globalThis.__studengageDb;
  if (conn) conn.close();
  globalThis.__studengageDb = undefined;
  const file = process.env.STUDENGAGE_DB;
  if (file) for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
}

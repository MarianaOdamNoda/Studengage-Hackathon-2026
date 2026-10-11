// Every test file gets its own throwaway SQLite file. Must run before lib/db is imported.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "studengage-test-"));
process.env.STUDENGAGE_DB = path.join(dir, "test.db");

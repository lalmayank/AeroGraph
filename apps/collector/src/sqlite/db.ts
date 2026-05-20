import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export function getDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

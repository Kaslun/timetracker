import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database, { type Database as Db } from "better-sqlite3";
import { app } from "electron";
import { DB_FILENAME } from "@shared/constants";
import { runMigrations } from "./schema";

let _db: Db | null = null;

export function getDbPath(): string {
  return join(app.getPath("userData"), DB_FILENAME);
}

export function db(): Db {
  if (_db) return _db;
  const path = getDbPath();
  mkdirSync(dirname(path), { recursive: true });
  _db = new Database(path);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  runMigrations(_db);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function newId(prefix = ""): string {
  const id = (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
    .replace(/-/g, "")
    .slice(0, 12);
  return prefix ? `${prefix}_${id}` : id;
}

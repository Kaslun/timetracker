/**
 * Tiny append-only audit log for destructive user actions ("wipe local data",
 * "disconnect all integrations", etc).
 *
 * Lives in `app.getPath('userData')/audit.log` so it survives a wipe of the
 * SQLite DB itself — the whole point is to leave a forensic trail when
 * something irreversible just happened.
 *
 * Format is one line per event: `<ISO ts>  <action>  <details>`. Plain text on
 * purpose: easy to grep, easy to email to support, easy to manually inspect.
 */
import { app } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "./logger";

const log = logger("audit");

export const AUDIT_FILENAME = "audit.log";

export function auditLogPath(): string {
  return join(app.getPath("userData"), AUDIT_FILENAME);
}

/**
 * Append a single line to the audit log. Failures are logged but never
 * thrown — destructive flows keep going even if disk is full.
 */
export function audit(action: string, details: Record<string, unknown> = {}): void {
  const line = `${new Date().toISOString()}  ${action}  ${JSON.stringify(details)}\n`;
  try {
    const path = auditLogPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, line, "utf-8");
  } catch (err) {
    log.warn("failed to append audit entry", err);
  }
}

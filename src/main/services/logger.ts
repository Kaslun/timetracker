/**
 * Tagged logger. Use instead of `console.log` so we can tune verbosity later
 * (and so log lines always show their origin).
 *
 * In production builds, `debug` is a no-op; `info`, `warn`, `error` always go
 * to stdout/stderr.
 */
const isProd = process.env["NODE_ENV"] === "production";

export function logger(tag: string) {
  const prefix = `[${tag}]`;
  return {
    debug: (...args: unknown[]): void => {
      if (!isProd) console.debug(prefix, ...args);
    },
    info: (...args: unknown[]): void => {
      console.log(prefix, ...args);
    },
    warn: (...args: unknown[]): void => {
      console.warn(prefix, ...args);
    },
    error: (...args: unknown[]): void => {
      console.error(prefix, ...args);
    },
  };
}

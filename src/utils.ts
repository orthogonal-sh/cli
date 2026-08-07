// Strips ASCII control characters (including ESC, 0x1B) from a string before
// it's written to the terminal. Needed for any remotely-sourced value we
// render directly (e.g. apiSlug, which an API owner sets) — without this, a
// crafted value containing terminal escape sequences could manipulate another
// user's terminal (spoofed output, hidden/cleared text, deceptive hyperlinks).
export function sanitizeForTerminal(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F]/g, "");
}

import { readFileSync } from "fs";
import path from "path";

/**
 * The installed CLI's version, read from the package.json npm ships next to
 * dist/ (and next to src/ in tests), so it never drifts from the release.
 */
export const CLI_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
    );
    return typeof pkg.version === "string" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
})();

import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const root = path.join(__dirname, "..", "..");
const bin = path.join(root, "dist", "index.js");

// The release workflow builds before it tests, so this runs on every
// release; locally it needs `npm run build` first.
describe.skipIf(!existsSync(bin))("built orth --version", () => {
  it("prints the version in package.json", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    const printed = execFileSync(process.execPath, [bin, "--version"], {
      encoding: "utf8",
    }).trim();
    expect(printed).toBe(pkg.version);
  });
});

import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { CLI_VERSION } from "../version.js";

describe("CLI_VERSION", () => {
  it("is the version in package.json", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8"),
    );
    expect(CLI_VERSION).toBe(pkg.version);
  });
});

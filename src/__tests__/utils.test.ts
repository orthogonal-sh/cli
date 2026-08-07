import { describe, it, expect } from "vitest";
import { sanitizeForTerminal } from "../utils.js";

describe("sanitizeForTerminal", () => {
  it("strips ANSI escape sequences", () => {
    expect(sanitizeForTerminal("\x1b[31mabstractapi/avatars\x1b[0m")).toBe(
      "[31mabstractapi/avatars[0m",
    );
  });

  it("strips other C0 control characters and DEL", () => {
    expect(sanitizeForTerminal("abstractapi\x07/avatars\x7f")).toBe(
      "abstractapi/avatars",
    );
  });

  it("leaves an ordinary nested slug untouched", () => {
    expect(sanitizeForTerminal("abstractapi/avatars")).toBe(
      "abstractapi/avatars",
    );
  });
});

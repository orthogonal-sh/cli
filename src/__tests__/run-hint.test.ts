import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api.js", () => ({
  run: vi.fn(),
}));

vi.mock("../config.js", () => ({
  requireApiKey: vi.fn(() => "orth_test_key"),
  getApiKey: vi.fn(() => "orth_test_key"),
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  }),
}));

vi.mock("chalk", () => {
  const identity = (s: string) => s;
  return {
    default: new Proxy({}, { get: () => identity }),
  };
});

import { run } from "../api.js";
import { runCommand } from "../commands/run.js";

const mockRun = run as ReturnType<typeof vi.fn>;

let errorOutput: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  errorOutput = [];
  // Pretend we're a TTY so runCommand doesn't try to read stdin.
  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errorOutput.push(args.map(String).join(" "));
  });
  vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function rejectWithHint(hint: unknown, message = "API request failed with status 400") {
  const err = new Error(message) as Error & { orthogonal?: unknown };
  err.orthogonal = hint;
  mockRun.mockRejectedValue(err);
}

describe("runCommand — _orthogonal hint", () => {
  it("prints the message and diagnostics from an upstream-4xx hint", async () => {
    rejectWithHint({
      error: "orthogonal_endpoint_contract",
      message: "The upstream API rejected this request.",
      unexpected_query_fields: ["company"],
      missing_required_query: ["organization"],
      expected_schema: {
        queryParams: {
          properties: {
            time_frame: { type: "string" },
            limit: { type: "number", minimum: 1, maximum: 100 },
          },
          required: ["time_frame"],
        },
      },
    });

    await runCommand("fantastic-jobs", "/v1/active-ats", { method: "GET" });

    const out = errorOutput.join("\n");
    expect(out).toContain("The upstream API rejected this request.");
    expect(out).toContain("Unexpected query fields: company");
    expect(out).toContain("Missing required query params: organization");
    // Expected-schema summary includes required marker and numeric bounds.
    expect(out).toContain("time_frame (required)");
    expect(out).toContain("limit [min 1, max 100]");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("emits machine-readable JSON hint in --raw mode", async () => {
    const hint = {
      error: "orthogonal_endpoint_contract",
      out_of_range: [{ name: "limit", value: 1000, max: 100 }],
    };
    rejectWithHint(hint);

    await runCommand("fantastic-jobs", "/v1/active-ats", { method: "GET", raw: true });

    const out = errorOutput.join("\n");
    expect(out).toContain('"_orthogonal"');
    expect(out).toContain('"orthogonal_endpoint_contract"');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("still exits cleanly when no hint is attached", async () => {
    mockRun.mockRejectedValue(new Error("Something generic"));

    await runCommand("fantastic-jobs", "/v1/active-ats", { method: "GET" });

    const out = errorOutput.join("\n");
    expect(out).toContain("Something generic");
    expect(out).not.toContain("Hint:");
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

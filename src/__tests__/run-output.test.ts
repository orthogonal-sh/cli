import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api.js", () => ({ run: vi.fn() }));

vi.mock("ora", () => ({
  default: () => ({ start: vi.fn().mockReturnThis(), stop: vi.fn() }),
}));

vi.mock("chalk", () => ({
  default: new Proxy({}, { get: () => (value: string) => value }),
}));

import { run } from "../api.js";
import { runCommand } from "../commands/run.js";

const mockRun = vi.mocked(run);
let stdinTTY: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  if (stdinTTY) Object.defineProperty(process.stdin, "isTTY", stdinTTY);
  else Reflect.deleteProperty(process.stdin, "isTTY");
});

function stdout(): string {
  return vi.mocked(console.log).mock.calls.map((args) => args.join(" ")).join("\n");
}

describe("runCommand response output", () => {
  it.each([
    { price: "$0.005" },
    { priceCents: 0.5 },
    { priceCents: 0 },
    {},
  ])("keeps --raw stdout parseable with pricing %j", async (pricing) => {
    const data = { results: [{ title: "A result" }], count: 1 };
    mockRun.mockResolvedValue({ success: true, data, ...pricing });

    await runCommand("example", "/search", { method: "GET", raw: true });

    expect(JSON.parse(stdout())).toEqual(data);
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it.each([
    [{ price: "$0.005" }, "$0.005"],
    [{ priceCents: 0.5 }, "$0.005"],
  ] as const)("still shows the cost in human output for %j", async (pricing, cost) => {
    mockRun.mockResolvedValue({ success: true, data: { ok: true }, ...pricing });

    await runCommand("example", "/search", { method: "GET" });

    expect(stdout()).toContain("Response:");
    expect(stdout()).toContain(`Cost: ${cost}`);
    expect(process.exit).not.toHaveBeenCalled();
  });
});

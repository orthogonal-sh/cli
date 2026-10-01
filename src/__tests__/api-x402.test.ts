import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api.js", () => ({
  getDetails: vi.fn(),
  search: vi.fn(),
  getApiBySlug: vi.fn(),
  listApis: vi.fn(),
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  }),
}));

import { getDetails } from "../api.js";
import { apiCommand } from "../commands/api.js";

const details = {
  api: { name: "Exa", slug: "exa" },
  endpoint: { path: "/search", method: "POST", description: "Search" },
  price: 0.01,
};

describe("orth api show --x402", () => {
  let logged: string[];
  beforeEach(() => {
    vi.clearAllMocks();
    logged = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logged.push(args.join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("prints the pay-per-call URL the server names", async () => {
    vi.mocked(getDetails).mockResolvedValue({
      ...details,
      usage: { x402: "https://mono.orthogonal.com/pay/exa/search" },
    });
    await apiCommand("exa", "/search", { x402: true });
    expect(logged.join("\n")).toContain(
      "https://mono.orthogonal.com/pay/exa/search",
    );
    expect(logged.join("\n")).not.toContain("x402.orth.sh");
  });

  it("falls back to x402.orth.sh when the server names none", async () => {
    vi.mocked(getDetails).mockResolvedValue(details);
    await apiCommand("exa", "/search", { x402: true });
    expect(logged.join("\n")).toContain("https://x402.orth.sh/exa/search");
  });
});

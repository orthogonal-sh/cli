import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api.js", () => ({
  apiRequest: vi.fn(),
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

vi.mock("chalk", () => ({
  default: {
    green: Object.assign((s: string) => s, { bold: (s: string) => s }),
    red: (s: string) => s,
    gray: (s: string) => s,
    white: (s: string) => s,
    cyan: (s: string) => s,
    bold: (s: string) => s,
    yellow: (s: string) => s,
  },
}));

import { apiRequest } from "../api.js";
import { balanceCommand, usageCommand } from "../commands/account.js";

describe("balanceCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  it("calls /credits/balance endpoint", async () => {
    (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      balance: "$5.00",
    });

    await balanceCommand();

    expect(apiRequest).toHaveBeenCalledWith("/credits/balance");
    expect(console.log).toHaveBeenCalled();
  });

  it("handles zero balance", async () => {
    (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      balance: "$0.00",
    });

    await balanceCommand();

    expect(apiRequest).toHaveBeenCalledWith("/credits/balance");
  });

  it("handles auth errors", async () => {
    (apiRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API request failed with status 401"),
    );

    await balanceCommand();

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe("usageCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  it("calls /credits/usage with default params", async () => {
    (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      usage: [
        {
          api: "weather",
          path: "/forecast",
          method: "GET",
          timestamp: "2026-02-27T10:00:00Z",
          cost: "$0.001",
          status: "completed",
        },
      ],
      totalSpent: "$0.00",
      pagination: { limit: 20, offset: 0, count: 1, total: 1 },
    });

    await usageCommand({ limit: "20" });

    expect(apiRequest).toHaveBeenCalledWith("/credits/usage?limit=20&days=30");
  });

  it("passes custom days param", async () => {
    (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      usage: [],
      pagination: { limit: 10, offset: 0, count: 0, total: 0 },
      summary: { totalSpentCents: 0, totalApiPaymentCents: 0, totalPlatformFeeCents: 0 },
    });

    await usageCommand({ limit: "10", days: "7" });

    expect(apiRequest).toHaveBeenCalledWith("/credits/usage?limit=10&days=7");
  });

  it("handles empty usage", async () => {
    (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      usage: [],
      pagination: { limit: 20, offset: 0, count: 0, total: 0 },
    });

    await usageCommand({ limit: "20" });

    expect(console.log).toHaveBeenCalled();
  });
});

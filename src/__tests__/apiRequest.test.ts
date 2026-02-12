import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
    green: (s: string) => s,
    red: (s: string) => s,
    gray: (s: string) => s,
    white: (s: string) => s,
    cyan: (s: string) => s,
    bold: (s: string) => s,
  },
}));

import { apiRequest } from "../api.js";
import { apiRequestCommand } from "../commands/apiRequest.js";

const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiRequestCommand", () => {
  it("should submit API request with docs URL", async () => {
    mockApiRequest.mockResolvedValue({});

    await apiRequestCommand("https://docs.example.com/api", {});

    expect(mockApiRequest).toHaveBeenCalledWith("/requests/api", {
      method: "POST",
      body: {
        docsUrl: "https://docs.example.com/api",
        description: undefined,
      },
    });
  });

  it("should include description when provided", async () => {
    mockApiRequest.mockResolvedValue({});

    await apiRequestCommand("https://docs.example.com/api", {
      description: "Please add this weather API",
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/requests/api", {
      method: "POST",
      body: {
        docsUrl: "https://docs.example.com/api",
        description: "Please add this weather API",
      },
    });
  });

  it("should handle API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Submission failed"));

    await apiRequestCommand("https://docs.example.com/api", {});

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

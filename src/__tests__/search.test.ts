import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api.js", () => ({
  search: vi.fn(),
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  }),
}));

import { search } from "../api.js";
import { searchCommand } from "../commands/search.js";

const mockSearch = search as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchCommand", () => {
  it("returns the API response after displaying results", async () => {
    const response = {
      results: [{
        name: "Weather",
        slug: "weather",
        endpoints: [{ path: "/forecast", method: "GET", description: "Forecast" }],
      }],
      count: 1,
      apisCount: 1,
    };
    mockSearch.mockResolvedValue(response);

    const result = await searchCommand("weather", { limit: "10" });

    expect(mockSearch).toHaveBeenCalledWith("weather", 10);
    expect(result).toEqual(response);
  });

  it("returns an empty response so it can still be tracked", async () => {
    const response = { results: [], count: 0, apisCount: 0 };
    mockSearch.mockResolvedValue(response);

    const result = await searchCommand("not found", { limit: "10" });

    expect(result).toEqual(response);
  });

  it("rethrows failed searches so the caller can track the failure", async () => {
    mockSearch.mockRejectedValue(new Error("Search failed"));

    await expect(searchCommand("weather", { limit: "10" }))
      .rejects.toThrow("Search failed");
  });
});

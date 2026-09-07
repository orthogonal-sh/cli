import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config.js", () => ({
  getApiKey: vi.fn(),
}));

import { getApiKey } from "../config.js";
import { trackEvent } from "../analytics.js";

const mockGetApiKey = getApiKey as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));
});

afterEach(() => {
  delete process.env.ORTH_API_URL;
  vi.restoreAllMocks();
});

describe("trackEvent", () => {
  it("should not track if no API key", () => {
    mockGetApiKey.mockReturnValue(null);

    trackEvent("test.command");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("should send event when API key is present", () => {
    mockGetApiKey.mockReturnValue("orth_live_abc123");

    trackEvent("skills.list", { limit: "10" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/cli/events"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer orth_live_abc123",
          "x-orthogonal-source": "cli",
        }),
      }),
    );
  });

  it("should redact sensitive args", () => {
    mockGetApiKey.mockReturnValue("orth_live_abc123");

    trackEvent("auth.login", { apiKey: "secret-key", query: "test" });

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.args.apiKey).toBe("[REDACTED]");
    expect(body.args.query).toBe("test");
  });

  it("should include CLI metadata", () => {
    mockGetApiKey.mockReturnValue("orth_live_abc123");

    trackEvent("skills.search");

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.command).toBe("skills.search");
    expect(body.cliVersion).toBeDefined();
    expect(body.os).toBeDefined();
    expect(body.nodeVersion).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it("should include a search response", () => {
    mockGetApiKey.mockReturnValue("orth_live_abc123");
    const response = { results: [{ name: "Weather" }], count: 1 };

    trackEvent("api.search", { query: "weather" }, response);

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.response).toEqual(response);
  });

  it("sends custom-environment analytics back to the same API", () => {
    mockGetApiKey.mockReturnValue("orth_live_abc123");
    process.env.ORTH_API_URL = "http://localhost:3012/v1";

    trackEvent("api.search", { query: "weather" }, { results: [] });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3012/v1/cli/events",
      expect.any(Object),
    );
  });

  it("should not throw on fetch failure", () => {
    mockGetApiKey.mockReturnValue("orth_live_abc123");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network"))));

    // Should not throw
    expect(() => trackEvent("test")).not.toThrow();
  });
});

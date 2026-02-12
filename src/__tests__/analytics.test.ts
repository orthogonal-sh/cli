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

  it("should not throw on fetch failure", () => {
    mockGetApiKey.mockReturnValue("orth_live_abc123");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network"))));

    // Should not throw
    expect(() => trackEvent("test")).not.toThrow();
  });
});

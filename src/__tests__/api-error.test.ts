import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config.js", () => ({
  requireApiKey: vi.fn(() => "orth_test_key"),
  getApiKey: vi.fn(() => "orth_test_key"),
}));

import { apiRequest } from "../api.js";

function mockFetch(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiRequest error handling", () => {
  it("attaches _orthogonal and responseBody for a JSON error body", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        400,
        JSON.stringify({
          success: false,
          error: "Parameter(s) out of range: limit=1000 (must be <= 100).",
          out_of_range: [{ name: "limit", value: 1000, max: 100 }],
          _orthogonal: { error: "orthogonal_endpoint_contract" },
        })
      )
    );

    await expect(apiRequest("/run", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 400,
      orthogonal: { error: "orthogonal_endpoint_contract" },
      responseBody: { out_of_range: [{ name: "limit", value: 1000, max: 100 }] },
    });
  });

  it("does NOT attach responseBody when the error body is non-JSON", async () => {
    vi.stubGlobal("fetch", mockFetch(502, "<html>Bad Gateway</html>"));

    let caught: any;
    try {
      await apiRequest("/run", { method: "POST", body: {} });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    // The real error message is preserved, and no `{}` masquerades as the body.
    expect(caught.message).toContain("502");
    expect(caught.responseBody).toBeUndefined();
  });
});

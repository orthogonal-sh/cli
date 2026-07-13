import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api.js", () => ({
  search: vi.fn(),
  getDetails: vi.fn(),
  getApiBySlug: vi.fn(),
  listApis: vi.fn(),
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  }),
}));

vi.mock("chalk", () => {
  const style = (value: string) => value;
  const bold = Object.assign(style, { magenta: style });
  const cyan = Object.assign(style, { bold: style });
  return {
    default: {
      bold,
      cyan,
      gray: style,
      white: style,
      yellow: style,
      red: style,
    },
  };
});

import { getDetails } from "../api.js";
import { apiCommand } from "../commands/api.js";

const mockGetDetails = getDetails as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiCommand --x402-full", () => {
  it("prints decoded payment details from an x402 v2 header", async () => {
    mockGetDetails.mockResolvedValue({
      description: "Create an inbox",
      price: 2,
      parameters: {
        body: [
          {
            name: "username",
            type: "string",
            required: false,
          },
        ],
      },
    });

    const challenge = {
      x402Version: 2,
      resource: { url: "https://x402.orth.sh/agentmail/v0/inboxes" },
      accepts: [{ network: "eip155:8453", amount: "2000000" }],
    };
    const encoded = Buffer.from(JSON.stringify(challenge)).toString("base64");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          status: 402,
          headers: { "Payment-Required": encoded },
        }),
      ),
    );

    await apiCommand("agentmail", "/v0/inboxes", { x402Full: true });

    expect(fetch).toHaveBeenCalledWith(
      "https://x402.orth.sh/agentmail/v0/inboxes",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
    const output = vi
      .mocked(console.log)
      .mock.calls.flat()
      .map(String)
      .join("\n");
    expect(output).toContain('"x402Version": 2');
    expect(output).toContain('"network": "eip155:8453"');
    expect(output).not.toContain('"paymentRequired"');
  });
});

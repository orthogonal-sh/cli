import { describe, expect, it } from "vitest";

import { readX402PaymentDetails, X402ResponseLike } from "../x402.js";

function response(
  body: string,
  headers: Record<string, string> = {},
): X402ResponseLike {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    headers: {
      get: (name: string) => normalized[name.toLowerCase()] ?? null,
    },
    text: async () => body,
  };
}

describe("readX402PaymentDetails", () => {
  it("decodes an x402 v2 Payment-Required header", async () => {
    const challenge = {
      x402Version: 2,
      error: "Payment required",
      resource: { url: "https://x402.example.com/search" },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          amount: "10000",
        },
      ],
    };
    const encoded = Buffer.from(JSON.stringify(challenge)).toString("base64");

    await expect(
      readX402PaymentDetails(
        response("{}", { "Payment-Required": encoded }),
      ),
    ).resolves.toEqual(challenge);
  });

  it("supports base64url-encoded challenge headers", async () => {
    const challenge = { x402Version: 2, accepts: [] };
    const encoded = Buffer.from(JSON.stringify(challenge)).toString("base64url");

    await expect(
      readX402PaymentDetails(
        response("", { "payment-required": encoded }),
      ),
    ).resolves.toEqual(challenge);
  });

  it("accepts a plain JSON challenge header", async () => {
    const challenge = { x402Version: 2, error: "Payment required" };

    await expect(
      readX402PaymentDetails(
        response("", { "payment-required": JSON.stringify(challenge) }),
      ),
    ).resolves.toEqual(challenge);
  });

  it("falls back to a legacy JSON response body", async () => {
    const challenge = { x402Version: 1, accepts: [] };

    await expect(
      readX402PaymentDetails(response(JSON.stringify(challenge))),
    ).resolves.toEqual(challenge);
  });

  it("preserves malformed headers alongside a useful response body", async () => {
    await expect(
      readX402PaymentDetails(
        response('{"error":"bad challenge"}', {
          "payment-required": "not-base64-or-json",
        }),
      ),
    ).resolves.toEqual({
      paymentRequired: "not-base64-or-json",
      body: { error: "bad challenge" },
    });
  });
});

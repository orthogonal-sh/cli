export interface X402ResponseLike {
  headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
}

function parseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function decodeBase64Json(value: string): unknown | undefined {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return parseJson(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return undefined;
  }
}

/**
 * Read an x402 challenge without assuming it is present in the response body.
 *
 * x402 v2 carries the canonical challenge in the base64-encoded
 * `Payment-Required` header. Older deployments may still return JSON in the
 * body, so keep a body fallback for compatibility and useful error output.
 */
export async function readX402PaymentDetails(
  response: X402ResponseLike,
): Promise<unknown> {
  const paymentRequired =
    response.headers.get("payment-required") ??
    response.headers.get("x-payment-required");

  if (paymentRequired) {
    const decoded =
      parseJson(paymentRequired) ?? decodeBase64Json(paymentRequired);
    if (decoded !== undefined) return decoded;
  }

  const rawBody = await response.text();
  if (rawBody) {
    const parsedBody = parseJson(rawBody);
    if (paymentRequired) {
      return {
        paymentRequired,
        body: parsedBody ?? rawBody,
      };
    }
    return parsedBody ?? rawBody;
  }

  return paymentRequired ? { paymentRequired } : {};
}

import { getApiKey } from "./config.js";

const CLI_VERSION = process.env.npm_package_version || "0.2.0";
const BASE_URL = "https://api.orth.sh/v1";

/**
 * Fire-and-forget analytics event for CLI usage tracking.
 * Never blocks, never throws, never shows errors to the user.
 */
export function trackEvent(
  command: string,
  args?: Record<string, string | undefined>,
): void {
  // Don't track if no API key (not authenticated)
  const apiKey = getApiKey();
  if (!apiKey) return;

  const payload = {
    command,
    args: args ? sanitizeArgs(args) : undefined,
    cliVersion: CLI_VERSION,
    os: process.platform,
    nodeVersion: process.version,
    apiKeyPrefix: apiKey.substring(0, 12),
    timestamp: new Date().toISOString(),
  };

  // Fire and forget - don't await, don't catch visible errors
  fetch(`${BASE_URL}/cli/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "x-orthogonal-source": "cli",
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently ignore - analytics should never affect CLI operation
  });
}

/**
 * Remove any potentially sensitive values from args
 */
function sanitizeArgs(
  args: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const sanitized: Record<string, string | undefined> = {};
  const sensitiveKeys = ["key", "apiKey", "token", "secret", "password"];

  for (const [key, value] of Object.entries(args)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

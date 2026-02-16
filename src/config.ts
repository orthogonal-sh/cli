import Conf from "conf";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

interface ConfigSchema {
  apiKey?: string;
}

export const config = new Conf<ConfigSchema>({
  projectName: "orthogonal-cli",
  schema: {
    apiKey: {
      type: "string",
    },
  },
});

/**
 * Try loading API key from ~/.config/orthogonal/credentials.json
 * (shared with the Orthogonal SDK / dashboard login)
 */
function getCredentialsFileKey(): string | undefined {
  try {
    const credPath = join(homedir(), ".config", "orthogonal", "credentials.json");
    const data = JSON.parse(readFileSync(credPath, "utf-8"));
    return data.user_api_key || data.org_api_key;
  } catch {
    return undefined;
  }
}

export function getApiKey(): string | undefined {
  return process.env.ORTHOGONAL_API_KEY || config.get("apiKey") || getCredentialsFileKey();
}

export function setApiKey(key: string): void {
  config.set("apiKey", key);
}

export function clearApiKey(): void {
  config.delete("apiKey");
}

export function requireApiKey(): string {
  const key = getApiKey();
  if (!key) {
    console.error("Error: Not authenticated. Run 'ortho login' first or set ORTHOGONAL_API_KEY.");
    process.exit(1);
  }
  return key;
}

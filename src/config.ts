import Conf from "conf";

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

export function getApiKey(): string | undefined {
  return process.env.ORTHOGONAL_API_KEY || config.get("apiKey");
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

import chalk from "chalk";
import { getApiKey, setApiKey, clearApiKey } from "../config.js";

export async function loginCommand(options: { key?: string }) {
  const key = options.key || process.env.ORTHOGONAL_API_KEY;
  
  if (!key) {
    console.log(chalk.yellow("Usage: orth login --key <your-api-key>"));
    console.log(chalk.gray("\nGet your API key at: https://orthogonal.com/dashboard/settings/api-keys"));
    console.log(chalk.gray("Or set ORTHOGONAL_API_KEY environment variable"));
    return;
  }

  // Validate the key format
  if (!key.startsWith("orth_")) {
    console.error(chalk.red("Invalid API key format. Keys should start with 'orth_'"));
    process.exit(1);
  }

  setApiKey(key);
  console.log(chalk.green("✓ Logged in successfully!"));
  console.log(chalk.gray(`  Key: ${key.slice(0, 15)}...${key.slice(-4)}`));
}

export async function logoutCommand() {
  clearApiKey();
  console.log(chalk.green("✓ Logged out. API key removed."));
}

export async function whoamiCommand() {
  const key = getApiKey();
  
  if (!key) {
    console.log(chalk.yellow("Not authenticated"));
    console.log(chalk.gray("Run 'ortho login' to authenticate"));
    return;
  }

  console.log(chalk.green("✓ Authenticated"));
  console.log(chalk.gray(`  Key: ${key.slice(0, 15)}...${key.slice(-4)}`));
  const source = process.env.ORTHOGONAL_API_KEY ? "environment" : (require("../config.js").config.get("apiKey") ? "config file" : "~/.config/orthogonal/credentials.json");
  console.log(chalk.gray(`  Source: ${source}`));
}

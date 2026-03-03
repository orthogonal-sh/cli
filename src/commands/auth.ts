import chalk from "chalk";
import ora from "ora";
import open from "open";
import { getApiKey, setApiKey, clearApiKey } from "../config.js";
import { unauthenticatedRequest } from "../api.js";

interface DeviceCodeResponse {
  device_id: string;
  user_code: string;
  verification_url: string;
  expires_at: string;
}

interface DeviceStatusResponse {
  status: "pending" | "confirmed" | "expired" | "not_found";
  api_key?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deviceAuthFlow(): Promise<void> {
  // Step 1: Create device code
  const spinner = ora("Starting login flow...").start();

  let deviceCode: DeviceCodeResponse;
  try {
    deviceCode = await unauthenticatedRequest<DeviceCodeResponse>(
      "/api/auth/device",
      { method: "POST" },
    );
    spinner.stop();
  } catch (error) {
    spinner.fail("Failed to start login flow");
    console.error(
      chalk.red(
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
    process.exit(1);
  }

  // Step 2: Display code and open browser
  console.log();
  console.log(chalk.bold("  Your code:"));
  console.log();
  console.log(chalk.bold.cyan(`    ${deviceCode.user_code}`));
  console.log();
  console.log(
    chalk.gray(
      `  Verify this code matches in your browser, then click Confirm.`,
    ),
  );
  console.log();

  try {
    await open(deviceCode.verification_url);
    console.log(chalk.gray(`  Browser opened to: ${deviceCode.verification_url}`));
  } catch {
    console.log(
      chalk.yellow(
        `  Open this URL in your browser: ${deviceCode.verification_url}`,
      ),
    );
  }
  console.log();

  // Step 3: Poll for confirmation
  const pollSpinner = ora("Waiting for confirmation...").start();
  // Use a local deadline with buffer to avoid clock skew issues
  const pollDeadline = Date.now() + 90 * 1000; // 90s local timeout (server is 60s + buffer)
  let consecutiveErrors = 0;

  while (Date.now() < pollDeadline) {
    await sleep(2000);

    try {
      const status = await unauthenticatedRequest<DeviceStatusResponse>(
        `/api/auth/device/${deviceCode.device_id}/status`,
      );
      consecutiveErrors = 0;

      if (status.status === "confirmed" && status.api_key) {
        pollSpinner.stop();
        setApiKey(status.api_key);
        console.log(chalk.green("✓ Logged in successfully!"));
        return;
      }

      if (status.status === "expired" || status.status === "not_found") {
        pollSpinner.fail("Device code expired");
        console.log(
          chalk.yellow("  Please run `orth login` to try again."),
        );
        return;
      }
    } catch {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        pollSpinner.fail("Unable to reach the server");
        console.log(
          chalk.yellow("  Check your internet connection and try again."),
        );
        return;
      }
    }
  }

  pollSpinner.fail("Device code expired");
  console.log(chalk.yellow("  Please run `orth login` to try again."));
}

export async function loginCommand(options: { key?: string }) {
  const key = options.key || process.env.ORTHOGONAL_API_KEY;

  if (key) {
    // Existing behavior: manual key entry
    if (!key.startsWith("orth_")) {
      console.error(
        chalk.red("Invalid API key format. Keys should start with 'orth_'"),
      );
      process.exit(1);
    }

    setApiKey(key);
    console.log(chalk.green("✓ Logged in successfully!"));
    console.log(chalk.gray(`  Key: ${key.slice(0, 15)}...${key.slice(-4)}`));
    return;
  }

  // New behavior: browser-based device auth flow
  await deviceAuthFlow();
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
  console.log(
    chalk.gray(
      `  Source: ${process.env.ORTHOGONAL_API_KEY ? "environment" : "config file"}`,
    ),
  );
}

import chalk from "chalk";
import ora from "ora";
import { apiRequest } from "../api.js";

interface BalanceResponse {
  balance: string;
}

interface UsageEvent {
  api: string;
  path: string;
  method: string;
  timestamp: string;
  cost: string;
  status: string;
}

interface UsageResponse {
  usage: UsageEvent[];
  totalSpent: string;
  pagination: { limit: number; offset: number; count: number; total: number };
}

export async function balanceCommand() {
  const spinner = ora("Fetching balance...").start();

  try {
    const data = await apiRequest<BalanceResponse>("/credits/balance");
    spinner.stop();

    console.log(`\n  ${chalk.green.bold(data.balance)}\n`);
  } catch (error) {
    spinner.stop();
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("401") || message.includes("Authentication")) {
      console.error(chalk.red("\n  Authentication failed. Check your API key with: orth login\n"));
    } else {
      console.error(chalk.red(`\n  Failed to fetch balance: ${message}\n`));
    }
    process.exit(1);
  }
}

export async function usageCommand(options: { limit: string; days?: string }) {
  const spinner = ora("Fetching usage...").start();

  try {
    const limit = parseInt(options.limit) || 20;
    const days = parseInt(options.days || "30") || 30;
    const data = await apiRequest<UsageResponse>(
      `/credits/usage?limit=${limit}&days=${days}`,
    );
    spinner.stop();

    if (!data?.usage || data.usage.length === 0) {
      console.log(chalk.gray("\n  No API usage in the last " + days + " days.\n"));
      return;
    }

    console.log(chalk.bold(`\n  API Usage (last ${days} days)\n`));

    // Table header
    console.log(
      chalk.gray("  " +
        "Date".padEnd(18) +
        "API".padEnd(20) +
        "Endpoint".padEnd(32) +
        "Cost".padStart(10)),
    );
    console.log(chalk.gray("  " + "─".repeat(80)));

    for (const item of data.usage) {
      const date = new Date(item.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const statusIcon = item.status === "completed" ? "" : chalk.yellow(" ⚠");

      const api = item.api ?? "unknown";
      const method = item.method ?? "";
      const path = item.path ?? "";
      const cost = item.cost ?? "$0.00";

      console.log(
        "  " +
          chalk.gray(date.padEnd(18)) +
          chalk.cyan(api.padEnd(20)) +
          chalk.white((method + " " + path).substring(0, 30).padEnd(32)) +
          chalk.green(cost.padStart(10)) +
          statusIcon,
      );
    }

    // Summary
    if (data.totalSpent) {
      console.log(chalk.gray("\n  " + "─".repeat(80)));
      console.log(
        chalk.bold(`  Total: ${chalk.green(data.totalSpent)}`) +
          chalk.gray(` (${data.pagination.total} calls)`),
      );
    }

    console.log();
  } catch (error) {
    spinner.stop();
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("401") || message.includes("Authentication")) {
      console.error(chalk.red("\n  Authentication failed. Check your API key with: orth login\n"));
    } else {
      console.error(chalk.red(`\n  Failed to fetch usage: ${message}\n`));
    }
    process.exit(1);
  }
}

import chalk from "chalk";
import ora from "ora";
import { apiRequest } from "../api.js";

interface BalanceResponse {
  balance: number;
  currency: string;
}

interface UsageItem {
  api: string;
  path: string;
  timestamp: string;
  cost: number;
}

interface UsageResponse {
  usage: UsageItem[];
  total: number;
}

export async function balanceCommand() {
  const spinner = ora("Fetching balance...").start();

  try {
    // Note: This endpoint may not exist yet - placeholder
    const data = await apiRequest<BalanceResponse>("/account/balance");
    spinner.stop();

    if (data && data.balance !== undefined) {
      console.log(chalk.bold("\nAccount Balance:"));
      console.log(chalk.green.bold(`  $${data.balance.toFixed(2)} ${data.currency || "USD"}`));
    } else {
      console.log(chalk.gray("Balance information not available."));
      console.log(chalk.gray("Check your balance at: https://orthogonal.com/dashboard"));
    }

  } catch (error) {
    spinner.stop();
    // Graceful fallback if endpoint doesn't exist
    console.log(chalk.gray("Balance information not available via API."));
    console.log(chalk.gray("Check your balance at: https://orthogonal.com/dashboard"));
  }
}

export async function usageCommand(options: { limit: string }) {
  const spinner = ora("Fetching usage...").start();

  try {
    // Note: This endpoint may not exist yet - placeholder
    const data = await apiRequest<UsageResponse>(`/account/usage?limit=${options.limit}`);
    spinner.stop();

    if (data?.usage && data.usage.length > 0) {
      console.log(chalk.bold("\nRecent API Usage:\n"));
      
      for (const item of data.usage) {
        const date = new Date(item.timestamp).toLocaleString();
        console.log(
          chalk.gray(date.padEnd(22)) +
          chalk.cyan(item.api.padEnd(15)) +
          chalk.white(item.path.padEnd(30)) +
          chalk.green(`$${item.cost.toFixed(4)}`)
        );
      }
      
      console.log(chalk.bold(`\nTotal: $${data.total.toFixed(2)}`));
    } else {
      console.log(chalk.gray("No recent usage data available."));
    }

  } catch (error) {
    spinner.stop();
    // Graceful fallback if endpoint doesn't exist
    console.log(chalk.gray("Usage information not available via API."));
    console.log(chalk.gray("Check your usage at: https://orthogonal.com/dashboard/usage"));
  }
}

import chalk from "chalk";
import ora from "ora";
import { apiRequest } from "../api.js";

/**
 * orth api request <docsUrl> - Request an API to be added to the platform
 */
export async function apiRequestCommand(
  docsUrl: string,
  options: { description?: string },
) {
  const spinner = ora("Submitting API request...").start();

  try {
    await apiRequest("/requests/api", {
      method: "POST",
      body: {
        docsUrl,
        description: options.description,
      },
    });

    spinner.stop();
    console.log(chalk.green("\n✓ API request submitted!"));
    console.log(
      chalk.gray("Our team has been notified and will review your request."),
    );
    console.log(chalk.gray(`  Docs URL: ${docsUrl}`));
    if (options.description) {
      console.log(chalk.gray(`  Notes: ${options.description}`));
    }
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

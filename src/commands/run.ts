import chalk from "chalk";
import ora from "ora";
import { run, RunResponse } from "../api.js";

export async function runCommand(
  api: string,
  path: string,
  options: {
    method: string;
    query?: string[];
    body?: string;
    data?: string;
    raw?: boolean;
  }
) {
  const spinner = ora(`Calling ${api}${path}...`).start();

  try {
    // Parse query params
    // Supports both `-q key=value -q key2=value2` and `-q 'key=value&key2=value2'`
    const query: Record<string, string> = {};
    if (options.query) {
      for (const param of options.query) {
        // Split on & to handle URL-style query strings
        const parts = param.split("&");
        for (const part of parts) {
          const eqIndex = part.indexOf("=");
          if (eqIndex > 0) {
            const key = part.slice(0, eqIndex);
            const value = part.slice(eqIndex + 1);
            query[key] = decodeURIComponent(value);
          }
        }
      }
    }

    // Parse body
    let body: unknown = undefined;
    const bodyJson = options.body || options.data;
    if (bodyJson) {
      try {
        body = JSON.parse(bodyJson);
      } catch {
        spinner.stop();
        console.error(chalk.red("Error: Invalid JSON in --body"));
        process.exit(1);
      }
    }

    // Check for stdin input
    if (!process.stdin.isTTY && !body) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const input = Buffer.concat(chunks).toString().trim();
      if (input) {
        try {
          body = JSON.parse(input);
        } catch {
          spinner.stop();
          console.error(chalk.red("Error: Invalid JSON from stdin"));
          process.exit(1);
        }
      }
    }

    const result: RunResponse = await run(api, path, {
      method: options.method,
      query: Object.keys(query).length > 0 ? query : undefined,
      body,
    });

    spinner.stop();

    if (options.raw) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      // Show cost
      if (result.price) {
        console.log(chalk.gray(`Cost: $${result.price}`));
      }

      // Pretty print the response
      console.log(chalk.bold("\nResponse:\n"));
      console.log(JSON.stringify(result.data, null, 2));
    }

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

import chalk from "chalk";
import ora from "ora";
import { search, SearchResponse } from "../api.js";

export async function searchCommand(query: string, options: { limit: string }) {
  const spinner = ora("Searching APIs...").start();

  try {
    const data: SearchResponse = await search(query, parseInt(options.limit, 10));
    spinner.stop();
    
    if (!data.results || data.results.length === 0) {
      console.log(chalk.yellow("No APIs found matching your query."));
      return;
    }

    console.log(chalk.bold(`\nFound ${data.apisCount} APIs with ${data.count} matching endpoints:\n`));

    for (const api of data.results) {
      console.log(chalk.cyan.bold(`${api.name}`) + chalk.gray(` (${api.slug})`));
      
      for (const endpoint of api.endpoints.slice(0, 3)) {
        const method = endpoint.method.padEnd(6);
        // Group members commonly collide on the same upstream path (e.g.
        // AbstractAPI's many products all expose "/v1") — when the endpoint's
        // own callable slug differs from the card's flat slug, show it so the
        // right identifier is obvious before calling `orth run`.
        const memberTag = endpoint.apiSlug && endpoint.apiSlug !== api.slug
          ? chalk.dim(`  [${endpoint.apiSlug}]`)
          : "";
        console.log(
          chalk.gray("  ") +
          chalk.yellow(method) +
          chalk.white(endpoint.path) +
          memberTag
        );
        if (endpoint.description) {
          console.log(chalk.gray(`       ${endpoint.description.slice(0, 80)}${endpoint.description.length > 80 ? "..." : ""}`));
        }
      }
      
      if (api.endpoints.length > 3) {
        console.log(chalk.gray(`  ... and ${api.endpoints.length - 3} more endpoints`));
      }
      console.log();
    }

    console.log(chalk.gray(`Run 'orth api <slug>' to see all endpoints for an API`));
    console.log(chalk.gray(`Run 'orth run <api> <path>' to call an endpoint`));

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

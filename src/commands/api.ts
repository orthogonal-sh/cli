import chalk from "chalk";
import ora from "ora";
import { search, getDetails, SearchResponse, DetailsResponse } from "../api.js";

export async function apiCommand(slug?: string, path?: string) {
  const spinner = ora("Loading...").start();

  try {
    if (!slug) {
      // List all APIs
      const data: SearchResponse = await search("*", 50);
      spinner.stop();
      
      console.log(chalk.bold("\nAvailable APIs:\n"));
      
      const seen = new Set<string>();
      for (const api of data.results) {
        if (seen.has(api.slug)) continue;
        seen.add(api.slug);
        
        console.log(
          chalk.cyan.bold(api.slug.padEnd(20)) +
          chalk.white(api.name) +
          chalk.gray(` (${api.endpoints.length} endpoints)`)
        );
      }
      
      console.log(chalk.gray("\nRun 'orth api <slug>' to see endpoints for an API"));
      return;
    }

    if (path) {
      // Show endpoint details
      const data: DetailsResponse = await getDetails(slug, path);
      spinner.stop();
      
      console.log(chalk.bold(`\n${chalk.cyan(slug)}${chalk.white(path)}\n`));
      console.log(chalk.gray(data.description || "No description"));
      
      if (data.price) {
        console.log(chalk.green(`\nPrice: $${data.price}`));
      }

      if (data.parameters?.query && data.parameters.query.length > 0) {
        console.log(chalk.bold("\nQuery Parameters:"));
        for (const param of data.parameters.query) {
          const required = param.required ? chalk.red("*") : "";
          console.log(
            chalk.yellow(`  ${param.name}${required}`) +
            chalk.gray(` (${param.type})`) +
            (param.description ? chalk.gray(` - ${param.description}`) : "")
          );
        }
      }

      if (data.parameters?.body && data.parameters.body.length > 0) {
        console.log(chalk.bold("\nBody Parameters:"));
        for (const param of data.parameters.body) {
          const required = param.required ? chalk.red("*") : "";
          console.log(
            chalk.yellow(`  ${param.name}${required}`) +
            chalk.gray(` (${param.type})`) +
            (param.description ? chalk.gray(` - ${param.description}`) : "")
          );
        }
      }

      console.log(chalk.gray("\nExample:"));
      console.log(chalk.white(`  orth run ${slug} ${path} --query key=value`));
      return;
    }

    // Show API endpoints
    const data: SearchResponse = await search(slug, 20);
    spinner.stop();

    const api = data.results.find((a) => a.slug === slug);
    
    if (!api) {
      console.log(chalk.yellow(`API '${slug}' not found.`));
      console.log(chalk.gray("Run 'orth api' to see available APIs"));
      return;
    }

    console.log(chalk.bold(`\n${chalk.cyan(api.name)} (${api.slug})\n`));
    
    for (const endpoint of api.endpoints) {
      const method = chalk.yellow(endpoint.method.padEnd(6));
      const price = endpoint.price ? chalk.green(`$${endpoint.price.toFixed(2)}`) : chalk.gray("free");
      console.log(`${method} ${chalk.white(endpoint.path)} ${price}`);
      if (endpoint.description) {
        console.log(chalk.gray(`       ${endpoint.description.slice(0, 80)}${endpoint.description.length > 80 ? "..." : ""}`));
      }
    }

    console.log(chalk.gray("\nRun 'orth api " + slug + " <path>' for endpoint details"));
    console.log(chalk.gray("Run 'orth run " + slug + " <path>' to call an endpoint"));

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

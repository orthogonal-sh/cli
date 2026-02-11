import chalk from "chalk";
import ora from "ora";
import { search, getDetails, SearchResponse, DetailsResponse } from "../api.js";

interface ApiOptions {
  x402?: boolean;
  x402Full?: boolean;
}

export async function apiCommand(slug?: string, path?: string, options?: ApiOptions) {
  const spinner = ora("Loading...").start();

  try {
    if (!slug) {
      // List all APIs - search multiple terms to get broader coverage
      const searches = await Promise.all([
        search("api", 50),
        search("data", 50),
        search("search", 50),
        search("email", 50),
      ]);
      spinner.stop();
      
      // Merge and dedupe results
      const allResults = searches.flatMap(s => s.results || []);
      const data: SearchResponse = {
        results: allResults,
        count: allResults.length,
        apisCount: new Set(allResults.map(r => r.slug)).size,
      };
      
      console.log(chalk.bold("\nAvailable APIs:\n"));
      
      const seen = new Set<string>();
      for (const api of data.results) {
        if (!api.slug || seen.has(api.slug)) continue;
        seen.add(api.slug);
        
        console.log(
          chalk.cyan.bold(api.slug.padEnd(20)) +
          chalk.white(api.name || "") +
          chalk.gray(` (${api.endpoints?.length || 0} endpoints)`)
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
      
      // Get description from endpoint object if available
      const desc = data.description || (data as any).endpoint?.description;
      console.log(chalk.gray(desc || "No description"));
      
      // Get price
      const price = data.price || (data as any).endpoint?.price;
      if (price) {
        console.log(chalk.green(`\nPrice: ${typeof price === 'number' ? '$' + price : price}`));
      }

      // Get params from nested endpoint object if needed
      const queryParams = data.parameters?.query || (data as any).endpoint?.queryParams || [];
      const bodyParams = data.parameters?.body || (data as any).endpoint?.bodyParams || [];

      if (queryParams.length > 0) {
        console.log(chalk.bold("\nQuery Parameters:"));
        for (const param of queryParams) {
          const required = param.required ? chalk.red("*") : "";
          console.log(
            chalk.yellow(`  ${param.name}${required}`) +
            chalk.gray(` (${param.type})`) +
            (param.description ? chalk.gray(` - ${param.description}`) : "")
          );
        }
      }

      if (bodyParams.length > 0) {
        console.log(chalk.bold("\nBody Parameters:"));
        for (const param of bodyParams) {
          const required = param.required ? chalk.red("*") : "";
          console.log(
            chalk.yellow(`  ${param.name}${required}`) +
            chalk.gray(` (${param.type})`) +
            (param.description ? chalk.gray(` - ${param.description}`) : "")
          );
        }
      }

      // Generate appropriate example
      console.log(chalk.gray("\nExample:"));
      if (bodyParams.length > 0) {
        const exampleBody: Record<string, string> = {};
        for (const param of bodyParams.slice(0, 3)) {
          exampleBody[param.name] = param.type === 'object' ? '{}' : `<${param.name}>`;
        }
        console.log(chalk.white(`  orth run ${slug} ${path} --body '${JSON.stringify(exampleBody)}'`));
      } else if (queryParams.length > 0) {
        const exampleQuery = queryParams.slice(0, 2).map((p: any) => `-q ${p.name}=<value>`).join(' ');
        console.log(chalk.white(`  orth run ${slug} ${path} ${exampleQuery}`));
      } else {
        console.log(chalk.white(`  orth run ${slug} ${path}`));
      }

      // x402 direct payment info
      if (options?.x402 || options?.x402Full) {
        const x402Url = `https://api.orth.sh/x402/run`;
        
        if (options?.x402 && !options?.x402Full) {
          // Minimal output - just the URL
          console.log(`\n${x402Url}`);
        } else {
          // Full output with all details
          const priceStr = String(price || '0').replace(/[$,]/g, '');
          const priceNum = parseFloat(priceStr) || 0;
          const priceUsdc = (priceNum * 1_000_000).toFixed(0); // USDC has 6 decimals
          
          console.log(chalk.bold.magenta("\n── x402 Direct Payment ──\n"));
          console.log(chalk.gray("Pay per request without API key using x402 protocol."));
          console.log(chalk.gray("Your agent can pay directly from its wallet.\n"));
          
          console.log(chalk.white("Endpoint:    ") + chalk.cyan(x402Url));
          console.log(chalk.white("Network:     ") + chalk.yellow("Base (Chain ID 8453)"));
          console.log(chalk.white("Token:       ") + chalk.yellow("USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)"));
          console.log(chalk.white("Price:       ") + chalk.green(`${priceUsdc} USDC units ($${priceNum.toFixed(4)})`));
          console.log(chalk.white("Payee:       ") + chalk.gray("Returned in 402 response header"));
          
          console.log(chalk.gray("\nFlow:"));
          console.log(chalk.gray("  1. POST to endpoint → receive 402 with payment details"));
          console.log(chalk.gray("  2. Sign payment with agent wallet"));
          console.log(chalk.gray("  3. Retry request with X-PAYMENT header"));
          
          console.log(chalk.gray("\nRequest body:"));
          console.log(chalk.white(`  {"api": "${slug}", "path": "${path}", "body": {...}, "query": {...}}`));
        }
      }
      
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

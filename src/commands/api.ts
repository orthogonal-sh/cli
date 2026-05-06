import chalk from "chalk";
import ora from "ora";
import { search, getDetails, getApiBySlug, listApis, SearchResponse, DetailsResponse } from "../api.js";

interface ApiOptions {
  x402?: boolean;
  x402Full?: boolean;
}

export async function apiCommand(slug?: string, path?: string, options?: ApiOptions) {
  const spinner = ora("Loading...").start();

  try {
    if (!slug) {
      // List all APIs using the list-endpoints endpoint
      try {
        const data = await listApis(500);
        spinner.stop();

        console.log(chalk.bold("\nAvailable APIs:\n"));

        const apis = (data.apis || []).sort((a, b) => a.slug.localeCompare(b.slug));
        for (const api of apis) {
          console.log(
            chalk.cyan.bold(api.slug.padEnd(20)) +
            chalk.white(api.name || "") +
            chalk.gray(` (${api.endpoints?.length || 0} endpoints)`)
          );
        }

        console.log(chalk.gray("\nRun 'orth api show <slug>' to see endpoints for an API"));
      } catch {
        // Fallback to search-based listing if list-endpoints not available
        const searches = await Promise.all([
          search("api", 50),
          search("data", 50),
          search("search", 50),
          search("email", 50),
        ]);
        spinner.stop();

        const allResults = searches.flatMap(s => s.results || []);
        console.log(chalk.bold("\nAvailable APIs:\n"));

        const seen = new Set<string>();
        for (const api of allResults) {
          if (!api.slug || seen.has(api.slug)) continue;
          seen.add(api.slug);
          console.log(
            chalk.cyan.bold(api.slug.padEnd(20)) +
            chalk.white(api.name || "") +
            chalk.gray(` (${api.endpoints?.length || 0} endpoints)`)
          );
        }

        console.log(chalk.gray("\nRun 'orth api show <slug>' to see endpoints for an API"));
      }
      return;
    }

    if (path) {
      // Show endpoint details
      const data: DetailsResponse = await getDetails(slug, path);
      spinner.stop();
      
      console.log(chalk.bold(`\n${chalk.cyan(slug)}${chalk.white(path)}\n`));
      
      // Get description from endpoint or action object if available
      const desc = data.description || data.endpoint?.description || data.action?.description;
      console.log(chalk.gray(desc || "No description"));

      // Show price
      const endpointPrice = data.price ?? data.endpoint?.price;
      const isDynamic = data.hasDynamicPricing || !!data.pricing_formula;
      if (isDynamic) {
        console.log(
          chalk.bold("Price: ") +
          chalk.yellow("dynamic") +
          chalk.gray(" (use --dry-run to estimate)")
        );
      } else if (endpointPrice !== undefined && endpointPrice !== null) {
        const isFree = endpointPrice === 0 || endpointPrice === "free" || endpointPrice === "0";
        const priceDisplay = typeof endpointPrice === 'string'
          ? endpointPrice
          : `$${parseFloat(Number(endpointPrice).toFixed(4))}`;
        console.log(
          chalk.bold("Price: ") +
          (isFree ? chalk.green("free") : chalk.yellow(priceDisplay))
        );
      }

      // Get params from nested endpoint or action object if needed
      const actionParams = data.action?.parameters ?? [];
      const queryParams = data.parameters?.query || data.endpoint?.queryParams || [];
      const bodyParams = data.parameters?.body || data.endpoint?.bodyParams || actionParams;

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
        const x402Url = `https://x402.orth.sh/${slug}${path}`;
        // Determine HTTP method: POST if body params, GET otherwise
        const method = bodyParams.length > 0 ? 'POST' : 'GET';
        
        if (options?.x402 && !options?.x402Full) {
          // Minimal output - just the URL
          console.log(`\n${x402Url}`);
        } else {
          // Full output - actually call the endpoint and get the 402 response
          try {
            const fetchOptions: RequestInit = { method };
            if (method === 'POST') {
              fetchOptions.headers = { 'Content-Type': 'application/json' };
              fetchOptions.body = '{}';
            }
            const response = await fetch(x402Url, fetchOptions);
            const responseData = await response.json();
            console.log(chalk.bold.magenta("\n── x402 Payment Details ──\n"));
            console.log(chalk.cyan(`URL: ${x402Url}`));
            console.log(chalk.yellow(`Method: ${method}`));
            console.log(chalk.gray(`Status: ${response.status}\n`));
            console.log(JSON.stringify(responseData, null, 2));
          } catch (err) {
            console.log(chalk.red(`\nFailed to fetch x402 details: ${err}`));
          }
        }
      }
      
      return;
    }

    // Show API endpoints - direct lookup by slug
    try {
      const apiData = await getApiBySlug(slug);
      spinner.stop();

      const api = apiData.api;
      console.log(chalk.bold(`\n${chalk.cyan(api.name)} (${api.slug})\n`));

      for (const endpoint of apiData.endpoints) {
        const method = chalk.yellow(endpoint.method.padEnd(6));
        const ep = endpoint.price as number | string | null | undefined;
        const epIsDynamic = endpoint.hasDynamicPricing || !!endpoint.pricing_formula;
        const price = epIsDynamic
          ? chalk.dim("dynamic")
          : (() => {
              const isFreePrice = ep === 0 || ep == null || ep === "free" || ep === "0";
              return isFreePrice
                ? chalk.green("free")
                : typeof ep === 'string'
                  ? chalk.dim(ep)
                  : chalk.dim(`$${parseFloat(Number(ep).toFixed(4))}`);
            })();
        console.log(`${method} ${chalk.white(endpoint.path)} ${price}`);
        if (endpoint.description) {
          console.log(chalk.gray(`       ${endpoint.description.slice(0, 80)}${endpoint.description.length > 80 ? "..." : ""}`));
        }
      }

      console.log(chalk.gray("\nRun 'orth api show " + slug + " <path>' for endpoint details"));
      console.log(chalk.gray("Run 'orth run " + slug + " <path>' to call an endpoint"));
    } catch {
      // Fallback to search if direct lookup fails (e.g. older backend)
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
        const ep2 = endpoint.price as number | string | null | undefined;
        const epIsDynamic2 = endpoint.hasDynamicPricing || !!endpoint.pricing_formula;
        const price = epIsDynamic2
          ? chalk.dim("dynamic")
          : (() => {
              const isFreePrice = ep2 === 0 || ep2 == null || ep2 === "free" || ep2 === "0";
              return isFreePrice
                ? chalk.green("free")
                : typeof ep2 === 'string'
                  ? chalk.dim(ep2)
                  : chalk.dim(`$${parseFloat(Number(ep2).toFixed(4))}`);
            })();
        console.log(`${method} ${chalk.white(endpoint.path)} ${price}`);
        if (endpoint.description) {
          console.log(chalk.gray(`       ${endpoint.description.slice(0, 80)}${endpoint.description.length > 80 ? "..." : ""}`));
        }
      }

      console.log(chalk.gray("\nRun 'orth api show " + slug + " <path>' for endpoint details"));
      console.log(chalk.gray("Run 'orth run " + slug + " <path>' to call an endpoint"));
    }

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

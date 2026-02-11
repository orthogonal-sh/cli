import chalk from "chalk";
import ora from "ora";
import { integrate, IntegrateResponse } from "../api.js";

const LANG_MAP: Record<string, string> = {
  typescript: "orth-sdk",
  ts: "orth-sdk",
  python: "x402-python",
  py: "x402-python",
  curl: "curl",
  sdk: "orth-sdk",
  run: "run-api",
};

export async function codeCommand(
  api: string,
  path: string,
  options: { lang: string }
) {
  const spinner = ora("Generating code...").start();

  try {
    const format = LANG_MAP[options.lang.toLowerCase()] || options.lang;
    const data: IntegrateResponse = await integrate(api, path, format);
    spinner.stop();
    
    console.log(chalk.bold(`\n${chalk.cyan(api)}${chalk.white(path)} - ${options.lang}\n`));
    
    const snippets = data.snippets;
    const code = snippets[format as keyof typeof snippets] || 
                 snippets["orth-sdk"] || 
                 Object.values(snippets)[0];
    
    if (code) {
      console.log(code);
    } else {
      console.log(chalk.yellow("No code snippet available for this format."));
      console.log(chalk.gray("Available formats: typescript, python, curl"));
    }

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

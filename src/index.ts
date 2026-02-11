#!/usr/bin/env node

import { Command } from "commander";
import { searchCommand } from "./commands/search.js";
import { runCommand } from "./commands/run.js";
import { apiCommand } from "./commands/api.js";
import { loginCommand, logoutCommand, whoamiCommand } from "./commands/auth.js";
import { balanceCommand, usageCommand } from "./commands/account.js";
import { codeCommand } from "./commands/code.js";

const program = new Command();

program
  .name("orth")
  .description("CLI to access all APIs on the Orthogonal platform")
  .version("0.1.0");

// Auth commands
program
  .command("login")
  .description("Authenticate with your Orthogonal API key")
  .option("-k, --key <key>", "API key (or set ORTHOGONAL_API_KEY env var)")
  .action(loginCommand);

program
  .command("logout")
  .description("Remove stored API key")
  .action(logoutCommand);

program
  .command("whoami")
  .description("Show current authentication status")
  .action(whoamiCommand);

// Discovery commands
program
  .command("search <query>")
  .description("Search for APIs using natural language")
  .option("-l, --limit <number>", "Max results", "10")
  .action(searchCommand);

program
  .command("api [slug] [path]")
  .description("List APIs or show details for a specific API/endpoint")
  .action(apiCommand);

// Run command
program
  .command("run <api> <path>")
  .description("Call an API endpoint")
  .option("-X, --method <method>", "HTTP method", "GET")
  .option("-q, --query <params...>", "Query params (key=value)")
  .option("-b, --body <json>", "Request body JSON")
  .option("-d, --data <json>", "Alias for --body")
  .option("--raw", "Output raw JSON without formatting")
  .action(runCommand);

// Code generation
program
  .command("code <api> <path>")
  .description("Generate integration code for an endpoint")
  .option("-l, --lang <language>", "Language: typescript, python, curl", "typescript")
  .action(codeCommand);

// Account commands
program
  .command("balance")
  .description("Check your credit balance")
  .action(balanceCommand);

program
  .command("usage")
  .description("Show recent API usage")
  .option("-l, --limit <number>", "Number of recent calls", "10")
  .action(usageCommand);

program.parse();

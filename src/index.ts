#!/usr/bin/env node

import { Command } from "commander";
import { searchCommand } from "./commands/search.js";
import { runCommand } from "./commands/run.js";
import { apiCommand } from "./commands/api.js";
import { loginCommand, logoutCommand, whoamiCommand } from "./commands/auth.js";
import { balanceCommand, usageCommand } from "./commands/account.js";
import { codeCommand } from "./commands/code.js";
import {
  skillsListCommand,
  skillsSearchCommand,
  skillsShowCommand,
  skillsCreateCommand,
  skillsInstallCommand,
  skillsPublishCommand,
  skillsRequestCommand,
  skillsInitCommand,
  skillsNewCommand,
  skillsSubmitCommand,
  skillsUpdateCommand,
  skillsRequestVerificationCommand,
} from "./commands/skills.js";
import { apiRequestCommand } from "./commands/apiRequest.js";
import { trackEvent } from "./analytics.js";

/**
 * Wraps an async action callback so that rejected promises are caught,
 * logged, and cause the process to exit with code 1.  Without this,
 * Commander.js silently swallows unhandled rejections from async actions.
 */
function asyncAction(fn: (...args: any[]) => Promise<void>) {
  return (...args: any[]) => {
    fn(...args).catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : "Unknown error");
      process.exit(1);
    });
  };
}

const program = new Command();

program
  .name("orth")
  .description("CLI to access all APIs and skills on the Orthogonal platform")
  .version("0.2.0");

// ─────────────────────────────────────────────────────────────────────────────
// Auth commands (top-level)
// ─────────────────────────────────────────────────────────────────────────────
program
  .command("login")
  .description("Authenticate with your Orthogonal API key")
  .option("-k, --key <key>", "API key (or set ORTHOGONAL_API_KEY env var)")
  .action(asyncAction(async (options) => {
    trackEvent("login");
    await loginCommand(options);
  }));

program
  .command("logout")
  .description("Remove stored API key")
  .action(asyncAction(async () => {
    trackEvent("logout");
    await logoutCommand();
  }));

program
  .command("whoami")
  .description("Show current authentication status")
  .action(asyncAction(async () => {
    trackEvent("whoami");
    await whoamiCommand();
  }));

// ─────────────────────────────────────────────────────────────────────────────
// Account commands (top-level)
// ─────────────────────────────────────────────────────────────────────────────
program
  .command("balance")
  .description("Check your credit balance")
  .action(asyncAction(async () => {
    trackEvent("balance");
    await balanceCommand();
  }));

program
  .command("usage")
  .description("Show recent API usage")
  .option("-l, --limit <number>", "Number of recent calls", "10")
  .action(asyncAction(async (options) => {
    trackEvent("usage");
    await usageCommand(options);
  }));

// ─────────────────────────────────────────────────────────────────────────────
// orth api <subcommand> — API commands group
// ─────────────────────────────────────────────────────────────────────────────
const apiGroup = program.command("api").description("API marketplace commands");

apiGroup
  .command("list")
  .description("List available APIs")
  .action(asyncAction(async () => {
    trackEvent("api.list");
    await apiCommand(undefined, undefined, {});
  }));

apiGroup
  .command("show <slug> [path]")
  .description("Show API endpoints or endpoint details")
  .option("--x402", "Output x402 payment URL only")
  .option("--x402-full", "Output full x402 payment details")
  .action(asyncAction(async (slug: string, path: string | undefined, options) => {
    trackEvent("api.show", { slug, path });
    await apiCommand(slug, path, options);
  }));

apiGroup
  .command("search <query>")
  .description("Search for APIs using natural language")
  .option("-l, --limit <number>", "Max results", "10")
  .action(asyncAction(async (query: string, options) => {
    trackEvent("api.search", { query });
    await searchCommand(query, options);
  }));

apiGroup
  .command("run <slug> <path>")
  .description("Call an API endpoint")
  .option("-X, --method <method>", "HTTP method", "GET")
  .option("-q, --query <params...>", "Query params (key=value)")
  .option("-b, --body <json>", "Request body JSON")
  .option("-d, --data <json>", "Alias for --body")
  .option("--raw", "Output raw JSON without formatting")
  .action(asyncAction(async (slug: string, path: string, options) => {
    trackEvent("api.run", { slug, path });
    await runCommand(slug, path, options);
  }));

apiGroup
  .command("code <slug> <path>")
  .description("Generate integration code for an endpoint")
  .option(
    "-l, --lang <language>",
    "Language: typescript, python, curl",
    "typescript",
  )
  .action(asyncAction(async (slug: string, path: string, options) => {
    trackEvent("api.code", { slug, path });
    await codeCommand(slug, path, options);
  }));

apiGroup
  .command("request <docsUrl>")
  .description("Request an API to be added to the platform")
  .option("-d, --description <text>", "Additional notes about the API")
  .action(asyncAction(async (docsUrl: string, options) => {
    trackEvent("api.request", { docsUrl });
    await apiRequestCommand(docsUrl, options);
  }));

// ─────────────────────────────────────────────────────────────────────────────
// orth skills <subcommand> — Skills commands group
// ─────────────────────────────────────────────────────────────────────────────
const skillsGroup = program
  .command("skills")
  .description("Agent skills library commands");

skillsGroup
  .command("list")
  .description("List discoverable skills")
  .option("-l, --limit <number>", "Max results", "20")
  .action(asyncAction(async (options) => {
    trackEvent("skills.list");
    await skillsListCommand(options);
  }));

skillsGroup
  .command("search <query>")
  .description("Search for agent skills")
  .option("-l, --limit <number>", "Max results", "20")
  .action(asyncAction(async (query: string, options) => {
    trackEvent("skills.search", { query });
    await skillsSearchCommand(query, options);
  }));

skillsGroup
  .command("show <slug>")
  .description("Show skill details and files")
  .action(asyncAction(async (slug: string) => {
    trackEvent("skills.show", { slug });
    await skillsShowCommand(slug);
  }));

skillsGroup
  .command("init [name]")
  .description("Initialize a new skill directory with SKILL.md template")
  .option("--bare", "Only create SKILL.md, skip subdirectories")
  .option("--path <dir>", "Output directory")
  .action(asyncAction(async (name: string | undefined, options) => {
    trackEvent("skills.init", { name });
    await skillsInitCommand(name, options);
  }));

skillsGroup
  .command("new [name]")
  .description("Create a new skill with guided structure")
  .option("-d, --description <text>", "Skill description")
  .option("-s, --scripts", "Include scripts/ directory with example")
  .option("-r, --references", "Include references/ directory with example")
  .option("-a, --assets", "Include assets/ directory")
  .option("--path <dir>", "Output directory")
  .action(asyncAction(async (name: string | undefined, options) => {
    trackEvent("skills.new", { name });
    await skillsNewCommand(name, options);
  }));

skillsGroup
  .command("submit [path]")
  .description("Submit a local skill to the Orthogonal platform")
  .option("-n, --name <name>", "Override skill name from frontmatter")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .action(asyncAction(async (inputPath: string | undefined, options) => {
    trackEvent("skills.submit", { path: inputPath });
    await skillsSubmitCommand(inputPath, options);
  }));

skillsGroup
  .command("update <slug> [path]")
  .description("Update an existing skill with local files")
  .option("-n, --name <name>", "Override skill name from frontmatter")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .action(asyncAction(async (slug: string, inputPath: string | undefined, options) => {
    trackEvent("skills.update", { slug, path: inputPath });
    await skillsUpdateCommand(slug, inputPath, options);
  }));

skillsGroup
  .command("request-verification <slug>")
  .description("Request verification for your skill (required before discoverability)")
  .action(asyncAction(async (slug: string) => {
    trackEvent("skills.request-verification", { slug });
    await skillsRequestVerificationCommand(slug);
  }));

skillsGroup
  .command("create <githubRepo>")
  .description("Create a skill from a GitHub URL or owner/repo")
  .option("-p, --path <path>", "Path to skill within repo")
  .option("-r, --ref <ref>", "Git ref (branch/tag)", "main")
  .option("-n, --name <name>", "Skill name (auto-detected from SKILL.md)")
  .action(asyncAction(async (githubRepo: string, options) => {
    trackEvent("skills.create", { githubRepo });
    await skillsCreateCommand(githubRepo, options);
  }));

skillsGroup
  .command("add <slug>")
  .description("Add a skill to your local agent skills directories")
  .option(
    "--agent <agent>",
    "Install for specific agent only (cursor, claude, copilot)",
  )
  .action(asyncAction(async (slug: string, options) => {
    trackEvent("skills.add", { slug });
    await skillsInstallCommand(slug, options);
  }));

skillsGroup
  .command("publish <slug>")
  .description("Toggle skill discoverability")
  .option("--unpublish", "Make skill private")
  .action(asyncAction(async (slug: string, options) => {
    trackEvent("skills.publish", { slug });
    await skillsPublishCommand(slug, options);
  }));

skillsGroup
  .command("request <input>")
  .description("Request a skill to be added (GitHub URL or description)")
  .action(asyncAction(async (input: string) => {
    trackEvent("skills.request", { input });
    await skillsRequestCommand(input);
  }));

// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatible aliases (flat commands)
// ─────────────────────────────────────────────────────────────────────────────
program
  .command("search <query>")
  .description("Search for APIs (alias for 'ortho api search')")
  .option("-l, --limit <number>", "Max results", "10")
  .action(asyncAction(async (query: string, options) => {
    trackEvent("search", { query });
    await searchCommand(query, options);
  }));

program
  .command("run <api> <path>")
  .description("Call an API endpoint (alias for 'ortho api run')")
  .option("-X, --method <method>", "HTTP method", "GET")
  .option("-q, --query <params...>", "Query params (key=value)")
  .option("-b, --body <json>", "Request body JSON")
  .option("-d, --data <json>", "Alias for --body")
  .option("--raw", "Output raw JSON without formatting")
  .action(asyncAction(async (api: string, path: string, options) => {
    trackEvent("run", { api, path });
    await runCommand(api, path, options);
  }));

program
  .command("code <api> <path>")
  .description("Generate integration code (alias for 'ortho api code')")
  .option(
    "-l, --lang <language>",
    "Language: typescript, python, curl",
    "typescript",
  )
  .action(asyncAction(async (api: string, path: string, options) => {
    trackEvent("code", { api, path });
    await codeCommand(api, path, options);
  }));

program.parse();

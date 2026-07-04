<div align="center">

# Orthogonal CLI

**One command line for every API and agent skill on the [Orthogonal](https://orthogonal.com) platform.**

Discover APIs in natural language, call them with a single command, and pay per request from your Orthogonal credit balance — no per-provider signups, keys, or contracts.

[![npm version](https://img.shields.io/npm/v/@orth/cli.svg?logo=npm&color=cb3837)](https://www.npmjs.com/package/@orth/cli)
[![npm downloads](https://img.shields.io/npm/dm/@orth/cli.svg?color=cb3837)](https://www.npmjs.com/package/@orth/cli)
[![node](https://img.shields.io/node/v/@orth/cli.svg?logo=node.js&color=339933)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@orth/cli.svg?color=blue)](./LICENSE)

![Demo](https://raw.githubusercontent.com/orthogonal-sh/cli/main/demos/demo.gif)

</div>

## Table of Contents

- [Why Orthogonal](#why-orthogonal)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Calling APIs](#calling-apis)
- [Agent Skills](#agent-skills)
- [Scheduled Tasks](#scheduled-tasks)
- [Account & Usage](#account--usage)
- [Command Reference](#command-reference)
- [Configuration](#configuration)
- [Programmatic Use](#programmatic-use)
- [Development](#development)
- [License](#license)

## Why Orthogonal

Orthogonal is a marketplace of production APIs and agent skills behind one account and one balance. The CLI lets you — and your AI agents — find and call any of them without leaving the terminal:

- **Discover** APIs and skills with natural-language search.
- **Call** any endpoint with one command — auth, billing, and routing are handled for you.
- **Pay per use** from a single credit balance instead of juggling dozens of provider subscriptions.
- **Script it** — clean JSON output (`--raw`) pipes straight into `jq` and shell pipelines.

## Installation

Requires **Node.js 18+**.

```bash
# Install globally
npm install -g @orth/cli

# …or run without installing
npx @orth/cli <command>
```

Verify the install:

```bash
orth --version
```

## Quick Start

```bash
# 1. Authenticate (get a key at https://orthogonal.com)
orth login --key orth_live_your_key

# 2. Find an API in plain English
orth api search "search the web"

# 3. Call an endpoint
orth run tavily /search -q query="latest AI news"

# 4. See what it cost
orth balance
```

## Authentication

```bash
# Log in with your API key (stored in ~/.config/orthogonal)
orth login --key orth_live_your_key

# …or use an environment variable (takes precedence — great for CI)
export ORTHOGONAL_API_KEY=orth_live_your_key

# Show the current identity
orth whoami

# Remove the stored key
orth logout
```

Get an API key from your [Orthogonal dashboard](https://orthogonal.com/dashboard).

## Calling APIs

### Discover & inspect

```bash
# Natural-language search across the marketplace
orth api search "generate images"

# List every available API
orth api list

# Show an API's endpoints
orth api show tavily

# Show one endpoint's parameters, pricing, and schema
orth api show tavily /search
```

### Call an endpoint

```bash
# GET with query params
orth run fantastic-jobs /v1/active-ats -q time_frame=1h -q limit=10

# Query params can also be passed as a single string
orth run fantastic-jobs /v1/active-ats -q "time_frame=1h&limit=10"

# POST with a JSON body
orth run some-api /v1/generate -X POST -b '{"prompt":"a red bicycle"}'

# Estimate the cost without spending credits
orth run some-api /v1/generate --dry-run

# Save a binary response (image, audio, PDF, …) to a file
orth run image-api /v1/render -q prompt="sunset" -o out.png

# Machine-readable output for pipelines
orth run tavily /search -q query="orthogonal" --raw | jq '.results[0].url'
```

### Generate integration code

Scaffold a ready-to-run snippet for any endpoint:

```bash
orth api code tavily /search                 # TypeScript (default)
orth api code tavily /search --lang python   # Python
orth api code tavily /search --lang curl     # cURL
```

### Request a new API

```bash
orth api request https://docs.example.com/api
```

## Agent Skills

Skills are packaged capabilities your AI agents can install and run. Browse the library, publish your own, and sync them to your local agent directories.

```bash
# Browse & search
orth skills list                     # verified, discoverable skills
orth skills search "web scraping"
orth skills show <slug>              # details + files

# Install into your local agent skill directories
orth skills add <slug>              # alias: orth skills install <slug>

# Author & publish
orth skills init [name]             # scaffold a SKILL.md template
orth skills create <owner/repo>    # create a skill from a GitHub repo
orth skills submit [path]          # submit a local skill
orth skills push <slug> [path]     # push local changes to the platform
orth skills update <slug> [path]   # pull the latest version locally
orth skills mine                   # list your skills
orth skills request-verification <slug>
orth skills publish <slug>         # toggle discoverability
orth skills request <input>        # request a skill by URL or description
```

**Verification workflow:** to make a skill discoverable to others, go `init`/`create` → `submit` → `request-verification`. Once verified, use `publish` to toggle its discoverability.

## Scheduled Tasks

Run API calls and skills on a schedule.

```bash
orth tasks list                # your scheduled tasks
orth tasks create              # create a task
orth tasks show <id>           # task details
orth tasks trigger <id>        # run it now
orth tasks logs <id>           # run history
orth tasks pause <id>          # pause
orth tasks resume <id>         # resume
orth tasks delete <id>         # delete
```

## Account & Usage

```bash
orth balance   # current credit balance
orth usage     # recent API usage
```

## Command Reference

| Command | Description |
| --- | --- |
| `orth login` / `logout` / `whoami` | Manage authentication |
| `orth balance` / `usage` | Credit balance and recent usage |
| `orth api list` | List available APIs |
| `orth api search <query>` | Natural-language API search |
| `orth api show <slug> [path]` | Show endpoints / endpoint details (alias: `info`) |
| `orth api run <slug> <path>` | Call an endpoint |
| `orth api code <slug> <path>` | Generate integration code |
| `orth api request <docsUrl>` | Request an API to be added |
| `orth skills …` | Browse, install, author, and publish skills |
| `orth tasks …` | Create and manage scheduled tasks |

**Shorthand aliases** for the most common commands:

```bash
orth search <query>       # → orth api search
orth run <slug> <path>    # → orth api run
orth code <slug> <path>   # → orth api code
```

Run `orth <command> --help` for the full options on any command.

### `run` options

| Flag | Description |
| --- | --- |
| `-X, --method <method>` | HTTP method (default `GET`) |
| `-q, --query <k=v...>` | Query params (repeatable, or one `a=1&b=2` string) |
| `-b, --body <json>` / `-d, --data <json>` | JSON request body |
| `-o, --output <file>` | Save the response to a file (auto-detects binary) |
| `--raw` | Print raw JSON (ideal for piping) |
| `--dry-run` | Estimate the cost without executing |

## Configuration

| Environment variable | Purpose |
| --- | --- |
| `ORTHOGONAL_API_KEY` | API key; overrides the stored credential (use in CI) |
| `ORTH_API_URL` | Override the API base URL (advanced) |

Credentials from `orth login` are stored in `~/.config/orthogonal`.

## Programmatic Use

Building an application instead of scripting the terminal? Use the official TypeScript SDK, [`@orth/sdk`](https://www.npmjs.com/package/@orth/sdk):

```bash
npm install @orth/sdk
```

## Development

```bash
git clone https://github.com/orthogonal-sh/cli.git
cd cli
npm install

npm run build      # compile TypeScript to dist/
npm run dev        # compile in watch mode
npm test           # run the test suite (vitest)
npm start          # run the built CLI
```

Contributions are welcome — please open an issue or a pull request.

## License

[MIT](./LICENSE) © Orthogonal

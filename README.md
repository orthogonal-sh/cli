# Orthogonal CLI

CLI to access all APIs and agent skills on the Orthogonal platform.

![Demo](demos/demo.gif)

## Installation

```bash
# Install globally
npm install -g @orth/cli

# Or use npx
npx @orth/cli <command>
```

## Authentication

```bash
# Login with API key
ortho login --key orth_live_your_key

# Or set environment variable
export ORTHOGONAL_API_KEY=orth_live_your_key

# Check auth status
ortho whoami

# Logout
ortho logout
```

## API Commands

### Search & Browse

```bash
# Search for APIs
ortho api search "email finder"
ortho api search "web scraping" --limit 20

# List all APIs
ortho api list

# Show API endpoints
ortho api show hunter

# Show endpoint details
ortho api show hunter /v2/domain-search
```

### Call APIs

```bash
# GET request with query params
ortho api run hunter /v2/domain-search -q domain=stripe.com

# POST request with body
ortho api run olostep /v1/scrapes --body '{"url": "https://stripe.com"}'

# Raw output for piping
ortho api run hunter /v2/domain-search -q domain=stripe.com --raw | jq '.emails'
```

### Generate Code

```bash
# TypeScript (default)
ortho api code hunter /v2/domain-search

# Python
ortho api code hunter /v2/domain-search --lang python

# cURL
ortho api code hunter /v2/domain-search --lang curl
```

### Request an API

```bash
# Request an API to be added to the platform
ortho api request https://docs.example.com/api -d "Weather data API"
```

## Skills Commands

### Browse & Search

```bash
# List verified & discoverable skills
ortho skills list

# Search for skills
ortho skills search "react best practices"

# Show skill details
ortho skills show owner/skill-name
```

### Install Skills

```bash
# Install a skill to all supported agents
ortho skills add owner/skill-name

# Install for a specific agent only
ortho skills add owner/skill-name --agent cursor
```

Installs to 7 agent skill directories:

| Agent | Directory |
|-------|-----------|
| Cursor | `~/.cursor/skills/` |
| Claude Code | `~/.claude/skills/` |
| GitHub Copilot | `~/.github/skills/` |
| Windsurf | `~/.codeium/windsurf/skills/` |
| Codex | `~/.agents/skills/` |
| Gemini | `~/.gemini/skills/` |
| OpenClaw | `~/.openclaw/skills/` |

### Create & Publish Skills

```bash
# Initialize a new skill from template
ortho skills init my-skill
ortho skills init my-skill --bare  # SKILL.md only, no subdirectories

# Create a skill from a GitHub repo
ortho skills create https://github.com/owner/repo
ortho skills create owner/repo --path skills/my-skill --ref main

# Submit a local skill to the platform
ortho skills submit ./my-skill
ortho skills submit --name "My Skill" --tags "react,testing"

# Request verification (required before discoverability)
ortho skills request-verification owner/my-skill

# Request a skill to be added (by description or GitHub URL)
ortho skills request "A skill for React testing patterns"
ortho skills request https://github.com/owner/cool-skill
```

### Verification Workflow

1. **Submit** your skill → it's on the platform but not publicly visible
2. **Request verification** → our team reviews it
3. **Once verified** → toggle discoverability on/off from your [dashboard](https://orthogonal.com/dashboard/skills)

## Account

```bash
# Check balance
ortho balance

# View usage
ortho usage --limit 20
```

## Shorthand Aliases

These top-level commands are aliases for their `ortho api` counterparts:

```bash
ortho search "query"          # → ortho api search "query"
ortho run slug /path          # → ortho api run slug /path
ortho code slug /path         # → ortho api code slug /path
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Watch tests
npm run test:watch
```

## License

MIT

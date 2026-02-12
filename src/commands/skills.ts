import chalk from "chalk";
import ora from "ora";
import { apiRequest } from "../api.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SkillResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sourceType: "github" | "upload";
  githubOwner?: string;
  githubRepo?: string;
  githubPath?: string;
  githubRef?: string;
  discoverable: boolean;
  verified: boolean;
  installCount: number;
  tags?: string[];
  installCommand?: string;
  githubUrl?: string;
  files?: {
    filePath: string;
    content: string;
    isPrimary: boolean;
  }[];
}

interface SkillsListResponse {
  skills: SkillResponse[];
  total: number;
}

interface SkillSearchResponse {
  results: SkillResponse[];
  count: number;
}

interface SkillDetailResponse {
  skill: SkillResponse;
}

// Agent skill directories (user-level global skills)
const AGENT_DIRS: Record<string, string> = {
  cursor: path.join(os.homedir(), ".cursor", "skills"),
  "claude-code": path.join(os.homedir(), ".claude", "skills"),
  copilot: path.join(os.homedir(), ".github", "skills"),
  windsurf: path.join(os.homedir(), ".codeium", "windsurf", "skills"),
  codex: path.join(os.homedir(), ".agents", "skills"), // Codex uses ~/.agents/skills/ for user-scoped skills
  gemini: path.join(os.homedir(), ".gemini", "skills"),
  openclaw: path.join(os.homedir(), ".openclaw", "skills"),
};

// ─────────────────────────────────────────────────────────────────────────────
// orth skills list
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsListCommand(options: { limit: string }) {
  const spinner = ora("Loading skills...").start();

  try {
    const limit = parseInt(options.limit, 10);
    const data = await apiRequest<SkillsListResponse>(`/skills?limit=${limit}`);
    spinner.stop();

    if (!data.skills || data.skills.length === 0) {
      console.log(chalk.yellow("No discoverable skills found."));
      return;
    }

    console.log(chalk.bold(`\nDiscoverable Skills (${data.total} total):\n`));

    for (const skill of data.skills) {
      const verified = skill.verified ? chalk.blue(" ✓") : "";
      const installs = chalk.gray(`(${skill.installCount} installs)`);
      const source =
        skill.sourceType === "github" && skill.githubOwner
          ? chalk.gray(` [${skill.githubOwner}/${skill.githubRepo}]`)
          : chalk.gray(" [uploaded]");

      console.log(
        chalk.cyan.bold(skill.name) + verified + source + " " + installs,
      );

      if (skill.description) {
        console.log(
          chalk.gray(
            `  ${skill.description.slice(0, 100)}${skill.description.length > 100 ? "..." : ""}`,
          ),
        );
      }

      if (skill.tags && skill.tags.length > 0) {
        console.log(
          chalk.gray("  Tags: ") +
            skill.tags.map((t) => chalk.magenta(t)).join(", "),
        );
      }

      console.log(chalk.gray(`  Slug: ${skill.slug}`));
      console.log();
    }

    console.log(
      chalk.gray("Run 'orth skills show <slug>' to see skill details"),
    );
    console.log(
      chalk.gray("Run 'orth skills add <slug>' to add a skill locally"),
    );
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills search <query>
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsSearchCommand(
  query: string,
  options: { limit: string },
) {
  const spinner = ora("Searching skills...").start();

  try {
    const data = await apiRequest<SkillSearchResponse>("/skills/search", {
      method: "POST",
      body: { query, limit: parseInt(options.limit, 10) },
    });
    spinner.stop();

    if (!data.results || data.results.length === 0) {
      console.log(chalk.yellow("No skills found matching your query."));
      return;
    }

    console.log(chalk.bold(`\nFound ${data.count} skills:\n`));

    for (const skill of data.results) {
      const verified = skill.verified ? chalk.blue(" ✓") : "";
      const installs = chalk.gray(`(${skill.installCount} installs)`);

      console.log(chalk.cyan.bold(skill.name) + verified + " " + installs);

      if (skill.description) {
        console.log(
          chalk.gray(
            `  ${skill.description.slice(0, 100)}${skill.description.length > 100 ? "..." : ""}`,
          ),
        );
      }
      console.log(chalk.gray(`  Slug: ${skill.slug}`));
      console.log();
    }

    console.log(chalk.gray("Run 'orth skills show <slug>' for full details"));
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills show <slug>
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsShowCommand(slug: string) {
  const spinner = ora("Loading skill...").start();

  try {
    const data = await apiRequest<SkillDetailResponse>(`/skills/${slug}`);
    spinner.stop();

    const skill = data.skill;

    console.log(chalk.bold(`\n${chalk.cyan(skill.name)}\n`));

    if (skill.description) {
      console.log(chalk.white(skill.description));
      console.log();
    }

    // Metadata
    console.log(chalk.bold("Details:"));
    console.log(chalk.gray("  Slug: ") + skill.slug);
    console.log(
      chalk.gray("  Source: ") +
        (skill.sourceType === "github"
          ? `GitHub (${skill.githubOwner}/${skill.githubRepo})`
          : "Uploaded"),
    );
    console.log(
      chalk.gray("  Installs: ") + chalk.green(String(skill.installCount)),
    );
    if (skill.verified) {
      console.log(chalk.gray("  Verified: ") + chalk.blue("Yes ✓"));
    }
    if (skill.tags && skill.tags.length > 0) {
      console.log(
        chalk.gray("  Tags: ") +
          skill.tags.map((t) => chalk.magenta(t)).join(", "),
      );
    }
    console.log();

    // Files
    if (skill.files && skill.files.length > 0) {
      console.log(chalk.bold("Files:"));
      for (const file of skill.files) {
        const primary = file.isPrimary ? chalk.green(" (primary)") : "";
        console.log(chalk.gray("  ") + chalk.white(file.filePath) + primary);
      }
      console.log();

      // Show primary file content preview
      const primaryFile = skill.files.find((f) => f.isPrimary);
      if (primaryFile) {
        console.log(chalk.bold(`── ${primaryFile.filePath} ──\n`));
        const lines = primaryFile.content.split("\n");
        const preview = lines.slice(0, 30).join("\n");
        console.log(preview);
        if (lines.length > 30) {
          console.log(chalk.gray(`\n... ${lines.length - 30} more lines`));
        }
      }
    }

    console.log();
    if (skill.installCommand) {
      console.log(chalk.bold("Install:"));
      console.log(chalk.white(`  ${skill.installCommand}`));
    }
    console.log(
      chalk.gray(`\nRun 'orth skills add ${skill.slug}' to add locally`),
    );
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills create <githubRepo>
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsCreateCommand(
  githubRepo: string,
  options: {
    path?: string;
    ref?: string;
    name?: string;
  },
) {
  const spinner = ora("Creating skill from GitHub...").start();

  try {
    // Parse GitHub URL or owner/repo format
    let githubOwner: string;
    let githubRepoName: string;

    const urlMatch = githubRepo.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
    if (urlMatch) {
      githubOwner = urlMatch[1];
      githubRepoName = urlMatch[2].replace(/\.git$/, "");
    } else {
      const parts = githubRepo.split("/");
      if (parts.length < 2) {
        spinner.stop();
        console.error(
          chalk.red("Error: Provide a GitHub URL or owner/repo format"),
        );
        process.exit(1);
      }
      githubOwner = parts[0];
      githubRepoName = parts[1];
    }

    const data = await apiRequest<{ message: string; skill: SkillResponse }>(
      "/skills",
      {
        method: "POST",
        body: {
          githubOwner,
          githubRepo: githubRepoName,
          githubPath: options.path,
          githubRef: options.ref || "main",
          name: options.name,
          sourceType: "github",
        },
      },
    );
    spinner.stop();

    console.log(chalk.green(`\n✓ ${data.message}`));
    console.log(chalk.bold(`\n${data.skill.name}`));
    console.log(chalk.gray(`  Slug: ${data.skill.slug}`));
    if (data.skill.description) {
      console.log(chalk.gray(`  ${data.skill.description}`));
    }

    console.log(
      chalk.bold("\nYour skill is on the platform but not yet verified."),
    );
    console.log(
      chalk.white(
        `To request verification: ${chalk.cyan(`orth skills request-verification ${data.skill.slug}`)}`,
      ),
    );
    console.log(
      chalk.gray(
        "Once verified, you can toggle discoverability anytime.",
      ),
    );
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills add <slug>
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsInstallCommand(
  slug: string,
  options: { agent?: string },
) {
  const spinner = ora("Fetching skill...").start();

  try {
    const data = await apiRequest<SkillDetailResponse>(`/skills/${slug}`);
    const skill = data.skill;
    spinner.stop();

    if (!skill.files || skill.files.length === 0) {
      console.log(chalk.yellow("This skill has no files to install."));
      return;
    }

    const primaryFile = skill.files.find((f) => f.isPrimary);
    if (!primaryFile) {
      console.log(chalk.yellow("No primary SKILL.md file found."));
      return;
    }

    // Determine which agents to install for
    if (options.agent && !AGENT_DIRS[options.agent]) {
      spinner.stop();
      console.error(
        chalk.red(`Error: Unknown agent '${options.agent}'. Valid agents: ${Object.keys(AGENT_DIRS).join(", ")}`),
      );
      process.exit(1);
    }

    const agents = options.agent
      ? { [options.agent]: AGENT_DIRS[options.agent] }
      : AGENT_DIRS;

    const skillDirName = skill.slug.replace(/\//g, "-");
    let installed = 0;

    for (const [agentName, baseDir] of Object.entries(agents)) {
      if (!baseDir) continue;

      // Only install for agents whose base directory already exists
      if (!fs.existsSync(path.dirname(baseDir))) continue;

      const skillDir = path.join(baseDir, skillDirName);

      try {
        // Create directories
        fs.mkdirSync(skillDir, { recursive: true });

        // Write all files (with path traversal protection)
        for (const file of skill.files) {
          // Sanitize file path to prevent path traversal
          const sanitized = file.filePath.replace(/\.\.\//g, "").replace(/\.\.\\/g, "");
          const filePath = path.resolve(skillDir, sanitized);
          // Ensure resolved path is within skillDir
          if (!filePath.startsWith(path.resolve(skillDir))) {
            console.log(chalk.yellow(`  Skipped unsafe file path: ${file.filePath}`));
            continue;
          }
          const fileDir = path.dirname(filePath);
          fs.mkdirSync(fileDir, { recursive: true });
          fs.writeFileSync(filePath, file.content, "utf-8");
        }

        console.log(chalk.green(`  ✓ Installed for ${agentName}: ${skillDir}`));
        installed++;
      } catch {
        // Skip agents whose directories don't exist / can't be created
        console.log(
          chalk.gray(`  - Skipped ${agentName} (directory not accessible)`),
        );
      }
    }

    // Record the install
    try {
      await apiRequest(`/skills/${slug}/install`, { method: "POST" });
    } catch {
      // Non-critical - don't fail the install
    }

    if (installed > 0) {
      console.log(
        chalk.green(`\n✓ Installed "${skill.name}" for ${installed} agent(s)`),
      );
    } else {
      console.log(
        chalk.yellow(
          "\nNo agents were found. Install manually by copying SKILL.md to your agent's skills directory.",
        ),
      );
    }
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills init [name]
// ─────────────────────────────────────────────────────────────────────────────

// Known binary/large file extensions to skip when reading local files
const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".mp4", ".mp3", ".wav", ".ogg",
  ".zip", ".tar", ".gz", ".bz2", ".rar", ".7z",
  ".woff", ".woff2", ".ttf", ".eot",
  ".exe", ".dll", ".so", ".dylib",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".lock", ".bin",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv",
  "dist", "build", ".next", ".cache",
]);

export async function skillsInitCommand(
  name: string | undefined,
  options: { bare?: boolean; path?: string },
) {
  try {
    const skillName = name || "my-skill";
    const dirPath = options.path || path.join(process.cwd(), skillName);

    // Check if directory already exists and has content
    if (fs.existsSync(dirPath)) {
      const contents = fs.readdirSync(dirPath);
      if (contents.length > 0) {
        const skillMdExists = contents.includes("SKILL.md");
        if (skillMdExists) {
          console.error(
            chalk.red(`Error: ${dirPath} already contains a SKILL.md file`),
          );
          process.exit(1);
        }
      }
    }

    // Create directory
    fs.mkdirSync(dirPath, { recursive: true });

    // Generate SKILL.md template
    const slugName = skillName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    const skillMdContent = `---
name: ${slugName}
description: TODO - Describe what this skill does and when an agent should use it. Be specific about triggers.
---

# ${skillName.charAt(0).toUpperCase() + skillName.slice(1).replace(/-/g, " ")}

TODO - Add instructions for the AI agent here.

## When to Use This Skill

Use this skill when the user:
- TODO - Describe specific triggers
- TODO - Add more triggers

## Workflow

### Step 1: TODO

Describe the first step.

### Step 2: TODO

Describe the next step.
`;

    fs.writeFileSync(path.join(dirPath, "SKILL.md"), skillMdContent, "utf-8");

    // Create optional subdirectories unless --bare
    if (!options.bare) {
      const subDirs = ["scripts", "references", "assets"];
      for (const sub of subDirs) {
        const subPath = path.join(dirPath, sub);
        fs.mkdirSync(subPath, { recursive: true });
        // Add .gitkeep to keep empty dirs in git
        fs.writeFileSync(path.join(subPath, ".gitkeep"), "", "utf-8");
      }
    }

    console.log(chalk.green(`\n✓ Skill initialized at ${dirPath}\n`));
    console.log(chalk.bold("Files created:"));
    console.log(chalk.white("  SKILL.md") + chalk.gray(" (primary - edit this!)"));
    if (!options.bare) {
      console.log(chalk.gray("  scripts/     - Executable scripts"));
      console.log(chalk.gray("  references/  - Reference docs loaded on demand"));
      console.log(chalk.gray("  assets/      - Files used in output"));
    }

    console.log(chalk.bold("\nNext steps:"));
    console.log(chalk.white("  1. Edit SKILL.md with your skill's instructions"));
    console.log(chalk.white("  2. Add any supporting files to scripts/, references/, or assets/"));
    console.log(chalk.white(`  3. Submit to Orthogonal: ${chalk.cyan(`orth skills submit ${dirPath}`)}`));
  } catch (error) {
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills submit [path]
// ─────────────────────────────────────────────────────────────────────────────

function readFilesRecursive(
  dirPath: string,
  basePath: string = "",
): { filePath: string; content: string; isPrimary: boolean }[] {
  const files: { filePath: string; content: string; isPrimary: boolean }[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      files.push(...readFilesRecursive(fullPath, relativePath));
    } else if (entry.isFile()) {
      // Skip dotfiles and binary files
      if (entry.name.startsWith(".")) continue;
      const ext = entry.name.includes(".")
        ? "." + entry.name.split(".").pop()!.toLowerCase()
        : "";
      if (SKIP_EXTENSIONS.has(ext)) continue;

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        files.push({
          filePath: relativePath,
          content,
          isPrimary: entry.name === "SKILL.md" && basePath === "",
        });
      } catch {
        // Skip files that can't be read as UTF-8
      }
    }
  }

  return files;
}

/**
 * Simple YAML frontmatter parser for SKILL.md files.
 * Supports single-line `name:` and `description:` values.
 * Multi-line YAML values (block scalars, folded strings) are not supported —
 * descriptions should be kept to a single line in frontmatter.
 */
function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = match[1] || "";
  const result: { name?: string; description?: string } = {};
  for (const line of fm.split("\n")) {
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch?.[1]) result.name = nameMatch[1].trim();
    const descMatch = line.match(/^description:\s*(.+)$/);
    if (descMatch?.[1]) result.description = descMatch[1].trim();
  }
  return result;
}

export async function skillsSubmitCommand(
  inputPath: string | undefined,
  options: { name?: string; tags?: string },
) {
  const dirPath = inputPath ? path.resolve(inputPath) : process.cwd();
  const spinner = ora("Reading skill files...").start();

  try {
    // Validate directory exists
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      spinner.stop();
      console.error(chalk.red(`Error: ${dirPath} is not a directory`));
      process.exit(1);
    }

    // Read all files
    const files = readFilesRecursive(dirPath);

    if (files.length === 0) {
      spinner.stop();
      console.error(chalk.red("Error: No files found in the directory"));
      process.exit(1);
    }

    // Validate SKILL.md exists
    const primaryFile = files.find((f) => f.isPrimary);
    if (!primaryFile) {
      spinner.stop();
      console.error(
        chalk.red("Error: No SKILL.md found in the root of the directory"),
      );
      console.log(
        chalk.gray("Run 'orth skills init' to create a skill template"),
      );
      process.exit(1);
    }

    // Parse frontmatter
    const frontmatter = parseFrontmatter(primaryFile.content);
    const skillName = options.name || frontmatter.name;
    const skillDescription = frontmatter.description;

    if (!skillName) {
      spinner.stop();
      console.error(
        chalk.red(
          "Error: Skill name is required. Add 'name:' to SKILL.md frontmatter or use --name",
        ),
      );
      process.exit(1);
    }

    if (!skillDescription) {
      spinner.stop();
      console.error(
        chalk.red(
          "Error: Skill description is required. Add 'description:' to SKILL.md frontmatter",
        ),
      );
      process.exit(1);
    }

    // Check size limits
    const totalSize = files.reduce((acc, f) => acc + f.content.length, 0);
    if (files.length > 50) {
      spinner.stop();
      console.error(chalk.red("Error: Too many files (max 50)"));
      process.exit(1);
    }
    if (totalSize > 1024 * 1024) {
      spinner.stop();
      console.error(chalk.red("Error: Total content too large (max 1MB)"));
      process.exit(1);
    }

    spinner.text = "Submitting skill to Orthogonal...";

    const tags = options.tags
      ? options.tags.split(",").map((t) => t.trim())
      : undefined;

    const data = await apiRequest<{ message: string; skill: SkillResponse }>(
      "/skills",
      {
        method: "POST",
        body: {
          sourceType: "upload",
          name: skillName,
          description: skillDescription,
          files: files.map((f) => ({
            filePath: f.filePath,
            content: f.content,
            isPrimary: f.isPrimary,
          })),
          tags,
          discoverable: false,
        },
      },
    );

    spinner.stop();

    console.log(chalk.green(`\n✓ ${data.message}`));
    console.log(chalk.bold(`\n${data.skill.name}`));
    console.log(chalk.gray(`  Slug: ${data.skill.slug}`));
    console.log(chalk.gray(`  Files: ${files.length}`));
    if (data.skill.description) {
      console.log(chalk.gray(`  ${data.skill.description.slice(0, 100)}`));
    }

    console.log(
      chalk.bold("\nYour skill is on the platform but not yet verified."),
    );
    console.log(
      chalk.white(
        `To request verification: ${chalk.cyan(`orth skills request-verification ${data.skill.slug}`)}`,
      ),
    );
    console.log(
      chalk.gray(
        "Once verified, you can toggle discoverability anytime.",
      ),
    );
    console.log(
      chalk.gray(
        `Dashboard: https://orth.sh/dashboard/skills`,
      ),
    );
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills request-verification <slug>
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsRequestVerificationCommand(slug: string) {
  const spinner = ora("Submitting verification request...").start();

  try {
    // First get the skill to find its ID
    const skillData = await apiRequest<{ skill: SkillResponse }>(
      `/skills/${slug}`,
    );

    if (!skillData.skill) {
      spinner.stop();
      console.error(chalk.red(`Error: Skill '${slug}' not found`));
      process.exit(1);
    }

    // Request verification via the public API endpoint
    await apiRequest(`/skills/${slug}/request-verification`, {
      method: "POST",
    });

    spinner.stop();
    console.log(chalk.green("\n✓ Verification request submitted!"));
    console.log(
      chalk.gray(
        "Our team will review your skill. Once verified, you can toggle discoverability anytime.",
      ),
    );
    console.log(
      chalk.gray("Check the status on your dashboard."),
    );
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills publish <slug> (deprecated - redirects to request-verification)
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsPublishCommand(
  slug: string,
  options: { unpublish?: boolean },
) {
  console.log(
    chalk.yellow(
      "Note: Direct publishing has been replaced with a verification workflow.",
    ),
  );
  console.log(
    chalk.white(
      `\nTo request your skill to be verified, run:\n  ${chalk.cyan(`orth skills request-verification ${slug}`)}`,
    ),
  );
  console.log(
    chalk.white(
      "Once verified, you can toggle discoverability from your dashboard.",
    ),
  );
  console.log(
    chalk.gray(
      "\nOr manage from the dashboard: https://orth.sh/dashboard/skills",
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// orth skills request <input>
// ─────────────────────────────────────────────────────────────────────────────
export async function skillsRequestCommand(input: string) {
  const spinner = ora("Submitting skill request...").start();

  try {
    // Determine if input is a GitHub URL or description
    const isGitHub =
      input.includes("github.com") ||
      /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(input);

    const body = isGitHub ? { githubRepo: input } : { description: input };

    await apiRequest("/requests/skill", {
      method: "POST",
      body,
    });

    spinner.stop();
    console.log(chalk.green("\n✓ Skill request submitted!"));
    console.log(
      chalk.gray("Our team has been notified and will review your request."),
    );
  } catch (error) {
    spinner.stop();
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }
}

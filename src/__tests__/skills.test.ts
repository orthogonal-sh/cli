import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock modules before importing commands
vi.mock("../api.js", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("../config.js", () => ({
  requireApiKey: vi.fn(() => "orth_test_key"),
  getApiKey: vi.fn(() => "orth_test_key"),
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  }),
}));

vi.mock("chalk", () => {
  const identity = (s: string) => s;
  const createChalk = (): any =>
    new Proxy(identity, {
      get(_target, prop) {
        if (prop === "__esModule") return false;
        if (prop === "default") return createChalk();
        return createChalk();
      },
      apply(_target, _this, args) {
        return String(args[0] ?? "");
      },
    });
  return { default: createChalk() };
});

import { apiRequest } from "../api.js";
import {
  skillsListCommand,
  skillsSearchCommand,
  skillsShowCommand,
  skillsCreateCommand,
  skillsInstallCommand,
  skillsInitCommand,
  skillsSubmitCommand,
  skillsRequestVerificationCommand,
  skillsPublishCommand,
  skillsRequestCommand,
} from "../commands/skills.js";

const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills list
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsListCommand", () => {
  it("should list skills from API", async () => {
    mockApiRequest.mockResolvedValue({
      skills: [
        {
          name: "Test Skill",
          slug: "owner/test-skill",
          description: "A test skill",
          installCount: 10,
          verified: true,
          tags: ["test"],
        },
      ],
      total: 1,
    });

    await skillsListCommand({ limit: "20" });

    expect(mockApiRequest).toHaveBeenCalledWith("/skills?limit=20");
    expect(console.log).toHaveBeenCalled();
  });

  it("should handle empty results", async () => {
    mockApiRequest.mockResolvedValue({ skills: [], total: 0 });

    await skillsListCommand({ limit: "10" });

    expect(mockApiRequest).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

  it("should handle API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Network error"));

    await skillsListCommand({ limit: "10" });

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills search
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsSearchCommand", () => {
  it("should search skills with query", async () => {
    mockApiRequest.mockResolvedValue({
      results: [
        {
          name: "React Skill",
          slug: "owner/react-skill",
          description: "React patterns",
          installCount: 5,
          verified: true,
        },
      ],
      count: 1,
    });

    await skillsSearchCommand("react", { limit: "10" });

    expect(mockApiRequest).toHaveBeenCalledWith("/skills/search", {
      method: "POST",
      body: { query: "react", limit: 10 },
    });
  });

  it("should handle no results", async () => {
    mockApiRequest.mockResolvedValue({ results: [], count: 0 });

    await skillsSearchCommand("nonexistent", { limit: "10" });

    expect(console.log).toHaveBeenCalled();
  });

  it("should handle API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Search failed"));

    await skillsSearchCommand("test", { limit: "10" });

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills show
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsShowCommand", () => {
  it("should show skill details", async () => {
    mockApiRequest.mockResolvedValue({
      skill: {
        name: "My Skill",
        slug: "owner/my-skill",
        description: "A cool skill",
        verified: true,
        discoverable: true,
        sourceType: "github",
        githubOwner: "owner",
        githubRepo: "my-skill",
        installCount: 42,
        tags: ["test"],
        files: [
          { filePath: "SKILL.md", content: "# My Skill\nDoes stuff", isPrimary: true },
        ],
      },
    });

    await skillsShowCommand("owner/my-skill");

    expect(mockApiRequest).toHaveBeenCalledWith("/skills/owner/my-skill");
    expect(console.log).toHaveBeenCalled();
  });

  it("should handle skill not found", async () => {
    mockApiRequest.mockRejectedValue(new Error("Not found"));

    await skillsShowCommand("nonexistent/skill");

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills create
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsCreateCommand", () => {
  it("should create skill from GitHub URL", async () => {
    mockApiRequest.mockResolvedValue({
      message: "Skill created",
      skill: {
        name: "Test",
        slug: "owner/test",
        description: "Test skill",
      },
    });

    await skillsCreateCommand("https://github.com/owner/repo", {
      ref: "main",
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/skills", {
      method: "POST",
      body: expect.objectContaining({
        githubOwner: "owner",
        githubRepo: "repo",
        sourceType: "github",
      }),
    });
  });

  it("should create skill from owner/repo format", async () => {
    mockApiRequest.mockResolvedValue({
      message: "Skill created",
      skill: { name: "Test", slug: "owner/test" },
    });

    await skillsCreateCommand("owner/repo", { ref: "main" });

    expect(mockApiRequest).toHaveBeenCalledWith("/skills", {
      method: "POST",
      body: expect.objectContaining({
        githubOwner: "owner",
        githubRepo: "repo",
      }),
    });
  });

  it("should handle invalid GitHub URL", async () => {
    await skillsCreateCommand("not-a-valid-url", { ref: "main" });

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should handle API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Create failed"));

    await skillsCreateCommand("owner/repo", { ref: "main" });

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills install (add)
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsInstallCommand", () => {
  it("should fetch skill from API", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        skill: {
          name: "Test",
          slug: "owner/test",
          files: [{ filePath: "SKILL.md", content: "# Test", isPrimary: true }],
        },
      })
      .mockResolvedValueOnce({}); // install tracking

    // The command will try to write to home dirs, but we just verify the API call
    await skillsInstallCommand("owner/test", {}).catch(() => {});

    expect(mockApiRequest).toHaveBeenCalledWith("/skills/owner/test");
  });

  it("should handle skill not found", async () => {
    mockApiRequest.mockRejectedValue(new Error("Not found"));

    await skillsInstallCommand("nonexistent/skill", {});

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills init
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsInitCommand", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "orth-init-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should scaffold a skill directory with SKILL.md", async () => {
    const skillPath = path.join(tmpDir, "my-skill");

    await skillsInitCommand("my-skill", { path: skillPath });

    expect(fs.existsSync(path.join(skillPath, "SKILL.md"))).toBe(true);
    const content = fs.readFileSync(path.join(skillPath, "SKILL.md"), "utf-8");
    expect(content).toContain("name: my-skill");
    expect(content).toContain("description: TODO");
  });

  it("should create subdirectories unless --bare", async () => {
    const skillPath = path.join(tmpDir, "full-skill");

    await skillsInitCommand("full-skill", { path: skillPath });

    expect(fs.existsSync(path.join(skillPath, "scripts"))).toBe(true);
    expect(fs.existsSync(path.join(skillPath, "references"))).toBe(true);
    expect(fs.existsSync(path.join(skillPath, "assets"))).toBe(true);
  });

  it("should skip subdirectories with --bare", async () => {
    const skillPath = path.join(tmpDir, "bare-skill");

    await skillsInitCommand("bare-skill", { bare: true, path: skillPath });

    expect(fs.existsSync(path.join(skillPath, "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(skillPath, "scripts"))).toBe(false);
  });

  it("should error if SKILL.md already exists", async () => {
    const skillPath = path.join(tmpDir, "existing-skill");
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), "existing");

    await skillsInitCommand("existing-skill", { path: skillPath });

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills submit
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsSubmitCommand", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "orth-submit-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should submit a skill with valid SKILL.md", async () => {
    const skillMd = `---
name: test-skill
description: A test skill for testing
---
# Test Skill
Does things.`;
    fs.writeFileSync(path.join(tmpDir, "SKILL.md"), skillMd);

    mockApiRequest.mockResolvedValue({
      message: "Skill created",
      skill: { name: "test-skill", slug: "owner/test-skill" },
    });

    await skillsSubmitCommand(tmpDir, {});

    expect(mockApiRequest).toHaveBeenCalledWith("/skills", {
      method: "POST",
      body: expect.objectContaining({
        name: "test-skill",
        sourceType: "upload",
        files: expect.arrayContaining([
          expect.objectContaining({
            filePath: "SKILL.md",
            isPrimary: true,
          }),
        ]),
      }),
    });
  });

  it("should error if no SKILL.md found", async () => {
    // Empty directory - no SKILL.md
    await skillsSubmitCommand(tmpDir, {});

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should error if SKILL.md has no name in frontmatter", async () => {
    fs.writeFileSync(path.join(tmpDir, "SKILL.md"), "# No frontmatter");

    await skillsSubmitCommand(tmpDir, {});

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should allow name override via --name option", async () => {
    const skillMd = `---
name: original
description: test
---
# Skill`;
    fs.writeFileSync(path.join(tmpDir, "SKILL.md"), skillMd);

    mockApiRequest.mockResolvedValue({
      message: "Skill created",
      skill: { name: "overridden", slug: "owner/overridden" },
    });

    await skillsSubmitCommand(tmpDir, { name: "overridden" });

    expect(mockApiRequest).toHaveBeenCalledWith("/skills", {
      method: "POST",
      body: expect.objectContaining({ name: "overridden" }),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills request-verification
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsRequestVerificationCommand", () => {
  it("should request verification for a skill", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        skill: { id: "skill-1", slug: "owner/my-skill" },
      })
      .mockResolvedValueOnce({
        message: "Verification request submitted",
      });

    await skillsRequestVerificationCommand("owner/my-skill");

    expect(mockApiRequest).toHaveBeenCalledWith("/skills/owner/my-skill");
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/skills/owner/my-skill/request-verification",
      { method: "POST" },
    );
  });

  it("should error if skill not found", async () => {
    mockApiRequest.mockResolvedValueOnce({ skill: null });

    await skillsRequestVerificationCommand("nonexistent/skill");

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should handle API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Already verified"));

    await skillsRequestVerificationCommand("owner/skill");

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills publish (deprecated)
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsPublishCommand", () => {
  it("should show deprecation message and redirect to request-verification", async () => {
    await skillsPublishCommand("owner/my-skill", {});

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .flat()
      .join(" ");
    expect(output).toContain("verification");
    expect(output).toContain("request-verification");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// orth skills request
// ─────────────────────────────────────────────────────────────────────────────
describe("skillsRequestCommand", () => {
  it("should submit GitHub-based skill request", async () => {
    mockApiRequest.mockResolvedValue({});

    await skillsRequestCommand("https://github.com/owner/cool-skill");

    expect(mockApiRequest).toHaveBeenCalledWith("/requests/skill", {
      method: "POST",
      body: { githubRepo: "https://github.com/owner/cool-skill" },
    });
  });

  it("should submit owner/repo as GitHub request", async () => {
    mockApiRequest.mockResolvedValue({});

    await skillsRequestCommand("owner/cool-skill");

    expect(mockApiRequest).toHaveBeenCalledWith("/requests/skill", {
      method: "POST",
      body: { githubRepo: "owner/cool-skill" },
    });
  });

  it("should submit description-based skill request", async () => {
    mockApiRequest.mockResolvedValue({});

    await skillsRequestCommand("A skill that helps with React testing");

    expect(mockApiRequest).toHaveBeenCalledWith("/requests/skill", {
      method: "POST",
      body: { description: "A skill that helps with React testing" },
    });
  });

  it("should handle API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Request failed"));

    await skillsRequestCommand("some request");

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

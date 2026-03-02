import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api.js", () => ({
  search: vi.fn(),
  getDetails: vi.fn(),
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
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get: () => new Proxy(passthrough, handler),
    apply: (_target: any, _thisArg: any, args: any[]) => args[0],
  };
  return { default: new Proxy(passthrough, handler) };
});

import { search, getDetails } from "../api.js";
import { apiCommand } from "../commands/api.js";

const mockGetDetails = getDetails as ReturnType<typeof vi.fn>;
const mockSearch = search as ReturnType<typeof vi.fn>;

let logOutput: string[];

beforeEach(() => {
  vi.clearAllMocks();
  logOutput = [];
  vi.spyOn(console, "log").mockImplementation((...args: any[]) => {
    logOutput.push(args.join(" "));
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiCommand — endpoint details", () => {
  it("should display description from endpoint object", async () => {
    mockGetDetails.mockResolvedValue({
      endpoint: {
        path: "/v1/scrapes",
        method: "POST",
        description: "Scrape a website",
        price: 0.05,
        bodyParams: [
          { name: "url", type: "string", required: true, description: "URL to scrape" },
        ],
      },
    });

    await apiCommand("olostep", "/v1/scrapes");

    const output = logOutput.join("\n");
    expect(output).toContain("Scrape a website");
    expect(output).toContain("url");
    expect(output).toContain("URL to scrape");
  });

  it("should display query and body params for regular endpoints", async () => {
    mockGetDetails.mockResolvedValue({
      description: "Test endpoint",
      parameters: {
        query: [
          { name: "q", type: "string", required: true, description: "Search query" },
        ],
        body: [
          { name: "limit", type: "number", required: false, description: "Max results" },
        ],
      },
    });

    await apiCommand("testapi", "/search");

    const output = logOutput.join("\n");
    expect(output).toContain("Query Parameters:");
    expect(output).toContain("q");
    expect(output).toContain("Body Parameters:");
    expect(output).toContain("limit");
  });
});

describe("apiCommand — integration action parameters", () => {
  it("should display description from action object", async () => {
    mockGetDetails.mockResolvedValue({
      success: true,
      type: "integration",
      integration: { name: "Gmail", slug: "gmail" },
      action: {
        description: "Send an email from your Gmail account",
        parameters: [
          { name: "recipient_email", type: "string", required: true, description: "Primary recipient" },
          { name: "subject", type: "string", required: false, description: "Subject line" },
          { name: "body", type: "string", required: true, description: "Email content" },
        ],
      },
    });

    await apiCommand("gmail", "/send-email");

    const output = logOutput.join("\n");
    expect(output).toContain("Send an email from your Gmail account");
  });

  it("should display action parameters as body parameters", async () => {
    mockGetDetails.mockResolvedValue({
      success: true,
      type: "integration",
      action: {
        description: "Send an email",
        parameters: [
          { name: "recipient_email", type: "string", required: true, description: "Primary recipient" },
          { name: "subject", type: "string", required: false, description: "Subject line" },
          { name: "body", type: "string", required: true, description: "Email content" },
        ],
      },
    });

    await apiCommand("gmail", "/send-email");

    const output = logOutput.join("\n");
    expect(output).toContain("Body Parameters:");
    expect(output).toContain("recipient_email");
    expect(output).toContain("subject");
    expect(output).toContain("body");
    expect(output).toContain("Primary recipient");
  });

  it("should show required markers for required action parameters", async () => {
    mockGetDetails.mockResolvedValue({
      action: {
        description: "Update sheet values",
        parameters: [
          { name: "spreadsheet_id", type: "string", required: true, description: "Sheet ID" },
          { name: "first_cell_location", type: "string", required: false, description: "Starting cell" },
        ],
      },
    });

    await apiCommand("google-sheets", "/update-values");

    const output = logOutput.join("\n");
    expect(output).toContain("spreadsheet_id");
    expect(output).toContain("first_cell_location");
  });

  it("should generate example using action parameters", async () => {
    mockGetDetails.mockResolvedValue({
      action: {
        description: "Update values",
        parameters: [
          { name: "spreadsheet_id", type: "string", required: true, description: "Sheet ID" },
          { name: "values", type: "array", required: true, description: "Cell values" },
        ],
      },
    });

    await apiCommand("google-sheets", "/update-values");

    const output = logOutput.join("\n");
    expect(output).toContain("orth run google-sheets /update-values --body");
    expect(output).toContain("spreadsheet_id");
  });

  it("should prefer endpoint bodyParams over action parameters", async () => {
    mockGetDetails.mockResolvedValue({
      endpoint: {
        bodyParams: [
          { name: "from_endpoint", type: "string", required: true, description: "From endpoint" },
        ],
      },
      action: {
        parameters: [
          { name: "from_action", type: "string", required: true, description: "From action" },
        ],
      },
    });

    await apiCommand("test", "/path");

    const output = logOutput.join("\n");
    expect(output).toContain("from_endpoint");
    expect(output).not.toContain("from_action");
  });

  it("should show 'No description' when no description available", async () => {
    mockGetDetails.mockResolvedValue({});

    await apiCommand("test", "/path");

    const output = logOutput.join("\n");
    expect(output).toContain("No description");
  });
});

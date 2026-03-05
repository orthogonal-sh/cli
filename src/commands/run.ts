import chalk from "chalk";
import ora from "ora";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { run, RunResponse } from "../api.js";

// Map content-type to file extension
const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/octet-stream": "bin",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/mp4": "mp4",
};

const VALID_ENCODINGS = new Set(["base64", "base64url", "hex", "utf8", "utf-8", "ascii", "latin1", "binary"]);

function writeExclusive(filePath: string, data: Buffer | string): void {
  try {
    writeFileSync(filePath, data, { flag: "wx" });
  } catch (err: any) {
    if (err?.code === "EEXIST") {
      console.error(chalk.red(`\nError: File already exists: ${filePath}`));
      console.error(chalk.gray("Remove it first or choose a different path."));
      process.exit(1);
    }
    throw err;
  }
}

function extFromContentType(contentType: string): string {
  // Try exact match first, then prefix match
  if (CONTENT_TYPE_EXT[contentType]) return CONTENT_TYPE_EXT[contentType];
  // Strip parameters (e.g., "image/jpeg; charset=utf-8")
  const base = contentType.split(";")[0].trim();
  if (CONTENT_TYPE_EXT[base]) return CONTENT_TYPE_EXT[base];
  // Fallback: use subtype
  const parts = base.split("/");
  return parts[1] || "bin";
}

interface BinaryEnvelope {
  _binary: true;
  encoding: string;
  contentType: string;
  data: string;
  size: number;
}

function isBinaryEnvelope(data: unknown): data is BinaryEnvelope {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as any)._binary === true &&
    typeof (data as any).data === "string" &&
    typeof (data as any).encoding === "string" &&
    typeof (data as any).contentType === "string" &&
    typeof (data as any).size === "number"
  );
}

export async function runCommand(
  api: string,
  path: string,
  options: {
    method: string;
    query?: string[];
    body?: string;
    data?: string;
    raw?: boolean;
    output?: string;
  }
) {
  const spinner = ora(`Calling ${api}${path}...`).start();

  try {
    // Parse query params
    // Supports both `-q key=value -q key2=value2` and `-q 'key=value&key2=value2'`
    const query: Record<string, string> = {};
    if (options.query) {
      for (const param of options.query) {
        // Split on & to handle URL-style query strings
        const parts = param.split("&");
        for (const part of parts) {
          const eqIndex = part.indexOf("=");
          if (eqIndex > 0) {
            const key = part.slice(0, eqIndex);
            const value = part.slice(eqIndex + 1);
            query[key] = decodeURIComponent(value);
          }
        }
      }
    }

    // Parse body
    let body: unknown = undefined;
    const bodyJson = options.body || options.data;
    if (bodyJson) {
      try {
        body = JSON.parse(bodyJson);
      } catch {
        spinner.stop();
        console.error(chalk.red("Error: Invalid JSON in --body"));
        process.exit(1);
      }
    }

    // Check for stdin input
    if (!process.stdin.isTTY && !body) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const input = Buffer.concat(chunks).toString().trim();
      if (input) {
        try {
          body = JSON.parse(input);
        } catch {
          spinner.stop();
          console.error(chalk.red("Error: Invalid JSON from stdin"));
          process.exit(1);
        }
      }
    }

    const result: RunResponse = await run(api, path, {
      method: options.method,
      query: Object.keys(query).length > 0 ? query : undefined,
      body,
    });

    spinner.stop();

    // Handle binary responses (base64-encoded by the server)
    if (isBinaryEnvelope(result.data)) {
      if (!options.output) {
        const ext = extFromContentType(result.data.contentType);
        const methodHint = options.method !== "GET" ? ` -X ${options.method}` : "";
        const bodyHint = options.body || options.data ? " --body '...'" : "";
        const queryHint = options.query?.length ? " -q '...'" : "";
        console.log(chalk.yellow(
          `\nResponse contains binary ${ext.toUpperCase()} data (${result.data.size} bytes).` +
          `\nUse -o to save it: orth api run ${api} ${path}${methodHint}${queryHint}${bodyHint} -o output.${ext}`
        ));
        return;
      }

      const ext = extFromContentType(result.data.contentType);
      const outputPath = resolve(options.output);

      if (!VALID_ENCODINGS.has(result.data.encoding)) {
        console.error(chalk.red(`\nError: Server returned unsupported encoding "${result.data.encoding}".`));
        process.exit(1);
      }

      const buffer = Buffer.from(result.data.data, result.data.encoding as BufferEncoding);
      writeExclusive(outputPath, buffer);
      console.log(chalk.green(`\n${ext.toUpperCase()} saved to: ${outputPath} (${buffer.length} bytes)`));
      return;
    }

    // If --output specified for non-binary data, save JSON to file
    if (options.output) {
      const outputPath = resolve(options.output);
      writeExclusive(outputPath, JSON.stringify(result.data, null, 2));
      console.log(chalk.green(`\nResponse saved to: ${outputPath}`));
      return;
    }

    if (options.raw) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      // Pretty print the response
      console.log(chalk.bold("\nResponse:\n"));
      console.log(JSON.stringify(result.data, null, 2));
    }

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

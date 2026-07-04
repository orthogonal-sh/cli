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

/**
 * Render the API's self-correction diagnostics attached to a failed run.
 * Pulls the `_orthogonal` hint (expected schema + field diagnostics) plus the
 * top-level `missing` / `out_of_range` arrays from the error response body.
 * The upstream-4xx path returns the schema ONLY inside `_orthogonal`, and the
 * pre-validation path returns `out_of_range` at the top level — so without this
 * the concrete violation is invisible in the human output.
 */
function printFailureHint(body: any): void {
  if (!body || typeof body !== "object") return;
  const hint = body._orthogonal;
  const hasHint = hint && typeof hint === "object";
  const outOfRange = Array.isArray(body.out_of_range) ? body.out_of_range : [];
  const missing = Array.isArray(body.missing) ? body.missing : [];
  if (!hasHint && outOfRange.length === 0 && missing.length === 0) return;

  console.error(chalk.yellow("\nHint:"));
  if (hasHint && hint.message) console.error(chalk.gray(`  ${hint.message}`));

  if (missing.length > 0) {
    console.error(
      chalk.gray("  Missing required params: ") + chalk.white(missing.join(", "))
    );
  }
  if (outOfRange.length > 0) {
    const parts = outOfRange.map((p: any) => {
      const bounds = [
        typeof p.min === "number" ? `>= ${p.min}` : null,
        typeof p.max === "number" ? `<= ${p.max}` : null,
      ]
        .filter(Boolean)
        .join(" and ");
      return bounds ? `${p.name}=${p.value} (must be ${bounds})` : `${p.name}=${p.value}`;
    });
    console.error(chalk.gray("  Out of range: ") + chalk.white(parts.join(", ")));
  }

  if (!hasHint) return;
  const diagnostics: [string, unknown][] = [
    ["Missing required query params", hint.missing_required_query],
    ["Unexpected query fields", hint.unexpected_query_fields],
    ["Missing required body params", hint.missing_required_body],
    ["Unexpected body fields", hint.unexpected_body_fields],
  ];
  for (const [label, value] of diagnostics) {
    if (Array.isArray(value) && value.length > 0) {
      console.error(
        chalk.gray(`  ${label}: `) + chalk.white((value as string[]).join(", "))
      );
    }
  }

  const summarize = (schema: any, kind: string): void => {
    if (!schema?.properties) return;
    const required = new Set<string>(schema.required || []);
    const names = Object.keys(schema.properties).map((name) => {
      const prop = schema.properties[name] || {};
      const bits = [name];
      if (required.has(name)) bits.push("(required)");
      const range = [
        typeof prop.minimum === "number" ? `min ${prop.minimum}` : null,
        typeof prop.maximum === "number" ? `max ${prop.maximum}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      if (range) bits.push(`[${range}]`);
      return bits.join(" ");
    });
    if (names.length > 0) {
      console.error(chalk.gray(`  Expected ${kind}: `) + chalk.white(names.join(", ")));
    }
  };
  summarize(hint.expected_schema?.queryParams, "query params");
  summarize(hint.expected_schema?.body, "body params");
}

function formatCost(result: RunResponse): string | null {
  if (result.price) return result.price;
  if (result.priceCents != null && result.priceCents > 0) {
    return `$${parseFloat((result.priceCents / 100).toFixed(4))}`;
  }
  return null;
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
    dryRun?: boolean;
  }
) {
  // In --raw mode keep the streams clean for piping: don't animate the spinner
  // on stderr, so a failed call's stderr is a single parseable JSON document.
  const spinner = ora(`Calling ${api}${path}...`);
  if (!options.raw) spinner.start();

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
      dryRun: options.dryRun,
    });

    spinner.stop();

    // Handle dry-run response
    if (result.dryRun) {
      const estimatedCost = result.estimatedPrice ||
        (result.estimatedPriceCents != null
          ? `$${parseFloat((result.estimatedPriceCents / 100).toFixed(4))}`
          : null) ||
        result.price ||
        "unknown";
      console.log(chalk.bold("\nEstimated cost: ") + chalk.yellow(estimatedCost));
      console.log(chalk.gray("(Use without --dry-run to execute)"));
      return;
    }

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
        const cost0 = formatCost(result);
        if (cost0) console.log(chalk.dim(`\nCost: ${cost0}`));
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
      const cost1 = formatCost(result);
      if (cost1) console.log(chalk.dim(`\nCost: ${cost1}`));
      return;
    }

    // If --output specified for non-binary data, save JSON to file
    if (options.output) {
      const outputPath = resolve(options.output);
      writeExclusive(outputPath, JSON.stringify(result.data, null, 2));
      console.log(chalk.green(`\nResponse saved to: ${outputPath}`));
      const cost2 = formatCost(result);
      if (cost2) console.log(chalk.dim(`\nCost: ${cost2}`));
      return;
    }

    if (options.raw) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      // Pretty print the response
      console.log(chalk.bold("\nResponse:\n"));
      console.log(JSON.stringify(result.data, null, 2));
    }

    // Show price if returned
    const cost3 = formatCost(result);
    if (cost3) {
      console.log(chalk.dim(`\nCost: ${cost3}`));
    }

  } catch (error) {
    spinner.stop();
    const err = error as {
      message?: string;
      status?: number;
      responseBody?: unknown;
    };
    const message = error instanceof Error ? error.message : "Unknown error";
    if (options.raw) {
      // In --raw mode, stderr must always be a single parseable JSON document
      // so agents can JSON.parse it. Prefer the server's parsed body; otherwise
      // (e.g. a non-JSON HTML 502) emit a synthesized error envelope.
      const envelope = err?.responseBody ?? {
        success: false,
        error: message,
        ...(typeof err?.status === "number" ? { status: err.status } : {}),
      };
      console.error(JSON.stringify(envelope, null, 2));
    } else {
      console.error(chalk.red(`Error: ${message}`));
      if (err?.responseBody) printFailureHint(err.responseBody);
    }
    process.exit(1);
  }
}

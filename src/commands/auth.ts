import chalk from "chalk";
import { exec } from "child_process";
import crypto from "crypto";
import http from "http";
import { getApiKey, setApiKey, clearApiKey } from "../config.js";
import { getMe } from "../api.js";

const WEB_BASE = process.env.ORTH_WEB_URL || "https://orthogonal.sh";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openBrowser(url: string) {
  // Use execFile-style args to avoid shell injection
  const { execFile } = require("child_process");
  const platform = process.platform;
  if (platform === "darwin") execFile("open", [url]);
  else if (platform === "win32") execFile("cmd", ["/c", "start", "", url]);
  else execFile("xdg-open", [url]);
}

async function browserLogin(): Promise<void> {
  // Generate a random state token to prevent CSRF
  const state = crypto.randomBytes(32).toString("hex");

  return new Promise((resolve, reject) => {
    let timeoutHandle: ReturnType<typeof setTimeout>;

    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://localhost`);

      if (url.pathname === "/callback") {
        const key = url.searchParams.get("key");
        const error = url.searchParams.get("error");
        const returnedState = url.searchParams.get("state");

        // Verify state token
        if (returnedState !== state) {
          clearTimeout(timeoutHandle);
          res.writeHead(403, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f0f0;">
                <div style="text-align: center; background: white; padding: 48px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <h1 style="font-size: 24px; margin: 0 0 8px; color: #e11d48;">Invalid Request</h1>
                  <p style="color: #666; margin: 0;">State token mismatch. Please try again.</p>
                </div>
              </body>
            </html>
          `);
          console.log(chalk.red("\n✗ Login failed: state token mismatch"));
          server.close();
          reject(new Error("State token mismatch"));
          return;
        }

        if (key) {
          clearTimeout(timeoutHandle);
          // Send a nice HTML response
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f0f0;">
                <div style="text-align: center; background: white; padding: 48px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <h1 style="font-size: 24px; margin: 0 0 8px;">Authenticated</h1>
                  <p style="color: #666; margin: 0;">You can close this tab and return to your terminal.</p>
                </div>
              </body>
            </html>
          `);

          if (!key.startsWith("orth_")) {
            console.log(chalk.red("\n✗ Invalid API key format received"));
            server.close();
            clearTimeout(timeoutHandle);
            reject(new Error("Invalid key format"));
            return;
          }

          setApiKey(key);
          console.log(chalk.green("\n✓ Logged in successfully!"));
          console.log(chalk.gray(`  Key: ${key.slice(0, 15)}...${key.slice(-4)}`));

          server.close();
          resolve();
        } else {
          clearTimeout(timeoutHandle);
          const safeError = escapeHtml(error || "Unknown error");
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f0f0;">
                <div style="text-align: center; background: white; padding: 48px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <h1 style="font-size: 24px; margin: 0 0 8px; color: #e11d48;">Authentication Failed</h1>
                  <p style="color: #666; margin: 0;">${safeError}</p>
                </div>
              </body>
            </html>
          `);

          console.log(chalk.red(`\n✗ Login failed: ${error || "Unknown error"}`));
          server.close();
          reject(new Error(error || "Login failed"));
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start local server"));
        return;
      }

      const port = address.port;
      const callbackUrl = `http://127.0.0.1:${port}/callback`;
      const authUrl = `${WEB_BASE}/cli-auth?callback=${encodeURIComponent(callbackUrl)}&state=${state}`;

      console.log(chalk.gray("Opening browser to authenticate..."));
      console.log(chalk.gray(`If it doesn't open, visit: ${authUrl}\n`));

      openBrowser(authUrl);

      // Timeout after 5 minutes
      timeoutHandle = setTimeout(() => {
        console.log(chalk.red("\n✗ Login timed out. Try again."));
        server.close();
        reject(new Error("Timed out"));
      }, 5 * 60 * 1000);
    });

    server.on("error", (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
  });
}

export async function loginCommand(options: { key?: string }) {
  const key = options.key || process.env.ORTHOGONAL_API_KEY;

  if (key) {
    // Direct key login (existing flow)
    if (!key.startsWith("orth_")) {
      console.error(chalk.red("Invalid API key format. Keys should start with 'orth_'"));
      process.exit(1);
    }

    setApiKey(key);
    console.log(chalk.green("✓ Logged in successfully!"));
    console.log(chalk.gray(`  Key: ${key.slice(0, 15)}...${key.slice(-4)}`));
    return;
  }

  // Browser-based login
  try {
    await browserLogin();
  } catch {
    process.exit(1);
  }
}

export async function logoutCommand() {
  clearApiKey();
  console.log(chalk.green("✓ Logged out. API key removed."));
}

export async function whoamiCommand() {
  const key = getApiKey();

  if (!key) {
    console.log(chalk.yellow("Not authenticated"));
    console.log(chalk.gray("Run 'orth login' to authenticate"));
    return;
  }

  console.log(chalk.green("✓ Authenticated"));

  // Resolve the account behind the key. A 404 means the API predates the
  // /me endpoint — fall back silently to the key-only output. Any other
  // failure (auth, network, 5xx) is surfaced so it isn't hidden.
  try {
    const me = await getMe();

    if (me.type === "organization") {
      const label = me.apiKeyName ? `organization (${me.apiKeyName})` : "organization";
      console.log(chalk.gray(`  Account: ${label}`));
      if (me.organizationId) {
        console.log(chalk.gray(`  Org ID: ${me.organizationId}`));
      }
    } else {
      if (me.name) console.log(chalk.gray(`  Name: ${me.name}`));
      if (me.email) console.log(chalk.gray(`  Email: ${me.email}`));
    }
  } catch (error) {
    // A 404 means the API predates /me — fall back silently to key-only
    // output. Surface anything else (auth, network, 5xx) so it isn't hidden.
    const status = (error as { status?: number }).status;
    if (status !== 404) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.yellow(`  Could not load account details: ${message}`));
    }
  }

  console.log(chalk.gray(`  Key: ${key.slice(0, 15)}...${key.slice(-4)}`));
  console.log(chalk.gray(`  Source: ${process.env.ORTHOGONAL_API_KEY ? "environment" : "config file"}`));
}

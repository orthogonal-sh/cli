import chalk from "chalk";
import ora from "ora";
import { apiRequest } from "../api.js";

interface Task {
  id: string;
  name: string;
  skill_slug: string;
  skill_input: Record<string, unknown>;
  cron_expression: string;
  timezone: string;
  status: string;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
}

interface TaskRun {
  id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  output: string | null;
  error: string | null;
  credits_used: number;
}

// Common cron presets
const CRON_PRESETS: Record<string, string> = {
  "every-5-min": "*/5 * * * *",
  "every-hour": "0 * * * *",
  "every-day-9am": "0 9 * * *",
  "every-weekday-9am": "0 9 * * 1-5",
  "every-monday": "0 9 * * 1",
  "every-month": "0 9 1 * *",
};

function cronToHuman(expr: string): string {
  const presetName = Object.entries(CRON_PRESETS).find(([, v]) => v === expr)?.[0];
  if (presetName) {
    return presetName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return expr;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadge(status: string): string {
  switch (status) {
    case "active": return chalk.green("● active");
    case "paused": return chalk.yellow("● paused");
    case "succeeded": return chalk.green("✓ succeeded");
    case "failed": return chalk.red("✗ failed");
    case "running": return chalk.blue("◌ running");
    case "pending": return chalk.gray("○ pending");
    default: return chalk.gray(status);
  }
}

export async function tasksListCommand() {
  const spinner = ora("Fetching tasks...").start();
  try {
    const data = await apiRequest<{ tasks: Task[] }>("/tasks");
    spinner.stop();

    if (!data.tasks || data.tasks.length === 0) {
      console.log(chalk.gray("\n  No tasks yet. Create one with: orth tasks create\n"));
      return;
    }

    console.log(chalk.bold("\nTasks\n"));
    for (const task of data.tasks) {
      console.log(`  ${chalk.white.bold(task.name)}  ${statusBadge(task.status)}  ${chalk.gray(cronToHuman(task.cron_expression))}`);
      console.log(`    Skill: ${chalk.cyan(task.skill_slug)}  Runs: ${task.run_count}${task.last_run_at ? `  Last: ${formatTimeAgo(task.last_run_at)}` : ""}`);
      console.log(`    ID: ${chalk.gray(task.id)}`);
      console.log();
    }
  } catch (err: any) {
    spinner.fail("Failed to fetch tasks");
    console.error(chalk.red(err.message));
  }
}

export async function tasksCreateCommand(options: {
  skill: string;
  name?: string;
  schedule?: string;
  input?: string[];
}) {
  const { skill, name, schedule } = options;

  if (!skill) {
    console.error(chalk.red("Skill slug is required. Usage: orth tasks create --skill <slug>"));
    process.exit(1);
  }

  // Parse schedule
  let cronExpression = schedule || "0 9 * * *"; // default: daily at 9am
  if (CRON_PRESETS[cronExpression]) {
    cronExpression = CRON_PRESETS[cronExpression];
  }

  // Parse input key=value pairs
  const skillInput: Record<string, string> = {};
  if (options.input) {
    for (const pair of options.input) {
      const [key, ...rest] = pair.split("=");
      if (key && rest.length > 0) {
        skillInput[key] = rest.join("=");
      }
    }
  }

  const taskName = name || `${skill} (${cronToHuman(cronExpression)})`;

  const spinner = ora("Creating task...").start();
  try {
    const data = await apiRequest<{ task: Task }>("/tasks", {
      method: "POST",
      body: {
        name: taskName,
        skillSlug: skill,
        skillInput,
        cronExpression,
      },
    });
    spinner.succeed("Task created!");
    console.log(`\n  ${chalk.white.bold(data.task.name)}`);
    console.log(`  Skill: ${chalk.cyan(data.task.skill_slug)}`);
    console.log(`  Schedule: ${chalk.gray(cronToHuman(data.task.cron_expression))}`);
    console.log(`  Status: ${statusBadge(data.task.status)}`);
    console.log(`  ID: ${chalk.gray(data.task.id)}\n`);
  } catch (err: any) {
    spinner.fail("Failed to create task");
    console.error(chalk.red(err.message));
  }
}

export async function tasksShowCommand(taskId: string) {
  const spinner = ora("Fetching task...").start();
  try {
    const data = await apiRequest<{ task: Task }>(`/tasks/${taskId}`);
    spinner.stop();

    const t = data.task;
    console.log(`\n  ${chalk.white.bold(t.name)}`);
    console.log(`  Status: ${statusBadge(t.status)}`);
    console.log(`  Skill: ${chalk.cyan(t.skill_slug)}`);
    console.log(`  Schedule: ${chalk.gray(cronToHuman(t.cron_expression))} (${t.timezone})`);
    console.log(`  Runs: ${t.run_count}${t.last_run_at ? `  Last: ${formatTimeAgo(t.last_run_at)}` : ""}`);
    if (Object.keys(t.skill_input || {}).length > 0) {
      console.log(`  Input: ${chalk.gray(JSON.stringify(t.skill_input))}`);
    }
    console.log(`  ID: ${chalk.gray(t.id)}`);
    console.log(`  Created: ${new Date(t.created_at).toLocaleString()}\n`);
  } catch (err: any) {
    spinner.fail("Failed to fetch task");
    console.error(chalk.red(err.message));
  }
}

export async function tasksDeleteCommand(taskId: string) {
  const spinner = ora("Deleting task...").start();
  try {
    await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
    spinner.succeed("Task deleted");
  } catch (err: any) {
    spinner.fail("Failed to delete task");
    console.error(chalk.red(err.message));
  }
}

export async function tasksPauseCommand(taskId: string) {
  const spinner = ora("Pausing task...").start();
  try {
    const data = await apiRequest<{ task: Task }>(`/tasks/${taskId}/pause`, { method: "POST" });
    spinner.succeed(`Task paused: ${data.task.name}`);
  } catch (err: any) {
    spinner.fail("Failed to pause task");
    console.error(chalk.red(err.message));
  }
}

export async function tasksResumeCommand(taskId: string) {
  const spinner = ora("Resuming task...").start();
  try {
    const data = await apiRequest<{ task: Task }>(`/tasks/${taskId}/resume`, { method: "POST" });
    spinner.succeed(`Task resumed: ${data.task.name}`);
  } catch (err: any) {
    spinner.fail("Failed to resume task");
    console.error(chalk.red(err.message));
  }
}

export async function tasksTriggerCommand(taskId: string) {
  const spinner = ora("Triggering task...").start();
  try {
    await apiRequest(`/tasks/${taskId}/trigger`, { method: "POST" });
    spinner.succeed("Task triggered — check logs for progress");
  } catch (err: any) {
    spinner.fail("Failed to trigger task");
    console.error(chalk.red(err.message));
  }
}

export async function tasksLogsCommand(taskId: string, options: { limit?: string }) {
  const limit = parseInt(options.limit || "10");
  const spinner = ora("Fetching run history...").start();
  try {
    const data = await apiRequest<{ runs: TaskRun[]; total: number }>(
      `/tasks/${taskId}/runs?limit=${limit}`
    );
    spinner.stop();

    if (!data.runs || data.runs.length === 0) {
      console.log(chalk.gray("\n  No runs yet.\n"));
      return;
    }

    console.log(chalk.bold(`\nRun History (${data.total} total)\n`));
    for (const run of data.runs) {
      const duration = run.duration_ms ? `${(run.duration_ms / 1000).toFixed(0)}s` : "—";
      const time = run.started_at ? new Date(run.started_at).toLocaleString() : "—";
      console.log(`  ${statusBadge(run.status)}  ${chalk.gray(time)}  ${chalk.gray(duration)}`);
      if (run.error) {
        console.log(`    ${chalk.red(run.error)}`);
      }
      if (run.output) {
        const preview = run.output.slice(0, 200);
        console.log(`    ${chalk.gray(preview)}${run.output.length > 200 ? "..." : ""}`);
      }
      console.log();
    }
  } catch (err: any) {
    spinner.fail("Failed to fetch run history");
    console.error(chalk.red(err.message));
  }
}

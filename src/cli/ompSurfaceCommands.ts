import { execFile } from "node:child_process";
import { z } from "incur";
import type { Logger } from "pino";

import { CLI_COMMANDS } from "../cliCommandNames.js";
import { logCliCommand } from "../cliLogging.js";
import type { CliInstance } from "./types.js";
import {
  ompAgentSurface,
  ompSurfaceAvailability,
  readOmpLiveCatalog,
  resolveOmpBinary,
} from "../application/OmpSurfaceAvailability.js";
import { OMP_PROVIDERS } from "../application/OmpProviderSurface.js";

/** Register the fork's additive OMP provider/agent surface commands. */
export const registerOmpSurfaceCommands = (
  cli: CliInstance,
  logger: Logger,
  environment: Readonly<NodeJS.ProcessEnv>,
): void => {
  cli.command(CLI_COMMANDS.listOmpProviders, {
    description:
      "List the full OMP provider surface with ambient-credential presence (names only, never values)",
    options: z.object({
      provider: z
        .string()
        .optional()
        .describe("Show one provider ID in detail"),
      live: z
        .boolean()
        .default(false)
        .describe("Also query the installed omp binary for its live catalog"),
    }),
    run: ({ options }) =>
      logCliCommand(logger, CLI_COMMANDS.listOmpProviders, async () => {
        const availability = ompSurfaceAvailability(environment);
        if (options.provider !== undefined) {
          const match = availability.find((row) => row.id === options.provider);
          if (match === undefined)
            return {
              error: `Unknown OMP provider ${JSON.stringify(options.provider)}`,
              knownProviders: availability.length,
            };
          return { provider: match };
        }
        const summary = {
          providers: availability,
          count: availability.length,
          ambientReady: availability.filter((row) => row.ambientReady).length,
        };
        if (!options.live) return summary;
        const live = await readOmpLiveCatalog(
          resolveOmpBinary(environment),
          environment,
        );
        return { ...summary, live };
      }),
  });
  cli.command(CLI_COMMANDS.listOmpAgents, {
    description: "List OMP bundled task agents and the discovery order",
    run: () =>
      logCliCommand(logger, CLI_COMMANDS.listOmpAgents, async () =>
        ompAgentSurface(),
      ),
  });
  cli.command(CLI_COMMANDS.ompModelCall, {
    description:
      "Run one bounded prompt through the installed omp binary on an explicit provider/model (ambient credentials only)",
    args: z.object({
      prompt: z.string().describe("Prompt text to send"),
    }),
    options: z.object({
      model: z
        .string()
        .describe(
          "Explicit provider/model selector, e.g. openai-codex/gpt-6-sol",
        ),
      timeout: z
        .number()
        .int()
        .positive()
        .default(120)
        .describe("Timeout in seconds"),
    }),
    run: ({ args, options }) =>
      logCliCommand(logger, CLI_COMMANDS.ompModelCall, () =>
        runOmpModelCall(
          resolveOmpBinary(environment),
          options.model,
          args.prompt,
          options.timeout * 1000,
          environment,
        ),
      ),
  });
};

const runOmpModelCall = async (
  binary: string,
  model: string,
  prompt: string,
  timeoutMs: number,
  environment: Readonly<NodeJS.ProcessEnv>,
): Promise<unknown> => {
  const providerId = model.split("/", 1)[0] ?? "";
  if (!isKnownOmpProviderId(providerId))
    return {
      error: `Unknown OMP provider ${JSON.stringify(providerId)}; list providers with rea list-omp-providers`,
    };
  const completed = await execOmpPrint(
    binary,
    model,
    prompt,
    timeoutMs,
    environment,
  );
  if (!completed.ok)
    return {
      error: `omp model call failed: ${completed.detail}`,
      model,
    };
  const events = completed.stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
  const assistant = [...events].reverse().find(isAssistantMessageEnd);
  const final = assistant ?? events.find(isMessageEndEvent);
  return {
    model,
    eventCount: events.length,
    finalMessage:
      final !== undefined && "message" in final ? final.message : null,
    stderrTail: completed.stderr.slice(-2000),
  };
};

const isKnownOmpProviderId = (providerId: string): boolean => {
  if (providerId.length === 0) return false;
  if (providerId === "local" || providerId === "web") return true;
  return (OMP_PROVIDERS as readonly { id: string }[]).some(
    (provider) => provider.id === providerId,
  );
};

const isMessageEndEvent = (event: unknown): event is { message: unknown } =>
  typeof event === "object" &&
  event !== null &&
  "type" in event &&
  event.type === "message_end" &&
  "message" in event;

const isAssistantMessageEnd = (event: unknown): event is { message: unknown } =>
  isMessageEndEvent(event) &&
  typeof event.message === "object" &&
  event.message !== null &&
  "role" in event.message &&
  event.message.role === "assistant";

type OmpPrintCompletion =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; detail: string };

const execOmpPrint = (
  binary: string,
  model: string,
  prompt: string,
  timeoutMs: number,
  environment: Readonly<NodeJS.ProcessEnv>,
): Promise<OmpPrintCompletion> =>
  // Executor form: execFile completion arrives via callback, and the ES2023
  // lib target has no Promise.withResolvers types.
  new Promise((resolve) => {
    const child = execFile(
      binary,
      [
        "--mode",
        "json",
        "--print",
        "--no-session",
        "--no-title",
        "--no-lsp",
        "--no-pty",
        "--model",
        model,
        prompt,
      ],
      {
        env: { ...environment },
        cwd: process.cwd(),
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error !== null) {
          resolve({
            ok: false,
            detail: `${error.message}${stderr.length > 0 ? `; stderr: ${stderr.slice(-1000)}` : ""}${stdout.length > 0 ? `; stdout tail: ${stdout.slice(-1000)}` : ""}`,
          });
          return;
        }
        resolve({ ok: true, stdout, stderr });
      },
    );
    child.stdin?.end();
  });

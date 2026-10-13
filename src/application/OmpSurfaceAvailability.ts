import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
import {
  OMP_AGENT_DISCOVERY_ORDER,
  OMP_BUNDLED_AGENTS,
  OMP_PROVIDERS,
  ompProviderById,
  type OmpProviderCredential,
} from "./OmpProviderSurface.js";

/** One provider's ambient-credential presence, without any secret values. */
export interface OmpProviderAvailability {
  readonly id: string;
  readonly envPresent: readonly string[];
  readonly envMissing: readonly string[];
  /** True when OMP could select this provider via ambient env or keyless local discovery. */
  readonly ambientReady: boolean;
  readonly credentialSource: "env" | "keyless" | "login" | "missing";
  readonly notes: string;
}

const KEYLESS_LOCAL_PREFIXES = ["ollama", "lm-studio", "llama.cpp", "vllm"];

const isKeylessLocal = (provider: OmpProviderCredential): boolean =>
  provider.id === "apple" ||
  provider.id.startsWith("web:") ||
  KEYLESS_LOCAL_PREFIXES.includes(provider.id);

/** Resolve one provider row against ambient env vars; values are never read. */
export const ompProviderAvailability = (
  provider: OmpProviderCredential,
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): OmpProviderAvailability => {
  const envPresent = provider.env.filter(
    (name) => (environment[name] ?? "").length > 0,
  );
  const envMissing = provider.env.filter(
    (name) => (environment[name] ?? "").length === 0,
  );
  if (envPresent.length > 0)
    return {
      id: provider.id,
      envPresent,
      envMissing,
      ambientReady: true,
      credentialSource: "env",
      notes: provider.notes,
    };
  if (isKeylessLocal(provider))
    return {
      id: provider.id,
      envPresent,
      envMissing,
      ambientReady: true,
      credentialSource: "keyless",
      notes: provider.notes,
    };
  if (provider.loginOnly || provider.env.length === 0)
    return {
      id: provider.id,
      envPresent,
      envMissing,
      ambientReady: false,
      credentialSource: "login",
      notes: provider.notes,
    };
  return {
    id: provider.id,
    envPresent,
    envMissing,
    ambientReady: false,
    credentialSource: "missing",
    notes: provider.notes,
  };
};

/** Resolve the full catalog against ambient env vars; values are never read. */
export const ompSurfaceAvailability = (
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): readonly OmpProviderAvailability[] =>
  [...OMP_PROVIDERS]
    .sort((left, right) => compareUnicodeCodePoints(left.id, right.id))
    .map((provider) => ompProviderAvailability(provider, environment));

/** One model row from `omp models --kind all --json`, availability-filtered by OMP. */
export interface OmpLiveModel {
  readonly provider: string;
  readonly id: string;
  readonly kind: string;
}

/** Live OMP catalog counts grouped by provider/kind, observed via the omp binary. */
export interface OmpLiveCatalog {
  readonly binary: string;
  readonly version: string;
  readonly modelCount: number;
  readonly providers: ReadonlyArray<{
    readonly provider: string;
    readonly kinds: ReadonlyArray<{
      readonly kind: string;
      readonly count: number;
    }>;
  }>;
  readonly uncoveredLiveProviders: readonly string[];
}

const runOmpJson = (
  binary: string,
  args: readonly string[],
  environment: Readonly<NodeJS.ProcessEnv>,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> =>
  // Executor form: execFile completion arrives via callback, and the ES2023
  // lib target has no Promise.withResolvers types.
  new Promise((resolve, reject) => {
    const child = execFile(
      binary,
      [...args],
      {
        env: { ...environment },
        timeout: timeoutMs,
        maxBuffer: 64 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(
            new Error(
              `omp ${args.join(" ")} failed: ${error.message}${stderr.length > 0 ? `: ${stderr.slice(0, 500)}` : ""}`,
              { cause: error },
            ),
          );
          return;
        }
        resolve({ stdout, stderr });
      },
    );
    child.stdin?.end();
  });

const parseLiveModels = (stdout: string): OmpLiveModel[] => {
  const parsed = JSON.parse(stdout) as {
    models?: Array<{ provider?: unknown; id?: unknown; kind?: unknown }>;
  };
  if (!Array.isArray(parsed.models))
    throw new Error("omp models --json did not return a models array");
  return parsed.models.map((model) => ({
    provider: typeof model.provider === "string" ? model.provider : "",
    id: typeof model.id === "string" ? model.id : "",
    kind: typeof model.kind === "string" ? model.kind : "",
  }));
};

/** Query the installed omp binary for its live availability-filtered catalog. */
export const readOmpLiveCatalog = async (
  binary: string,
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
  timeoutMs = 120_000,
): Promise<OmpLiveCatalog> => {
  const [version, catalog] = await Promise.all([
    runOmpJson(binary, ["--version"], environment, 30_000),
    runOmpJson(
      binary,
      ["models", "--kind", "all", "--json"],
      environment,
      timeoutMs,
    ),
  ]);
  const models = parseLiveModels(catalog.stdout);
  const byProvider = new Map<string, Map<string, number>>();
  for (const model of models) {
    const kinds = byProvider.get(model.provider) ?? new Map<string, number>();
    kinds.set(model.kind, (kinds.get(model.kind) ?? 0) + 1);
    byProvider.set(model.provider, kinds);
  }
  const providers = [...byProvider.entries()]
    .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
    .map(([provider, kinds]) => ({
      provider,
      kinds: [...kinds.entries()]
        .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
        .map(([kind, count]) => ({ kind, count })),
    }));
  const uncoveredLiveProviders = providers
    .map(({ provider }) => provider)
    .filter(
      (provider) =>
        provider !== "local" &&
        provider !== "web" &&
        ompProviderById(provider) === undefined,
    );
  return {
    binary,
    version: version.stdout.trim(),
    modelCount: models.length,
    providers,
    uncoveredLiveProviders,
  };
};

/** Resolve the omp binary path the same way the OMP verifier does. */
export const resolveOmpBinary = (
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): string => environment.REA_VERIFY_OMP_COMMAND ?? "omp";

/** OMP agent surface: bundled agents plus the documented discovery order. */
export const ompAgentSurface = (): {
  readonly bundled: typeof OMP_BUNDLED_AGENTS;
  readonly discoveryOrder: typeof OMP_AGENT_DISCOVERY_ORDER;
  readonly projectAgentsDirectory: string;
  readonly userAgentsDirectory: string;
} => ({
  bundled: OMP_BUNDLED_AGENTS,
  discoveryOrder: OMP_AGENT_DISCOVERY_ORDER,
  projectAgentsDirectory: join(".omp", "agents"),
  userAgentsDirectory: join(homedir(), ".omp", "agent", "agents"),
});

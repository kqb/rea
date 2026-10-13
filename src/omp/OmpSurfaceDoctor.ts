import { execFile } from "node:child_process";

import type {
  DoctorProviderCheck,
  DoctorProviderInspection,
} from "../application/Doctor.js";
import { ompSurfaceAvailability } from "../application/OmpSurfaceAvailability.js";

/**
 * Inspect the ambient OMP model-provider surface for `rea doctor`. Reports
 * credential-name presence only; secret values are never read or published.
 */
export const inspectOmpSurfaceProvider = async (
  environment: Readonly<NodeJS.ProcessEnv>,
): Promise<DoctorProviderInspection> => {
  const availability = ompSurfaceAvailability(environment);
  const ambientReady = availability.filter((row) => row.ambientReady);
  const binary = environment.REA_VERIFY_OMP_COMMAND ?? "omp";
  const version = await readOmpVersion(binary, environment);
  const checks: DoctorProviderCheck[] = [
    {
      name: "omp_binary",
      ok: version !== undefined,
      code: version === undefined ? "executable_missing" : null,
      detail:
        version === undefined
          ? `omp binary ${JSON.stringify(binary)} did not report a version`
          : `omp binary ${JSON.stringify(binary)} reports ${version}`,
      remediation:
        version === undefined
          ? "Install omp 18.10.3 or set REA_VERIFY_OMP_COMMAND to its path."
          : null,
      classification: "missing_dependency",
    },
    {
      name: "ambient_credentials",
      ok: ambientReady.length > 0,
      code: ambientReady.length === 0 ? "not_configured" : null,
      detail:
        ambientReady.length === 0
          ? `No OMP provider has ambient credentials (${availability.length} providers known)`
          : `${ambientReady.length} of ${availability.length} OMP providers have ambient credentials or keyless discovery`,
      remediation:
        ambientReady.length === 0
          ? "Export a provider key (e.g. OPENAI_API_KEY) or run /login inside omp, then rerun rea doctor."
          : null,
      classification: "missing_dependency",
    },
  ];
  return {
    id: "omp-surface",
    configured: version !== undefined,
    available: version !== undefined && ambientReady.length > 0,
    providerVersion: version ?? null,
    // Non-secret presence facts only: which credential names exist, never values.
    registrationEnvironment: {},
    checks,
  };
};

const readOmpVersion = async (
  binary: string,
  environment: Readonly<NodeJS.ProcessEnv>,
): Promise<string | undefined> => {
  try {
    const { promise, resolve, reject } = deferred<string>();
    // Executor form: execFile completion arrives via callback, and the ES2023
    // lib target has no Promise.withResolvers types.
    const child = execFile(
      binary,
      ["--version"],
      { env: { ...environment }, timeout: 30_000 },
      (error, stdout) => {
        if (error !== null) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      },
    );
    child.stdin?.end();
    const version = await promise;
    return version.length === 0 ? undefined : version;
  } catch (cause: unknown) {
    // best-effort cleanup: optional version probing; failure means unavailable.
    void cause;
    return undefined;
  }
};

const deferred = <Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
  reject: (reason: unknown) => void;
} => {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

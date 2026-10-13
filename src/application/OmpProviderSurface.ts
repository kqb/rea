/** One OMP 18.10.3 model-provider credential mapping, verified against omp:// docs. */
export interface OmpProviderCredential {
  readonly id: string;
  /** Ordered credential env vars; first match wins in OMP resolution. */
  readonly env: readonly string[];
  /** Additional non-credential env vars OMP reads for this provider (routing/base URL). */
  readonly configEnv?: readonly string[];
  /** True when OMP documents login/OAuth rather than an env-var key. */
  readonly loginOnly: boolean;
  readonly notes: string;
}

const core = (
  id: string,
  env: readonly string[],
  notes: string,
  extra?: Partial<OmpProviderCredential>,
): OmpProviderCredential => ({ id, env, loginOnly: false, notes, ...extra });

const login = (
  id: string,
  env: readonly string[],
  notes: string,
  extra?: Partial<OmpProviderCredential>,
): OmpProviderCredential => ({ id, env, loginOnly: true, notes, ...extra });

/**
 * Full OMP provider surface: every provider ID from omp://providers.md plus
 * `omp auth-broker list --json` (83 loginable IDs, omp/18.10.3). Env names
 * from omp://providers.md and omp://environment-variables.md; values are never
 * stored here. Observed 2026-10-13 via the installed omp binary.
 */
export const OMP_PROVIDERS = [
  // Core providers (omp://providers.md § Core providers).
  core(
    "anthropic",
    ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"],
    "OAuth token first, API key fallback; Foundry mode prefers ANTHROPIC_FOUNDRY_API_KEY",
    {
      configEnv: [
        "CLAUDE_CODE_USE_FOUNDRY",
        "FOUNDRY_BASE_URL",
        "ANTHROPIC_FOUNDRY_API_KEY",
        "ANTHROPIC_CUSTOM_HEADERS",
      ],
    },
  ),
  core("openai", ["OPENAI_API_KEY"], "OpenAI API key"),
  core(
    "openai-codex",
    ["OPENAI_CODEX_OAUTH_TOKEN"],
    "Codex OAuth token; normally stored OAuth via /login openai-codex",
  ),
  login(
    "openai-codex-device",
    [],
    "Headless/device Codex login variant; no separate env var documented",
  ),
  core("google", ["GEMINI_API_KEY"], "Gemini API key"),
  login("google-gemini-cli", [], "OAuth-backed; no key env documented"),
  login("google-antigravity", [], "OAuth-backed; no key env documented"),
  core(
    "google-vertex",
    ["GOOGLE_CLOUD_API_KEY"],
    "API key or ADC with project/location vars",
    {
      configEnv: [
        "GOOGLE_APPLICATION_CREDENTIALS",
        "GOOGLE_CLOUD_PROJECT",
        "GCP_PROJECT",
        "GCLOUD_PROJECT",
        "GOOGLE_VERTEX_LOCATION",
        "GOOGLE_CLOUD_LOCATION",
        "VERTEX_LOCATION",
      ],
    },
  ),
  core("groq", ["GROQ_API_KEY"], "Groq API key"),
  core(
    "openrouter",
    ["OPENROUTER_API_KEY"],
    "OpenRouter key; also /login openrouter",
  ),
  core("mistral", ["MISTRAL_API_KEY"], "Mistral API key"),
  core("xai", ["XAI_API_KEY"], "xAI API key"),
  core(
    "xai-oauth",
    ["XAI_OAUTH_TOKEN", "XAI_API_KEY"],
    "OAuth token first; API key accepted but does not auto-enable SuperGrok",
  ),
  core(
    "github-copilot",
    ["COPILOT_GITHUB_TOKEN"],
    "Copilot token; also OAuth login",
    {
      configEnv: ["COPILOT_INTEGRATION_ID"],
    },
  ),
  core(
    "cursor",
    ["CURSOR_ACCESS_TOKEN", "CURSOR_API_KEY"],
    "Access token; CURSOR_API_KEY accepted as alias",
  ),
  core(
    "azure",
    ["AZURE_OPENAI_API_KEY"],
    "Azure OpenAI key with routing vars",
    {
      configEnv: [
        "AZURE_OPENAI_BASE_URL",
        "AZURE_OPENAI_RESOURCE_NAME",
        "AZURE_OPENAI_API_VERSION",
        "AZURE_OPENAI_DEPLOYMENT_NAME_MAP",
      ],
    },
  ),
  core(
    "amazon-bedrock",
    ["AWS_BEARER_TOKEN_BEDROCK"],
    "Bearer token or AWS profile/chain",
    {
      configEnv: [
        "AWS_PROFILE",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_SESSION_TOKEN",
        "AWS_REGION",
        "AWS_DEFAULT_REGION",
      ],
    },
  ),
  // Additional hosted providers (omp://providers.md § Additional hosted providers).
  core(
    "abliteration",
    ["ABLITERATION_API_KEY", "ABLIT_KEY"],
    "ABLITERATION_API_KEY wins",
  ),
  core("aiand", ["AIAND_API_KEY"], "ai& API key"),
  core("aimlapi", ["AIMLAPI_API_KEY"], "AIML API key (api.aimlapi.com/v1)"),
  core(
    "alibaba-coding-plan",
    ["ALIBABA_CODING_PLAN_API_KEY"],
    "Alibaba Coding Plan key",
  ),
  core(
    "alibaba-token-plan",
    ["ALIBABA_TOKEN_PLAN_API_KEY", "BAILIAN_TOKEN_PLAN_API_KEY"],
    "QwenCloud Token Plan key",
  ),
  core(
    "baseten",
    ["BASETEN_API_KEY"],
    "Baseten key; interactive /login baseten",
  ),
  core(
    "bedrock-mantle",
    ["AWS_BEARER_TOKEN_BEDROCK"],
    "AWS bearer token or credential chain (SigV4)",
    {
      configEnv: [
        "AWS_PROFILE",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_REGION",
      ],
    },
  ),
  core("cerebras", ["CEREBRAS_API_KEY"], "Cerebras API key"),
  core(
    "charm-hyper",
    ["CHARM_HYPER_API_KEY", "HYPER_API_KEY"],
    "Charm Hyper key; HYPER_API_KEY fallback",
  ),
  core(
    "cline-pass",
    ["CLINE_API_KEY"],
    "Cline API key; /login cline-pass validates against /users/me",
  ),
  core(
    "cloudflare-ai-gateway",
    ["CLOUDFLARE_AI_GATEWAY_API_KEY"],
    "Gateway token plus account and gateway IDs",
    {
      configEnv: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_GATEWAY_ID"],
    },
  ),
  core(
    "cloudflare-workers-ai",
    ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_AUTH_TOKEN"],
    "API token plus account ID; serves Clef judge models",
    {
      configEnv: ["CLOUDFLARE_ACCOUNT_ID"],
    },
  ),
  core(
    "commandcode",
    ["COMMAND_CODE_API_KEY", "COMMANDCODE_API_KEY"],
    "Command Code key; legacy alias accepted",
  ),
  core(
    "coralbricks",
    ["CORAL_API_KEY", "CORALBRICKS_API_KEY"],
    "CoralBricks key",
  ),
  core(
    "coreweave",
    ["COREWEAVE_API_KEY", "WANDB_API_KEY"],
    "CoreWeave serverless inference key; project header required",
    {
      configEnv: ["COREWEAVE_PROJECT", "WANDB_INFERENCE_PROJECT"],
    },
  ),
  core("deepinfra", ["DEEPINFRA_API_KEY"], "DeepInfra API key"),
  core("deepseek", ["DEEPSEEK_API_KEY"], "DeepSeek API key"),
  core(
    "devin",
    ["DEVIN_API_KEY"],
    "Devin key; OAuth /login devin also documented",
  ),
  login(
    "factory-droid",
    [],
    "Subscription OAuth via /login factory-droid; no FACTORY_API_KEY discovery",
  ),
  core("firepass", ["FIREPASS_API_KEY"], "Fire Pass API key"),
  core("fireworks", ["FIREWORKS_API_KEY"], "Fireworks API key"),
  core(
    "gitlab-duo",
    ["GITLAB_TOKEN"],
    "GitLab token; shared with gitlab-duo-agent",
  ),
  core(
    "gitlab-duo-agent",
    ["GITLAB_TOKEN"],
    "GitLab token; shared with gitlab-duo",
  ),
  core("gmi-cloud", ["GMI_API_KEY"], "GMI Cloud API key"),
  core("helmcode", ["HELMCODE_API_KEY"], "Helmcode API key"),
  core(
    "huggingface",
    ["HUGGINGFACE_HUB_TOKEN", "HF_TOKEN"],
    "Hugging Face token; HF_TOKEN fallback",
  ),
  login("kimi-code", [], "Device OAuth; host overrides only", {
    configEnv: ["KIMI_CODE_OAUTH_HOST", "KIMI_OAUTH_HOST"],
  }),
  core("kilo", ["KILO_API_KEY"], "Kilo API key"),
  core("litellm", ["LITELLM_API_KEY"], "LiteLLM proxy key", {
    configEnv: ["LITELLM_BASE_URL"],
  }),
  core(
    "meta",
    ["MODEL_API_KEY", "META_API_KEY"],
    "Meta Model API key; either var works",
  ),
  core("minimax", ["MINIMAX_API_KEY"], "MiniMax API key"),
  core("minimax-code", ["MINIMAX_CODE_API_KEY"], "MiniMax Code key"),
  core("minimax-code-cn", ["MINIMAX_CODE_CN_API_KEY"], "MiniMax Code CN key"),
  core(
    "moonshot",
    ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
    "Moonshot key; KIMI_API_KEY fallback",
  ),
  login("muse-code", [], "Device OAuth; no key env documented"),
  core("nanogpt", ["NANO_GPT_API_KEY"], "NanoGPT API key"),
  core("novita", ["NOVITA_API_KEY"], "Novita API key"),
  core("nvidia", ["NVIDIA_API_KEY"], "NVIDIA API key"),
  core("opencode-go", ["OPENCODE_API_KEY"], "OpenCode gateway key"),
  core("opencode-zen", ["OPENCODE_API_KEY"], "OpenCode gateway key"),
  core(
    "perplexity",
    ["PERPLEXITY_API_KEY", "PERPLEXITY_COOKIES"],
    "API key or cookies; Pro/Max OAuth login also available",
  ),
  core("qianfan", ["QIANFAN_API_KEY"], "Qianfan API key"),
  core(
    "qwen-portal",
    ["QWEN_OAUTH_TOKEN", "QWEN_PORTAL_API_KEY"],
    "OAuth token first, API key fallback; also OAuth login",
  ),
  core(
    "sakana",
    ["SAKANA_API_KEY", "FUGU_API_KEY"],
    "Sakana AI key; either var works",
    {
      configEnv: ["SAKANA_BASE_URL", "FUGU_BASE_URL"],
    },
  ),
  core("siliconflow", ["SILICONFLOW_API_KEY"], "SiliconFlow API key"),
  core("siliconflow-cn", ["SILICONFLOW_CN_API_KEY"], "SiliconFlow CN API key"),
  core(
    "singularityapi-dev",
    ["SINGULARITYAPI_DEV_API_KEY"],
    "SingularityAPI universal gateway key",
  ),
  core(
    "singularityapi-tech",
    ["SINGULARITYAPI_TECH_API_KEY"],
    "SingularityAPI reserved DeepSeek lanes key",
  ),
  core("snowflake", ["SNOWFLAKE_PAT"], "Snowflake PAT plus account routing", {
    configEnv: ["SNOWFLAKE_ACCOUNT"],
  }),
  core(
    "stepfun",
    ["STEPFUN_API_KEY"],
    "StepFun key; region-scoped (.ai vs .com)",
  ),
  login("stencil", [], "Login-only in auth-broker list; no env documented"),
  core("synthetic", ["SYNTHETIC_API_KEY"], "Synthetic API key"),
  core("together", ["TOGETHER_API_KEY"], "Together API key"),
  core("typesafe", ["TYPESAFE_API_KEY"], "TypeSafe key; judgment API/role"),
  core("umans", ["UMANS_AI_CODING_PLAN_API_KEY"], "Umans AI Coding Plan key", {
    configEnv: ["UMANS_WEBSEARCH_PROVIDER"],
  }),
  core(
    "vllm",
    ["VLLM_API_KEY"],
    "Optional key for authenticated local vLLM servers",
  ),
  core("venice", ["VENICE_API_KEY"], "Venice API key"),
  core(
    "vercel-ai-gateway",
    ["AI_GATEWAY_API_KEY", "VERCEL_AI_GATEWAY_API_KEY"],
    "Vercel AI Gateway key",
  ),
  core(
    "wafer-serverless",
    ["WAFER_SERVERLESS_API_KEY"],
    "Wafer Serverless key; OAuth login also documented",
  ),
  core("xiaomi", ["XIAOMI_API_KEY"], "Xiaomi MiMo key"),
  core(
    "xiaomi-token-plan-ams",
    ["XIAOMI_TOKEN_PLAN_AMS_API_KEY"],
    "Xiaomi Token Plan AMS key",
  ),
  core(
    "xiaomi-token-plan-cn",
    ["XIAOMI_TOKEN_PLAN_CN_API_KEY"],
    "Xiaomi Token Plan CN key",
  ),
  core(
    "xiaomi-token-plan-sgp",
    ["XIAOMI_TOKEN_PLAN_SGP_API_KEY"],
    "Xiaomi Token Plan SGP key",
  ),
  core(
    "yolo-auto",
    ["YOLO_AUTO_API_KEY"],
    "Yolo-Auto key; flat-rate Qwen models",
  ),
  core("zai", ["ZAI_API_KEY"], "Z.AI key; also used by z.ai web search"),
  login(
    "zai-coding-plan",
    [],
    "OAuth sign-in flow; docs state it mints/stores the credential as provider zai",
  ),
  core("zenmux", ["ZENMUX_API_KEY"], "ZenMux key"),
  core("zhipu-coding-plan", ["ZHIPU_API_KEY"], "Zhipu Coding Plan key"),
  // Built-in local engines (omp://providers.md § Built-in local engines).
  core(
    "ollama",
    ["OLLAMA_API_KEY"],
    "Optional; local discovery is keyless by default",
    {
      configEnv: ["OLLAMA_BASE_URL", "OLLAMA_HOST"],
    },
  ),
  core(
    "ollama-cloud",
    ["OLLAMA_CLOUD_API_KEY"],
    "Ollama Cloud key; OAuth/login also documented",
  ),
  core("lm-studio", ["LM_STUDIO_API_KEY"], "Optional; keyless by default", {
    configEnv: ["LM_STUDIO_BASE_URL"],
  }),
  core(
    "llama.cpp",
    ["LLAMA_CPP_API_KEY"],
    "Only when the server requires auth",
    {
      configEnv: ["LLAMA_CPP_BASE_URL"],
    },
  ),
  core(
    "apple",
    [],
    "macOS arm64 Apple Foundation Models bridge; keyless, offers apple/on-device only when the bridge reports usable",
    {
      loginOnly: true,
    },
  ),
  // Web/search catalog (provider ID `web`, kind `search`; `omp models --kind all --json`).
  core("web:brave", ["BRAVE_API_KEY"], "Brave search key or stored credential"),
  core("web:duckduckgo", [], "No key env documented; keyless/unspecified", {
    loginOnly: true,
  }),
  core("web:ecosia", [], "No key env documented; keyless/unspecified", {
    loginOnly: true,
  }),
  core("web:exa", ["EXA_API_KEY"], "Exa key; otherwise public Exa MCP"),
  core(
    "web:firecrawl",
    ["FIRECRAWL_API_KEY"],
    "Firecrawl key for fetch reader; keyless fallback for search only",
    {
      configEnv: ["FIRECRAWL_BASE_URL", "FIRECRAWL_API_URL"],
    },
  ),
  core("web:google", [], "No dedicated search key documented", {
    loginOnly: true,
  }),
  core("web:hosted", [], "No key env documented; keyless/unspecified", {
    loginOnly: true,
  }),
  core("web:jina", ["JINA_API_KEY"], "Jina reader key"),
  core("web:kagi", ["KAGI_API_KEY"], "Kagi search key"),
  core(
    "web:kimi",
    ["MOONSHOT_SEARCH_API_KEY", "KIMI_SEARCH_API_KEY"],
    "Kimi/Moonshot search key",
    {
      configEnv: ["MOONSHOT_SEARCH_BASE_URL", "KIMI_SEARCH_BASE_URL"],
    },
  ),
  core("web:mojeek", [], "No key env documented; keyless/unspecified", {
    loginOnly: true,
  }),
  core(
    "web:ollama",
    ["OLLAMA_CLOUD_API_KEY"],
    "Ollama web search via cloud key",
  ),
  core("web:parallel", ["PARALLEL_API_KEY"], "Parallel search key"),
  core(
    "web:perplexity",
    ["PERPLEXITY_API_KEY", "PERPLEXITY_COOKIES"],
    "Perplexity API key or cookies",
  ),
  core("web:public", [], "No key env documented; keyless/unspecified", {
    loginOnly: true,
  }),
  core(
    "web:searxng",
    [],
    "Self-hosted endpoint with optional token/basic auth",
    {
      configEnv: [
        "SEARXNG_ENDPOINT",
        "SEARXNG_TOKEN",
        "SEARXNG_BASIC_USERNAME",
        "SEARXNG_BASIC_PASSWORD",
      ],
    },
  ),
  core("web:startpage", [], "No key env documented; keyless/unspecified", {
    loginOnly: true,
  }),
  core("web:synthetic", [], "No search-specific env documented", {
    loginOnly: true,
  }),
  core("web:tavily", ["TAVILY_API_KEY"], "Tavily key or stored credential"),
  core("web:tinyfish", ["TINYFISH_API_KEY"], "Tinyfish search key"),
  core("web:zai", ["ZAI_API_KEY"], "Z.AI key or stored OAuth"),
] as const satisfies readonly OmpProviderCredential[];

/** Provider IDs in the order above (core, hosted, local, web/search). */
export const OMP_PROVIDER_IDS = OMP_PROVIDERS.map(
  (provider) => provider.id,
) as unknown as readonly string[];

/** Look up one provider row by exact ID. */
export const ompProviderById = (
  id: string,
): OmpProviderCredential | undefined =>
  (OMP_PROVIDERS as readonly OmpProviderCredential[]).find(
    (provider) => provider.id === id,
  );

/** One OMP bundled task agent (omp://task-agent-discovery.md § Bundled agents). */
export interface OmpAgentDefinition {
  readonly name: string;
  readonly description: string;
  readonly sourceFile: string;
}

/**
 * Bundled OMP task agents, definitive from omp://task-agent-discovery.md
 * (OMP 18.10.3 exposes no `agents list` command; only `unpack`).
 */
export const OMP_BUNDLED_AGENTS = [
  {
    name: "scout",
    description:
      "Fast read-only exploration with structural summaries disabled",
    sourceFile: "scout prompt file",
  },
  {
    name: "reviewer",
    description: "Review a change for correctness",
    sourceFile: "reviewer prompt file",
  },
  {
    name: "security-reviewer",
    description: "Security-focused review",
    sourceFile: "security-reviewer prompt file",
  },
  {
    name: "task",
    description:
      "Default general-purpose subagent; omitted-agent fallback in unrestricted sessions",
    sourceFile: "shared task.md body plus injected frontmatter",
  },
  {
    name: "sonic",
    description: "Fast general-purpose subagent; vibe_spawn fast tier",
    sourceFile: "shared task.md body plus injected frontmatter",
  },
] as const satisfies readonly OmpAgentDefinition[];

/**
 * OMP agent discovery order (omp://task-agent-discovery.md § Discovery inputs
 * and precedence). First wins by exact case-sensitive name; bundled last.
 */
export const OMP_AGENT_DISCOVERY_ORDER = [
  "Nearest project .omp/agents directory",
  "User ~/.omp/agent/agents directory",
  "OMP extension package agents/ directories (explicit --extension roots, session extensions: array, installed npm/link plugins)",
  "Claude marketplace plugin roots with agents/ dirs (when the Claude plugin source is enabled)",
  "Bundled agents last: scout, reviewer, security-reviewer, task, sonic",
] as const;

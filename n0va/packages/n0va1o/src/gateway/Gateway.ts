import { JITAuthProvider } from "../auth/JITAuthProvider";
import { CONNECTOR_REGISTRY } from "../connectors/registry";
import { ConnectedAccount, N0VA1ORequest, N0VA1OResponse, Recipe } from "../types";
import { nanoid } from "nanoid";
import { SandboxExecutor } from "../sandbox/SandboxExecutor";
import { VirtualFileSystem } from "../filesystem/VirtualFileSystem";
import { IntentRouter } from "../routing/IntentRouter";
import { RecipeCompiler } from "../recipes/RecipeCompiler";

interface SchemaModifier {
  type: "redact" | "cap" | "inject";
  field: string;
  value?: unknown;
  maxValue?: number;
}

interface ExecutionHook {
  type: "before" | "after";
  handler: (payload: unknown) => Promise<unknown>;
}

export interface N0VA1OHealth {
  status: string;
  uptime: number;
  connections: number;
  sandbox: { activeSandboxes: number };
  vfs: { totalFiles: number; totalSizeMB: number };
  router: { registeredIntents: number; registeredActions: number };
  recipes: { cachedRecipes: number };
}

export class N0VA1OGateway {
  private authProvider: JITAuthProvider;
  private schemaModifiers: SchemaModifier[] = [];
  private executionHooks: ExecutionHook[] = [];
  private recipeCache = new Map<string, string>();
  private startTime: number;

  readonly sandbox: SandboxExecutor;
  readonly virtualFS: VirtualFileSystem;
  readonly intentRouter: IntentRouter;
  readonly recipeCompiler: RecipeCompiler;

  constructor() {
    this.authProvider = new JITAuthProvider();
    this.sandbox = new SandboxExecutor();
    this.virtualFS = new VirtualFileSystem();
    this.intentRouter = new IntentRouter();
    this.recipeCompiler = new RecipeCompiler();
    this.startTime = Date.now();
    this.registerDefaultModifiers();
    this.registerDefaultIntents();
  }

  private registerDefaultModifiers(): void {
    this.addSchemaModifier({ type: "redact", field: "delete_campaign" });
    this.addSchemaModifier({ type: "cap", field: "budget_increase", maxValue: 50 });
    this.addSchemaModifier({
      type: "inject",
      field: "utm_params",
      value: { source: "n0va", medium: "cpc", campaign: "{campaign_name}" },
    });
  }

  private registerDefaultIntents(): void {
    this.intentRouter.registerAction("launch campaign", "create_campaign", ["meta", "google", "linkedin", "tiktok"], ["read", "write"], "high");
    this.intentRouter.registerAction("increase budget", "update_budget", ["meta", "google", "linkedin", "tiktok"], ["read", "write"], "high");
    this.intentRouter.registerAction("pause campaign", "pause_campaign", ["meta", "google", "linkedin", "tiktok"], ["read", "write"], "high");
    this.intentRouter.registerAction("view performance", "read_insights", ["meta", "google", "linkedin", "tiktok", "snapchat", "twitter"], ["read"], "low");
    this.intentRouter.registerAction("check analytics", "read_insights", ["meta", "google", "linkedin", "tiktok"], ["read"], "low");
    this.intentRouter.registerAction("create campaign", "create_campaign", ["meta", "google", "linkedin", "tiktok"], ["read", "write"], "medium");

    this.intentRouter.registerContextualAction("shift_budget", ["meta", "google", "linkedin"], ["roas_drop", "budget_reallocation", "underperformance"], "high");
    this.intentRouter.registerContextualAction("expand_audience", ["meta", "google"], ["lookalike_expansion", "audience_growth"], "medium");
    this.intentRouter.registerContextualAction("generate_creative", ["n0va_diffusion"], ["creative_fatigue", "ctr_drop", "fresh_creative"], "medium");
    this.intentRouter.registerContextualAction("pause_placement", ["meta", "google", "linkedin", "tiktok"], ["ivt_high", "brand_safety", "fraud_detected"], "critical");
  }

  addSchemaModifier(modifier: SchemaModifier): void {
    this.schemaModifiers.push(modifier);
  }

  addExecutionHook(hook: ExecutionHook): void {
    this.executionHooks.push(hook);
  }

  async getPlatforms(): Promise<typeof CONNECTOR_REGISTRY> {
    return CONNECTOR_REGISTRY;
  }

  async execute(
    request: N0VA1ORequest,
    account: ConnectedAccount
  ): Promise<N0VA1OResponse> {
    const startTime = Date.now();
    const requestId = nanoid(12);

    try {
      const token = await this.authProvider.provisionToken(account, "write");
      const modifiedRequest = await this.applySchemaModifiers(request);
      const preHookResult = await this.runBeforeHooks(modifiedRequest);

      const connector = await this.getConnectorForPlatform(account.platform);
      let result: unknown;

      if (connector) {
        result = await connector(preHookResult, account, token);
      }

      const finalResult = await this.runAfterHooks(result);

      return {
        success: true,
        data: finalResult,
        requestId,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        requestId,
        latency: Date.now() - startTime,
      };
    }
  }

  async resolveAndExecute(
    intent: string,
    account: ConnectedAccount,
    params: Record<string, unknown> = {}
  ): Promise<N0VA1OResponse | N0VA1OResponse[]> {
    const availableActions = CONNECTOR_REGISTRY
      .filter((c) => c.platform === account.platform)
      .flatMap((c) => c.actions);

    const resolved = this.intentRouter.resolve(intent, availableActions);

    if (resolved.confidence < 0.3 || resolved.actions.length === 0) {
      return {
        success: false,
        error: `No action found matching intent: "${intent}"`,
        requestId: nanoid(12),
        latency: 0,
      };
    }

    const results = await Promise.all(
      resolved.actions.slice(0, 3).map((action) =>
        this.execute(
          {
            id: `${action.action}_${Date.now()}`,
            accountId: account.id,
            action: action.action,
            params,
          },
          account
        )
      )
    );

    return results.length === 1 ? results[0] : results;
  }

  async uploadLargeFile(
    name: string,
    data: Buffer | string,
    contentType: string,
    metadata?: Record<string, unknown>,
    ttlMs?: number
  ): Promise<{ id: string; path: string; size: number; checksum: string; pointer: string }> {
    return this.virtualFS.upload(name, data, contentType, metadata, ttlMs);
  }

  async readFile(pointer: string): Promise<Buffer | null> {
    return this.virtualFS.resolvePointer(pointer);
  }

  async executeSandbox(
    script: string,
    files: { path: string; content: string | Buffer }[] = []
  ): Promise<{ success: boolean; output: unknown; executionTimeMs: number; sandboxId: string; error?: string }> {
    return this.sandbox.executeScript(script, files);
  }

  async compileRecipe(recipe: Recipe): Promise<string> {
    const compiled = await this.recipeCompiler.compile(recipe);
    const compiledId = compiled.id;
    this.recipeCache.set(recipe.id, compiledId);
    return compiledId;
  }

  async quickCompile(recipeId: string, actions: string[]): Promise<string> {
    const compiled = `compiled_recipe_${recipeId}_${nanoid(8)}`;
    this.recipeCache.set(recipeId, compiled);
    return compiled;
  }

  getHealth(): N0VA1OHealth {
    return {
      status: "operational",
      uptime: (Date.now() - this.startTime) / 1000,
      connections: CONNECTOR_REGISTRY.length,
      sandbox: { activeSandboxes: this.sandbox.getActiveSandboxCount() },
      vfs: this.virtualFS.getStorageStats(),
      router: {
        registeredIntents: 0,
        registeredActions: 0,
      },
      recipes: { cachedRecipes: this.recipeCache.size },
    };
  }

  private async applySchemaModifiers(request: N0VA1ORequest): Promise<N0VA1ORequest> {
    let params = { ...request.params };

    for (const modifier of this.schemaModifiers) {
      switch (modifier.type) {
        case "redact":
          delete params[modifier.field];
          break;
        case "cap":
          if (typeof params[modifier.field] === "number" && modifier.maxValue && (params[modifier.field] as number) > modifier.maxValue) {
            params[modifier.field] = modifier.maxValue;
          }
          break;
        case "inject":
          if (modifier.value && typeof modifier.value === "object") {
            params = { ...params, ...modifier.value };
          }
          break;
      }
    }

    return { ...request, params };
  }

  private async runBeforeHooks(request: N0VA1ORequest): Promise<N0VA1ORequest> {
    let payload: unknown = request;
    for (const hook of this.executionHooks) {
      if (hook.type === "before") {
        payload = await hook.handler(payload);
      }
    }
    return payload as N0VA1ORequest;
  }

  private async runAfterHooks(result: unknown): Promise<unknown> {
    let payload = result;
    for (const hook of this.executionHooks) {
      if (hook.type === "after") {
        payload = await hook.handler(payload);
      }
    }
    return payload;
  }

  private async getConnectorForPlatform(
    platform: string
  ): Promise<((req: N0VA1ORequest, account: ConnectedAccount, token: string) => Promise<unknown>) | null> {
    const def = CONNECTOR_REGISTRY.find((c) => c.platform === platform);
    if (!def) return null;

    return async (req: N0VA1ORequest, _account: ConnectedAccount, token: string) => {
      return {
        platform: def.platform,
        action: req.action,
        params: req.params,
        status: "executed",
        tokenPreview: token.substring(0, 20) + "...",
      };
    };
  }
}

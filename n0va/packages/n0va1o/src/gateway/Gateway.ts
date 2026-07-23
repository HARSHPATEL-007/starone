import { JITAuthProvider } from "../auth/JITAuthProvider";
import { CONNECTOR_REGISTRY } from "../connectors/registry";
import { ConnectedAccount, N0VA1ORequest, N0VA1OResponse } from "../types";
import { nanoid } from "nanoid";

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

export class N0VA1OGateway {
  private authProvider: JITAuthProvider;
  private schemaModifiers: SchemaModifier[] = [];
  private executionHooks: ExecutionHook[] = [];
  private recipeCache = new Map<string, string>();

  constructor() {
    this.authProvider = new JITAuthProvider();
    this.registerDefaultModifiers();
  }

  private registerDefaultModifiers(): void {
    this.addSchemaModifier({
      type: "redact",
      field: "delete_campaign",
    });
    this.addSchemaModifier({
      type: "cap",
      field: "budget_increase",
      maxValue: 50,
    });
    this.addSchemaModifier({
      type: "inject",
      field: "utm_params",
      value: {
        source: "n0va",
        medium: "cpc",
        campaign: "{campaign_name}",
      },
    });
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

  private async applySchemaModifiers(request: N0VA1ORequest): Promise<N0VA1ORequest> {
    let params = { ...request.params };

    for (const modifier of this.schemaModifiers) {
      switch (modifier.type) {
        case "redact":
          delete params[modifier.field];
          break;
        case "cap":
          if (
            typeof params[modifier.field] === "number" &&
            modifier.maxValue &&
            (params[modifier.field] as number) > modifier.maxValue
          ) {
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

  async compileRecipe(recipeId: string, actions: string[]): Promise<string> {
    const compiled = `compiled_recipe_${recipeId}_${nanoid(8)}`;
    this.recipeCache.set(recipeId, compiled);
    return compiled;
  }

  getHealth(): { status: string; uptime: number; connections: number } {
    return {
      status: "operational",
      uptime: process.uptime(),
      connections: CONNECTOR_REGISTRY.length,
    };
  }
}

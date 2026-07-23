export enum ConnectionStatus {
  Active = "active",
  Error = "error",
  Expired = "expired",
  Pending = "pending",
}

export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface ConnectedAccount {
  id: string;
  tenantId: string;
  platform: string;
  label: string;
  status: ConnectionStatus;
  credentials: PlatformCredentials;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface N0VA1ORequest {
  id: string;
  accountId: string;
  action: string;
  params: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface N0VA1OResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  requestId: string;
  latency: number;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  platform: string;
  version: string;
  actions: string[];
  authType: "oauth2" | "api_key" | "jwt" | "basic";
  baseUrl: string;
}

export interface RecipeStep {
  id: string;
  action: string;
  platform: string;
  params: Record<string, unknown>;
  condition?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  version: string;
  trigger: string;
  steps: RecipeStep[];
  hitlGate?: {
    threshold: number;
    field: string;
  };
  isCompiled: boolean;
  createdAt: Date;
}

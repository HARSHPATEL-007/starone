import { ConnectedAccount, ConnectionStatus } from "../types";

interface TokenCacheEntry {
  token: string;
  expiresAt: Date;
}

export class JITAuthProvider {
  private tokenCache = new Map<string, TokenCacheEntry>();
  private refreshLocks = new Map<string, Promise<string>>();

  async provisionToken(account: ConnectedAccount, intent: string): Promise<string> {
    const cacheKey = `${account.id}:${intent}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.token;
    }

    if (this.refreshLocks.has(cacheKey)) {
      return this.refreshLocks.get(cacheKey)!;
    }

    const refreshPromise = this.refreshToken(account, intent);
    this.refreshLocks.set(cacheKey, refreshPromise);

    try {
      const token = await refreshPromise;
      return token;
    } finally {
      this.refreshLocks.delete(cacheKey);
    }
  }

  private async refreshToken(account: ConnectedAccount, intent: string): Promise<string> {
    const payload = {
      sub: account.id,
      tenant: account.tenantId,
      platform: account.platform,
      intent,
      scopes: this.pruneScopes(account.credentials.scopes, intent),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    const token = `n0va1o_jit_${account.id}_${encoded}`;

    this.tokenCache.set(`${account.id}:${intent}`, {
      token,
      expiresAt: new Date(Date.now() + 55 * 60 * 1000),
    });

    return token;
  }

  private pruneScopes(scopes: string[], intent: string): string[] {
    const intentScopeMap: Record<string, string[]> = {
      read: ["read"],
      write: ["read", "write"],
      admin: ["read", "write", "admin"],
    };

    const requiredLevel = intentScopeMap[intent] || ["read"];
    return scopes.filter((s) => requiredLevel.includes(s));
  }

  async revokeToken(accountId: string): Promise<void> {
    for (const [key] of this.tokenCache) {
      if (key.startsWith(`${accountId}:`)) {
        this.tokenCache.delete(key);
      }
    }
  }
}

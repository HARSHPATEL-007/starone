import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { DataStore } from "../services/DataStore";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const PLATFORM_CONFIGS: Record<string, { authUrl: string; tokenUrl: string; clientId: string; scopes: string[]; authorizeParams: Record<string, string> }> = {
  meta: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    clientId: "n0va_meta_client_id",
    scopes: ["ads_read", "ads_management", "business_management", "pages_read_engagement"],
    authorizeParams: { response_type: "code", display: "popup" },
  },
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: "n0va_google_client_id",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    authorizeParams: { response_type: "code", access_type: "offline", prompt: "consent" },
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientId: "n0va_linkedin_client_id",
    scopes: ["r_ads", "w_ads", "r_ads_reporting", "r_organization_social"],
    authorizeParams: { response_type: "code" },
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1/oauth2/access_token",
    clientId: "n0va_tiktok_client_id",
    scopes: ["ad:read", "ad:write", "report:read", "audience:read"],
    authorizeParams: { response_type: "code", service: "tiktok" },
  },
  snapchat: {
    authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    clientId: "n0va_snapchat_client_id",
    scopes: ["snap_ads_manage", "snap_ads_read"],
    authorizeParams: { response_type: "code" },
  },
  pinterest: {
    authUrl: "https://www.pinterest.com/oauth",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    clientId: "n0va_pinterest_client_id",
    scopes: ["ads:read", "ads:write", "boards:read", "pins:read"],
    authorizeParams: { response_type: "code" },
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    clientId: "n0va_twitter_client_id",
    scopes: ["tweet.read", "tweet.write", "ads:read", "ads:write", "offline.access"],
    authorizeParams: { response_type: "code", code_challenge_method: "S256" },
  },
};

router.get(
  "/configs",
  asyncHandler(async (_req: Request, res: Response) => {
    const configs = Object.entries(PLATFORM_CONFIGS).map(([platform, cfg]) => ({
      platform,
      authUrl: cfg.authUrl,
      clientId: cfg.clientId,
      scopes: cfg.scopes,
      authorizeParams: cfg.authorizeParams,
    }));
    sendSuccess(res, configs, { count: configs.length });
  })
);

router.post(
  "/authorize",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { platform, redirectUri } = req.body;
    if (!platform || !redirectUri) throw new AppError(400, "Missing platform or redirectUri");
    const cfg = PLATFORM_CONFIGS[platform];
    if (!cfg) throw new AppError(400, `Unsupported platform: ${platform}`);

    const state = Buffer.from(JSON.stringify({ tenantId, platform, redirectUri, ts: Date.now() })).toString("base64url");
    const authUrl = new URL(cfg.authUrl);
    authUrl.searchParams.set("client_id", cfg.clientId);
    authUrl.searchParams.set("redirect_uri", `${req.protocol}://${req.get("host")}/api/v1/oauth/callback`);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", cfg.scopes.join(" "));
    for (const [k, v] of Object.entries(cfg.authorizeParams)) authUrl.searchParams.set(k, v);

    sendSuccess(res, { authUrl: authUrl.toString(), state, platform });
  })
);

router.get(
  "/callback",
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query;
    if (error) throw new AppError(400, `OAuth error: ${error}`);
    if (!code || !state) throw new AppError(400, "Missing code or state");

    let stateData: { tenantId: string; platform: string; redirectUri: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, "base64url").toString());
    } catch {
      throw new AppError(400, "Invalid state parameter");
    }

    const { tenantId, platform, redirectUri } = stateData;
    const cfg = PLATFORM_CONFIGS[platform];
    if (!cfg) throw new AppError(400, `Unknown platform: ${platform}`);

    const tokenResp = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: cfg.clientId,
        client_secret: "n0va_secret_" + platform,
        code,
        redirect_uri: `${req.protocol}://${req.get("host")}/api/v1/oauth/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: any = await tokenResp.json();
    const accessToken = tokenData.access_token || "sim_" + platform + "_" + Date.now();
    const refreshToken = tokenData.refresh_token || "sim_refresh_" + platform + "_" + Date.now();
    const expiresIn = tokenData.expires_in || 3600;

    let account: any;
    if (DataStore.usingMemory()) {
      const existing = DataStore["mem"]().findOne("connected_accounts", (a: any) => a.tenantId === tenantId && a.platform === platform);
      if (existing) {
        account = DataStore["mem"]().update("connected_accounts", (a: any) => a._id === existing._id, {
          status: "active",
          credentials: { accessToken, refreshToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(), scopes: cfg.scopes },
          updatedAt: new Date().toISOString(),
        });
      } else {
        account = DataStore["mem"]().insert("connected_accounts", {
          tenantId,
          platform,
          label: platform.charAt(0).toUpperCase() + platform.slice(1),
          status: "active",
          credentials: { accessToken, refreshToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(), scopes: cfg.scopes },
          metadata: { connectedVia: "oauth" },
        });
      }
    }
    res.redirect(`${redirectUri}?platform=${platform}&status=connected`);
  })
);

router.post(
  "/refresh/:platform",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { platform } = req.params;
    const mem = DataStore["mem"]();
    const account = mem.findOne("connected_accounts", (a: any) => a.tenantId === tenantId && a.platform === platform);
    if (!account) throw new AppError(404, `No connected account for ${platform}`);
    const newToken = "refreshed_" + platform + "_" + Date.now();
    mem.update("connected_accounts", (a: any) => a._id === account._id, {
      "credentials.accessToken": newToken,
      "credentials.expiresAt": new Date(Date.now() + 3600000).toISOString(),
    });
    sendSuccess(res, { platform, accessToken: newToken, expiresAt: new Date(Date.now() + 3600000).toISOString() });
  })
);

router.get(
  "/status",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const mem = DataStore["mem"]();
    const accounts = mem.find("connected_accounts", (a: any) => a.tenantId === tenantId);
    const statuses = Object.keys(PLATFORM_CONFIGS).map((p) => {
      const acct = accounts.find((a: any) => a.platform === p);
      return {
        platform: p,
        connected: !!acct,
        active: acct?.status === "active",
        label: acct?.label || null,
        expiresAt: acct?.credentials?.expiresAt || null,
        accountId: acct?._id || null,
      };
    });
    sendSuccess(res, { platforms: statuses, totalConnected: accounts.length }, { count: accounts.length });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (_req: Request, res: Response) => {
    const mem = DataStore["mem"]();
    const accounts = mem.find("connected_accounts", () => true);
    const platforms = [...new Set(accounts.map((a: any) => a.platform))] as string[];
    const activeCount = accounts.filter((a: any) => a.status === "active").length;
    sendSuccess(res, { totalConnected: accounts.length, platforms, activeCount });
  })
);

export default router;

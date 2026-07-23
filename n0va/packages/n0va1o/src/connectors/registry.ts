import { ConnectorDefinition } from "../types";

export const CONNECTOR_REGISTRY: ConnectorDefinition[] = [
  {
    id: "meta_ads",
    name: "Meta Ads",
    platform: "meta",
    version: "v19.0",
    actions: ["read_campaigns", "create_campaign", "update_budget", "pause_campaign", "read_insights"],
    authType: "oauth2",
    baseUrl: "https://graph.facebook.com/v19.0",
  },
  {
    id: "google_ads",
    name: "Google Ads",
    platform: "google",
    version: "v16",
    actions: ["read_campaigns", "create_campaign", "update_budget", "pause_campaign", "read_insights"],
    authType: "oauth2",
    baseUrl: "https://googleads.googleapis.com/v16",
  },
  {
    id: "linkedin_ads",
    name: "LinkedIn Ads",
    platform: "linkedin",
    version: "v2",
    actions: ["read_campaigns", "create_campaign", "update_budget", "pause_campaign"],
    authType: "oauth2",
    baseUrl: "https://api.linkedin.com/v2",
  },
  {
    id: "tiktok_ads",
    name: "TikTok Ads",
    platform: "tiktok",
    version: "v1.3",
    actions: ["read_campaigns", "create_campaign", "update_budget", "pause_campaign"],
    authType: "oauth2",
    baseUrl: "https://ads.tiktok.com/open_api/v1.3",
  },
  {
    id: "snapchat_ads",
    name: "Snapchat Ads",
    platform: "snapchat",
    version: "v1",
    actions: ["read_campaigns", "create_campaign", "update_budget"],
    authType: "oauth2",
    baseUrl: "https://adsapi.snapchat.com/v1",
  },
  {
    id: "twitter_ads",
    name: "X Ads",
    platform: "twitter",
    version: "v2",
    actions: ["read_campaigns", "create_campaign", "update_budget"],
    authType: "oauth2",
    baseUrl: "https://ads-api.twitter.com/v2",
  },
];

export function getConnectorDef(platform: string): ConnectorDefinition | undefined {
  return CONNECTOR_REGISTRY.find((c) => c.platform === platform);
}

export function getConnectorDefsByAction(action: string): ConnectorDefinition[] {
  return CONNECTOR_REGISTRY.filter((c) => c.actions.includes(action));
}

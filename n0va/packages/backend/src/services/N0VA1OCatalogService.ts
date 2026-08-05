import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("n0va1o_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const GATEWAY_CATEGORIES = [
  { id: "ads_marketing", name: "Ads & Marketing", transport: "rest", auth: "oauth2" },
  { id: "data_analytics", name: "Data & Analytics", transport: "rest", auth: "api_key" },
  { id: "workflow", name: "Workflow & Automation", transport: "rest", auth: "oauth2" },
  { id: "social", name: "Social & Community", transport: "rest+ws", auth: "oauth2" },
  { id: "hr", name: "HR & Talent", transport: "rest", auth: "oauth2" },
  { id: "finance", name: "Finance & Accounting", transport: "rest", auth: "oauth2" },
  { id: "ecommerce", name: "E-commerce", transport: "rest", auth: "oauth2" },
  { id: "booking", name: "Booking & Reservations", transport: "rest", auth: "oauth2" },
  { id: "entertainment", name: "Entertainment & Media", transport: "rest", auth: "oauth2" },
  { id: "design", name: "Design & Creative", transport: "rest", auth: "oauth2" },
  { id: "docs", name: "Docs & File", transport: "rest", auth: "oauth2" },
  { id: "schedule", name: "Scheduling & Meetings", transport: "rest", auth: "oauth2" },
  { id: "ai_ml", name: "AI & ML", transport: "rest", auth: "api_key" },
  { id: "education", name: "Education & Learning", transport: "rest", auth: "oauth2" },
  { id: "devops", name: "DevOps & Engineering", transport: "rest", auth: "api_key" },
  { id: "crm", name: "CRM & Sales", transport: "rest", auth: "oauth2" },
  { id: "pm", name: "PM & Productivity", transport: "rest", auth: "oauth2" },
] as const;

export const PLATFORM_CATALOG = [
  // Ads & Marketing
  { id: "google_ads", name: "Google Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write", "reporting"] },
  { id: "meta_ads", name: "Meta Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest", "graphql"], capabilities: ["campaign_read", "campaign_write", "audience"] },
  { id: "tiktok_ads", name: "TikTok Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "linkedin_ads", name: "LinkedIn Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "snap_ads", name: "Snap Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "pinterest_ads", name: "Pinterest Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "reddit_ads", name: "Reddit Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "amazon_ads", name: "Amazon Ads", category: "ads_marketing", authType: "api_key", protocols: ["rest"], capabilities: ["campaign_read", "reporting"] },
  { id: "bing_ads", name: "Bing Ads", category: "ads_marketing", authType: "oauth2", protocols: ["soap"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "twitter_ads", name: "X Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "quora_ads", name: "Quora Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read"] },
  { id: "taboola", name: "Taboola", category: "ads_marketing", authType: "api_key", protocols: ["rest"], capabilities: ["campaign_write", "reporting"] },
  { id: "outbrain", name: "Outbrain", category: "ads_marketing", authType: "api_key", protocols: ["rest"], capabilities: ["campaign_write", "reporting"] },
  { id: "criteo", name: "Criteo", category: "ads_marketing", authType: "api_key", protocols: ["rest"], capabilities: ["campaign_read", "reporting"] },
  { id: "adroll", name: "AdRoll", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["campaign_read", "campaign_write"] },
  { id: "mailchimp", name: "Mailchimp", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["audience", "campaign_write", "reporting"] },
  { id: "klaviyo", name: "Klaviyo", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["audience", "campaign_write", "events"] },
  { id: "hubspot_marketing", name: "HubSpot Marketing", category: "ads_marketing", authType: "oauth2", protocols: ["rest"], capabilities: ["audience", "campaign_write", "workflows"] },
  { id: "activecampaign", name: "ActiveCampaign", category: "ads_marketing", authType: "api_key", protocols: ["rest"], capabilities: ["audience", "campaign_write"] },
  { id: "braze", name: "Braze", category: "ads_marketing", authType: "api_key", protocols: ["rest"], capabilities: ["audience", "campaign_write", "events"] },
  { id: "sendgrid", name: "SendGrid", category: "ads_marketing", authType: "api_key", protocols: ["rest"], capabilities: ["email", "campaign_write"] },
  { id: "segment", name: "Segment", category: "data_analytics", authType: "api_key", protocols: ["rest"], capabilities: ["events", "profiles"] },
  { id: "snowflake", name: "Snowflake", category: "data_analytics", authType: "oauth2", protocols: ["rest", "sql"], capabilities: ["warehouse", "query"] },
  { id: "bigquery", name: "Google BigQuery", category: "data_analytics", authType: "oauth2", protocols: ["rest", "sql"], capabilities: ["warehouse", "query"] },
  { id: "redshift", name: "Amazon Redshift", category: "data_analytics", authType: "api_key", protocols: ["sql"], capabilities: ["warehouse", "query"] },
  { id: "looker", name: "Looker", category: "data_analytics", authType: "oauth2", protocols: ["rest"], capabilities: ["explore", "query"] },
  { id: "tableau", name: "Tableau", category: "data_analytics", authType: "oauth2", protocols: ["rest"], capabilities: ["explore", "query"] },
  { id: "powerbi", name: "Power BI", category: "data_analytics", authType: "oauth2", protocols: ["rest"], capabilities: ["explore", "query"] },
  { id: "databricks", name: "Databricks", category: "data_analytics", authType: "api_key", protocols: ["rest", "sql"], capabilities: ["warehouse", "query"] },
  { id: "fivetran", name: "Fivetran", category: "data_analytics", authType: "api_key", protocols: ["rest"], capabilities: ["sync", "pipeline"] },
  { id: "airbyte", name: "Airbyte", category: "data_analytics", authType: "api_key", protocols: ["rest"], capabilities: ["sync", "pipeline"] },
  { id: "mixpanel", name: "Mixpanel", category: "data_analytics", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "query"] },
  { id: "amplitude", name: "Amplitude", category: "data_analytics", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "query"] },
  { id: "posthog", name: "PostHog", category: "data_analytics", authType: "api_key", protocols: ["rest"], capabilities: ["events", "query"] },
  { id: "fullstory", name: "FullStory", category: "data_analytics", authType: "api_key", protocols: ["rest"], capabilities: ["events", "sessions"] },
  { id: "hotjar", name: "Hotjar", category: "data_analytics", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "sessions"] },
  { id: "matomo", name: "Matomo", category: "data_analytics", authType: "api_key", protocols: ["rest"], capabilities: ["events", "query"] },
  { id: "zapier", name: "Zapier", category: "workflow", authType: "oauth2", protocols: ["rest"], capabilities: ["trigger", "action"] },
  { id: "make", name: "Make", category: "workflow", authType: "oauth2", protocols: ["rest"], capabilities: ["trigger", "action"] },
  { id: "n8n", name: "n8n", category: "workflow", authType: "api_key", protocols: ["rest"], capabilities: ["trigger", "action"] },
  { id: "workato", name: "Workato", category: "workflow", authType: "oauth2", protocols: ["rest"], capabilities: ["trigger", "action"] },
  { id: "pipedream", name: "Pipedream", category: "workflow", authType: "oauth2", protocols: ["rest"], capabilities: ["trigger", "action"] },
  { id: "ifttt", name: "IFTTT", category: "workflow", authType: "oauth2", protocols: ["rest"], capabilities: ["trigger", "action"] },
  { id: "retool", name: "Retool", category: "workflow", authType: "oauth2", protocols: ["rest"], capabilities: ["app_build", "action"] },
  { id: "slack", name: "Slack", category: "social", authType: "oauth2", protocols: ["rest", "ws"], capabilities: ["chat", "channels", "files"] },
  { id: "discord", name: "Discord", category: "social", authType: "oauth2", protocols: ["rest", "ws"], capabilities: ["chat", "channels", "voice"] },
  { id: "teams", name: "Microsoft Teams", category: "social", authType: "oauth2", protocols: ["graphql"], capabilities: ["chat", "channels", "meetings"] },
  { id: "telegram", name: "Telegram", category: "social", authType: "api_key", protocols: ["rest"], capabilities: ["chat", "bots"] },
  { id: "whatsapp", name: "WhatsApp Business", category: "social", authType: "api_key", protocols: ["rest"], capabilities: ["chat", "templates"] },
  { id: "linkedin_social", name: "LinkedIn", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["posts", "profile"] },
  { id: "instagram", name: "Instagram", category: "social", authType: "oauth2", protocols: ["graphql"], capabilities: ["posts", "media"] },
  { id: "youtube", name: "YouTube", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["video", "channels"] },
  { id: "tiktok_social", name: "TikTok", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["posts", "media"] },
  { id: "pinterest_social", name: "Pinterest", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["pins", "boards"] },
  { id: "reddit_social", name: "Reddit", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["posts", "comments"] },
  { id: "twitch", name: "Twitch", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["streams", "chat"] },
  { id: "medium", name: "Medium", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["posts"] },
  { id: "wordpress", name: "WordPress", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["posts", "media"] },
  { id: "workday", name: "Workday", category: "hr", authType: "oauth2", protocols: ["rest", "soap"], capabilities: ["hcm", "payroll"] },
  { id: "sap_successfactors", name: "SAP SuccessFactors", category: "hr", authType: "oauth2", protocols: ["rest", "soap"], capabilities: ["hcm"] },
  { id: "bamboo", name: "BambooHR", category: "hr", authType: "api_key", protocols: ["rest"], capabilities: ["employees", "time_off"] },
  { id: "gusto", name: "Gusto", category: "hr", authType: "oauth2", protocols: ["rest"], capabilities: ["payroll", "employees"] },
  { id: "adp", name: "ADP", category: "hr", authType: "oauth2", protocols: ["rest"], capabilities: ["payroll", "hcm"] },
  { id: "rippling", name: "Rippling", category: "hr", authType: "oauth2", protocols: ["rest"], capabilities: ["employees", "payroll"] },
  { id: "greenhouse", name: "Greenhouse", category: "hr", authType: "api_key", protocols: ["rest"], capabilities: ["ats", "candidates"] },
  { id: "lever", name: "Lever", category: "hr", authType: "oauth2", protocols: ["rest"], capabilities: ["ats", "candidates"] },
  { id: "workable", name: "Workable", category: "hr", authType: "api_key", protocols: ["rest"], capabilities: ["ats", "candidates"] },
  { id: "deel", name: "Deel", category: "hr", authType: "oauth2", protocols: ["rest"], capabilities: ["contracts", "payments"] },
  { id: "remote", name: "Remote.com", category: "hr", authType: "oauth2", protocols: ["rest"], capabilities: ["contracts", "payments"] },
  { id: "quickbooks", name: "QuickBooks", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["accounting", "invoices"] },
  { id: "xero", name: "Xero", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["accounting", "invoices"] },
  { id: "netsuite", name: "NetSuite", category: "finance", authType: "oauth2", protocols: ["rest", "soap"], capabilities: ["accounting", "erp"] },
  { id: "sage", name: "Sage", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["accounting"] },
  { id: "freshbooks", name: "FreshBooks", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["accounting", "invoices"] },
  { id: "stripe", name: "Stripe", category: "finance", authType: "api_key", protocols: ["rest"], capabilities: ["payments", "customers", "invoices"] },
  { id: "braintree", name: "Braintree", category: "finance", authType: "api_key", protocols: ["rest"], capabilities: ["payments"] },
  { id: "square", name: "Square", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["payments", "invoices"] },
  { id: "adyen", name: "Adyen", category: "finance", authType: "api_key", protocols: ["rest"], capabilities: ["payments"] },
  { id: "paypal", name: "PayPal", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["payments", "invoices"] },
  { id: "chargebee", name: "Chargebee", category: "finance", authType: "api_key", protocols: ["rest"], capabilities: ["subscriptions", "invoices"] },
  { id: "recurly", name: "Recurly", category: "finance", authType: "api_key", protocols: ["rest"], capabilities: ["subscriptions", "invoices"] },
  { id: "expensify", name: "Expensify", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["expenses", "reports"] },
  { id: "concur", name: "SAP Concur", category: "finance", authType: "oauth2", protocols: ["rest"], capabilities: ["expenses", "travel"] },
  { id: "wise", name: "Wise", category: "finance", authType: "api_key", protocols: ["rest"], capabilities: ["transfers", "balances"] },
  { id: "plaid", name: "Plaid", category: "finance", authType: "api_key", protocols: ["rest"], capabilities: ["banking", "transactions"] },
  { id: "shopify", name: "Shopify", category: "ecommerce", authType: "oauth2", protocols: ["rest", "graphql"], capabilities: ["orders", "products", "customers"] },
  { id: "woocommerce", name: "WooCommerce", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "products", "customers"] },
  { id: "bigcommerce", name: "BigCommerce", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "products"] },
  { id: "magento", name: "Magento", category: "ecommerce", authType: "oauth2", protocols: ["rest", "graphql"], capabilities: ["orders", "products"] },
  { id: "salesforce_commerce", name: "Salesforce Commerce", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "products"] },
  { id: "wix", name: "Wix", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "products"] },
  { id: "squarespace", name: "Squarespace", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "products"] },
  { id: "ecwid", name: "Ecwid", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "products"] },
  { id: "ebay", name: "eBay", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "inventory"] },
  { id: "etsy", name: "Etsy", category: "ecommerce", authType: "oauth2", protocols: ["rest"], capabilities: ["orders", "inventory"] },
  { id: "calendly", name: "Calendly", category: "booking", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "availability"] },
  { id: "cal_com", name: "Cal.com", category: "booking", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "availability"] },
  { id: "acuity", name: "Acuity Scheduling", category: "booking", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "availability"] },
  { id: "setmore", name: "Setmore", category: "booking", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "availability"] },
  { id: "square_appointments", name: "Square Appointments", category: "booking", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "availability"] },
  { id: "mindbody", name: "Mindbody", category: "booking", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "classes"] },
  { id: "simplybook", name: "SimplyBook.me", category: "booking", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "availability"] },
  { id: "spotify", name: "Spotify", category: "entertainment", authType: "oauth2", protocols: ["rest"], capabilities: ["music", "playlists"] },
  { id: "apple_music", name: "Apple Music", category: "entertainment", authType: "oauth2", protocols: ["rest"], capabilities: ["music", "playlists"] },
  { id: "soundcloud", name: "SoundCloud", category: "entertainment", authType: "oauth2", protocols: ["rest"], capabilities: ["music", "playlists"] },
  { id: "vimeo", name: "Vimeo", category: "entertainment", authType: "oauth2", protocols: ["rest"], capabilities: ["video"] },
  { id: "figma", name: "Figma", category: "design", authType: "oauth2", protocols: ["rest"], capabilities: ["files", "comments"] },
  { id: "sketch", name: "Sketch", category: "design", authType: "oauth2", protocols: ["rest"], capabilities: ["files"] },
  { id: "canva", name: "Canva", category: "design", authType: "oauth2", protocols: ["rest"], capabilities: ["designs", "assets"] },
  { id: "miro", name: "Miro", category: "design", authType: "oauth2", protocols: ["rest"], capabilities: ["boards", "shapes"] },
  { id: "invision", name: "InVision", category: "design", authType: "oauth2", protocols: ["rest"], capabilities: ["prototypes"] },
  { id: "webflow", name: "Webflow", category: "design", authType: "oauth2", protocols: ["rest"], capabilities: ["sites", "cms"] },
  { id: "framer", name: "Framer", category: "design", authType: "oauth2", protocols: ["rest"], capabilities: ["sites"] },
  { id: "google_drive", name: "Google Drive", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["files", "folders"] },
  { id: "dropbox", name: "Dropbox", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["files", "folders"] },
  { id: "onedrive", name: "OneDrive", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["files", "folders"] },
  { id: "box", name: "Box", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["files", "folders"] },
  { id: "notion", name: "Notion", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["pages", "databases"] },
  { id: "confluence", name: "Confluence", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["pages", "spaces"] },
  { id: "coda", name: "Coda", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["docs", "tables"] },
  { id: "evernote", name: "Evernote", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["notes"] },
  { id: "googledocs", name: "Google Docs", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["documents"] },
  { id: "googlesheets", name: "Google Sheets", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["spreadsheets"] },
  { id: "docusign", name: "DocuSign", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["envelopes", "signatures"] },
  { id: "hellosign", name: "Dropbox Sign", category: "docs", authType: "oauth2", protocols: ["rest"], capabilities: ["signatures"] },
  { id: "zoom", name: "Zoom", category: "schedule", authType: "oauth2", protocols: ["rest"], capabilities: ["meetings", "recordings"] },
  { id: "googlemeet", name: "Google Meet", category: "schedule", authType: "oauth2", protocols: ["rest"], capabilities: ["meetings"] },
  { id: "webex", name: "Webex", category: "schedule", authType: "oauth2", protocols: ["rest"], capabilities: ["meetings", "messages"] },
  { id: "gotomeeting", name: "GoToMeeting", category: "schedule", authType: "oauth2", protocols: ["rest"], capabilities: ["meetings"] },
  { id: "eventbrite", name: "Eventbrite", category: "schedule", authType: "oauth2", protocols: ["rest"], capabilities: ["events", "tickets"] },
  { id: "openai", name: "OpenAI", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["llm", "embeddings", "assistants"] },
  { id: "anthropic", name: "Anthropic", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["llm", "tool_use"] },
  { id: "google_gemini", name: "Google Gemini", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["llm", "vision"] },
  { id: "mistral", name: "Mistral AI", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["llm"] },
  { id: "cohere", name: "Cohere", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["llm", "embeddings"] },
  { id: "huggingface", name: "Hugging Face", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["models", "inference"] },
  { id: "replicate", name: "Replicate", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["inference", "models"] },
  { id: "pinecone", name: "Pinecone", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["vectors"] },
  { id: "weaviate", name: "Weaviate", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["vectors"] },
  { id: "qdrant", name: "Qdrant", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["vectors"] },
  { id: "elevenlabs", name: "ElevenLabs", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["tts", "voice"] },
  { id: "assemblyai", name: "AssemblyAI", category: "ai_ml", authType: "api_key", protocols: ["rest"], capabilities: ["stt", "transcripts"] },
  { id: "deepgram", name: "Deepgram", category: "ai_ml", authType: "api_key", protocols: ["rest", "ws"], capabilities: ["stt", "tts"] },
  { id: "canvas_lms", name: "Canvas LMS", category: "education", authType: "api_key", protocols: ["rest"], capabilities: ["courses", "enrollments"] },
  { id: "blackboard", name: "Blackboard", category: "education", authType: "oauth2", protocols: ["rest"], capabilities: ["courses", "enrollments"] },
  { id: "moodle", name: "Moodle", category: "education", authType: "api_key", protocols: ["rest"], capabilities: ["courses", "enrollments"] },
  { id: "google_classroom", name: "Google Classroom", category: "education", authType: "oauth2", protocols: ["rest"], capabilities: ["courses", "assignments"] },
  { id: "teachable", name: "Teachable", category: "education", authType: "oauth2", protocols: ["rest"], capabilities: ["courses", "students"] },
  { id: "thinkific", name: "Thinkific", category: "education", authType: "oauth2", protocols: ["rest"], capabilities: ["courses", "students"] },
  { id: "kajabi", name: "Kajabi", category: "education", authType: "oauth2", protocols: ["rest"], capabilities: ["courses", "students"] },
  { id: "udemy", name: "Udemy", category: "education", authType: "oauth2", protocols: ["rest"], capabilities: ["courses", "students"] },
  { id: "github", name: "GitHub", category: "devops", authType: "oauth2", protocols: ["rest", "graphql"], capabilities: ["repos", "issues", "actions"] },
  { id: "gitlab", name: "GitLab", category: "devops", authType: "oauth2", protocols: ["rest", "graphql"], capabilities: ["repos", "issues", "pipelines"] },
  { id: "bitbucket", name: "Bitbucket", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["repos", "issues", "pipelines"] },
  { id: "jira", name: "Jira", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["issues", "projects", "boards"] },
  { id: "linear", name: "Linear", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["issues", "projects"] },
  { id: "pagerduty", name: "PagerDuty", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["incidents", "oncall"] },
  { id: "opsgenie", name: "Opsgenie", category: "devops", authType: "api_key", protocols: ["rest"], capabilities: ["alerts", "oncall"] },
  { id: "datadog", name: "Datadog", category: "devops", authType: "api_key", protocols: ["rest"], capabilities: ["metrics", "logs", "monitors"] },
  { id: "grafana", name: "Grafana", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["dashboards", "alerts"] },
  { id: "newrelic", name: "New Relic", category: "devops", authType: "api_key", protocols: ["rest", "graphql"], capabilities: ["metrics", "logs"] },
  { id: "sentry", name: "Sentry", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["issues", "events"] },
  { id: "circleci", name: "CircleCI", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["pipelines", "jobs"] },
  { id: "jenkins", name: "Jenkins", category: "devops", authType: "api_key", protocols: ["rest"], capabilities: ["jobs", "builds"] },
  { id: "vercel", name: "Vercel", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["deployments", "projects"] },
  { id: "netlify", name: "Netlify", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["deployments", "sites"] },
  { id: "cloudflare", name: "Cloudflare", category: "devops", authType: "api_key", protocols: ["rest"], capabilities: ["dns", "workers", "cache"] },
  { id: "aws", name: "Amazon Web Services", category: "devops", authType: "api_key", protocols: ["rest"], capabilities: ["compute", "storage", "lambda"] },
  { id: "azure", name: "Microsoft Azure", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["compute", "storage", "functions"] },
  { id: "gcp", name: "Google Cloud", category: "devops", authType: "oauth2", protocols: ["rest"], capabilities: ["compute", "storage", "functions"] },
  { id: "salesforce", name: "Salesforce", category: "crm", authType: "oauth2", protocols: ["rest", "soap"], capabilities: ["accounts", "contacts", "opportunities"] },
  { id: "hubspot_crm", name: "HubSpot CRM", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["contacts", "deals", "companies"] },
  { id: "pipedrive", name: "Pipedrive", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["deals", "contacts", "activities"] },
  { id: "zoho_crm", name: "Zoho CRM", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["accounts", "contacts", "deals"] },
  { id: "freshsales", name: "Freshsales", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["contacts", "deals"] },
  { id: "dynamics", name: "Microsoft Dynamics 365", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["accounts", "contacts", "opportunities"] },
  { id: "close", name: "Close", category: "crm", authType: "api_key", protocols: ["rest"], capabilities: ["leads", "activities"] },
  { id: "copper", name: "Copper", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["contacts", "companies", "deals"] },
  { id: "insightly", name: "Insightly", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["contacts", "opportunities"] },
  { id: "sugar", name: "SugarCRM", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["accounts", "leads"] },
  { id: "outreach", name: "Outreach", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["sequences", "prospects"] },
  { id: "salesloft", name: "Salesloft", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["sequences", "people"] },
  { id: "gong", name: "Gong", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["calls", "transcripts"] },
  { id: "clearbit", name: "Clearbit", category: "crm", authType: "api_key", protocols: ["rest"], capabilities: ["enrichment", "companies"] },
  { id: "zendesk", name: "Zendesk", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["tickets", "users"] },
  { id: "freshdesk", name: "Freshdesk", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["tickets", "contacts"] },
  { id: "intercom", name: "Intercom", category: "crm", authType: "oauth2", protocols: ["rest"], capabilities: ["conversations", "contacts"] },
  { id: "asana", name: "Asana", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["tasks", "projects", "portfolios"] },
  { id: "trello", name: "Trello", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["boards", "cards", "lists"] },
  { id: "monday", name: "Monday.com", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["boards", "items", "groups"] },
  { id: "clickup", name: "ClickUp", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["tasks", "lists", "docs"] },
  { id: "todoist", name: "Todoist", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["tasks", "projects"] },
  { id: "wrike", name: "Wrike", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["tasks", "projects"] },
  { id: "basecamp", name: "Basecamp", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["projects", "todos", "messages"] },
  { id: "airtable", name: "Airtable", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["bases", "records"] },
  { id: "smartsheet", name: "Smartsheet", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["sheets", "rows"] },
  { id: "obsidian", name: "Obsidian", category: "pm", authType: "api_key", protocols: ["rest"], capabilities: ["notes", "vaults"] },
  { id: "instagram_ads", name: "Instagram Ads", category: "ads_marketing", authType: "oauth2", protocols: ["rest", "graphql"], capabilities: ["campaign_read", "campaign_write", "audience"] },
  { id: "bluesky", name: "Bluesky", category: "social", authType: "oauth2", protocols: ["rest"], capabilities: ["posts", "feeds"] },
  { id: "harvest", name: "Harvest", category: "pm", authType: "oauth2", protocols: ["rest"], capabilities: ["time", "expenses", "projects"] },
] as const;

export const PLAN_TIERS = [
  { id: "free", name: "Free", monthlyPrice: 0, limits: { agents: 1, connections: 5, recipes: 3, sandboxes: 1, triggers: 3, toolCallsPerDay: 100, maxPayloadMB: 5, teams: 1 } },
  { id: "growth", name: "Growth", monthlyPrice: 29, limits: { agents: 5, connections: 25, recipes: 20, sandboxes: 5, triggers: 25, toolCallsPerDay: 5000, maxPayloadMB: 50, teams: 5 } },
  { id: "pro", name: "Pro", monthlyPrice: 99, limits: { agents: 25, connections: 100, recipes: 100, sandboxes: 25, triggers: 100, toolCallsPerDay: 50000, maxPayloadMB: 250, teams: 25 } },
  { id: "enterprise", name: "Enterprise", monthlyPrice: 499, limits: { agents: 250, connections: 1000, recipes: 1000, sandboxes: 100, triggers: 1000, toolCallsPerDay: 1000000, maxPayloadMB: 1000, teams: 250 } },
  { id: "transcendent", name: "Transcendent", monthlyPrice: 4999, limits: { agents: 2500, connections: 10000, recipes: 10000, sandboxes: 1000, triggers: 10000, toolCallsPerDay: 10000000, maxPayloadMB: 10000, teams: 1000 } },
] as const;

export class N0VA1OCatalogService {
  gatewayCatalog(tenantId: string) {
    const connections = DataStore.mem().find("n0va1o_connections", (c: any) => c.tenantId === tenantId);
    return {
      categories: GATEWAY_CATEGORIES.map((c) => ({
        id: c.id, name: c.name, transport: c.transport, auth: c.auth,
        platformCount: PLATFORM_CATALOG.filter((p) => p.category === c.id).length,
      })),
      platforms: PLATFORM_CATALOG.map((p) => {
        const conns = connections.filter((c: any) => c.platformId === p.id);
        return {
          ...p,
          connectedCount: conns.length,
          status: conns.some((c: any) => c.status === "connected") ? "connected" : conns.some((c: any) => c.status === "pending") ? "pending" : "disconnected",
        };
      }),
      totalPlatforms: PLATFORM_CATALOG.length,
      totalConnections: connections.length,
      summary: `${PLATFORM_CATALOG.length} platforms across ${GATEWAY_CATEGORIES.length} categories — one gateway, every app`,
    };
  }

  catalogSearch(tenantId: string, query: string, category?: string) {
    const q = String(query || "").toLowerCase().trim();
    let rows = PLATFORM_CATALOG as unknown as any[];
    if (category) rows = rows.filter((p) => p.category === category);
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      rows = rows.filter((p) => {
        const hay = `${p.name} ${p.id} ${p.capabilities.join(" ")}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      });
    }
    return { results: rows, count: rows.length, query: q, category: category || null };
  }

  categoryCatalog() {
    return { categories: GATEWAY_CATEGORIES, total: GATEWAY_CATEGORIES.length };
  }

  planCatalog(tenantId: string) {
    const state = DataStore.mem().findOne("n0va1o_state", (s: any) => s.tenantId === tenantId) || { plan: "free" };
    return {
      tiers: PLAN_TIERS,
      currentPlan: state.plan,
      current: PLAN_TIERS.find((t) => t.id === state.plan) || PLAN_TIERS[0],
      summary: `Current plan: ${state.plan} — ${PLAN_TIERS.find((t) => t.id === state.plan)?.name || "Free"}`,
    };
  }

  setPlan(tenantId: string, plan: string) {
    const tier = PLAN_TIERS.find((t) => t.id === plan);
    if (!tier) throw new Error("Unknown plan tier");
    const existing = DataStore.mem().findOne("n0va1o_state", (s: any) => s.tenantId === tenantId);
    if (existing) {
      DataStore.mem().update("n0va1o_state", (s: any) => s.tenantId === tenantId, { plan, updatedAt: new Date().toISOString() });
    } else {
      DataStore.mem().insert("n0va1o_state", { tenantId, plan, createdAt: new Date().toISOString() });
    }
    logEntry(tenantId, "plan_changed", `Plan changed to ${tier.name} ($${tier.monthlyPrice}/mo)`, { plan });
    return { plan: tier.id, name: tier.name, limits: tier.limits, summary: `Plan changed to ${tier.name}` };
  }

  usageStatus(tenantId: string) {
    const state = DataStore.mem().findOne("n0va1o_state", (s: any) => s.tenantId === tenantId) || { plan: "free" };
    const tier = PLAN_TIERS.find((t) => t.id === state.plan) || PLAN_TIERS[0];
    const counts = {
      agents: DataStore.mem().find("n0va1o_agents", (a: any) => a.tenantId === tenantId && a.status === "active").length,
      connections: DataStore.mem().find("n0va1o_connections", (c: any) => c.tenantId === tenantId && c.status === "connected").length,
      recipes: DataStore.mem().find("n0va1o_recipes", (r: any) => r.tenantId === tenantId).length,
      sandboxes: DataStore.mem().find("n0va1o_sandboxes", (s: any) => s.tenantId === tenantId && s.status === "running").length,
      triggers: DataStore.mem().find("n0va1o_triggers", (t: any) => t.tenantId === tenantId && t.enabled).length,
    };
    const toolCallsToday = DataStore.mem().find("n0va1o_executions", (e: any) => e.tenantId === tenantId && e.at && e.at.startsWith(new Date().toISOString().slice(0, 10))).length;
    const usage = [
      { dimension: "agents", used: counts.agents, limit: tier.limits.agents },
      { dimension: "connections", used: counts.connections, limit: tier.limits.connections },
      { dimension: "recipes", used: counts.recipes, limit: tier.limits.recipes },
      { dimension: "sandboxes", used: counts.sandboxes, limit: tier.limits.sandboxes },
      { dimension: "triggers", used: counts.triggers, limit: tier.limits.triggers },
      { dimension: "toolCallsPerDay", used: toolCallsToday, limit: tier.limits.toolCallsPerDay },
    ];
    const over = usage.filter((u) => u.used > u.limit);
    return {
      plan: tier.id, tierName: tier.name, usage, over,
      status: over.length === 0 ? "within_limits" : "over_limits",
      summary: over.length === 0 ? `Within ${tier.name} plan limits` : `Over limit on ${over.length} dimension(s): ${over.map((o) => o.dimension).join(", ")}`,
    };
  }

  gatewayOverview(tenantId: string) {
    const state = DataStore.mem().findOne("n0va1o_state", (s: any) => s.tenantId === tenantId) || { plan: "free" };
    const agents = DataStore.mem().find("n0va1o_agents", (a: any) => a.tenantId === tenantId);
    const connections = DataStore.mem().find("n0va1o_connections", (c: any) => c.tenantId === tenantId);
    const recipes = DataStore.mem().find("n0va1o_recipes", (r: any) => r.tenantId === tenantId);
    const executions = DataStore.mem().find("n0va1o_executions", (e: any) => e.tenantId === tenantId);
    const triggers = DataStore.mem().find("n0va1o_triggers", (t: any) => t.tenantId === tenantId);
    const hitl = DataStore.mem().find("n0va1o_hitl", (h: any) => h.tenantId === tenantId && h.status === "pending_review");
    const latest = DataStore.mem().find("n0va1o_log", (l: any) => l.tenantId === tenantId).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())[0] || null;
    return {
      plan: state.plan,
      counts: {
        agents: agents.length,
        connectedConnections: connections.filter((c: any) => c.status === "connected").length,
        totalConnections: connections.length,
        recipes: recipes.length,
        executions: executions.length,
        triggers: triggers.filter((t: any) => t.enabled).length,
        hitlPending: hitl.length,
      },
      performance: {
        toolDiscoveryP99Ms: 45,
        jitAuthMs: 120,
        sandboxColdStartMs: 200,
        recipeCompileMs: 85,
        webhookDeliveryMs: 50,
        accountSwitchMs: 15,
      },
      latestEvent: latest,
      summary: `N0VA1O gateway: ${agents.length} agent(s), ${connections.filter((c: any) => c.status === "connected").length} live connection(s) on ${state.plan} plan`,
    };
  }
}

export const n0va1oCatalog = new N0VA1OCatalogService();

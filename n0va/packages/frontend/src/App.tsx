import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const MailInbox = lazy(() => import("./pages/MailInbox"));
const MailSearch = lazy(() => import("./pages/MailSearch"));
const MailRules = lazy(() => import("./pages/MailRules"));
const Mailboxes = lazy(() => import("./pages/Mailboxes"));
const MailAI = lazy(() => import("./pages/MailAI"));
const MailContacts = lazy(() => import("./pages/MailContacts"));
const MailAgent = lazy(() => import("./pages/MailAgent"));
const MailCompliance = lazy(() => import("./pages/MailCompliance"));
const MailTemplates = lazy(() => import("./pages/MailTemplates"));
const MailSignatures = lazy(() => import("./pages/MailSignatures"));
const MailSpam = lazy(() => import("./pages/MailSpam"));
const MailFollowUps = lazy(() => import("./pages/MailFollowUps"));
const MailAnalytics = lazy(() => import("./pages/MailAnalytics"));
const MailFiles = lazy(() => import("./pages/MailFiles"));
const MailCollaboration = lazy(() => import("./pages/MailCollaboration"));
const MailPredict = lazy(() => import("./pages/MailPredict"));
const MailCampaigns = lazy(() => import("./pages/MailCampaigns"));
const MailDiscovery = lazy(() => import("./pages/MailDiscovery"));
const MailDomains = lazy(() => import("./pages/MailDomains"));
const MailVoice = lazy(() => import("./pages/MailVoice"));
const MailCommandCenter = lazy(() => import("./pages/MailCommandCenter"));
const MailOps = lazy(() => import("./pages/MailOps"));
const MailProtection = lazy(() => import("./pages/MailProtection"));
const MailWebhooks = lazy(() => import("./pages/MailWebhooks"));
const MailAgents = lazy(() => import("./pages/MailAgents"));
const MailIntegrations = lazy(() => import("./pages/MailIntegrations"));
const MailBilling = lazy(() => import("./pages/MailBilling"));
const MailNotifications = lazy(() => import("./pages/MailNotifications"));
const AutonomousCampaignManager = lazy(() => import("./pages/AutonomousCampaignManager"));
const UnifiedAdsPipeline = lazy(() => import("./pages/UnifiedAdsPipeline"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const Creatives = lazy(() => import("./pages/Creatives"));
const Audiences = lazy(() => import("./pages/Audiences"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const Platforms = lazy(() => import("./pages/Platforms"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Recipes = lazy(() => import("./pages/Recipes"));
const WarRoom = lazy(() => import("./pages/WarRoom"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const ConnectedAccounts = lazy(() => import("./pages/ConnectedAccounts"));
const WebhooksPage = lazy(() => import("./pages/WebhooksPage"));
const WebhookDetail = lazy(() => import("./pages/WebhookDetail"));
const AttributionComparison = lazy(() => import("./pages/AttributionComparison"));
const CampaignForecast = lazy(() => import("./pages/CampaignForecast"));
const CreativeABTest = lazy(() => import("./pages/CreativeABTest"));
const AudienceOverlap = lazy(() => import("./pages/AudienceOverlap"));
const Login = lazy(() => import("./pages/Login"));
const AudienceDetail = lazy(() => import("./pages/AudienceDetail"));
const CreativeDetail = lazy(() => import("./pages/CreativeDetail"));
const FraudEvaluation = lazy(() => import("./pages/FraudEvaluation"));
const BudgetStrategy = lazy(() => import("./pages/BudgetStrategy"));
const ActivityFeed = lazy(() => import("./pages/ActivityFeed"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const HyperContext = lazy(() => import("./pages/HyperContext"));
const CampaignWizard = lazy(() => import("./pages/CampaignWizard"));
const PlatformDetail = lazy(() => import("./pages/PlatformDetail"));
const PlatformHealth = lazy(() => import("./pages/PlatformHealth"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const CreativeFatigue = lazy(() => import("./pages/CreativeFatigue"));
const CampaignCalendar = lazy(() => import("./pages/CampaignCalendar"));
const ReportCenter = lazy(() => import("./pages/ReportCenter"));
const AudienceBuilder = lazy(() => import("./pages/AudienceBuilder"));
const Billing = lazy(() => import("./pages/Billing"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const AgentCreator = lazy(() => import("./pages/AgentCreator"));
const CreativeBuilder = lazy(() => import("./pages/CreativeBuilder"));
const RecipeBuilder = lazy(() => import("./pages/RecipeBuilder"));
const CampaignComparison = lazy(() => import("./pages/CampaignComparison"));
const CampaignInsights = lazy(() => import("./pages/CampaignInsights"));
const CampaignTemplates = lazy(() => import("./pages/CampaignTemplates"));
const CampaignReview = lazy(() => import("./pages/CampaignReview"));
const GlobalSearch = lazy(() => import("./pages/GlobalSearch"));
const CampaignBriefGenerator = lazy(() => import("./pages/CampaignBriefGenerator"));
const AccountPage = lazy(() => import("./pages/Account"));
const BrandKit = lazy(() => import("./pages/BrandKit"));
const DataImport = lazy(() => import("./pages/DataImport"));
const Approvals = lazy(() => import("./pages/Approvals"));
const CreativeGallery = lazy(() => import("./pages/CreativeGallery"));
const LaunchChecklist = lazy(() => import("./pages/LaunchChecklist"));
const MarketingCalendar = lazy(() => import("./pages/MarketingCalendar"));
const ExportCenter = lazy(() => import("./pages/ExportCenter"));
const ContentLibrary = lazy(() => import("./pages/ContentLibrary"));
const Goals = lazy(() => import("./pages/Goals"));
const ABTesting = lazy(() => import("./pages/ABTesting"));
const Comments = lazy(() => import("./pages/Comments"));
const CompetitiveIntel = lazy(() => import("./pages/CompetitiveIntel"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Automation = lazy(() => import("./pages/Automation"));
const Playbooks = lazy(() => import("./pages/Playbooks"));
const ROICalculator = lazy(() => import("./pages/ROICalculator"));
const Team = lazy(() => import("./pages/Team"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const CustomDashboards = lazy(() => import("./pages/CustomDashboards"));
const AdPreview = lazy(() => import("./pages/AdPreview"));
const Segmentation = lazy(() => import("./pages/Segmentation"));
const UTMBuilder = lazy(() => import("./pages/UTMBuilder"));
const Funnel = lazy(() => import("./pages/Funnel"));
const SmartLists = lazy(() => import("./pages/SmartLists"));
const Briefs = lazy(() => import("./pages/Briefs"));
const LandingPages = lazy(() => import("./pages/LandingPages"));
const CostTracker = lazy(() => import("./pages/CostTracker"));
const MarketingForms = lazy(() => import("./pages/MarketingForms"));
const ChannelPerformance = lazy(() => import("./pages/ChannelPerformance"));
const KeywordManager = lazy(() => import("./pages/KeywordManager"));
const CampaignArchive = lazy(() => import("./pages/CampaignArchive"));
const LeadScoring = lazy(() => import("./pages/LeadScoring"));
const CampaignSnapshots = lazy(() => import("./pages/CampaignSnapshots"));
const SocialPublisher = lazy(() => import("./pages/SocialPublisher"));
const CampaignAlerts = lazy(() => import("./pages/CampaignAlerts"));
const AdCopyGenerator = lazy(() => import("./pages/AdCopyGenerator"));
const CampaignSurveys = lazy(() => import("./pages/CampaignSurveys"));
const CampaignHealth = lazy(() => import("./pages/CampaignHealth"));
const CustomerJourneyBuilder = lazy(() => import("./pages/CustomerJourneyBuilder"));
const CampaignBoard = lazy(() => import("./pages/CampaignBoard"));
const LaunchReadiness = lazy(() => import("./pages/LaunchReadiness"));
const MediaKit = lazy(() => import("./pages/MediaKit"));
const CampaignScheduler = lazy(() => import("./pages/CampaignScheduler"));
const IntentConsole = lazy(() => import("./pages/IntentConsole"));
const SandboxConsole = lazy(() => import("./pages/SandboxConsole"));
const DeliveryDashboard = lazy(() => import("./pages/DeliveryDashboard"));
const BudgetPacing = lazy(() => import("./pages/BudgetPacing"));
const SharedCampaignView = lazy(() => import("./pages/SharedCampaignView"));
const MentionsPage = lazy(() => import("./pages/MentionsPage"));
const CampaignOptimizer = lazy(() => import("./pages/CampaignOptimizer"));
const ReportBuilder = lazy(() => import("./pages/ReportBuilder"));
const AudienceInsights = lazy(() => import("./pages/AudienceInsights"));
const DeveloperPortal = lazy(() => import("./pages/DeveloperPortal"));
const PlaybookExecution = lazy(() => import("./pages/PlaybookExecution"));
const LandingPageBuilder = lazy(() => import("./pages/LandingPageBuilder"));
const InfluencerManagement = lazy(() => import("./pages/InfluencerManagement"));
const CampaignIssues = lazy(() => import("./pages/CampaignIssues"));
const CompetitiveBenchmarking = lazy(() => import("./pages/CompetitiveBenchmarking"));
const CustomerDataPlatform = lazy(() => import("./pages/CustomerDataPlatform"));
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
const CampaignScorecard = lazy(() => import("./pages/CampaignScorecard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PredictiveForecasting = lazy(() => import("./pages/PredictiveForecasting"));
const ABTestStatistics = lazy(() => import("./pages/ABTestStatistics"));
const AnomalyDetection = lazy(() => import("./pages/AnomalyDetection"));
const PortfolioBudgetOptimizer = lazy(() => import("./pages/PortfolioBudgetOptimizer"));
const CampaignSaturation = lazy(() => import("./pages/CampaignSaturation"));
const N0VA1OGateway = lazy(() => import("./pages/N0VA1OGateway"));
const MarketingIntelligence = lazy(() => import("./pages/MarketingIntelligence"));
const AgentIntelligence = lazy(() => import("./pages/AgentIntelligence"));
const PredictiveBidding = lazy(() => import("./pages/PredictiveBidding"));
const CustomerLifetimeValue = lazy(() => import("./pages/CustomerLifetimeValue"));
const AdCopyOptimizer = lazy(() => import("./pages/AdCopyOptimizer"));
const MarketingMixModel = lazy(() => import("./pages/MarketingMixModel"));
const CampaignSimulation = lazy(() => import("./pages/CampaignSimulation"));
const RealTimeBidding = lazy(() => import("./pages/RealTimeBidding"));
const CreativeAIEnhanced = lazy(() => import("./pages/CreativeAIEnhanced"));
const AudienceInsightsEnhanced = lazy(() => import("./pages/AudienceInsightsEnhanced"));
const AdCopyPersonalization = lazy(() => import("./pages/AdCopyPersonalization"));
const CampaignHealthPredictor = lazy(() => import("./pages/CampaignHealthPredictor"));
const DSAlgorithms = lazy(() => import("./pages/DSAlgorithms"));
const AttributionAnalytics = lazy(() => import("./pages/AttributionAnalytics"));
const ForecastingDashboard = lazy(() => import("./pages/ForecastingDashboard"));
const MarketingROIAnalyzer = lazy(() => import("./pages/MarketingROIAnalyzer"));
const PredictiveForecastingEnhanced = lazy(() => import("./pages/PredictiveForecastingEnhanced"));
const IncrementalityTesting = lazy(() => import("./pages/IncrementalityTesting"));
const SearchIntelligence = lazy(() => import("./pages/SearchIntelligence"));
const AnomalyDetectionEnhanced = lazy(() => import("./pages/AnomalyDetectionEnhanced"));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("n0va_token");
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/shared/:token" element={<SharedCampaignView />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <ToastProvider>
            <Layout>
              <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/command-center" element={<CommandCenter />} />
                <Route path="/mail" element={<MailInbox />} />
                <Route path="/mail/search" element={<MailSearch />} />
                <Route path="/mail/rules" element={<MailRules />} />
                <Route path="/mail/mailboxes" element={<Mailboxes />} />
                <Route path="/mail/ai" element={<MailAI />} />
                <Route path="/mail/contacts" element={<MailContacts />} />
                <Route path="/mail/agent" element={<MailAgent />} />
                <Route path="/mail/compliance" element={<MailCompliance />} />
                <Route path="/mail/templates" element={<MailTemplates />} />
                <Route path="/mail/signatures" element={<MailSignatures />} />
                <Route path="/mail/spam" element={<MailSpam />} />
                <Route path="/mail/followups" element={<MailFollowUps />} />
                <Route path="/mail/analytics" element={<MailAnalytics />} />
                <Route path="/mail/files" element={<MailFiles />} />
                <Route path="/mail/collaboration" element={<MailCollaboration />} />
                <Route path="/mail/predict" element={<MailPredict />} />
                <Route path="/mail/campaigns" element={<MailCampaigns />} />
                <Route path="/mail/discovery" element={<MailDiscovery />} />
                <Route path="/mail/domains" element={<MailDomains />} />
                <Route path="/mail/voice" element={<MailVoice />} />
                <Route path="/mail/command-center" element={<MailCommandCenter />} />
                <Route path="/mail/ops" element={<MailOps />} />
          <Route path="/mail/protection" element={<MailProtection />} />
                <Route path="/mail/webhooks" element={<MailWebhooks />} />
                <Route path="/mail/agents" element={<MailAgents />} />
                <Route path="/mail/integrations" element={<MailIntegrations />} />
                <Route path="/mail/billing" element={<MailBilling />} />
                <Route path="/mail/notifications" element={<MailNotifications />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/new" element={<CampaignWizard />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/creatives" element={<Creatives />} />
                <Route path="/creatives/new" element={<CreativeBuilder />} />
                <Route path="/creatives/:id" element={<CreativeDetail />} />
                <Route path="/audiences" element={<Audiences />} />
                <Route path="/audiences/new" element={<AudienceBuilder />} />
                <Route path="/audiences/:id" element={<AudienceDetail />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/agents/new" element={<AgentCreator />} />
                <Route path="/agents/:id" element={<AgentDetail />} />
                <Route path="/platforms" element={<Platforms />} />
                <Route path="/platforms/:id" element={<PlatformDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/recipes/new" element={<RecipeBuilder />} />
                <Route path="/recipes/:id" element={<RecipeDetail />} />
                <Route path="/war-room" element={<WarRoom />} />
                <Route path="/fraud-evaluation" element={<FraudEvaluation />} />
                <Route path="/budget-strategy" element={<BudgetStrategy />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/connected-accounts" element={<ConnectedAccounts />} />
                <Route path="/platform-health" element={<PlatformHealth />} />
                <Route path="/creative-fatigue" element={<CreativeFatigue />} />
                <Route path="/campaign-calendar" element={<CampaignCalendar />} />
                <Route path="/campaign-comparison" element={<CampaignComparison />} />
                <Route path="/insights" element={<CampaignInsights />} />
                <Route path="/templates" element={<CampaignTemplates />} />
                <Route path="/campaign-review" element={<CampaignReview />} />
                <Route path="/search" element={<GlobalSearch />} />
                <Route path="/brief-generator" element={<CampaignBriefGenerator />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/brand-kit" element={<BrandKit />} />
                <Route path="/import" element={<DataImport />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/creative-gallery" element={<CreativeGallery />} />
                <Route path="/launch-checklist" element={<LaunchChecklist />} />
                <Route path="/marketing-calendar" element={<MarketingCalendar />} />
                <Route path="/export" element={<ExportCenter />} />
                <Route path="/content-library" element={<ContentLibrary />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/ab-testing" element={<ABTesting />} />
                <Route path="/comments" element={<Comments />} />
                <Route path="/competitive-intel" element={<CompetitiveIntel />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/automation" element={<Automation />} />
                <Route path="/playbooks" element={<Playbooks />} />
                <Route path="/roi-calculator" element={<ROICalculator />} />
                <Route path="/team" element={<Team />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/custom-dashboards" element={<CustomDashboards />} />
                <Route path="/ad-preview" element={<AdPreview />} />
                <Route path="/segmentation" element={<Segmentation />} />
                <Route path="/utm-builder" element={<UTMBuilder />} />
                <Route path="/funnel" element={<Funnel />} />
                <Route path="/smart-lists" element={<SmartLists />} />
                <Route path="/briefs" element={<Briefs />} />
                <Route path="/landing-pages" element={<LandingPages />} />
                <Route path="/cost-tracker" element={<CostTracker />} />
                <Route path="/forms" element={<MarketingForms />} />
                <Route path="/channel-performance" element={<ChannelPerformance />} />
                <Route path="/keywords" element={<KeywordManager />} />
                <Route path="/campaign-archive" element={<CampaignArchive />} />
                <Route path="/lead-scoring" element={<LeadScoring />} />
                <Route path="/campaign-snapshots" element={<CampaignSnapshots />} />
                <Route path="/social-publisher" element={<SocialPublisher />} />
                <Route path="/campaign-alerts" element={<CampaignAlerts />} />
                <Route path="/ad-copy" element={<AdCopyGenerator />} />
                <Route path="/surveys" element={<CampaignSurveys />} />
                <Route path="/campaign-health" element={<CampaignHealth />} />
                <Route path="/customer-journey" element={<CustomerJourneyBuilder />} />
                <Route path="/campaign-board" element={<CampaignBoard />} />
                <Route path="/launch-readiness" element={<LaunchReadiness />} />
                <Route path="/media-kit" element={<MediaKit />} />
                <Route path="/webhooks" element={<WebhooksPage />} />
                <Route path="/webhooks/:id" element={<WebhookDetail />} />
                <Route path="/attribution" element={<AttributionComparison />} />
                <Route path="/forecast" element={<CampaignForecast />} />
                <Route path="/creative-ab-test" element={<CreativeABTest />} />
                <Route path="/audience-overlap" element={<AudienceOverlap />} />
                <Route path="/activity" element={<ActivityFeed />} />
                <Route path="/notifications" element={<NotificationCenter />} />
                <Route path="/mentions" element={<MentionsPage />} />
                <Route path="/hyper-context" element={<HyperContext />} />
                <Route path="/reports" element={<ReportCenter />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/billing/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/campaign-scheduler" element={<CampaignScheduler />} />
                <Route path="/intent-console" element={<IntentConsole />} />
                <Route path="/sandbox-console" element={<SandboxConsole />} />
                <Route path="/delivery" element={<DeliveryDashboard />} />
                <Route path="/budget-pacing" element={<BudgetPacing />} />
                <Route path="/campaign-optimizer" element={<CampaignOptimizer />} />
                <Route path="/report-builder" element={<ReportBuilder />} />
                <Route path="/audience-insights" element={<AudienceInsights />} />
                <Route path="/developer-portal" element={<DeveloperPortal />} />
                <Route path="/playbook-execution" element={<PlaybookExecution />} />
                <Route path="/landing-page-builder" element={<LandingPageBuilder />} />
                <Route path="/influencer-management" element={<InfluencerManagement />} />
                <Route path="/campaign-issues" element={<CampaignIssues />} />
                <Route path="/competitive-benchmarking" element={<CompetitiveBenchmarking />} />
                <Route path="/cdp" element={<CustomerDataPlatform />} />
                <Route path="/workflow-builder" element={<WorkflowBuilder />} />
                <Route path="/campaign-scorecard" element={<CampaignScorecard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/predictive-forecasting" element={<PredictiveForecasting />} />
                <Route path="/ab-test-statistics" element={<ABTestStatistics />} />
                <Route path="/anomaly-detection" element={<AnomalyDetection />} />
                <Route path="/portfolio-budget-optimizer" element={<PortfolioBudgetOptimizer />} />
                <Route path="/campaign-saturation" element={<CampaignSaturation />} />
                <Route path="/n0va1o" element={<N0VA1OGateway />} />
                <Route path="/marketing-intelligence" element={<MarketingIntelligence />} />
                <Route path="/agent-intelligence" element={<AgentIntelligence />} />
                <Route path="/predictive-bidding" element={<PredictiveBidding />} />
                <Route path="/customer-lifetime-value" element={<CustomerLifetimeValue />} />
                <Route path="/ad-copy-optimizer" element={<AdCopyOptimizer />} />
                <Route path="/marketing-mix-model" element={<MarketingMixModel />} />
                <Route path="/campaign-simulation" element={<CampaignSimulation />} />
                <Route path="/real-time-bidding" element={<RealTimeBidding />} />
                <Route path="/creative-ai-enhanced" element={<CreativeAIEnhanced />} />
                <Route path="/audience-insights-enhanced" element={<AudienceInsightsEnhanced />} />
                <Route path="/ad-copy-personalization" element={<AdCopyPersonalization />} />
                <Route path="/campaign-health-predictor" element={<CampaignHealthPredictor />} />
                <Route path="/ds-algorithms" element={<DSAlgorithms />} />
                <Route path="/attribution-analytics" element={<AttributionAnalytics />} />
                <Route path="/forecasting-dashboard" element={<ForecastingDashboard />} />
                <Route path="/marketing-roi" element={<MarketingROIAnalyzer />} />
                <Route path="/predictive-forecasting-enhanced" element={<PredictiveForecastingEnhanced />} />
                <Route path="/incrementality-testing" element={<IncrementalityTesting />} />
                <Route path="/search-intelligence" element={<SearchIntelligence />} />
                <Route path="/anomaly-detection-enhanced" element={<AnomalyDetectionEnhanced />} />
                <Route path="/autonomous-campaign-manager" element={<AutonomousCampaignManager />} />
                <Route path="/unified-ads-pipeline" element={<UnifiedAdsPipeline />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </Layout>
            </ToastProvider>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

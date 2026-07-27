import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Creatives from "./pages/Creatives";
import Audiences from "./pages/Audiences";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Platforms from "./pages/Platforms";
import Analytics from "./pages/Analytics";
import Recipes from "./pages/Recipes";
import WarRoom from "./pages/WarRoom";
import SettingsPage from "./pages/Settings";
import ConnectedAccounts from "./pages/ConnectedAccounts";
import WebhooksPage from "./pages/WebhooksPage";
import WebhookDetail from "./pages/WebhookDetail";
import AttributionComparison from "./pages/AttributionComparison";
import CampaignForecast from "./pages/CampaignForecast";
import CreativeABTest from "./pages/CreativeABTest";
import AudienceOverlap from "./pages/AudienceOverlap";
import Login from "./pages/Login";
import AudienceDetail from "./pages/AudienceDetail";
import CreativeDetail from "./pages/CreativeDetail";
import FraudEvaluation from "./pages/FraudEvaluation";
import BudgetStrategy from "./pages/BudgetStrategy";
import ActivityFeed from "./pages/ActivityFeed";
import NotificationCenter from "./pages/NotificationCenter";
import HyperContext from "./pages/HyperContext";
import CampaignWizard from "./pages/CampaignWizard";
import PlatformDetail from "./pages/PlatformDetail";
import PlatformHealth from "./pages/PlatformHealth";
import RecipeDetail from "./pages/RecipeDetail";
import CreativeFatigue from "./pages/CreativeFatigue";
import CampaignCalendar from "./pages/CampaignCalendar";
import ReportCenter from "./pages/ReportCenter";
import AudienceBuilder from "./pages/AudienceBuilder";
import Billing from "./pages/Billing";
import InvoiceDetail from "./pages/InvoiceDetail";
import AgentCreator from "./pages/AgentCreator";
import CreativeBuilder from "./pages/CreativeBuilder";
import RecipeBuilder from "./pages/RecipeBuilder";
import CampaignComparison from "./pages/CampaignComparison";
import CampaignInsights from "./pages/CampaignInsights";
import CampaignTemplates from "./pages/CampaignTemplates";
import CampaignReview from "./pages/CampaignReview";
import GlobalSearch from "./pages/GlobalSearch";
import CampaignBriefGenerator from "./pages/CampaignBriefGenerator";
import AccountPage from "./pages/Account";
import BrandKit from "./pages/BrandKit";
import DataImport from "./pages/DataImport";
import Approvals from "./pages/Approvals";
import CreativeGallery from "./pages/CreativeGallery";
import LaunchChecklist from "./pages/LaunchChecklist";
import MarketingCalendar from "./pages/MarketingCalendar";
import ExportCenter from "./pages/ExportCenter";
import ContentLibrary from "./pages/ContentLibrary";
import Goals from "./pages/Goals";
import ABTesting from "./pages/ABTesting";
import Comments from "./pages/Comments";
import CompetitiveIntel from "./pages/CompetitiveIntel";
import HelpCenter from "./pages/HelpCenter";
import Automation from "./pages/Automation";
import Playbooks from "./pages/Playbooks";
import ROICalculator from "./pages/ROICalculator";
import Team from "./pages/Team";
import AuditLog from "./pages/AuditLog";
import CustomDashboards from "./pages/CustomDashboards";
import AdPreview from "./pages/AdPreview";
import Segmentation from "./pages/Segmentation";
import UTMBuilder from "./pages/UTMBuilder";
import Funnel from "./pages/Funnel";
import SmartLists from "./pages/SmartLists";
import Briefs from "./pages/Briefs";
import LandingPages from "./pages/LandingPages";
import CostTracker from "./pages/CostTracker";
import MarketingForms from "./pages/MarketingForms";
import ChannelPerformance from "./pages/ChannelPerformance";
import KeywordManager from "./pages/KeywordManager";
import CampaignArchive from "./pages/CampaignArchive";
import LeadScoring from "./pages/LeadScoring";
import CampaignSnapshots from "./pages/CampaignSnapshots";
import SocialPublisher from "./pages/SocialPublisher";
import CampaignAlerts from "./pages/CampaignAlerts";
import AdCopyGenerator from "./pages/AdCopyGenerator";
import CampaignSurveys from "./pages/CampaignSurveys";
import CampaignHealth from "./pages/CampaignHealth";
import CustomerJourneyBuilder from "./pages/CustomerJourneyBuilder";
import CampaignBoard from "./pages/CampaignBoard";
import LaunchReadiness from "./pages/LaunchReadiness";
import MediaKit from "./pages/MediaKit";
import CampaignScheduler from "./pages/CampaignScheduler";
import IntentConsole from "./pages/IntentConsole";
import SandboxConsole from "./pages/SandboxConsole";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import BudgetPacing from "./pages/BudgetPacing";
import SharedCampaignView from "./pages/SharedCampaignView";
import MentionsPage from "./pages/MentionsPage";
import CampaignOptimizer from "./pages/CampaignOptimizer";
import ReportBuilder from "./pages/ReportBuilder";
import AudienceInsights from "./pages/AudienceInsights";
import DeveloperPortal from "./pages/DeveloperPortal";
import PlaybookExecution from "./pages/PlaybookExecution";
import LandingPageBuilder from "./pages/LandingPageBuilder";
import InfluencerManagement from "./pages/InfluencerManagement";
import CampaignIssues from "./pages/CampaignIssues";
import CompetitiveBenchmarking from "./pages/CompetitiveBenchmarking";
import CustomerDataPlatform from "./pages/CustomerDataPlatform";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import CampaignScorecard from "./pages/CampaignScorecard";
import AdminDashboard from "./pages/AdminDashboard";
import PredictiveForecasting from "./pages/PredictiveForecasting";
import ABTestStatistics from "./pages/ABTestStatistics";
import AnomalyDetection from "./pages/AnomalyDetection";
import PortfolioBudgetOptimizer from "./pages/PortfolioBudgetOptimizer";
import CampaignSaturation from "./pages/CampaignSaturation";
import N0VA1OGateway from "./pages/N0VA1OGateway";
import MarketingIntelligence from "./pages/MarketingIntelligence";
import AgentIntelligence from "./pages/AgentIntelligence";
import PredictiveBidding from "./pages/PredictiveBidding";
import CustomerLifetimeValue from "./pages/CustomerLifetimeValue";
import AdCopyOptimizer from "./pages/AdCopyOptimizer";
import MarketingMixModel from "./pages/MarketingMixModel";
import CampaignSimulation from "./pages/CampaignSimulation";
import RealTimeBidding from "./pages/RealTimeBidding";
import CreativeAIEnhanced from "./pages/CreativeAIEnhanced";
import AudienceInsightsEnhanced from "./pages/AudienceInsightsEnhanced";
import AdCopyPersonalization from "./pages/AdCopyPersonalization";
import CampaignHealthPredictor from "./pages/CampaignHealthPredictor";
import PredictiveForecastingEnhanced from "./pages/PredictiveForecastingEnhanced";
import IncrementalityTesting from "./pages/IncrementalityTesting";
import SearchIntelligence from "./pages/SearchIntelligence";
import AnomalyDetectionEnhanced from "./pages/AnomalyDetectionEnhanced";

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
              <Routes>
                <Route path="/" element={<Dashboard />} />
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
                <Route path="/predictive-forecasting-enhanced" element={<PredictiveForecastingEnhanced />} />
                <Route path="/incrementality-testing" element={<IncrementalityTesting />} />
                <Route path="/search-intelligence" element={<SearchIntelligence />} />
                <Route path="/anomaly-detection-enhanced" element={<AnomalyDetectionEnhanced />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
            </ToastProvider>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

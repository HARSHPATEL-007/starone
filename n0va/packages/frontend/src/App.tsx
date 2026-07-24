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
                <Route path="/webhooks" element={<WebhooksPage />} />
                <Route path="/webhooks/:id" element={<WebhookDetail />} />
                <Route path="/attribution" element={<AttributionComparison />} />
                <Route path="/forecast" element={<CampaignForecast />} />
                <Route path="/creative-ab-test" element={<CreativeABTest />} />
                <Route path="/audience-overlap" element={<AudienceOverlap />} />
                <Route path="/activity" element={<ActivityFeed />} />
                <Route path="/notifications" element={<NotificationCenter />} />
                <Route path="/hyper-context" element={<HyperContext />} />
                <Route path="/reports" element={<ReportCenter />} />
                <Route path="/billing" element={<Billing />} />
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

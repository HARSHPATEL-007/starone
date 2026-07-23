import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Creatives from "./pages/Creatives";
import Audiences from "./pages/Audiences";
import Agents from "./pages/Agents";
import Platforms from "./pages/Platforms";
import Analytics from "./pages/Analytics";
import Recipes from "./pages/Recipes";
import WarRoom from "./pages/WarRoom";
import SettingsPage from "./pages/Settings";
import ConnectedAccounts from "./pages/ConnectedAccounts";
import WebhooksPage from "./pages/WebhooksPage";
import AttributionComparison from "./pages/AttributionComparison";
import CampaignForecast from "./pages/CampaignForecast";
import CreativeABTest from "./pages/CreativeABTest";
import AudienceOverlap from "./pages/AudienceOverlap";
import Login from "./pages/Login";
import AudienceDetail from "./pages/AudienceDetail";
import FraudEvaluation from "./pages/FraudEvaluation";
import BudgetStrategy from "./pages/BudgetStrategy";

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
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/creatives" element={<Creatives />} />
                <Route path="/audiences" element={<Audiences />} />
                <Route path="/audiences/:id" element={<AudienceDetail />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/platforms" element={<Platforms />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/war-room" element={<WarRoom />} />
                <Route path="/fraud-evaluation" element={<FraudEvaluation />} />
                <Route path="/budget-strategy" element={<BudgetStrategy />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/connected-accounts" element={<ConnectedAccounts />} />
                <Route path="/webhooks" element={<WebhooksPage />} />
                <Route path="/attribution" element={<AttributionComparison />} />
                <Route path="/forecast" element={<CampaignForecast />} />
                <Route path="/creative-ab-test" element={<CreativeABTest />} />
                <Route path="/audience-overlap" element={<AudienceOverlap />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

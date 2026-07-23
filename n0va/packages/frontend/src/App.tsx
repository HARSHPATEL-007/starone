import { Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/creatives" element={<Creatives />} />
        <Route path="/audiences" element={<Audiences />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/platforms" element={<Platforms />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/war-room" element={<WarRoom />} />
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
  );
}

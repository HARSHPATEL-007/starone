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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

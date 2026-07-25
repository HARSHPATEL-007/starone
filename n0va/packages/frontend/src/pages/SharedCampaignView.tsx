import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Shield, Eye, Lock, AlertTriangle, ExternalLink } from "lucide-react";
import { api } from "../api/client";

export default function SharedCampaignView() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<any>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  async function resolve(passwordAttempt?: string) {
    setLoading(true);
    setError("");
    try {
      const shareData = await api.shares.access(token!, passwordAttempt);
      setShare(shareData);
      setNeedsPassword(false);
      const camp = await api.campaigns.get(shareData.entityId);
      setCampaign(camp);
    } catch (err: any) {
      if (err.message?.includes("Password required")) {
        setNeedsPassword(true);
      } else if (err.message?.includes("Invalid password")) {
        setError("Invalid password. Please try again.");
      } else if (err.message?.includes("expired")) {
        setError("This share link has expired.");
      } else {
        setError("This share link is invalid or has been removed.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { resolve(); }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !needsPassword) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="card p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="card p-8 max-w-md w-full">
          <Lock className="w-12 h-12 text-n0va-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2 text-center">Password Required</h1>
          <p className="text-gray-400 mb-4 text-center text-sm">This campaign is protected. Enter the password to view.</p>
          <input type="password" className="input w-full mb-3" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && resolve(password)} />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <button className="btn-primary w-full" onClick={() => resolve(password)}>View Campaign</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Shield className="w-3 h-3" />
          Shared view · {share?.permissions === "edit" ? "Can edit" : "View only"}
          <Eye className="w-3 h-3 ml-2" />
        </div>

        {campaign && (
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
                <p className="text-gray-400 mt-1">{campaign.type} · {campaign.status}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-700 text-gray-400">
                {campaign.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-lg font-semibold text-white">${(campaign.budget?.lifetime || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Spent</p>
                <p className="text-lg font-semibold text-white">${(campaign.budget?.spent || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Platforms</p>
                <p className="text-lg font-semibold text-white">{(campaign.platforms || []).join(", ") || "None"}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Goal</p>
                <p className="text-sm font-semibold text-white truncate">{campaign.goal || "N/A"}</p>
              </div>
            </div>

            {campaign.startDate && (
              <div className="text-xs text-gray-500">
                {new Date(campaign.startDate).toLocaleDateString()} — {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : "No end date"}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 text-center text-xs text-gray-600">
          Powered by N0VA Ads & Marketing
        </div>
      </div>
    </div>
  );
}

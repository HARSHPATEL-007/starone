import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Check, CreditCard, TrendingUp, Users, Image, Bot, Target, DollarSign, Zap, Shield } from "lucide-react";
import { SkeletonCard } from "../components/Skeleton";

interface PricingTier {
  tier: string;
  name: string;
  price: number;
  unit: string;
  minUsers: number;
  maxUsers?: number;
  features: string[];
  n0va1oApiCalls: string;
  highlighted: boolean;
  custom?: boolean;
}

interface BundleDiscount {
  modules: string;
  discount: number;
  bonus: string;
}

interface AddOn {
  name: string;
  description: string;
  price: number;
}

export default function Billing() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<{ tiers: PricingTier[]; bundleDiscounts: BundleDiscount[]; addOns: AddOn[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState("growth");
  const [annual, setAnnual] = useState(true);

  useEffect(() => {
    api.settings.pricing().then((data) => {
      setPricing(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const current = pricing?.tiers.find((t) => t.tier === currentTier);
  const monthlyCost = current ? current.price * (current.minUsers || 1) : 0;
  const annualCost = monthlyCost * 12 * (annual ? 0.83 : 1);

  const USAGE_METRICS = [
    { icon: TrendingUp, label: "Active Campaigns", value: "12 / 25", color: "text-green-400", bg: "bg-green-500/10" },
    { icon: Users, label: "Audience Segments", value: "8 / 50", color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: Image, label: "Creatives", value: "45 / 100", color: "text-purple-400", bg: "bg-purple-500/10" },
    { icon: Bot, label: "AI Agents", value: "4 / 10", color: "text-n0va-400", bg: "bg-n0va-500/10" },
    { icon: Target, label: "Platform Connections", value: "5 / 10", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: DollarSign, label: "Monthly Spend", value: "$24,500", color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Usage</h1>
          <p className="text-sm text-gray-500">Plan details, usage metrics, and upgrade options</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : !pricing ? (
        <div className="card text-center py-12">
          <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Unable to load billing data</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {pricing.tiers.filter((t) => !t.custom).map((tier) => {
              const isCurrent = tier.tier === currentTier;
              const cost = tier.price * (tier.minUsers || 1);
              return (
                <div key={tier.tier} className={`card relative ${tier.highlighted ? "border-n0va-500/50" : ""} ${isCurrent ? "ring-2 ring-n0va-500" : ""}`}>
                  {tier.highlighted && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-n0va-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                      POPULAR
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-2.5 right-3 bg-green-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                      CURRENT
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    {isCurrent && <Shield className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-white">${cost.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">/{tier.unit}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{tier.n0va1oApiCalls} API calls</p>
                  <button
                    onClick={() => setCurrentTier(tier.tier)}
                    className={`w-full text-xs py-2 rounded-lg font-medium transition-all ${isCurrent ? "bg-gray-800 text-gray-400" : "bg-n0va-600 text-white hover:bg-n0va-500"}`}
                  >
                    {isCurrent ? "Current Plan" : "Select"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="card col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">Usage This Month</h3>
              <div className="grid grid-cols-3 gap-3">
                {USAGE_METRICS.map((m) => (
                  <div key={m.label} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>
                        <m.icon className={`w-4 h-4 ${m.color}`} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{m.label}</p>
                    <p className="text-lg font-bold text-white">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Billing Summary</h3>
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Current Plan</p>
                  <p className="text-sm font-medium text-white capitalize">{currentTier} - {current?.name}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Monthly Base</p>
                  <p className="text-sm font-medium text-white">${monthlyCost.toLocaleString()}/{current?.unit}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Annual (17% off)</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={annual} onChange={() => setAnnual(!annual)} className="sr-only peer" />
                      <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-checked:bg-n0va-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                  <p className="text-sm font-medium text-white">${Math.round(annualCost).toLocaleString()}/yr</p>
                </div>
                <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-green-400 font-medium">All features active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Bundle Discounts</h3>
              <div className="space-y-2">
                {pricing.bundleDiscounts.map((bd) => (
                  <div key={bd.modules} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30">
                    <div>
                      <p className="text-sm text-white font-medium">{bd.modules} modules</p>
                      <p className="text-[10px] text-gray-500">{bd.bonus}</p>
                    </div>
                    <span className="text-sm font-bold text-green-400">{bd.discount > 0 ? `${bd.discount}% off` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Add-Ons</h3>
              <div className="space-y-2">
                {pricing.addOns.map((ao) => (
                  <div key={ao.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30">
                    <div>
                      <p className="text-sm text-white font-medium">{ao.name}</p>
                      <p className="text-[10px] text-gray-500">{ao.description}</p>
                    </div>
                    <span className="text-sm font-bold text-white">${ao.price.toLocaleString()}<span className="text-[10px] text-gray-500">/mo</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

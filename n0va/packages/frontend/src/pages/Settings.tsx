import { useEffect, useState, useCallback } from "react";
import { Check, Settings as SettingsIcon, Shield, Bot, Bell, CreditCard, Sliders, Layers, CheckCircle, Clock, Lock } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

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

export default function SettingsPage() {
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState<"pricing" | "tenant" | "notifications" | "agents" | "modules">("pricing");
  const [pricing, setPricing] = useState<{ tiers: PricingTier[]; bundleDiscounts: any[]; addOns: any[] } | null>(null);
  const [tenantSettings, setTenantSettings] = useState<any>(null);
  const [moduleData, setModuleData] = useState<{ total: number; modules: string[] } | null>(null);

  useEffect(() => {
    Promise.all([
      api.settings.pricing().catch(() => null),
      api.settings.tenant().catch(() => null),
      api.settings.modules().catch(() => null),
    ]).then(([p, t, m]) => {
      setPricing(p);
      setTenantSettings(t);
      setModuleData(m);
    });
  }, []);

  const saveSettings = useCallback(async (section: string) => {
    try {
      await api.settings.updateTenant(tenantSettings || {});
      addToast("success", `${section} saved`);
    } catch {
      addToast("error", `Failed to save ${section}`);
    }
  }, [tenantSettings, addToast]);

  const sections = [
    { id: "pricing" as const, label: "Pricing & Plans", icon: CreditCard },
    { id: "tenant" as const, label: "Tenant Settings", icon: Sliders },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "agents" as const, label: "Agent Config", icon: Bot },
    { id: "modules" as const, label: "Modules", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your N0VA Ads & Marketing workspace</p>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeSection === s.id ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveSection(s.id)}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "pricing" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {pricing?.tiers.map((tier) => (
              <div
                key={tier.tier}
                className={`card flex flex-col ${tier.highlighted ? "border-n0va-600/40 ring-1 ring-n0va-600/20" : ""} ${tier.custom ? "border-purple-600/30" : ""}`}
              >
                {tier.highlighted && (
                  <div className="text-xs text-n0va-400 font-medium mb-2">Most Popular</div>
                )}
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-white">
                    {tier.custom ? "Custom" : `$${tier.price}`}
                  </span>
                  <span className="text-sm text-gray-500">/{tier.unit}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {tier.maxUsers ? `${tier.minUsers}–${tier.maxUsers} users` : tier.minUsers ? `${tier.minUsers}+ users` : "Any size"}
                </p>
                <ul className="space-y-2 flex-1 mb-6">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-gray-500 mb-4">
                  N0VA1O: {tier.n0va1oApiCalls}
                </div>
                <button className={`w-full ${tier.highlighted ? "btn-primary" : "btn-secondary"}`}>
                  {tier.custom ? "Contact Sales" : "Get Started"}
                </button>
              </div>
            ))}
          </div>

          {pricing?.bundleDiscounts && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Bundle Discounts</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {pricing.bundleDiscounts.map((bd: any) => (
                  <div key={bd.modules} className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{bd.modules}</p>
                    <p className="text-xs text-gray-500">Modules</p>
                    <p className="text-green-400 font-bold text-sm mt-1">{bd.discount}% off</p>
                    <p className="text-xs text-gray-500 mt-1">{bd.bonus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pricing?.addOns && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Add-Ons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pricing.addOns.map((addon: any) => (
                  <div key={addon.name} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm text-white font-medium">{addon.name}</p>
                      <p className="text-xs text-gray-500">{addon.description}</p>
                    </div>
                    <span className="text-n0va-400 font-bold">${addon.price}/mo</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "tenant" && tenantSettings && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Tenant Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Timezone</label>
              <select className="select" value={tenantSettings.timezone} onChange={(e) => setTenantSettings({ ...tenantSettings, timezone: e.target.value })}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Denver">America/Denver</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Currency</label>
              <select className="select" value={tenantSettings.currency} onChange={(e) => setTenantSettings({ ...tenantSettings, currency: e.target.value })}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="SGD">SGD (S$)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Attribution Model</label>
              <select className="select" value={tenantSettings.attributionModel} onChange={(e) => setTenantSettings({ ...tenantSettings, attributionModel: e.target.value })}>
                <option value="last_click">Last Click</option>
                <option value="first_click">First Click</option>
                <option value="linear">Linear</option>
                <option value="time_decay">Time Decay</option>
                <option value="position_based">Position Based</option>
                <option value="data_driven">Data Driven</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Attribution Window (days)</label>
              <input className="input" type="number" value={tenantSettings.attributionWindow} onChange={(e) => setTenantSettings({ ...tenantSettings, attributionWindow: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Budget Alert Threshold (%)</label>
              <input className="input" type="number" value={tenantSettings.budgetAlertThreshold} onChange={(e) => setTenantSettings({ ...tenantSettings, budgetAlertThreshold: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Brand Safety Min Score</label>
              <input className="input" type="number" value={tenantSettings.brandSafetyMinScore} onChange={(e) => setTenantSettings({ ...tenantSettings, brandSafetyMinScore: parseInt(e.target.value) })} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <button className="btn-primary" onClick={() => saveSettings("Tenant settings")}>Save Settings</button>
          </div>
        </div>
      )}

      {activeSection === "notifications" && tenantSettings && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {Object.entries(tenantSettings.notifications || {}).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-300 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={() => setTenantSettings({
                    ...tenantSettings,
                    notifications: { ...tenantSettings.notifications, [key]: !value },
                  })}
                  className="w-4 h-4 text-n0va-600 bg-gray-700 border-gray-600 rounded focus:ring-n0va-500"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <button className="btn-primary" onClick={() => saveSettings("Notification preferences")}>Save Preferences</button>
          </div>
        </div>
      )}

      {activeSection === "modules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">N0VA Modules</h3>
              <p className="text-sm text-gray-500 mt-1">{moduleData?.total || 0} modules available in your workspace</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(moduleData?.modules || []).map((mod) => {
              const isActive = mod === "Ads & Marketing";
              const isCore = ["Core Platform", "Identity", "Security Suite", "Cloud Storage"].includes(mod);
              const isComing = ["Voice", "Drawings", "Mail", "Meet", "ERP", "Finance", "CRM", "Sign"].includes(mod);
              return (
                <div key={mod} className={`card p-4 ${isActive ? "border-n0va-600/40 ring-1 ring-n0va-600/20" : ""}`}>
                  <div className="flex items-center gap-3">
                    {isActive ? (
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    ) : isCore ? (
                      <Shield className="w-5 h-5 text-n0va-400 shrink-0" />
                    ) : isComing ? (
                      <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
                    ) : (
                      <Layers className="w-5 h-5 text-gray-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{mod}</p>
                      <p className="text-xs mt-0.5">
                        {isActive ? (
                          <span className="text-green-400">Active</span>
                        ) : isCore ? (
                          <span className="text-n0va-400">Core</span>
                        ) : isComing ? (
                          <span className="text-yellow-500">Coming Soon</span>
                        ) : (
                          <span className="text-gray-600">Available</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Active</span>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-n0va-400" /> Core</span>
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-gray-500" /> Available</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-yellow-500" /> Coming Soon</span>
          </div>
        </div>
      )}

      {activeSection === "agents" && tenantSettings && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">AI Agent Configuration</h3>
          <div className="space-y-4">
            {[
              { key: "budgetAgentEnabled", label: "Budget Agent", desc: "Monitors spend pacing and reallocates budget" },
              { key: "creativeAgentEnabled", label: "Creative Agent", desc: "Detects fatigue and generates new variants" },
              { key: "audienceAgentEnabled", label: "Audience Agent", desc: "Analyzes segments and expands lookalikes" },
              { key: "bidAgentEnabled", label: "Bid Agent", desc: "Optimizes bids and adjusts for seasonality" },
              { key: "fraudAgentEnabled", label: "Fraud Agent", desc: "Monitors IVT and auto-pauses suspicious placements" },
            ].map((agent) => (
              <label key={agent.key} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm text-white font-medium">{agent.label}</p>
                  <p className="text-xs text-gray-500">{agent.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={(tenantSettings.agentConfig || {})[agent.key] as boolean}
                  onChange={() => setTenantSettings({
                    ...tenantSettings,
                    agentConfig: {
                      ...tenantSettings.agentConfig,
                      [agent.key]: !(tenantSettings.agentConfig || {})[agent.key],
                    },
                  })}
                  className="w-4 h-4 text-n0va-600 bg-gray-700 border-gray-600 rounded focus:ring-n0va-500"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Max Budget Shift (%)</label>
              <input className="input" type="number" value={tenantSettings.agentConfig?.maxBudgetShiftPercent || 30} onChange={(e) => setTenantSettings({ ...tenantSettings, agentConfig: { ...tenantSettings.agentConfig, maxBudgetShiftPercent: parseInt(e.target.value) } })} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">HITL Threshold ($)</label>
              <input className="input" type="number" value={tenantSettings.agentConfig?.hitlThreshold || 10000} onChange={(e) => setTenantSettings({ ...tenantSettings, agentConfig: { ...tenantSettings.agentConfig, hitlThreshold: parseInt(e.target.value) } })} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <button className="btn-primary" onClick={() => saveSettings("Agent config")}>Save Agent Config</button>
          </div>
        </div>
      )}
    </div>
  );
}

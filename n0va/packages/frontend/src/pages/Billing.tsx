import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, Check, CreditCard, TrendingUp, Users, Image, Bot, Target, DollarSign, Zap, Shield, FileText, Plus, X, Loader, ExternalLink, Download } from "lucide-react";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

interface PricingTier {
  tier: string; name: string; price: number; unit: string;
  minUsers: number; maxUsers?: number; features: string[];
  n0va1oApiCalls: string; highlighted: boolean; custom?: boolean;
}

interface BundleDiscount { modules: string; discount: number; bonus: string; }
interface AddOn { name: string; description: string; price: number; }
interface Subscription { plan: string; status: string; periodStart: string; periodEnd: string; amount: number; currency: string; interval: string; features: string[]; }
interface Invoice { id: string; amount: number; currency: string; status: string; dueDate: string; paidAt?: string; }

export default function Billing() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [pricing, setPricing] = useState<{ tiers: PricingTier[]; bundleDiscounts: BundleDiscount[]; addOns: AddOn[] } | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState("growth");
  const [annual, setAnnual] = useState(true);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ description: "", amount: 0, dueDate: "" });
  const [updatingPlan, setUpdatingPlan] = useState(false);

  useEffect(() => {
    Promise.all([
      api.settings.pricing().catch(() => null),
      api.billing.subscription().catch(() => null),
      api.billing.invoices().catch(() => []),
    ]).then(([p, s, inv]) => {
      setPricing(p);
      setSubscription(s);
      setInvoices(inv || []);
      setLoading(false);
    });
  }, []);

  async function handleSelectPlan(tier: string) {
    if (tier === currentTier) return;
    setCurrentTier(tier);
    setUpdatingPlan(true);
    const tierData = pricing?.tiers.find((t) => t.tier === tier);
    if (tierData) {
      await api.billing.updateSubscription({
        plan: tier, name: tierData.name, amount: tierData.price * (tierData.minUsers || 1),
        currency: "USD", interval: annual ? "year" : "month", status: "active",
        periodStart: new Date().toISOString(),
        periodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
      }).then(() => addToast("success", `Switched to ${tierData.name} plan`)).catch(() => addToast("error", "Failed to update plan"));
    }
    setUpdatingPlan(false);
  }

  async function handleCreateInvoice() {
    if (!invoiceForm.description.trim() || invoiceForm.amount <= 0 || !invoiceForm.dueDate) {
      addToast("error", "All fields are required"); return;
    }
    try {
      const created = await api.billing.createInvoice({
        id: "INV-" + Date.now().toString(36).toUpperCase(),
        description: invoiceForm.description.trim(),
        amount: invoiceForm.amount,
        currency: "USD",
        status: "pending",
        dueDate: new Date(invoiceForm.dueDate).toISOString(),
        createdAt: new Date().toISOString(),
        items: [{ label: invoiceForm.description.trim(), amount: invoiceForm.amount, quantity: 1 }],
      });
      setInvoices([created, ...invoices]);
      setShowCreateInvoice(false);
      setInvoiceForm({ description: "", amount: 0, dueDate: "" });
      addToast("success", "Invoice created");
    } catch { addToast("error", "Failed to create invoice"); }
  }

  const current = pricing?.tiers.find((t) => t.tier === currentTier);
  const monthlyCost = current ? current.price * (current.minUsers || 1) : 0;
  const annualCost = monthlyCost * 12 * (annual ? 0.83 : 1);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const spendTrend = MONTHS.map(m => ({ month: m, spend: Math.round(monthlyCost * (0.7 + Math.random() * 0.6)) }));

  function exportInvoicesCSV() {
    const header = "ID,Amount,Currency,Status,Due Date,Paid Date";
    const rows = invoices.map(inv => `"${inv.id}",${inv.amount},"${inv.currency}","${inv.status}","${new Date(inv.dueDate).toLocaleDateString()}",${inv.paidAt ? `"${new Date(inv.paidAt).toLocaleDateString()}"` : ""}`).join("\n");
    const blob = new Blob(["\ufeff" + header + "\n" + rows], { type: "text/csv;charset=utf-8" });
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "invoices.csv"; el.click();
    addToast("success", "Invoices exported");
  }

  const USAGE_METRICS = [
    { icon: TrendingUp, label: "Active Campaigns", value: "12 / 25", color: "text-green-400", bg: "bg-green-500/10" },
    { icon: Users, label: "Audience Segments", value: "8 / 50", color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: Image, label: "Creatives", value: "45 / 100", color: "text-purple-400", bg: "bg-purple-500/10" },
    { icon: Bot, label: "AI Agents", value: "4 / 10", color: "text-n0va-400", bg: "bg-n0va-500/10" },
    { icon: Target, label: "Platform Connections", value: "5 / 10", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: DollarSign, label: "Monthly Spend", value: "$24,500", color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  if (loading) {
    return <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-3 gap-6">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
    </div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Usage</h1>
          <p className="text-sm text-gray-500">Plan details, usage metrics, and upgrade options</p>
        </div>
      </div>

      {!pricing ? (
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
                  {tier.highlighted && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-n0va-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">POPULAR</div>}
                  {isCurrent && <div className="absolute -top-2.5 right-3 bg-green-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">CURRENT</div>}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    {isCurrent && <Shield className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-white">${cost.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">/{tier.unit}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{tier.n0va1oApiCalls} API calls</p>
                  <button onClick={() => handleSelectPlan(tier.tier)} disabled={isCurrent || updatingPlan}
                    className={`w-full text-xs py-2 rounded-lg font-medium transition-all ${isCurrent ? "bg-gray-800 text-gray-400" : "bg-n0va-600 text-white hover:bg-n0va-500"}`}>
                    {updatingPlan ? <><Loader className="w-3 h-3 animate-spin inline" /> Updating...</> : isCurrent ? "Current Plan" : "Select"}
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
                      <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}><m.icon className={`w-4 h-4 ${m.color}`} /></div>
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
                  <p className="text-sm font-medium text-white capitalize">{subscription?.plan || currentTier} — {subscription?.status || "active"}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Monthly Base</p>
                  <p className="text-sm font-medium text-white">${(subscription?.amount || monthlyCost).toLocaleString()}/{subscription?.interval || current?.unit || "month"}</p>
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
                {subscription?.periodEnd && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Billing Period</p>
                    <p className="text-xs text-white">{new Date(subscription.periodStart).toLocaleDateString()} — {new Date(subscription.periodEnd).toLocaleDateString()}</p>
                  </div>
                )}
                <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3">
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-400" /><p className="text-xs text-green-400 font-medium">All features active</p></div>
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

          <div className="card">
            <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-n0va-400" /> Monthly Spend Trend</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={9} />
                  <YAxis stroke="#6b7280" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                  <Bar dataKey="spend" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-n0va-400" /> Invoices</h3>
              <div className="flex items-center gap-2">
                <button onClick={exportInvoicesCSV} className="btn-ghost text-xs flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
                <button onClick={() => setShowCreateInvoice(true)} className="btn-ghost text-xs flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Create Invoice</button>
              </div>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No invoices yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left py-2 px-3">Invoice</th>
                      <th className="text-right py-2 px-3">Amount</th>
                      <th className="text-right py-2 px-3">Status</th>
                      <th className="text-right py-2 px-3">Due</th>
                      <th className="text-right py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-2 px-3 text-white font-medium">{inv.id}</td>
                        <td className="py-2 px-3 text-right text-gray-300">${inv.amount.toLocaleString()} {inv.currency}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-500/10 text-green-400" : inv.status === "pending" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>{inv.status}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-right">
                          <Link to={`/billing/invoices/${inv.id}`} className="text-gray-600 hover:text-n0va-400"><ExternalLink className="w-3.5 h-3.5" /></Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showCreateInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateInvoice(false)}>
              <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Create Invoice</h3>
                  <button onClick={() => setShowCreateInvoice(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); handleCreateInvoice(); }} className="space-y-4">
                  <div>
                    <label className="label">Description</label>
                    <input className="input w-full" placeholder="e.g. Monthly retainer" value={invoiceForm.description} onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })} autoFocus />
                  </div>
                  <div>
                    <label className="label">Amount (USD)</label>
                    <input type="number" min="0" className="input w-full" value={invoiceForm.amount || ""} onChange={e => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Due Date</label>
                    <input type="date" className="input w-full" value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowCreateInvoice(false)} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { CreditCard, RefreshCw, AlertTriangle, TrendingUp, CheckCircle2, X, ChevronRight, Plus, Trash2, Zap, Package, Bell, Building2, Wallet, ArrowDownCircle, RotateCcw, BadgeDollarSign } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const PLAN_COLORS: Record<string, string> = {
  free: "border-gray-600/40",
  pro: "border-sky-500/40",
  business: "border-violet-500/40",
  n0va1o: "border-amber-500/40",
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  ok: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "All within limits" },
  warning: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Near limits" },
  critical: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Limits exceeded" },
};

export default function MailBilling() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [cardForm, setCardForm] = useState({ brand: "", last4: "", expMonth: "", expYear: "", billingName: "" });
  const [overageMode, setOverageMode] = useState("warn");
  const [alertsOn, setAlertsOn] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(85);
  const [contractForm, setContractForm] = useState({ company: "", termMonths: "12", annualPrice: "", seats: "", contactEmail: "" });
  const [downgradeTarget, setDowngradeTarget] = useState("");

  const load = useCallback(async () => {
    const d = await api.adsMarketingModule.mailBillingDashboard().catch(() => null);
    setDash(unwrap(d));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!dash) return;
    setOverageMode(dash.overage?.mode || "warn");
    setAlertsOn(dash.alerts?.enabled !== false);
    setAlertThreshold(dash.alerts?.threshold || 85);
  }, [dash?.overage?.mode, dash?.alerts?.enabled, dash?.alerts?.threshold]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  async function upgrade(planId: string) {
    if (!confirm(`Upgrade to the ${planId} plan?`)) return;
    setBusy("up" + planId);
    const r = unwrap(await api.adsMarketingModule.mailBillingUpgrade(planId).catch(() => null));
    if (r?.summary) addToast("success", r.summary); else addToast("error", "Upgrade failed");
    setBusy(null);
    load();
  }

  async function addCard() {
    setBusy("card");
    const r = unwrap(await api.adsMarketingModule.mailBillingAddPaymentMethod(cardForm).catch(() => null));
    if (r?.methodId) {
      addToast("success", r.summary);
      setShowCard(false);
      setCardForm({ brand: "", last4: "", expMonth: "", expYear: "", billingName: "" });
      load();
    } else {
      addToast("error", "Could not add payment method");
    }
    setBusy(null);
  }

  async function removeMethod(methodId: string) {
    if (!confirm("Remove this payment method?")) return;
    setBusy("rm" + methodId);
    const r = unwrap(await api.adsMarketingModule.mailBillingRemovePaymentMethod(methodId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function payInvoice(invoiceId: string) {
    setBusy("pay" + invoiceId);
    const r = unwrap(await api.adsMarketingModule.mailBillingPayInvoice(invoiceId).catch(() => null));
    if (r?.summary) addToast("success", r.summary);
    setBusy(null);
    load();
  }

  async function addAddon(addonId: string, name: string) {
    if (!confirm(`Add "${name}" for a prorated charge?`)) return;
    setBusy("addon" + addonId);
    const r = unwrap(await api.adsMarketingModule.mailBillingAddAddon(addonId).catch(() => null));
    if (r?.summary) addToast("success", r.summary); else addToast("error", "Could not add add-on");
    setBusy(null);
    load();
  }

  async function removeAddon(addonId: string) {
    if (!confirm("Remove this add-on? A prorated credit will be issued.")) return;
    setBusy("rmaddon" + addonId);
    const r = unwrap(await api.adsMarketingModule.mailBillingRemoveAddon(addonId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function saveOverage() {
    setBusy("overage");
    const r = unwrap(await api.adsMarketingModule.mailBillingSetOveragePolicy({ mode: overageMode }).catch(() => null));
    if (r?.summary) addToast("success", r.summary); else addToast("error", "Could not save policy");
    setBusy(null);
    load();
  }

  async function invoiceOverage() {
    setBusy("ovinv");
    const r = unwrap(await api.adsMarketingModule.mailBillingOverageInvoice().catch(() => null));
    if (r?.summary) addToast("success", r.summary); else addToast("error", "No overage to invoice");
    setBusy(null);
    load();
  }

  async function createContract() {
    if (!contractForm.company.trim()) { addToast("warning", "Company name required"); return; }
    setBusy("contract");
    const r = unwrap(await api.adsMarketingModule.mailBillingCreateContract({
      company: contractForm.company.trim(),
      termMonths: Number(contractForm.termMonths),
      annualPrice: Number(contractForm.annualPrice || 0),
      seats: Number(contractForm.seats || 1),
      contactEmail: contractForm.contactEmail.trim() || undefined,
    }).catch(() => null));
    if (r?.summary) { addToast("success", r.summary); setContractForm({ company: "", termMonths: "12", annualPrice: "", seats: "", contactEmail: "" }); }
    else addToast("error", "Could not create contract");
    setBusy(null);
    load();
  }

  async function cancelContract() {
    if (!confirm("Cancel the enterprise contract?")) return;
    setBusy("cnclcontract");
    const r = unwrap(await api.adsMarketingModule.mailBillingCancelContract().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function saveAlerts() {
    setBusy("alerts");
    const r = unwrap(await api.adsMarketingModule.mailBillingSetAlertThresholds({ enabled: alertsOn }).catch(() => null));
    if (r?.summary) addToast("success", r.summary);
    setBusy(null);
    load();
  }

  async function downgrade(planId: string) {
    if (!planId) return;
    if (!confirm(`Downgrade to ${planId}? A prorated credit will be issued.`)) return;
    setBusy("down" + planId);
    const r = unwrap(await api.adsMarketingModule.mailBillingDowngrade(planId).catch(() => null));
    if (r?.summary) addToast("success", r.summary); else addToast("error", "Downgrade failed — usage may exceed the target plan");
    setBusy(null);
    setDowngradeTarget("");
    load();
  }

  async function toggleAutoRenew() {
    setBusy("renew");
    const next = !dash?.autoRenew;
    const r = unwrap(await api.adsMarketingModule.mailBillingSetAutoRenew(next).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function cancelSub() {
    if (!confirm("Cancel the subscription at the end of the current cycle?")) return;
    setBusy("cancel");
    const r = unwrap(await api.adsMarketingModule.mailBillingCancelSubscription().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  const fmtBytes = (n: number) => {
    if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} TB`;
    if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><CreditCard className="w-6 h-6 text-n0va-400" /> Billing & Plans</h1>
          <p className="text-gray-500 mt-1 text-sm">Plans, usage limits, invoices & payments (spec §3.3)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs" onClick={() => setShowCard(true)}><Plus className="w-3.5 h-3.5" /> Add card</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-sm text-red-300">Could not load billing data — backend unreachable.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card">
              <div className="text-xs text-gray-500">Current plan</div>
              <div className="text-xl font-bold text-white mt-1 capitalize">{dash.planName}</div>
              <div className="text-xs text-gray-500 mt-1">
                ${dash.effectiveMonthly ?? dash.priceMonthly}/mo · {dash.daysLeftInCycle} day(s) left
                {dash.addonMonthlyTotal > 0 && ` · +$${dash.addonMonthlyTotal}/mo add-ons`}
              </div>
              {dash.autoRenew === false && <div className="text-xs text-red-400 mt-1">Auto-renew off — cancels at cycle end</div>}
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Status</div>
              <div className="mt-1.5">
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_META[dash.status]?.color || STATUS_META.ok.color}`}>
                  {STATUS_META[dash.status]?.label || dash.status}
                </span>
              </div>
              {dash.recommendedPlan && (
                <div className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Upgrade to {dash.recommendedPlan} recommended
                </div>
              )}
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Open invoices</div>
              <div className="text-xl font-bold text-white mt-1">${(dash.invoiceTotals?.openTotal || 0).toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">{dash.invoices?.length || 0} invoice(s) · next ${dash.nextInvoice?.amount?.toFixed?.(2) ?? dash.nextInvoice?.amount}</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Payment methods</div>
              <div className="text-xl font-bold text-white mt-1">{dash.paymentMethods?.length || 0}</div>
              <div className="text-xs text-gray-500 mt-1">{dash.defaultPaymentMethodId ? "Default set" : "No card on file"}</div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><Wallet className="w-3 h-3" /> ${(dash.credits?.balance || 0).toFixed(2)} credit</div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Plans</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(dash.plans || []).map((p: any) => {
                const current = p.id === dash.plan;
                return (
                  <div key={p.id} className={`rounded-xl border bg-gray-900/60 p-4 flex flex-col gap-2 ${current ? PLAN_COLORS[p.id] || "border-n0va-500/50" : "border-gray-800"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{p.name}</span>
                      {current && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-lg font-bold text-white">${p.priceMonthly}<span className="text-xs text-gray-500 font-normal">/mo</span></div>
                    <ul className="text-xs text-gray-400 space-y-1 flex-1">
                      {(p.features || []).slice(0, 3).map((f: string) => <li key={f} className="flex items-center gap-1"><ChevronRight className="w-3 h-3 text-gray-600" />{f}</li>)}
                    </ul>
                    {current ? (
                      <button className="btn-secondary text-xs w-full justify-center" disabled>Current plan</button>
                    ) : (
                      <button className="btn-primary text-xs w-full justify-center" disabled={busy === "up" + p.id} onClick={() => upgrade(p.id)}>
                        {busy === "up" + p.id ? "Switching…" : `Upgrade to ${p.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-800">
              <span className="text-xs text-gray-500 flex items-center gap-1"><ArrowDownCircle className="w-3.5 h-3.5" /> Downgrade:</span>
              <select className="select text-xs !w-auto" value={downgradeTarget} onChange={(e) => setDowngradeTarget(e.target.value)}>
                <option value="">Select plan…</option>
                {(dash.plans || []).filter((p: any) => p.id !== dash.plan).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} (${p.priceMonthly}/mo)</option>
                ))}
              </select>
              <button className="btn-secondary text-xs" disabled={busy === "down" + downgradeTarget || !downgradeTarget} onClick={() => downgrade(downgradeTarget)}>
                {busy === "down" + downgradeTarget ? "Switching…" : "Downgrade"}
              </button>
              <button className="btn-secondary text-xs flex items-center gap-1" disabled={busy === "renew"} onClick={toggleAutoRenew}>
                <RotateCcw className="w-3 h-3" /> {dash.autoRenew ? "Turn off auto-renew" : "Turn on auto-renew"}
              </button>
              <button className="btn-secondary text-xs text-red-400" disabled={busy === "cancel"} onClick={cancelSub}>Cancel subscription</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card min-w-0">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Package className="w-4 h-4 text-n0va-400" /> Add-ons</h3>
              <div className="text-xs text-gray-500 mb-2">
                Active: {dash.addons?.total || 0} — ${(dash.addons?.monthlyTotal || 0).toFixed(2)}/mo
              </div>
              {(dash.addons?.addons || []).length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {(dash.addons.addons).map((a: any) => (
                    <div key={a.addonId} className="flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs text-white truncate">{a.name}</div>
                        <div className="text-[10px] text-gray-500">${a.monthlyPrice}/mo · since {String(a.addedAt || "").slice(0, 10)}</div>
                      </div>
                      <button className="text-gray-500 hover:text-red-400 p-1 shrink-0" disabled={busy === "rmaddon" + a.addonId} onClick={() => removeAddon(a.addonId)} title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(dash.addonCatalog?.addons || []).map((a: any) => {
                  const active = (dash.addons?.addons || []).some((x: any) => x.addonId === a.id);
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-gray-900/40 rounded-lg px-3 py-2 border border-gray-800">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-200 truncate">{a.name}</div>
                        <div className="text-[10px] text-gray-500">${a.monthlyPrice}/mo</div>
                      </div>
                      {active ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">Active</span>
                      ) : (
                        <button className="btn-secondary text-[10px] px-2 py-1 shrink-0" disabled={busy === "addon" + a.id} onClick={() => addAddon(a.id, a.name)}>
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card min-w-0">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><BadgeDollarSign className="w-4 h-4 text-n0va-400" /> Overage policy</h3>
              <div className="flex items-center gap-2 mb-3">
                <select className="select text-xs" value={overageMode} onChange={(e) => setOverageMode(e.target.value)}>
                  <option value="warn">Warn only</option>
                  <option value="block">Block over-limit actions</option>
                  <option value="bill">Bill for overage</option>
                </select>
                <button className="btn-secondary text-xs" disabled={busy === "overage"} onClick={saveOverage}>Save</button>
                <button className="btn-primary text-xs" disabled={busy === "ovinv" || overageMode !== "bill" || (dash.overage?.count || 0) === 0} onClick={invoiceOverage} title={overageMode !== "bill" ? "Enable bill mode first" : ""}>
                  Invoice overage
                </button>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {dash.overage?.count || 0} dimension(s) over limit — projected <span className="text-amber-400 font-semibold">${(dash.overage?.projectedTotal || 0).toFixed(2)}</span> this cycle
              </div>
              <div className="space-y-1.5">
                {(dash.overage?.overages || []).length === 0 && <div className="text-xs text-gray-600">No overages in the current cycle.</div>}
                {(dash.overage?.overages || []).map((o: any) => (
                  <div key={o.dimension} className="flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-300">{o.label}</span>
                    <span className="text-[11px] text-gray-500">{o.overUnits} unit(s) × ${o.rate}</span>
                    <span className="text-xs font-semibold text-amber-400">${o.projectedCost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card min-w-0">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-n0va-400" /> Enterprise contract</h3>
              {dash.contract?.active ? (
                <div className="space-y-1.5">
                  <div className="bg-gray-900/60 rounded-lg px-3 py-2 space-y-1">
                    <div className="text-xs font-semibold text-white">{dash.contract.company}</div>
                    <div className="text-[11px] text-gray-400">${dash.contract.annualPrice}/yr · ${dash.contract.effectiveMonthly}/mo effective · {dash.contract.discountPct}% off standard</div>
                    <div className="text-[11px] text-gray-500">{dash.contract.termMonths} months · {dash.contract.seats} seat(s) · renews in {dash.contract.daysToRenewal} day(s)</div>
                    <div className="text-[11px] text-gray-500">{dash.contract.contactEmail} · {dash.contract.paymentSchedule} billing</div>
                  </div>
                  <button className="btn-secondary text-xs" disabled={busy === "cnclcontract"} onClick={cancelContract}>Cancel contract</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-gray-500">Standard monthly billing applies. Add a term contract for discounted annual pricing.</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input text-xs" placeholder="Company" value={contractForm.company} onChange={(e) => setContractForm({ ...contractForm, company: e.target.value })} />
                    <select className="select text-xs" value={contractForm.termMonths} onChange={(e) => setContractForm({ ...contractForm, termMonths: e.target.value })}>
                      <option value="12">12 months</option>
                      <option value="24">24 months</option>
                      <option value="36">36 months</option>
                    </select>
                    <input className="input text-xs" type="number" placeholder="Annual price ($)" value={contractForm.annualPrice} onChange={(e) => setContractForm({ ...contractForm, annualPrice: e.target.value })} />
                    <input className="input text-xs" type="number" placeholder="Seats" value={contractForm.seats} onChange={(e) => setContractForm({ ...contractForm, seats: e.target.value })} />
                  </div>
                  <input className="input text-xs" placeholder="Contact email" value={contractForm.contactEmail} onChange={(e) => setContractForm({ ...contractForm, contactEmail: e.target.value })} />
                  <button className="btn-primary text-xs w-full justify-center" disabled={busy === "contract"} onClick={createContract}>
                    {busy === "contract" ? "Creating…" : "Create contract"}
                  </button>
                </div>
              )}
            </div>

            <div className="card min-w-0">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Bell className="w-4 h-4 text-n0va-400" /> Usage alerts</h3>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={alertsOn} onChange={(e) => setAlertsOn(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
                  Alerts enabled
                </label>
                <button className="btn-secondary text-xs ml-auto" disabled={busy === "alerts"} onClick={saveAlerts}>Save</button>
              </div>
              <div className="space-y-1.5">
                {(dash.alerts?.alerts || []).length === 0 && <div className="text-xs text-gray-600">All dimensions within threshold ({alertThreshold}%).</div>}
                {(dash.alerts?.alerts || []).map((al: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${al.severity === "critical" ? "bg-red-500" : "bg-amber-400"}`} />
                    <span className={`text-xs ${al.severity === "critical" ? "text-red-300" : "text-amber-200"}`}>{al.message}</span>
                    <span className="text-[10px] text-gray-500 ml-auto shrink-0">{al.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-gray-600 mt-2">Threshold: {alertThreshold}% of limit · custom per-dimension thresholds available via API</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-3">Usage vs limits</h3>
              <div className="space-y-3">
                {(dash.usage || []).map((u: any) => (
                  <div key={u.dimension}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">{u.label}</span>
                      <span className={u.overLimit ? "text-red-400 font-semibold" : "text-gray-500"}>
                        {u.display}{u.overLimit && " · over limit"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div className={`h-full rounded-full ${u.overLimit ? "bg-red-500" : u.pct >= 85 ? "bg-amber-400" : "bg-n0va-500"}`} style={{ width: `${Math.min(100, u.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-n0va-400" /> Storage forecast</h3>
                <div className="text-xs text-gray-400 space-y-1.5">
                  <div>Growth: ~{dash.forecast?.growthPerDayMb} MB / day</div>
                  <div>Used: {fmtBytes(dash.forecast?.usedBytes || 0)} of {fmtBytes(dash.forecast?.limitBytes || 0)}</div>
                  <div>Quota hit: {dash.forecast?.daysToQuota ? `in ${dash.forecast.daysToQuota} day(s)` : "now"} {dash.forecast?.projectedDate ? `(${dash.forecast.projectedDate})` : ""}</div>
                  {dash.forecast?.atRisk && <div className="text-amber-400">Under 90 days — consider upgrading</div>}
                </div>
                {dash.forecast?.recommendedPlan && (
                  <button className="btn-primary text-xs w-full justify-center mt-3" onClick={() => upgrade(dash.forecast.recommendedPlan)}>
                    Upgrade to {dash.forecast.recommendedPlan}
                  </button>
                )}
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">Payment methods</h3>
                {(dash.paymentMethods || []).length === 0 && <div className="text-xs text-gray-500">No card on file — add one to upgrade.</div>}
                <div className="space-y-2">
                  {(dash.paymentMethods || []).map((pm: any) => (
                    <div key={pm._id} className="flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className="w-4 h-4 text-gray-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-white truncate capitalize">{pm.brand} •••• {pm.last4}</div>
                          <div className="text-[10px] text-gray-500">{pm.expMonth}/{pm.expYear}{pm.isDefault && " · default"}</div>
                        </div>
                      </div>
                      <button className="text-gray-500 hover:text-red-400 p-1" disabled={busy === "rm" + pm._id} onClick={() => removeMethod(pm._id)} title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card min-w-0">
              <h3 className="text-sm font-semibold text-white mb-3">Invoices</h3>
              <div className="space-y-2">
                {(dash.invoices || []).length === 0 && <div className="text-xs text-gray-500">No invoices yet.</div>}
                {(dash.invoices || []).map((inv: any) => (
                  <div key={inv._id} className="flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs text-white flex items-center gap-1.5 flex-wrap">
                        {inv.number}
                        {inv.kind && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                            inv.kind === "refund" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : inv.kind === "addon" ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                            : inv.kind === "overage" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-gray-700/60 text-gray-400 border-gray-600"
                          }`}>{inv.kind}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {(inv.lines || []).map((l: any) => l.description).join(" · ") || inv.status} · issued {String(inv.issuedAt || "").slice(0, 10)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold ${Number(inv.total || 0) < 0 ? "text-emerald-400" : "text-white"}`}>
                        {Number(inv.total || 0) < 0 ? "-$" + Math.abs(Number(inv.total)).toFixed(2) : "$" + Number(inv.total).toFixed(2)}
                      </span>
                      {inv.status === "open" && Number(inv.total || 0) >= 0 ? (
                        <button className="btn-primary text-[10px] px-2 py-1" disabled={busy === "pay" + inv._id} onClick={() => payInvoice(inv._id)}>Pay</button>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          Number(inv.total || 0) < 0 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }`}>{Number(inv.total || 0) < 0 ? "Credit" : "Paid"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card min-w-0">
              <h3 className="text-sm font-semibold text-white mb-3">Billing activity</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(dash.log || []).length === 0 && <div className="text-xs text-gray-500">No billing events yet.</div>}
                {(dash.log || []).map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-900/60 rounded-lg px-3 py-2">
                    <Zap className="w-3.5 h-3.5 text-n0va-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs text-white">{e.detail}</div>
                      <div className="text-[10px] text-gray-500">{e.category} · {String(e.at || "").slice(0, 19).replace("T", " ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {showCard && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setShowCard(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add payment method</h3>
              <button className="text-gray-500 hover:text-white p-1" onClick={() => setShowCard(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Brand (visa/mastercard/amex)" value={cardForm.brand} onChange={(e) => setCardForm({ ...cardForm, brand: e.target.value })} />
              <input className="input" placeholder="Last 4 digits" maxLength={4} value={cardForm.last4} onChange={(e) => setCardForm({ ...cardForm, last4: e.target.value })} />
              <input className="input" placeholder="Exp month (1-12)" value={cardForm.expMonth} onChange={(e) => setCardForm({ ...cardForm, expMonth: e.target.value })} />
              <input className="input" placeholder="Exp year (2027)" value={cardForm.expYear} onChange={(e) => setCardForm({ ...cardForm, expYear: e.target.value })} />
            </div>
            <input className="input" placeholder="Billing name" value={cardForm.billingName} onChange={(e) => setCardForm({ ...cardForm, billingName: e.target.value })} />
            <button className="btn-primary w-full justify-center" disabled={busy === "card"} onClick={addCard}>
              {busy === "card" ? "Adding…" : "Add card"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

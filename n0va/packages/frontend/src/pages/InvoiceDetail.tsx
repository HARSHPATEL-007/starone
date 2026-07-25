import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle, Clock, AlertCircle, CreditCard, FileText, Calendar, DollarSign, Hash, Building, X, Copy, Send, Trash2, Edit3, Loader, Check } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

interface InvoiceData {
  _id?: string;
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string;
  createdAt?: string;
  description?: string;
  items?: { label: string; amount: number; quantity: number }[];
  billingAddress?: { name: string; line1: string; line2?: string; city: string; state: string; zip: string; country: string };
  paymentMethod?: { brand: string; last4: string };
  subtotal?: number;
  tax?: number;
  total?: number;
  history?: { action: string; date: string; note?: string }[];
}

function extractInvoice(raw: any): InvoiceData {
  if (!raw) return { id: "", amount: 0, currency: "USD", status: "pending", dueDate: new Date().toISOString() };
  const src = raw?.data || raw;
  return {
    _id: raw?._id || src?._id,
    id: src.id || raw?.id || src._id || raw?._id || "",
    amount: src.amount || 0,
    currency: src.currency || "USD",
    status: src.status || "pending",
    dueDate: src.dueDate || src.createdAt || new Date().toISOString(),
    paidAt: src.paidAt,
    createdAt: src.createdAt || raw?.createdAt,
    description: src.description || "",
    items: src.items || [],
    billingAddress: src.billingAddress,
    paymentMethod: src.paymentMethod,
    subtotal: src.subtotal,
    tax: src.tax,
    total: src.total,
    history: src.history || [],
  };
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadInvoice();
  }, [id]);

  async function loadInvoice() {
    setLoading(true);
    setError("");
    try {
      const r = await api.billing.getInvoice(id!);
      setInvoice(extractInvoice(r));
    } catch (e: any) {
      setError(e.message || "Failed to load invoice");
    }
    setLoading(false);
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    try {
      await api.billing.updateSubscription({ invoiceId: invoice._id || invoice.id, status: "paid", paidAt: new Date().toISOString() });
      addToast("success", "Invoice marked as paid");
      loadInvoice();
    } catch { addToast("error", "Failed to mark invoice as paid"); }
  }

  async function handleDelete() {
    if (!invoice) return;
    try {
      await api.entities.delete("invoices", invoice._id || invoice.id);
      addToast("success", "Invoice deleted");
      navigate("/billing");
    } catch { addToast("error", "Failed to delete invoice"); }
  }

  function handleDownload() {
    if (!invoice) return;
    const json = JSON.stringify(invoice, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-${invoice.id}.json`; a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Invoice downloaded");
  }

  function handleCopyId() {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.id);
    addToast("success", "Invoice ID copied");
  }

  function handleEmailInvoice() {
    if (!invoice) return;
    addToast("info", `Invoice ${invoice.id} will be emailed to the billing contact`);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>;
  if (error || !invoice) return (
    <div className="max-w-3xl mx-auto text-center py-16">
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-white mb-2">Invoice not found</h2>
      <p className="text-sm text-gray-500 mb-4">{error || "This invoice does not exist or has been removed."}</p>
      <button onClick={() => navigate("/billing")} className="btn-primary text-sm">Back to Billing</button>
    </div>
  );

  const statusMeta = invoice.status === "paid" ? { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Paid" }
    : invoice.status === "overdue" ? { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Overdue" }
    : { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Pending" };
  const StatusIcon = statusMeta.icon;
  const items = invoice.items?.length ? invoice.items : [{ label: invoice.description || "Invoice Item", amount: invoice.amount, quantity: 1 }];
  const subtotal = invoice.subtotal ?? items.reduce((s, i) => s + i.amount * i.quantity, 0);
  const tax = invoice.tax ?? 0;
  const total = invoice.total ?? subtotal + tax;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/billing")} className="text-gray-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-n0va-400" />
              Invoice {invoice.id}
            </h1>
            <p className="text-sm text-gray-500">{invoice.description || "Invoice detail"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${statusMeta.bg} ${statusMeta.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />{statusMeta.label}
          </span>
          <button onClick={handleCopyId} className="btn-ghost text-xs flex items-center gap-1.5" title="Copy Invoice ID"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={handleDownload} className="btn-ghost text-xs flex items-center gap-1.5" title="Download JSON"><Download className="w-3.5 h-3.5" /></button>
          <button onClick={handleEmailInvoice} className="btn-ghost text-xs flex items-center gap-1.5" title="Email Invoice"><Send className="w-3.5 h-3.5" /></button>
          <button onClick={handlePrint} className="btn-ghost text-xs flex items-center gap-1.5" title="Print"><FileText className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-n0va-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-n0va-400" /></div>
          <div><p className="text-xs text-gray-500">Amount</p><p className="text-lg font-bold text-white">${invoice.amount.toLocaleString()} {invoice.currency}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-400" /></div>
          <div><p className="text-xs text-gray-500">Due Date</p><p className="text-lg font-bold text-white">{new Date(invoice.dueDate).toLocaleDateString()}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Hash className="w-5 h-5 text-purple-400" /></div>
          <div><p className="text-xs text-gray-500">Invoice ID</p><p className="text-sm font-bold text-white font-mono truncate">{invoice.id}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-amber-400" /></div>
          <div><p className="text-xs text-gray-500">Currency</p><p className="text-lg font-bold text-white">{invoice.currency}</p></div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Line Items</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Unit Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-800/50">
                <td className="py-3 text-white">{item.label}</td>
                <td className="py-3 text-right text-gray-400">{item.quantity}</td>
                <td className="py-3 text-right text-gray-400">${item.amount.toLocaleString()}</td>
                <td className="py-3 text-right text-white font-medium">${(item.amount * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3} className="pt-3 text-right text-gray-500">Subtotal</td><td className="pt-3 text-right text-gray-300">${subtotal.toLocaleString()}</td></tr>
            {tax > 0 && <tr><td colSpan={3} className="text-right text-gray-500">Tax ({(tax / Math.max(subtotal, 1) * 100).toFixed(1)}%)</td><td className="text-right text-gray-300">${tax.toLocaleString()}</td></tr>}
            <tr><td colSpan={3} className="text-right text-white font-semibold pt-1">Total</td><td className="text-right text-white font-bold pt-1">${total.toLocaleString()} {invoice.currency}</td></tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {invoice.billingAddress && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Building className="w-4 h-4 text-gray-500" /> Billing Address</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p>{invoice.billingAddress.name}</p>
              <p>{invoice.billingAddress.line1}</p>
              {invoice.billingAddress.line2 && <p>{invoice.billingAddress.line2}</p>}
              <p>{invoice.billingAddress.city}, {invoice.billingAddress.state} {invoice.billingAddress.zip}</p>
              <p>{invoice.billingAddress.country}</p>
            </div>
          </div>
        )}
        {invoice.paymentMethod && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><CreditCard className="w-4 h-4 text-gray-500" /> Payment Method</h3>
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-gray-600" />
              <div>
                <p className="text-sm text-white capitalize">{invoice.paymentMethod.brand}</p>
                <p className="text-xs text-gray-500">•••• {invoice.paymentMethod.last4}</p>
              </div>
            </div>
            {invoice.paidAt && <p className="text-xs text-green-400 mt-3 flex items-center gap-1"><Check className="w-3 h-3" /> Paid on {new Date(invoice.paidAt).toLocaleDateString()}</p>}
          </div>
        )}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-gray-500" /> Dates</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-300">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Due</span><span className="text-gray-300">{new Date(invoice.dueDate).toLocaleDateString()}</span></div>
            {invoice.paidAt && <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="text-green-400">{new Date(invoice.paidAt).toLocaleDateString()}</span></div>}
          </div>
        </div>
        {(invoice.history && invoice.history.length > 0) && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-gray-500" /> Payment History</h3>
            <div className="space-y-2">
              {invoice.history.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-n0va-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-300 capitalize">{h.action.replace(/_/g, " ")}</p>
                    <p className="text-gray-600">{new Date(h.date).toLocaleString()}{h.note ? ` — ${h.note}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pb-8">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/billing")} className="btn-ghost text-sm"><ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Billing</button>
          {invoice.status !== "paid" && (
            <button onClick={() => setShowDelete(true)} className="btn-ghost text-sm text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4 inline mr-1" /> Delete</button>
          )}
        </div>
        {invoice.status !== "paid" && (
          <button onClick={handleMarkPaid} className="btn-primary text-sm">
            <CheckCircle className="w-4 h-4 inline mr-1" /> Mark as Paid
          </button>
        )}
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDelete(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Invoice</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete invoice <span className="text-white font-mono">{invoice.id}</span>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDelete(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} className="btn-primary bg-red-600 hover:bg-red-500 border-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

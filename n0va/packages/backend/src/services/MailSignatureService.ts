import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class MailSignatureService {
  private getMailbox(tenantId: string, mailboxId: string): any {
    const mb = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mb) throw new Error(`Mailbox "${mailboxId}" not found`);
    return mb;
  }

  listSignatures(tenantId: string) {
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId)
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    return mailboxes.map(mb => {
      const cfg = mb.signatureConfig || {};
      return {
        mailboxId: mb._id, mailboxName: mb.name, email: mb.email,
        text: cfg.text !== undefined ? cfg.text : (mb.signature || ""),
        enabled: cfg.enabled !== undefined ? !!cfg.enabled : !!mb.signature,
        isDefault: !!cfg.isDefault,
        updatedAt: cfg.updatedAt || null,
      };
    });
  }

  getSignature(tenantId: string, mailboxId: string) {
    const mb = this.getMailbox(tenantId, mailboxId);
    const cfg = mb.signatureConfig || {};
    return {
      mailboxId: mb._id, mailboxName: mb.name, email: mb.email,
      text: cfg.text !== undefined ? cfg.text : (mb.signature || ""),
      enabled: cfg.enabled !== undefined ? !!cfg.enabled : !!mb.signature,
      isDefault: !!cfg.isDefault,
      updatedAt: cfg.updatedAt || null,
    };
  }

  updateSignature(tenantId: string, mailboxId: string, input: any) {
    this.getMailbox(tenantId, mailboxId);
    if (!input) throw new Error("Signature text is required");
    const text = String(input.text ?? "");
    const enabled = input.enabled !== undefined ? !!input.enabled : true;
    const makeDefault = !!input.isDefault;
    if (makeDefault) {
      DataStore.mem().update("mailboxes", (m: any) => m.tenantId === tenantId && m._id !== mailboxId, { signatureConfig: { isDefault: false } });
    }
    const updated = DataStore.mem().update("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId, {
      signature: text,
      signatureConfig: { text, enabled, isDefault: makeDefault, updatedAt: new Date().toISOString() },
    });
    return {
      mailboxId: updated._id, mailboxName: updated.name, text, enabled, isDefault: makeDefault,
      summary: `Signature for "${updated.name}" ${makeDefault ? "saved and set as default" : "saved"}`,
    };
  }

  toggleSignature(tenantId: string, mailboxId: string, enabled: boolean) {
    const sig = this.getSignature(tenantId, mailboxId);
    const updated = DataStore.mem().update("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId, {
      signatureConfig: { text: sig.text, enabled: !!enabled, isDefault: sig.isDefault, updatedAt: new Date().toISOString() },
    });
    return { mailboxId, enabled: !!enabled, summary: `Signature for "${updated.name}" ${enabled ? "enabled" : "disabled"}` };
  }

  defaultSignature(tenantId: string) {
    const signatures = this.listSignatures(tenantId);
    return signatures.find(s => s.isDefault && s.enabled)
      || signatures.find(s => s.enabled && s.text.trim().length > 0)
      || signatures.find(s => s.text.trim().length > 0)
      || null;
  }

  composePreview(tenantId: string, mailboxId: string, body: string) {
    const sig = this.getSignature(tenantId, mailboxId);
    if (!sig.enabled || !sig.text.trim()) return { body: body || "", signature: null, withSignature: false, summary: "No signature attached" };
    const composed = `${body || ""}${body ? "\n\n" : ""}-- \n${sig.text}`;
    return { body: composed, signature: sig.text, withSignature: true, summary: "Signature attached" };
  }

  signaturesDashboard(tenantId: string) {
    const signatures = this.listSignatures(tenantId);
    const configured = signatures.filter(s => s.text.trim().length > 0);
    const enabled = signatures.filter(s => s.enabled);
    const dflt = this.defaultSignature(tenantId);
    return {
      signatures,
      totals: {
        mailboxes: signatures.length,
        configured: configured.length,
        enabled: enabled.length,
        defaults: signatures.filter(s => s.isDefault).length,
      },
      defaultSignature: dflt,
      summary: `${configured.length}/${signatures.length} mailbox(es) have a signature${dflt ? ` — default on "${dflt.mailboxName}"` : ""}`,
      seed: hashStr(tenantId + "signatures_seed"),
    };
  }
}

export const mailSignature = new MailSignatureService();

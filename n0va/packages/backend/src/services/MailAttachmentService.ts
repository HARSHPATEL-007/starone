import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function attachmentId(messageId: string, fileName: string): string {
  return `att_${hashStr(messageId + fileName)}`;
}

export class MailAttachmentService {
  private all(tenantId: string) {
    const out: any[] = [];
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    for (const m of msgs) {
      for (const att of m.attachments || []) {
        out.push({
          attachmentId: attachmentId(m._id, att.name),
          messageId: m._id,
          threadId: m.threadId,
          subject: m.subject,
          folder: m.folder,
          from: m.from,
          receivedAt: m.receivedAt,
          name: att.name,
          sizeBytes: att.sizeBytes || 0,
          type: att.type || "unknown",
          scan: att.scan || { status: "pending" },
        });
      }
    }
    return out;
  }

  private find(tenantId: string, attachmentId: string) {
    const att = this.all(tenantId).find(a => a.attachmentId === attachmentId);
    if (!att) throw new Error(`Attachment "${attachmentId}" not found`);
    return att;
  }

  listAttachments(tenantId: string, opts: any = {}) {
    let atts = this.all(tenantId).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    if (opts.type) atts = atts.filter(a => a.type === opts.type);
    if (opts.folder) atts = atts.filter(a => a.folder === opts.folder);
    if (opts.status) atts = atts.filter(a => a.scan.status === opts.status);
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 100;
    return atts.slice(0, limit).map(a => ({
      ...a,
      sizeLabel: a.sizeBytes >= 1048576 ? `${Math.round((a.sizeBytes / 1048576) * 10) / 10} MB` : `${Math.round(a.sizeBytes / 1024)} KB`,
    }));
  }

  getAttachment(tenantId: string, attachmentId: string) {
    const att = this.find(tenantId, attachmentId);
    const seed = hashStr(attachmentId);
    const baseScan = att.scan && att.scan.status !== "pending" ? att.scan : {
      status: seed % 5 === 0 ? "suspicious" : "clean",
      virus: seed % 5 === 0 ? "Heuristic match — possible executable in archive" : "No threats detected",
      dlp: seed % 9 === 0 ? "Possible sensitive data (PII pattern)" : "No sensitive data detected",
      scannedAt: new Date().toISOString(),
    };
    const preview = att.type === "pdf" || att.type === "txt" || att.type === "docx"
      ? `[Preview] ${att.name} — extracted content preview for message "${att.subject}" (deterministic mock).`
      : `No preview available for ${att.type || "unknown"} files.`;
    return { ...att, scan: baseScan, preview, summary: `${att.name} (${att.sizeBytes} bytes) — ${baseScan.status}` };
  }

  scanAttachment(tenantId: string, attachmentId: string) {
    const att = this.find(tenantId, attachmentId);
    const seed = hashStr(attachmentId);
    const scan = {
      status: seed % 5 === 0 ? "suspicious" : "clean",
      virus: seed % 5 === 0 ? "Heuristic match — possible executable in archive" : "No threats detected",
      dlp: seed % 9 === 0 ? "Possible sensitive data (PII pattern)" : "No sensitive data detected",
      scannedAt: new Date().toISOString(),
    };
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === att.messageId && m.tenantId === tenantId);
    if (msg) {
      const newAtts = (msg.attachments || []).map((a: any) => (a.name === att.name ? { ...a, scan } : a));
      DataStore.mem().update("messages", (m: any) => m._id === msg._id, { attachments: newAtts });
    }
    return { attachmentId, name: att.name, scan, summary: `${att.name} scanned — ${scan.status}` };
  }

  quarantineAttachment(tenantId: string, attachmentId: string) {
    const att = this.find(tenantId, attachmentId);
    const scan = { ...(att.scan || {}), status: "quarantined", quarantinedAt: new Date().toISOString() };
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === att.messageId && m.tenantId === tenantId);
    if (msg) {
      const newAtts = (msg.attachments || []).map((a: any) => (a.name === att.name ? { ...a, scan } : a));
      DataStore.mem().update("messages", (m: any) => m._id === msg._id, { attachments: newAtts });
    }
    return { attachmentId, name: att.name, scan, summary: `${att.name} quarantined` };
  }

  attachmentStats(tenantId: string) {
    const atts = this.all(tenantId);
    const byType = new Map<string, number>();
    for (const a of atts) byType.set(a.type, (byType.get(a.type) || 0) + 1);
    const byFolder = new Map<string, number>();
    for (const a of atts) byFolder.set(a.folder, (byFolder.get(a.folder) || 0) + 1);
    const risky = atts.filter(a => a.scan.status === "suspicious" || a.scan.status === "quarantined");
    return {
      totals: {
        files: atts.length,
        messages: new Set(atts.map(a => a.messageId)).size,
        bytes: atts.reduce((s, a) => s + a.sizeBytes, 0),
        risky: risky.length,
        scanned: atts.filter(a => a.scan.status !== "pending").length,
      },
      byType: [...byType.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      byFolder: [...byFolder.entries()].map(([folder, count]) => ({ folder, count })).sort((a, b) => b.count - a.count),
      risky,
      summary: `${atts.length} attachment(s) across ${new Set(atts.map(a => a.messageId)).size} message(s) — ${risky.length} flagged`,
      seed: hashStr(tenantId + "attachment_stats"),
    };
  }
}

export const mailAttachment = new MailAttachmentService();

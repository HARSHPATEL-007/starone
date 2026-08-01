import { DataStore } from "./DataStore";
import { mailMessage } from "./MailMessageService";
import { mailAgent } from "./MailAgentService";
import { mailRules } from "./MailRulesService";

export class MailVoiceService {
  private defaultMailbox(tenantId: string): any {
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId);
    if (mailboxes.length === 0) throw new Error("No mailboxes configured");
    return mailboxes.find((m: any) => m.status === "active") || mailboxes[0];
  }

  private resolveRecipient(tenantId: string, raw: string): string[] {
    const value = String(raw || "").trim();
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value)) return [value];
    const contact = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId && c.name.toLowerCase() === value.toLowerCase());
    if (contact.length > 0) return [contact[0].email];
    return [value];
  }

  private latestInboxMessage(tenantId: string, mailboxId: string): any {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.mailboxId === mailboxId && m.folder === "inbox")
      .sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return msgs[0] || null;
  }

  parseMailCommand(tenantId: string, command: string) {
    const text = String(command || "").trim();
    if (!text) throw new Error("Command is required");
    const lower = text.toLowerCase();

    if (/(^| )help$|what can you do/.test(lower)) {
      return { intent: "help", params: {}, explanation: "Here's what I can do with your mail" };
    }

    const scheduleMatch = lower.match(/^schedule (?:an |a )?(?:email |mail )?(?:to )?(.+?) (?:at|for) ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)$/);
    if (scheduleMatch) {
      return {
        intent: "schedule_email",
        params: { to: this.resolveRecipient(tenantId, scheduleMatch[1]), sendAt: scheduleMatch[2] },
        explanation: `Scheduling an email to ${scheduleMatch[1]} at ${scheduleMatch[2]}`,
      };
    }

    const sendMatch = lower.match(/^send (?:an |a )?(?:email |mail )?(?:to )?(.+?)(?: about | regarding | with subject )(.+)$/);
    if (sendMatch) {
      return {
        intent: "send_email",
        params: { to: this.resolveRecipient(tenantId, sendMatch[1]), subject: sendMatch[2] },
        explanation: `Sending an email to ${sendMatch[1]} about "${sendMatch[2]}"`,
      };
    }

    if (/^(show|read|list)( me)?( my)? (unread )?(emails|email|mail|messages|inbox)/.test(lower)) {
      return { intent: "read_unread", params: {}, explanation: "Listing your unread mail" };
    }

    const searchMatch = lower.match(/^search (?:mail|emails|messages|inbox|for )?(.+)$/);
    if (searchMatch && !/^search (help|options)$/.test(lower)) {
      return { intent: "search_mail", params: { query: searchMatch[1].trim() }, explanation: `Searching mail for "${searchMatch[1].trim()}"` };
    }

    if (/^(mark|set) all (email|emails|mail|messages) (as )?read$/.test(lower)) {
      return { intent: "mark_all_read", params: {}, explanation: "Marking all mail as read" };
    }
    if (/^(mark|set) (the )?(last |latest )?(email|mail|message) (as )?read$/.test(lower)) {
      return { intent: "mark_read", params: {}, explanation: "Marking your latest email as read" };
    }
    if (/^(star|unstar) (the )?(last |latest )?(email|mail|message)$/.test(lower)) {
      return { intent: "toggle_star", params: {}, explanation: "Toggling the star on your latest email" };
    }

    const oooMatch = lower.match(/^(turn on|enable|start|turn off|disable|stop) (my )?(out[- ]of[- ]office|ooo)$/);
    if (oooMatch) {
      const on = ["turn on", "enable", "start"].includes(oooMatch[1]);
      return { intent: "out_of_office", params: { enabled: on }, explanation: `${on ? "Enabling" : "Disabling"} out of office auto-replies` };
    }

    if (/^summarize (the )?(last |latest )?(email|thread|conversation)$/.test(lower)) {
      return { intent: "summarize_thread", params: {}, explanation: "Summarizing your latest conversation" };
    }

    if (/^unread (count|total)$|how many unread/.test(lower)) {
      return { intent: "unread_count", params: {}, explanation: "Counting your unread mail" };
    }

    const ruleMatch = lower.match(/^create (a )?rule (from |using )?(.+)$/);
    if (ruleMatch) {
      return { intent: "create_rule", params: { template: ruleMatch[3].trim() }, explanation: `Creating a rule from template "${ruleMatch[3].trim()}"` };
    }

    return { intent: "general", params: { query: text }, explanation: `I understood "${command}" as a general request` };
  }

  executeMailCommand(tenantId: string, command: string) {
    const parsed = this.parseMailCommand(tenantId, command);
    const mb = this.defaultMailbox(tenantId);
    let result: any = null;

    switch (parsed.intent) {
      case "send_email": {
        const msg = mailMessage.composeSend(tenantId, mb._id, {
          to: parsed.params.to,
          subject: parsed.params.subject,
          body: "",
        });
        result = msg;
        break;
      }
      case "read_unread": {
        const list = mailMessage.listMessages(tenantId, { folder: "inbox", unread: true, limit: 20 });
        result = { messages: list.messages, total: list.unread, unread: list.unread };
        break;
      }
      case "search_mail": {
        const s = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && `${m.subject} ${m.body}`.toLowerCase().includes(String(parsed.params.query).toLowerCase()));
        result = { query: parsed.params.query, messages: s, total: s.length };
        break;
      }
      case "mark_read": {
        const latest = this.latestInboxMessage(tenantId, mb._id);
        if (!latest) throw new Error("No inbox messages to mark read");
        result = mailMessage.markRead(tenantId, latest._id, true);
        break;
      }
      case "mark_all_read": {
        const unread = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox" && !m.read);
        for (const m of unread) mailMessage.markRead(tenantId, m._id, true);
        result = { marked: unread.length, summary: `${unread.length} message(s) marked read` };
        break;
      }
      case "toggle_star": {
        const latest = this.latestInboxMessage(tenantId, mb._id);
        if (!latest) throw new Error("No inbox messages to star");
        result = mailMessage.toggleStar(tenantId, latest._id);
        break;
      }
      case "out_of_office": {
        result = mailAgent.setOutOfOffice(tenantId, mb._id, { enabled: parsed.params.enabled });
        break;
      }
      case "schedule_email": {
        const s = mailAgent.scheduleSend(tenantId, mb._id, {
          to: parsed.params.to,
          subject: "Scheduled email",
          body: "",
          sendAt: parsed.params.sendAt,
        });
        result = s;
        break;
      }
      case "summarize_thread": {
        const latest = this.latestInboxMessage(tenantId, mb._id);
        if (!latest) throw new Error("No conversation to summarize");
        const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === latest.threadId)
          .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
        result = {
          threadId: latest.threadId,
          subject: latest.subject,
          messageCount: msgs.length,
          participants: [...new Set(msgs.map(m => (m.from || {}).email).filter(Boolean))],
          summary: `"${latest.subject}" — ${msgs.length} message(s), ${msgs.filter(m => (m.ai && m.ai.actionItems || []).length > 0).length} with action items`,
        };
        break;
      }
      case "unread_count": {
        const list = mailMessage.listMessages(tenantId, { folder: "inbox", unread: true });
        result = { unread: list.unread, summary: `${list.unread} unread message(s)` };
        break;
      }
      case "create_rule": {
        const template = String(parsed.params.template || "").toLowerCase();
        const tpl = mailRules.ruleTemplates().find((t: any) => t.templateId === template || t.name.toLowerCase().includes(template));
        if (!tpl) throw new Error(`Unknown rule template "${parsed.params.template}"`);
        result = mailRules.instantiateTemplate(tenantId, tpl.templateId);
        break;
      }
      case "help": {
        result = this.voiceCommandHelp();
        break;
      }
      default: {
        const list = mailMessage.listMessages(tenantId, { folder: "inbox", limit: 5 });
        result = { messages: list.messages, total: list.total, note: `No specific action for "${command}" — here's your recent mail` };
      }
    }

    return {
      intent: parsed.intent,
      command,
      explanation: parsed.explanation,
      executed: true,
      result,
      summary: result && result.summary ? result.summary : `${parsed.explanation} — done`,
    };
  }

  voiceCommandHelp() {
    return {
      commands: [
        "send email to john@partner.com about Q3 invoice",
        "read my unread emails",
        "search for invoice",
        "mark the last email read",
        "mark all email read",
        "star the last email",
        "schedule email to accounts@company.com at 2026-08-02T09:00:00Z",
        "turn on out of office",
        "turn off out of office",
        "summarize the latest thread",
        "unread count",
        "create rule from newsletters",
        "help",
      ],
      summary: `${13} voice commands available for N0VA MAIL`,
      seed: hashStr("n0va_mail_voice_help"),
    };
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const mailVoice = new MailVoiceService();

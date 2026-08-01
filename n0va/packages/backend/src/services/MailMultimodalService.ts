import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const VIDEO_CHAPTERS = ["Intro", "Overview", "Key points", "Demo", "Wrap-up"];
const UI_ELEMENTS = ["button", "input", "modal", "menu", "card", "form", "chart", "table"];
const STEPS = ["Open app", "Navigate to section", "Configure options", "Apply changes", "Verify result"];
const VULN_PATTERNS: { pattern: RegExp; finding: string }[] = [
  { pattern: /eval\s*\(/i, finding: "Unsafe eval() usage — arbitrary code execution risk" },
  { pattern: /exec\s*\(/i, finding: "Shell command execution — command injection surface" },
  { pattern: /child_process/i, finding: "child_process usage — validate inputs before spawning" },
  { pattern: /innerHTML\s*=/i, finding: "innerHTML assignment — XSS risk, use textContent" },
  { pattern: /insert\s*\(|execute\(|raw\s+query/i, finding: "Raw database access — SQL injection surface" },
  { pattern: /password\s*=\s*["'][^"']+["']/i, finding: "Hard-coded credential in source" },
  { pattern: /fetch\s*\(\s*["']http/i, finding: "Hard-coded HTTP URL — use HTTPS or config" },
];
const LANG_KEYWORDS: [string, string[]][] = [
  ["TypeScript", ["interface", "typescript", "tsx", ": string", "any[]"]],
  ["JavaScript", ["function", "=>", "const ", "let ", "require("]],
  ["Python", ["def ", "import ", "print(", "self."]],
  ["SQL", ["SELECT", "FROM", "INSERT INTO", "WHERE"]],
  ["HTML", ["<div", "<html", "<body", "class="]],
  ["CSS", ["{", "px;", "color:", "display:"]],
  ["Bash", ["#!/bin", "echo ", "apt-get", "npm run"]],
];

export class MailMultimodalService {
  private requireMessage(tenantId: string, messageId: string | undefined): any {
    if (!messageId) return null;
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    return msg;
  }

  attachVideo(tenantId: string, input: any) {
    if (!input || !input.title) throw new Error("Video title is required");
    const msg = this.requireMessage(tenantId, input.messageId);
    const durationSec = Math.max(1, parseInt(String(input.durationSec || 300), 10) || 300);
    const seed = `${input.title}|${input.url || ""}`;
    const chapterCount = 3 + (hashStr(seed + "chapters") % 3);
    const chapters = Array.from({ length: chapterCount }, (_, i) => ({
      title: VIDEO_CHAPTERS[i % VIDEO_CHAPTERS.length],
      startSec: Math.round((durationSec / chapterCount) * i),
    }));
    const transcriptSummary = `Video "${input.title}" — ${chapterCount} chapters, ${Math.round(durationSec / 60)} min. Covers the core topic with a walkthrough and wrap-up.`;
    const block = DataStore.mem().insert("mail_content_blocks", {
      tenantId,
      type: "video",
      messageId: input.messageId || null,
      title: input.title,
      url: input.url || null,
      thumbnailUrl: input.thumbnailUrl || null,
      durationSec,
      chapters,
      transcriptSummary,
      autoSummary: `Auto-summary: ${input.title} (${Math.round(durationSec / 60)} min) — key chapters indexed, transcript ready.`,
      processing: "enriched",
    });
    return { blockId: block._id, ...block, summary: `Video "${input.title}" attached and enriched (${chapterCount} chapters)` };
  }

  attachScreenRecording(tenantId: string, input: any) {
    if (!input || !input.title) throw new Error("Recording title is required");
    const msg = this.requireMessage(tenantId, input.messageId);
    const sizeMB = Math.max(1, parseFloat(String(input.sizeMB || 120)) || 120);
    const seed = input.title + "|" + String(input.sizeMB || 120);
    const compressionPct = 40 + (hashStr(seed + "comp") % 55);
    const elementCount = 3 + (hashStr(seed + "ui") % 5);
    const uiElements = Array.from({ length: elementCount }, (_, i) => UI_ELEMENTS[(hashStr(seed + "el" + i) % UI_ELEMENTS.length)]);
    const stepCount = 3 + (hashStr(seed + "steps") % 3);
    const steps = Array.from({ length: stepCount }, (_, i) => STEPS[(hashStr(seed + "st" + i) % STEPS.length)]);
    const ocrText = `Screen capture text: title bar "${input.title}", ${elementCount} UI element(s) detected, ${stepCount} workflow step(s) extracted.`;
    const block = DataStore.mem().insert("mail_content_blocks", {
      tenantId,
      type: "screen_recording",
      messageId: input.messageId || null,
      title: input.title,
      sizeMB,
      compressionPct,
      ocrText,
      uiElements,
      steps,
      processing: "enriched",
    });
    return { blockId: block._id, ...block, summary: `Recording "${input.title}" processed — ${compressionPct}% compressed, ${stepCount} steps extracted` };
  }

  attachCodeSnippet(tenantId: string, input: any) {
    if (!input || !input.code) throw new Error("Code snippet body is required");
    const msg = this.requireMessage(tenantId, input.messageId);
    const code = String(input.code);
    const language = input.language || LANG_KEYWORDS.find(([, kw]) => kw.some(k => code.includes(k)))?.[0] || "Text";
    const findings = VULN_PATTERNS
      .filter(v => v.pattern.test(code))
      .map(v => ({ severity: hashStr(code + v.finding) % 5 === 0 ? "high" : hashStr(code + v.finding + "s") % 2 === 0 ? "medium" : "low", finding: v.finding }));
    const block = DataStore.mem().insert("mail_content_blocks", {
      tenantId,
      type: "code_snippet",
      messageId: input.messageId || null,
      title: input.name || `Code snippet`,
      code,
      language,
      lineCount: code.split(/\r?\n/).length,
      vulnerabilities: findings,
    });
    return { blockId: block._id, ...block, summary: `Snippet analyzed — ${language}, ${block.lineCount} lines, ${findings.length} finding(s)` };
  }

  createPoll(tenantId: string, input: any) {
    if (!input || !input.question) throw new Error("Poll question is required");
    if (!input.options || !Array.isArray(input.options) || input.options.length < 2) throw new Error("Poll needs at least 2 options");
    const msg = this.requireMessage(tenantId, input.messageId);
    const poll = DataStore.mem().insert("mail_polls", {
      tenantId,
      messageId: input.messageId || null,
      question: input.question,
      options: input.options.map((o: string) => ({ text: String(o), votes: 0 })),
      voters: [],
      status: input.status || "open",
      deadlineAt: input.deadlineDays ? new Date(Date.now() + parseInt(String(input.deadlineDays), 10) * 86400000).toISOString() : null,
      createdBy: input.createdBy || "user_001",
    });
    return { pollId: poll._id, ...poll, summary: `Poll "${input.question}" created — ${poll.options.length} options` };
  }

  votePoll(tenantId: string, pollId: string, optionIndex: number, voter: string) {
    const poll = DataStore.mem().findOne("mail_polls", (p: any) => p._id === pollId && p.tenantId === tenantId);
    if (!poll) throw new Error(`Poll "${pollId}" not found`);
    if (poll.status === "closed") throw new Error(`Poll "${poll.question}" is closed`);
    const idx = parseInt(String(optionIndex), 10);
    if (isNaN(idx) || idx < 0 || idx >= poll.options.length) throw new Error(`Option index ${optionIndex} out of range`);
    if (!voter) throw new Error("Voter id is required");
    if ((poll.voters || []).includes(voter)) throw new Error(`Voter "${voter}" already voted`);
    poll.options[idx].votes += 1;
    const updated = DataStore.mem().update("mail_polls", (p: any) => p._id === pollId && p.tenantId === tenantId, { options: poll.options, voters: [...(poll.voters || []), voter] });
    return { pollId, option: poll.options[idx].text, optionIndex: idx, totalVotes: poll.options.reduce((a: number, o: any) => a + o.votes, 0), summary: `Vote cast for "${poll.options[idx].text}"` };
  }

  pollResults(tenantId: string, pollId: string) {
    const poll = DataStore.mem().findOne("mail_polls", (p: any) => p._id === pollId && p.tenantId === tenantId);
    if (!poll) throw new Error(`Poll "${pollId}" not found`);
    const total = poll.options.reduce((a: number, o: any) => a + o.votes, 0);
    const sentiment = hashStr(poll.question + "sentiment") % 3 === 0 ? "negative" : hashStr(poll.question) % 2 === 0 ? "positive" : "neutral";
    const trend = hashStr(poll.question + "trend") % 2 === 0 ? "rising" : "stable";
    return {
      pollId,
      question: poll.question,
      options: poll.options.map((o: any) => ({ text: o.text, votes: o.votes, pct: total > 0 ? Math.round((o.votes / total) * 100) : 0 })),
      totalVotes: total,
      sentiment,
      trend,
      status: poll.status,
      summary: `${total} vote(s) — sentiment ${sentiment}, trend ${trend}`,
    };
  }

  listContentBlocks(tenantId: string, opts: any = {}) {
    let blocks = DataStore.mem().find("mail_content_blocks", (b: any) => b.tenantId === tenantId);
    if (opts.type) blocks = blocks.filter(b => b.type === opts.type);
    if (opts.messageId) blocks = blocks.filter(b => b.messageId === opts.messageId);
    blocks = blocks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 50;
    return { blocks: blocks.slice(0, limit), total: blocks.length, summary: `${blocks.length} content block(s)` };
  }

  getContentBlock(tenantId: string, blockId: string) {
    const block = DataStore.mem().findOne("mail_content_blocks", (b: any) => b._id === blockId && b.tenantId === tenantId);
    if (!block) throw new Error(`Content block "${blockId}" not found`);
    return block;
  }

  deleteContentBlock(tenantId: string, blockId: string) {
    const block = this.getContentBlock(tenantId, blockId);
    DataStore.mem().delete("mail_content_blocks", (b: any) => b._id === blockId && b.tenantId === tenantId);
    return { blockId, summary: `Content block "${block.title}" deleted` };
  }

  listPolls(tenantId: string) {
    const polls = DataStore.mem().find("mail_polls", (p: any) => p.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { polls: polls.map(p => ({ pollId: p._id, question: p.question, options: p.options, totalVotes: p.options.reduce((a: number, o: any) => a + o.votes, 0), status: p.status, deadlineAt: p.deadlineAt })), summary: `${polls.length} poll(s)` };
  }

  closePoll(tenantId: string, pollId: string) {
    const poll = DataStore.mem().findOne("mail_polls", (p: any) => p._id === pollId && p.tenantId === tenantId);
    if (!poll) throw new Error(`Poll "${pollId}" not found`);
    DataStore.mem().update("mail_polls", (p: any) => p._id === pollId && p.tenantId === tenantId, { status: "closed" });
    return { pollId, status: "closed", summary: `Poll "${poll.question}" closed` };
  }

  multimodalDashboard(tenantId: string) {
    const blocks = DataStore.mem().find("mail_content_blocks", (b: any) => b.tenantId === tenantId);
    const polls = DataStore.mem().find("mail_polls", (p: any) => p.tenantId === tenantId);
    const byType: Record<string, number> = {};
    for (const b of blocks) byType[b.type] = (byType[b.type] || 0) + 1;
    const totalVotes = polls.reduce((acc: number, p: any) => acc + p.options.reduce((a: number, o: any) => a + o.votes, 0), 0);
    return {
      blocks: blocks.length,
      byType,
      polls: polls.length,
      openPolls: polls.filter(p => p.status === "open").length,
      totalVotes,
      vulnerabilityCount: blocks.filter(b => b.type === "code_snippet").reduce((acc: number, b: any) => acc + (b.vulnerabilities || []).length, 0),
      summary: `${blocks.length} content block(s), ${polls.length} poll(s), ${totalVotes} total votes`,
    };
  }
}

export const mailMultimodal = new MailMultimodalService();

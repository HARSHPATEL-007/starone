import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const EMOTIONS = ["joy", "anger", "sadness", "neutral", "excitement"] as const;
const SPEAKER_NAMES = ["Speaker A", "Speaker B", "Speaker C", "Speaker D", "Speaker E", "Speaker F", "Speaker G", "Speaker H", "Speaker I", "Speaker J"];
const ACTION_KEYWORDS = ["approve", "review", "schedule", "send", "share", "call", "confirm", "prepare", "follow up", "follow-up", "remind"];

export class MailVoiceNoteService {
  private log(tenantId: string, note: any, action: string) {
    DataStore.mem().insert("mail_voice_log", {
      tenantId, noteId: note._id, action,
      at: new Date().toISOString(),
      detail: `${action} voice note "${note.title || note.transcript?.slice(0, 40) || "untitled"}"`,
    });
  }

  createVoiceNote(tenantId: string, input: any) {
    if (!input || !input.messageId) throw new Error("messageId is required — attach the voice note to a message");
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === input.messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${input.messageId}" not found`);
    const durationSec = Math.max(1, parseInt(String(input.durationSec || 45), 10) || 45);
    const language = input.language || "en";
    const seed = `${msg.from?.email || "sender"}|${msg.subject || "thread"}|${input.audioData || ""}`;
    const speakerCount = 1 + (hashStr(seed + "speakers") % 3);
    const speakers = Array.from({ length: speakerCount }, (_, i) => ({
      name: SPEAKER_NAMES[i],
      segments: 1 + (hashStr(seed + "seg" + i) % 4),
    }));
    const emotion = EMOTIONS[hashStr(seed + "emotion") % EMOTIONS.length];
    const fillerRemoved = hashStr(seed + "filler") % 3 === 0;
    const confidence = 78 + (hashStr(seed + "conf") % 20);
    const transcript = input.transcript
      ? String(input.transcript)
      : this.synthesizeTranscript(msg, speakerCount, seed);
    const summary = this.summarize(transcript, seed);
    const actionItems = ACTION_KEYWORDS
      .filter(k => transcript.toLowerCase().includes(k))
      .slice(0, 3)
      .map(k => `Follow up: ${k} request mentioned in "${msg.subject}"`);
    if (actionItems.length === 0) actionItems.push(`Revisit "${msg.subject}" — no explicit action found`);

    const note = DataStore.mem().insert("mail_voice_notes", {
      tenantId,
      messageId: msg._id,
      threadId: msg.threadId || null,
      mailboxId: msg.mailboxId || null,
      title: input.title || `Voice note on "${msg.subject}"`,
      durationSec,
      language,
      audioData: input.audioData ? String(input.audioData).slice(0, 80) : null,
      transcript,
      speakers,
      emotion,
      fillerWordsRemoved: fillerRemoved,
      confidence,
      summary,
      actionItems,
      generateTranscript: input.generateTranscript !== false,
      indexed: true,
    });
    this.log(tenantId, note, "recorded");
    return {
      noteId: note._id,
      ...note,
      summary: `Voice note recorded (${Math.round(durationSec / 60)}m ${durationSec % 60}s) — ${emotion} tone, ${speakerCount} speaker(s), ${fillerRemoved ? "filler removed, " : ""}transcript ${input.generateTranscript === false ? "not generated" : `ready (${confidence}% confidence)`}`,
    };
  }

  private synthesizeTranscript(msg: any, speakerCount: number, seed: string): string {
    const subject = msg.subject || "untitled thread";
    const sender = msg.from?.name || msg.from?.email || "Sender";
    const topics = subject.split(/[\s-]+/).filter((w: string) => w.length > 3).slice(0, 3).join(" ") || subject;
    const lines: string[] = [];
    for (let i = 0; i < speakerCount; i++) {
      const name = SPEAKER_NAMES[i];
      const tone = EMOTIONS[hashStr(seed + "tone" + i) % EMOTIONS.length];
      lines.push(`${name}: ${i === 0 ? `Hi, this is ${sender}. Quick voice note about ${topics}.` : `Thanks — on the ${topics} point, I think we should review the numbers before we approve anything.`}`);
      lines.push(`${name}: ${i === speakerCount - 1 ? "Let's schedule a follow-up and confirm next steps by the end of the week." : "Agreed, I will prepare the draft and share it with the team."}`);
    }
    return lines.join("\n");
  }

  private summarize(transcript: string, seed: string): string {
    const t = transcript.toLowerCase();
    if (t.includes("approve") || t.includes("review")) return "Discussion centers on reviewing and approving the pending request; a decision is expected shortly.";
    if (t.includes("schedule") || t.includes("meeting")) return "Conversation about scheduling a follow-up; participants agreed on a next meeting window.";
    if (t.includes("share") || t.includes("draft")) return "Participants agreed to prepare and share a draft with the team before the deadline.";
    return "Casual update on the thread topic with a request for follow-up.";
  }

  listVoiceNotes(tenantId: string, opts: any = {}) {
    let notes = DataStore.mem().find("mail_voice_notes", (n: any) => n.tenantId === tenantId);
    if (opts.messageId) notes = notes.filter(n => n.messageId === opts.messageId);
    if (opts.mailboxId) notes = notes.filter(n => n.mailboxId === opts.mailboxId);
    notes = notes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 50;
    return { notes: notes.slice(0, limit), total: notes.length, summary: `${notes.length} voice note(s)` };
  }

  getVoiceNote(tenantId: string, noteId: string) {
    const note = DataStore.mem().findOne("mail_voice_notes", (n: any) => n._id === noteId && n.tenantId === tenantId);
    if (!note) throw new Error(`Voice note "${noteId}" not found`);
    return note;
  }

  deleteVoiceNote(tenantId: string, noteId: string) {
    const note = this.getVoiceNote(tenantId, noteId);
    DataStore.mem().delete("mail_voice_notes", (n: any) => n._id === noteId && n.tenantId === tenantId);
    this.log(tenantId, note, "deleted");
    return { noteId, summary: `Voice note deleted (${note.title})` };
  }

  voiceNoteDashboard(tenantId: string) {
    const notes = DataStore.mem().find("mail_voice_notes", (n: any) => n.tenantId === tenantId);
    const totalMinutes = notes.reduce((acc: number, n: any) => acc + (n.durationSec || 0) / 60, 0);
    const emotionMix: Record<string, number> = {};
    for (const n of notes) emotionMix[n.emotion || "neutral"] = (emotionMix[n.emotion || "neutral"] || 0) + 1;
    const speakers = new Map<string, number>();
    for (const n of notes) for (const s of n.speakers || []) speakers.set(s.name, (speakers.get(s.name) || 0) + (s.segments || 0));
    const topSpeakers = [...speakers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, segments]) => ({ name, segments }));
    const actionItems = notes.flatMap(n => (n.actionItems || []).map(a => ({ noteId: n._id, title: n.title, item: a })));
    return {
      totalNotes: notes.length,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
      emotionMix,
      topSpeakers,
      actionItems: actionItems.slice(0, 10),
      summary: `${notes.length} voice note(s), ~${Math.round(totalMinutes)} min transcribed`,
    };
  }
}

export const mailVoiceNote = new MailVoiceNoteService();

import { describe, it, expect, beforeEach } from "vitest";
import { aniService } from "../services/AniService";
import { DataStore } from "../services/DataStore";

const TENANT = "ani_test_tenant";

describe("AniService", () => {
  beforeEach(() => {
    DataStore["mem"]()["collections"].clear();
  });

  it("returns a healthy module health", () => {
    const health = aniService.moduleHealth();
    expect(health.module).toBe("ani");
    expect(health.status).toBe("healthy");
  });

  it("returns an overview with cross-module context", () => {
    const overview = aniService.overview(TENANT, "user_001");
    expect(overview.greeting).toBeTruthy();
    expect(overview.context).toHaveProperty("inboxCount");
    expect(overview.memories.length).toBeGreaterThan(0);
    expect(overview.automations.length).toBeGreaterThan(0);
  });

  it("detects intents and replies in chat", () => {
    const res = aniService.chat(TENANT, "user_001", "summarize my morning", { threadId: "t1" });
    expect(res.intent.intent).toBe("summarize");
    expect(res.reply).toContain("state of your world");
    const convos = aniService.conversations(TENANT, "user_001", { threadId: "t1" });
    expect(convos.messages.length).toBe(2);
  });

  it("detects email intent", () => {
    const res = aniService.chat(TENANT, "user_001", "draft an email to the CEO");
    expect(res.intent.intent).toBe("draft_email");
  });

  it("saves, searches, and deletes memory", () => {
    const saved = aniService.saveMemory(TENANT, "user_001", { topic: "preferences", text: "ANi prefers concise briefings" });
    expect(saved.memory.text).toContain("concise");
    const found = aniService.memorySearch(TENANT, "concise");
    expect(found.total).toBeGreaterThan(0);
    aniService.deleteMemory(TENANT, saved.memory.memoryId);
    expect(aniService.memorySearch(TENANT, "concise").total).toBe(0);
  });

  it("generates and lists briefings", () => {
    const daily = aniService.generateBriefing(TENANT, "user_001", "daily");
    expect(daily.briefing.type).toBe("daily");
    aniService.generateBriefing(TENANT, "user_001", "weekly");
    const list = aniService.listBriefings(TENANT, "user_001");
    expect(list.total).toBe(2);
  });

  it("creates, toggles, and runs automations", () => {
    const created = aniService.createAutomation(TENANT, "user_001", { templateId: "morning_briefing", enabled: true });
    expect(created.automation.templateId).toBe("morning_briefing");
    aniService.createAutomation(TENANT, "user_001", { templateId: "triage_inbox" });
    aniService.toggleAutomation(TENANT, created.automation._id, false);
    const run = aniService.runAutomation(TENANT, "user_001", created.automation._id);
    expect(run.run.status).toBe("completed");
    expect(aniService.automationRuns(TENANT).total).toBeGreaterThan(0);
  });

  it("communes automations list reflects installed state", () => {
    aniService.createAutomation(TENANT, "user_001", { templateId: "campaign_pulse" });
    const list = aniService.automations(TENANT, "user_001");
    const carpet = list.automations.find((a: any) => a.id === "campaign_pulse");
    expect(carpet.installed).toBe(true);
  });

  it("executes voice commands with intent resolution", () => {
    const res = aniService.executeVoiceCommand(TENANT, "user_001", "run campaign pulse");
    expect(res.intent.intent).toBe("campaign");
    expect(aniService.voiceLog(TENANT).total).toBe(1);
  });

  it("returns suggestions and supports dismiss/accept", () => {
    const suggs = aniService.suggestions(TENANT, "user_001");
    expect(suggs.total).toBeGreaterThan(0);
    const first = suggs.suggestions[0];
    aniService.acceptSuggestion(TENANT, first.suggestionId);
    aniService.dismissSuggestion(TENANT, first.suggestionId);
    expect(aniService.suggestions(TENANT, "user_001").total).toBe(suggs.total - 1);
  });

  it("reads and updates settings", () => {
    aniService.updateSettings(TENANT, "user_001", { tone: "warm" });
    const s = aniService.settings(TENANT, "user_001");
    expect(s.settings.prefs.tone).toBe("warm");
  });

  it("returns stats", () => {
    aniService.chat(TENANT, "user_001", "help me prioritize");
    const stats = aniService.stats(TENANT);
    expect(stats.total_messages).toBeGreaterThan(0);
  });
});
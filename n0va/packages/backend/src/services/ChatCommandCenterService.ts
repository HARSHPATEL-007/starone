import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const CMDS = [
  "/status", "/help", "/huddle", "/search", "/who", "/lock", "/archive", "/unread", "/thread", "/shortcut",
];

export class ChatCommandCenterService {
  listCommands() {
    return {
      commands: [
        { command: "/status", description: "Show or update your status" },
        { command: "/help", description: "List all slash commands" },
        { command: "/huddle", description: "Start an audio huddle" },
        { command: "/search", description: "Search messages and files" },
        { command: "/who", description: "Who's in this room" },
        { command: "/lock", description: "Lock the room" },
        { command: "/archive", description: "Archive the room" },
        { command: "/unread", description: "Jump to first unread message" },
        { command: "/thread", description: "Summarize the thread" },
        { command: "/shortcut", description: "Open a keyboard shortcut" },
      ],
      total: CMDS.length,
      summary: `${CMDS.length} quick actions`,
    };
  }

  runQuickAction(tenantId: string, userId: string, command: string, payload: any = {}) {
    const c = String(command || "").replace(/^\//, "");
    const rooms = DataStore.mem().find("chat_rooms", (x: any) => x.tenantId === tenantId);
    switch (c) {
      case "status": {
        const status = payload.status || "available";
        DataStore.mem().update("chat_presence", (p: any) => p.tenantId === tenantId && p.userId === userId, { status });
        return { action: "/status", payload: { status }, summary: `Status set to ${status}` };
      }
      case "who": {
        const members = DataStore.mem().find("chat_room_members", (x: any) => x.tenantId === tenantId && x.roomId === payload.roomId);
        return { action: "/who", payload: { roomId: payload.roomId, members: members.length }, summary: `${members.length} member(s) in room` };
      }
      case "lock": {
        if (!payload.roomId) throw new Error("roomId is required");
        const room = DataStore.mem().findOne("chat_rooms", (x: any) => x.roomId === payload.roomId && x.tenantId === tenantId);
        if (!room) throw new Error("Room not found");
        const updated = DataStore.mem().update("chat_rooms", (x: any) => x.roomId === payload.roomId && x.tenantId === tenantId, { locked: true, locked_at: new Date().toISOString() });
        return { action: "/lock", payload: { roomId: payload.roomId }, summary: `Room "${updated.display_name || updated.name}" locked` };
      }
      case "archive": {
        if (!payload.roomId) throw new Error("roomId is required");
        DataStore.mem().update("chat_rooms", (x: any) => x.roomId === payload.roomId && x.tenantId === tenantId, { archived: true, archived_at: new Date().toISOString() });
        return { action: "/archive", payload: { roomId: payload.roomId }, summary: `Room archived (${rooms.length - 1} room(s) remain)` };
      }
      case "unread": {
        const unread = DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId && !x.read).length;
        return { action: "/unread", payload: { unread }, summary: `${unread} unread message(s)` };
      }
      case "shortcut": {
        const shortcuts = [
          { keys: "j/k", action: "Navigate messages" },
          { keys: "r", action: "Reply in thread" },
          { keys: "e", action: "Edit last message" },
          { keys: "f", action: "Forward" },
        ];
        return { action: "/shortcut", payload: { shortcuts }, summary: "Keyboard shortcuts loaded" };
      }
      case "huddle": {
        return { action: "/huddle", payload: { topic: payload.topic || "Quick sync" }, summary: "Huddle started" };
      }
      case "search":
        return { action: "/search", payload: { query: payload.query || "" }, summary: "Search queued" };
      case "thread":
        return { action: "/thread", payload: { roomId: payload.roomId }, summary: "Thread summary requested" };
      default:
        throw new Error(`Unknown command "/${c}"`);
    }
  }

  discoverRooms(tenantId: string, userId: string) {
    const memberships = DataStore.mem().find("chat_room_members", (x: any) => x.tenantId === tenantId && x.userId === userId);
    const ids = new Set(memberships.map((m) => m.roomId));
    const mine = DataStore.mem().find("chat_rooms", (x: any) => x.tenantId === tenantId && ids.has(x.roomId) && !x.archived);
    const unread: Record<string, number> = {};
    for (const m of mine) {
      unread[m.roomId] = DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId && x.roomId === m.roomId && !x.read).length;
    }
    return {
      rooms: mine.map((r) => ({ roomId: r.roomId, name: r.display_name || r.name, unread: unread[r.roomId] || 0, last_activity: r.last_activity_at })),
      total_unread: Object.values(unread).reduce((a, b) => a + b, 0),
      summary: `${mine.length} room(s) · ${Object.values(unread).reduce((a, b) => a + b, 0)} unread`,
    };
  }

  syncRooms(tenantId: string, roomIds: string[], action: string) {
    const syncId = `sync_${hashStr(tenantId + action + Date.now())}`;
    return {
      syncId,
      action,
      rooms: roomIds,
      summary: `${roomIds.length} room(s) ${action}`,
    };
  }
}

export const chatCommandCenter = new ChatCommandCenterService();
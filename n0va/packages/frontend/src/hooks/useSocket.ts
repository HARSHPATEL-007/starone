import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (socketRef.current) return;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  const subscribeCampaign = useCallback((id: string) => {
    socketRef.current?.emit("subscribe:campaign", id);
  }, []);

  const unsubscribeCampaign = useCallback((id: string) => {
    socketRef.current?.emit("unsubscribe:campaign", id);
  }, []);

  const subscribeFraud = useCallback(() => {
    socketRef.current?.emit("subscribe:fraud");
  }, []);

  const subscribeBudget = useCallback(() => {
    socketRef.current?.emit("subscribe:budget");
  }, []);

  const subscribeTenant = useCallback((id: string) => {
    socketRef.current?.emit("subscribe:tenant", id);
  }, []);

  const unsubscribeTenant = useCallback((id: string) => {
    socketRef.current?.emit("unsubscribe:tenant", id);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { connected, subscribeCampaign, unsubscribeCampaign, subscribeFraud, subscribeBudget, subscribeTenant, unsubscribeTenant, on, socket: socketRef };
}

export function useCampaignLive(id: string | undefined) {
  const { connected, subscribeCampaign, unsubscribeCampaign, on } = useSocket();
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    if (!id || !connected) return;
    subscribeCampaign(id);
    const cleanup = on(`campaign:${id}:update`, (data: any) => setLiveData(data));
    return () => { unsubscribeCampaign(id); cleanup(); };
  }, [id, connected, subscribeCampaign, unsubscribeCampaign, on]);

  return liveData;
}

export function useFraudAlerts() {
  const { connected, subscribeFraud, on } = useSocket();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!connected) return;
    subscribeFraud();
    const cleanup = on("fraud:alert", (alert: any) => setAlerts((prev) => [alert, ...prev].slice(0, 50)));
    return cleanup;
  }, [connected, subscribeFraud, on]);

  return alerts;
}

export function useBudgetAlerts() {
  const { connected, subscribeBudget, on } = useSocket();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!connected) return;
    subscribeBudget();
    const cleanup = on("budget:alert", (alert: any) => setAlerts((prev) => [alert, ...prev].slice(0, 20)));
    return cleanup;
  }, [connected, subscribeBudget, on]);

  return alerts;
}

export function useTenantActivity(tenantId: string) {
  const { connected, subscribeTenant, unsubscribeTenant, on } = useSocket();
  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!connected) return;
    subscribeTenant(tenantId);
    const cleanup = on("activity:new", (activity: any) => setLiveActivities((prev) => [activity, ...prev].slice(0, 100)));
    return () => { unsubscribeTenant(tenantId); cleanup(); };
  }, [tenantId, connected, subscribeTenant, unsubscribeTenant, on]);

  return liveActivities;
}

export const MAIL_REALTIME_EVENTS = [
  "mail.received", "mail.sent", "mail.read", "mail.thread_update",
  "mail.label_change", "mail.folder_change", "mail.spam_detected", "mail.ai_suggestion",
] as const;

export type MailRealtimeEvent = (typeof MAIL_REALTIME_EVENTS)[number];

export function useMailRealtime(tenantId: string) {
  const { connected, subscribeTenant, unsubscribeTenant, on } = useSocket();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!connected) return;
    subscribeTenant(tenantId);
    const cleanups = MAIL_REALTIME_EVENTS.map((event) =>
      on(event, (payload: any) => {
        const entry = { event, payload, at: new Date().toISOString() };
        setEvents((prev) => [entry, ...prev].slice(0, 50));
        window.dispatchEvent(new CustomEvent("n0va:mail-event", { detail: entry }));
        window.dispatchEvent(new CustomEvent("n0va:refresh-data"));
      })
    );
    return () => {
      unsubscribeTenant(tenantId);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [tenantId, connected, subscribeTenant, unsubscribeTenant, on]);

  return { connected, events };
}

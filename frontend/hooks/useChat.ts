"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, ChatMode, WSFrame } from "@/lib/types";
import { useWebSocket } from "./useWebSocket";

interface StoredMessage {
  id: string;
  role: ChatMessage["role"];
  content: string;
  confidence_score: number | null;
  created_at: string;
}
interface ConversationDetail {
  conversation: { status: string };
  messages: StoredMessage[];
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const key = "cs_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function useChat(token: string | null, onSent?: () => void) {
  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>("ai");
  const [isTyping, setIsTyping] = useState(false);
  const [escalationId, setEscalationId] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const handleFrame = useCallback((frame: WSFrame) => {
    switch (frame.type) {
      case "connected":
        break;

      case "typing":
        setIsTyping(true);
        break;

      case "message":
        setIsTyping(false);
        setMode("ai"); // AI is answering again — clear any "specialist" banner
        setMessages((prev) => [
          ...prev,
          {
            id: frame.message_id,
            role: "assistant",
            content: frame.content,
            confidence: frame.confidence,
            mode: frame.mode,
            timestamp: frame.timestamp,
          },
        ]);
        break;

      case "escalation":
        setIsTyping(false);
        setMode("human");
        setEscalationId(frame.escalation_id);
        setMessages((prev) => [
          ...prev,
          {
            id: frame.escalation_id,
            role: "system",
            content: frame.message,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;

      case "agent_joined":
        setIsTyping(false);
        setMode("human");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: frame.message,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;

      case "resolved":
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: frame.message,
            timestamp: new Date().toISOString(),
          },
        ]);
        // Conversation is closed — start a fresh session so the next message
        // begins a brand-new conversation, and hand control back to the AI.
        setMode("ai");
        setEscalationId(null);
        {
          const next = crypto.randomUUID();
          localStorage.setItem("cs_session_id", next);
          setSessionId(next);
        }
        break;

      case "quota_exceeded":
        setIsTyping(false);
        setQuotaExceeded(true);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: frame.message,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;

      case "error":
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: frame.message,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;
    }
  }, []);

  // Load saved history once on mount so a page refresh keeps the conversation.
  // (DB read only — no LLM tokens. Runs once; session rotation after a resolve
  // intentionally does NOT reload, so the resolution message stays visible.)
  useEffect(() => {
    let cancelled = false;
    const sid = sessionId;
    api
      .get<ConversationDetail>(`/api/v1/conversations/${sid}`)
      .then((data) => {
        if (cancelled || !data.messages?.length) return;
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            confidence: m.confidence_score ?? undefined,
            timestamp: m.created_at,
          })),
        );
        if (data.conversation.status === "escalated" || data.conversation.status === "assigned") {
          setMode("human");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { connected, send } = useWebSocket(sessionId, token, handleFrame);

  const sendMessage = useCallback(
    (content: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
      send({ type: "message", content });
      onSent?.();
    },
    [send, onSent]
  );

  const startNewChat = useCallback(() => {
    const next = crypto.randomUUID();
    localStorage.setItem("cs_session_id", next);
    setSessionId(next);
    setMessages([]);
    setMode("ai");
    setEscalationId(null);
    setIsTyping(false);
  }, []);

  return {
    sessionId,
    messages,
    mode,
    isTyping,
    escalationId,
    quotaExceeded,
    connected,
    sendMessage,
    startNewChat,
  };
}

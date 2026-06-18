"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatMode, WSFrame } from "@/lib/types";
import { useWebSocket } from "./useWebSocket";

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

export function useChat() {
  const [sessionId] = useState(getOrCreateSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>("ai");
  const [isTyping, setIsTyping] = useState(false);
  const [escalationId, setEscalationId] = useState<string | null>(null);

  const handleFrame = useCallback((frame: WSFrame) => {
    switch (frame.type) {
      case "connected":
        break;

      case "typing":
        setIsTyping(true);
        break;

      case "message":
        setIsTyping(false);
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

  const { connected, send } = useWebSocket(sessionId, handleFrame);

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
    },
    [send]
  );

  return {
    sessionId,
    messages,
    mode,
    isTyping,
    escalationId,
    connected,
    sendMessage,
  };
}

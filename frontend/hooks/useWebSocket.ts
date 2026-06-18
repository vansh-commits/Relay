"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/api";
import type { WSFrame } from "@/lib/types";

type Handler = (frame: WSFrame) => void;

export function useWebSocket(sessionId: string, onFrame: Handler) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const shouldCloseRef = useRef(false);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (shouldCloseRef.current) return;
    const url = wsUrl(sessionId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      setConnected(true);
    };

    ws.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data) as WSFrame;
        onFrame(frame);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!shouldCloseRef.current) {
        const delay = Math.min(500 * 2 ** retryRef.current, 30000);
        retryRef.current++;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws.close();
  }, [sessionId, onFrame]);

  useEffect(() => {
    shouldCloseRef.current = false;
    connect();
    return () => {
      shouldCloseRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((frame: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(frame));
    }
  }, []);

  return { connected, send };
}

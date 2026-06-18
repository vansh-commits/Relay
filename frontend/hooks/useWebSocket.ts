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

  // Keep the latest handler in a ref so `connect` stays stable and the effect
  // never tears down / reopens the socket (which previously caused duplicate
  // connections and duplicate API calls).
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const connect = useCallback(() => {
    if (shouldCloseRef.current) return;
    // Don't open a second socket if one is already open/connecting.
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const ws = new WebSocket(wsUrl(sessionId));
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      setConnected(true);
    };

    ws.onmessage = (ev) => {
      try {
        onFrameRef.current(JSON.parse(ev.data) as WSFrame);
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
  }, [sessionId]);

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

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ModeIndicator } from "./ModeIndicator";

export function ChatShell() {
  const { user, ready, signup, login, guest, logout, noteQuestionSent } = useAuth();
  const { sessionId, messages, mode, isTyping, quotaExceeded, connected, sendMessage, startNewChat } = useChat(
    user?.token ?? null,
    noteQuestionSent,
  );
  const [showAuth, setShowAuth] = useState(false);
  const pendingRef = useRef<string | null>(null);

  // Hide the auth screen once signed in
  useEffect(() => {
    if (user) setShowAuth(false);
  }, [user]);

  // Send any message the user typed before signing in, once connected
  useEffect(() => {
    if (connected && pendingRef.current) {
      sendMessage(pendingRef.current);
      pendingRef.current = null;
    }
  }, [connected, sendMessage]);

  function handleSend(text: string) {
    if (!user) {
      pendingRef.current = text; // stash, then ask them to sign up
      setShowAuth(true);
      return;
    }
    sendMessage(text);
  }

  const guestExhausted = Boolean(user?.is_guest && quotaExceeded);

  if (!ready) return <div className="min-h-screen bg-bg-base" />;

  // Sign-up gate: shown on first message (no account yet) or when a guest runs out
  if (showAuth || guestExhausted) {
    return (
      <AuthScreen
        onSignup={signup}
        onLogin={login}
        onGuest={guest}
        allowGuest={!guestExhausted}
        notice={guestExhausted ? "You've used all 4 free questions. Create an account to keep chatting." : undefined}
      />
    );
  }

  const remaining = user?.is_guest ? Math.max(user.question_limit - user.question_count, 0) : null;

  return (
    <div className="flex flex-col h-screen bg-bg-base">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-base flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <span className="text-sm font-bold text-accent">R</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">Relay</p>
            <p className="text-xs text-text-muted mt-0.5 leading-none">Support</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {remaining !== null && (
            <span className="text-xs text-text-muted">
              {remaining} free {remaining === 1 ? "question" : "questions"} left
            </span>
          )}
          <ModeIndicator mode={mode} />
          <button
            onClick={startNewChat}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-bg-elevated"
          >
            New chat
          </button>
          <div
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success" : "bg-text-muted"}`}
            title={connected ? "Connected" : "Reconnecting…"}
          />
          {user && (
            <button
              onClick={logout}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-bg-elevated"
              title={user.email ?? "Guest"}
            >
              {user.is_guest ? "Guest" : "Sign out"}
            </button>
          )}
          <Link
            href="/admin"
            className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-bg-elevated"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Escalation banner */}
      {mode === "human" && (
        <div className="px-4 py-2.5 bg-warning/10 border-b border-warning/20 flex items-center gap-2 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-dot flex-shrink-0" />
          <p className="text-xs text-warning">A specialist is on this conversation — your messages go straight to them.</p>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isTyping={isTyping} conversationId={sessionId} />

      {/* Input — stays usable during human handoff */}
      <MessageInput onSend={handleSend} disabled={false} />
    </div>
  );
}

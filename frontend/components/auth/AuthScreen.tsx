"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EMAIL_RE } from "@/lib/auth";

interface AuthScreenProps {
  onSignup: (email: string, password: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onGuest: () => Promise<void>;
  /** Optional context shown at the top, e.g. when a guest runs out of questions */
  notice?: string;
  allowGuest?: boolean;
}

export function AuthScreen({ onSignup, onLogin, onGuest, notice, allowGuest = true }: AuthScreenProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const emailValid = EMAIL_RE.test(email);
  const canSubmit = emailValid && password.length >= 6 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailValid) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    try {
      await (mode === "signup" ? onSignup(email.trim(), password) : onLogin(email.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function continueAsGuest() {
    setError("");
    setBusy(true);
    try {
      await onGuest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full bg-bg-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-accent">R</span>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {mode === "signup" ? "Sign up to start chatting with support." : "Log in to continue."}
          </p>
        </div>

        {notice && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
            {notice}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputCls}
            />
            {email.length > 0 && !emailValid && (
              <p className="text-xs text-danger mt-1">Enter a valid email address.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className={`${inputCls} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted hover:text-text-secondary px-1.5 py-1 transition-colors"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <Button type="submit" disabled={!canSubmit} className="w-full justify-center">
            {busy ? "Please wait…" : mode === "signup" ? "Sign up to continue" : "Log in"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            {mode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
        </div>

        {allowGuest && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Button variant="secondary" onClick={continueAsGuest} disabled={busy} className="w-full justify-center">
              Continue as guest
            </Button>
            <p className="text-xs text-text-muted text-center mt-2">Guests get 4 free questions.</p>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { authApi, clearToken, getToken, setToken, type AuthUser } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Restore session on load
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    authApi
      .me(token)
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  const apply = useCallback((u: AuthUser) => {
    setToken(u.token);
    setUser(u);
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    apply(await authApi.signup(email, password));
  }, [apply]);

  const login = useCallback(async (email: string, password: string) => {
    apply(await authApi.login(email, password));
  }, [apply]);

  const guest = useCallback(async () => {
    apply(await authApi.guest());
  }, [apply]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // Locally count a guest's sent question for the "X left" indicator
  const noteQuestionSent = useCallback(() => {
    setUser((u) => (u && u.is_guest ? { ...u, question_count: u.question_count + 1 } : u));
  }, []);

  return { user, ready, signup, login, guest, logout, noteQuestionSent };
}

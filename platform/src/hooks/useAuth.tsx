import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountStatus = "pending" | "approved" | "rejected";
export type AppRole = "admin" | "viewer";

export interface SignInResult {
  error: string | null;
  emailNotConfirmed?: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  status: AccountStatus | null;
  role: AppRole | null;
  isAdmin: boolean;
  /** true while the session OR the access check is still being resolved */
  loading: boolean;
  /** set when the access check failed (network/DB) — show retry, NOT "pending" */
  accessError: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  // Guards against out-of-order async responses (fast tab switches, token refresh)
  const loadSeq = useRef(0);

  const loadAccess = useCallback(async () => {
    const seq = ++loadSeq.current;
    setAccessLoading(true);
    setAccessError(null);
    // Single SECURITY DEFINER RPC: immune to RLS edge cases and
    // self-heals a missing profile/role row server-side.
    // Transient "Failed to fetch" (preview iframe / network blip) → retry twice.
    let data: any = null;
    let error: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      ({ data, error } = await supabase.rpc("get_my_access"));
      if (seq !== loadSeq.current) return; // a newer call superseded this one
      const transient = !!error && /failed to fetch|network|load failed/i.test(error.message ?? "");
      if (!transient) break;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      if (seq !== loadSeq.current) return;
    }

    if (error) {
      console.error("get_my_access failed:", error.message);
      setAccessError(
        /failed to fetch|network|load failed/i.test(error.message ?? "")
          ? "Falha de conexão com o servidor. Verifique sua internet e tente novamente."
          : error.message,
      );
      setStatus(null);
      setRole(null);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setStatus((row?.status as AccountStatus) ?? null);
      const roles: string[] = row?.roles ?? [];
      setRole(roles.includes("admin") ? "admin" : roles.includes("viewer") ? "viewer" : null);
      if (!row) setAccessError("Não foi possível carregar seu perfil.");
    }
    setAccessLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Synchronous state updates only inside the callback (supabase-js
      // deadlocks if you await supabase calls here) — defer the DB read.
      setSession(s);
      if (s?.user) {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
          setAccessLoading(true); // block ProtectedRoute BEFORE the deferred read runs
          setTimeout(() => loadAccess(), 0);
        }
      } else {
        loadSeq.current++;
        setStatus(null);
        setRole(null);
        setAccessError(null);
        setAccessLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setSessionLoading(false);
      if (s?.user) {
        await loadAccess();
      } else {
        setAccessLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadAccess]);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    status,
    role,
    isAdmin: role === "admin",
    loading: sessionLoading || (!!session?.user && accessLoading),
    accessError,

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (!error) return { error: null };
      if (error.message === "Invalid login credentials") {
        return {
          error:
            "E-mail ou senha incorretos. Verifique o e-mail (sem espaços) e a senha, ou use 'Esqueci minha senha'.",
        };
      }
      if (error.message === "Email not confirmed") {
        return {
          error: "Este e-mail ainda não foi confirmado. Reenvie o link de confirmação abaixo.",
          emailNotConfirmed: true,
        };
      }
      return { error: error.message };
    },

    signUp: async (email, password, fullName) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      });
      if (error?.message === "User already registered") {
        return { error: "Este e-mail já está cadastrado. Use 'Entrar' ou 'Esqueci minha senha'." };
      }
      return { error: error?.message ?? null };
    },

    resendConfirmation: async (email) => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      return { error: error?.message ?? null };
    },

    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    refresh: loadAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

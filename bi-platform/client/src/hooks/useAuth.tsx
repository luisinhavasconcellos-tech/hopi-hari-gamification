import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authSupabase } from "@/integrations/supabase/authClient";
import { queryClient } from "@/lib/queryClient";
import { resetParkAttractionsCache } from "@/hooks/useParkAttractions";

export type AccountStatus = "pending" | "approved" | "rejected";

const ACCOUNT_STATUSES: readonly AccountStatus[] = ["pending", "approved", "rejected"];

/** Qualquer status desconhecido vindo da API é tratado como pendente — nunca libera a rota. */
const normalizeStatus = (value: unknown): AccountStatus =>
  (ACCOUNT_STATUSES as readonly string[]).includes(String(value)) ? (value as AccountStatus) : "pending";

/**
 * Prefixo das chaves de cache de KPIs da AudienceIntelligencePage em sessionStorage
 * (CACHE_KEY = "audience-overview-cache-v5"). Mantido como prefixo para não criar
 * ciclo de import com a página e sobreviver a mudanças de versão da chave.
 */
const AUDIENCE_KPI_CACHE_PREFIX = "audience-overview-cache";
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
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const appUrl = (path = "") =>
  new URL(`${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`, window.location.origin).toString();

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
    let data: { status?: AccountStatus; roles?: string[] } | null = null;
    let error: { message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: sessionData } = await authSupabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        error = { message: "Authentication required" };
        break;
      }
      try {
        const response = await fetch("/api/auth/access", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || "Unable to verify platform access");
        }
        data = (await response.json()) as { status?: AccountStatus; roles?: string[] };
        error = null;
      } catch (caught) {
        error = { message: caught instanceof Error ? caught.message : "Failed to fetch" };
      }
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
      const row = data;
      setStatus(row ? normalizeStatus(row.status) : null);
      const roles: string[] = row?.roles ?? [];
      setRole(roles.includes("admin") ? "admin" : roles.includes("viewer") ? "viewer" : null);
      if (!row) setAccessError("Não foi possível carregar seu perfil.");
    }
    setAccessLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = authSupabase.auth.onAuthStateChange((event, s) => {
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

    authSupabase.auth.getSession().then(async ({ data: { session: s } }) => {
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
      const { error } = await authSupabase.auth.signInWithPassword({
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
      const { error } = await authSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error?.message === "User already registered") {
        return { error: "Este e-mail já está cadastrado. Use 'Entrar' ou 'Esqueci minha senha'." };
      }
      return { error: error?.message ?? null };
    },

    resetPassword: async (email) => {
      const { error } = await authSupabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: appUrl("reset-password"),
      });
      return { error: error?.message ?? null };
    },

    signOut: async () => {
      await authSupabase.auth.signOut();
      // Nada do usuário anterior pode sobreviver na mesma aba: cache do
      // react-query, caches em memória dos hooks e o snapshot de KPIs em sessionStorage.
      queryClient.clear();
      resetParkAttractionsCache();
      try {
        const doomed: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(AUDIENCE_KPI_CACHE_PREFIX)) doomed.push(key);
        }
        doomed.forEach((key) => sessionStorage.removeItem(key));
      } catch {
        /* storage indisponível (modo privado / bloqueado) — nada a limpar */
      }
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

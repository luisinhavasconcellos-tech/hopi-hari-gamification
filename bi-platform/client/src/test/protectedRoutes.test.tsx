import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cleanup, render, waitFor } from "@testing-library/react";
import { PROTECTED_ROUTES, PUBLIC_ROUTES, toConcretePath } from "./protectedRoutes";

/* ------------------------------------------------------------------ *
 * Backend stub — nenhum teste deve depender de rede.                   *
 * Reproduz uma sessão ANÔNIMA (sem usuário logado).                    *
 * ------------------------------------------------------------------ */
function makeQuery(): any {
  const result = { data: [], error: null, count: 0 };
  const target: any = () => makeQuery();
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      }
      if (prop === "catch" || prop === "finally") {
        return () => makeQuery();
      }
      return () => makeQuery();
    },
    apply() {
      return makeQuery();
    },
  });
}

// AuthProvider talks to the AUTH project client; mock it with the same anonymous session.
vi.mock("@/integrations/supabase/authClient", () => {
  const anonSession = { data: { session: null }, error: null };
  return {
    authSupabase: {
      auth: {
        getSession: async () => anonSession,
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
          cb("INITIAL_SESSION", null);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
        signUp: async () => ({ data: {}, error: null }),
        resetPasswordForEmail: async () => ({ data: {}, error: null }),
      },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const anonSession = { data: { session: null }, error: null };
  return {
    supabase: {
      from: () => makeQuery(),
      rpc: () => makeQuery(),
      functions: { invoke: async () => ({ data: null, error: null }) },
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
      auth: {
        // sessão anônima
        getSession: async () => anonSession,
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
          cb("INITIAL_SESSION", null);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
      },
    },
  };
});

/* jsdom não implementa APIs usadas por gráficos/observers */
beforeEach(() => {
  (globalThis as any).ResizeObserver ||= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  (globalThis as any).IntersectionObserver ||= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!("scrollTo" in window)) (window as any).scrollTo = () => {};
});

afterEach(() => cleanup());

const APP_SOURCE = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");

/* ------------------------------------------------------------------ *
 * 1. Análise estática: nenhuma rota nova pode escapar do manifesto,    *
 *    e o gate de rota precisa exigir login.                            *
 * ------------------------------------------------------------------ */
describe("manifesto de rotas", () => {
  const declared = Array.from(APP_SOURCE.matchAll(/<Route\s+path="([^"]+)"/g)).map((m) => m[1]);

  it("cobre todas as rotas declaradas em App.tsx", () => {
    const known = new Set<string>([...PROTECTED_ROUTES, ...PUBLIC_ROUTES]);
    const missing = declared.filter((r) => !known.has(r));
    expect(missing, `Rotas sem cobertura de teste: ${missing.join(", ")}`).toEqual([]);
  });

  it("ProtectedRoute redireciona sessão anônima para /auth", () => {
    const guard = fs.readFileSync(
      path.resolve(__dirname, "../components/ProtectedRoute.tsx"),
      "utf8",
    );
    expect(guard).toMatch(/\/auth/);
    expect(guard).toMatch(/<Navigate/);
  });

  it("oculta a configuração de domínio e redireciona links antigos ao dashboard", () => {
    const sidebar = fs.readFileSync(
      path.resolve(__dirname, "../components/layout/Sidebar.tsx"),
      "utf8",
    );

    expect(sidebar).not.toContain('to: "/dominio"');
    expect(sidebar).not.toContain("Domínio & Verificação");
    expect(APP_SOURCE).toContain(
      '<Route path="/dominio" element={<Navigate to="/dashboard" replace />} />',
    );
    expect(APP_SOURCE).not.toContain("DomainSetupPage");
  });

  it("consolida a auditoria de gênero dentro de Segmentos", () => {
    const sidebar = fs.readFileSync(
      path.resolve(__dirname, "../components/layout/Sidebar.tsx"),
      "utf8",
    );
    const segments = fs.readFileSync(
      path.resolve(__dirname, "../pages/audience/SegmentsPage.tsx"),
      "utf8",
    );

    expect(sidebar).not.toContain('to: "/audience/gender-audit"');
    expect(sidebar).not.toContain("Auditoria de Gênero");
    expect(segments).toContain('aria-labelledby="gender-audit-title"');
    expect(segments).toContain("<GenderAuditSection embedded />");
    expect(APP_SOURCE).toContain(
      '<Route path="/audience/gender-audit" element={<Navigate to="/audience/segments#gender-audit" replace />} />',
    );
  });
});

/* ------------------------------------------------------------------ *
 * 2. Render real: cada rota protegida redireciona anônimos ao portal.  *
 * ------------------------------------------------------------------ */
describe("rotas protegidas exigem login", () => {
  it.each(PROTECTED_ROUTES.map((r) => [r, toConcretePath(r)]))(
    "%s redireciona sessão anônima para /auth",
    async (_pattern, url) => {
      window.history.pushState({}, "", url);
      const { default: App } = await import("../App");
      const { container } = render(<App />);

      await waitFor(() => {
        expect(window.location.pathname, `${url} não exigiu login`).toBe("/auth");
      });

      // O destino original é preservado para depois do login.
      const next = new URLSearchParams(window.location.search).get("next");
      expect(next, `${url} não preservou ?next=`).toBe(url);

      await waitFor(() => {
        expect(container.textContent).toMatch(/Entrar/);
      });
    },
    20000,
  );
});

/* ------------------------------------------------------------------ *
 * 3. O portal de acesso carrega sem login.                             *
 * ------------------------------------------------------------------ */
describe("portal de acesso", () => {
  it("/auth renderiza o portal em sessão anônima", async () => {
    window.history.pushState({}, "", "/auth");
    const { default: App } = await import("../App");
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.textContent).toMatch(/Entrar/);
      expect(container.textContent).toMatch(/Criar Conta/);
    });
    expect(window.location.pathname).toBe("/auth");
  });
});

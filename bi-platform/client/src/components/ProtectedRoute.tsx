import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert, Clock3, RefreshCcw, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";

function CenteredShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-4 glass rounded-2xl p-8">
        <div className="flex justify-center">
          <BrandMark className="size-14" />
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Protege as rotas da plataforma: exige sessão autenticada e conta aprovada.
 * Sem sessão → redireciona para /auth preservando o destino em ?next=.
 */
export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { session, loading, status, isAdmin, accessError, refresh, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (accessError) {
    return (
      <CenteredShell>
        <h1 className="font-display text-xl font-bold">Não foi possível verificar seu acesso</h1>
        <p className="text-sm text-muted-foreground">{accessError}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => refresh()}>
            <RefreshCcw className="size-4 mr-2" />
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="size-4 mr-2" />
            Sair
          </Button>
        </div>
      </CenteredShell>
    );
  }

  if (status === "pending") {
    return (
      <CenteredShell>
        <Clock3 className="size-8 mx-auto text-warning" />
        <h1 className="font-display text-xl font-bold">Conta aguardando aprovação</h1>
        <p className="text-sm text-muted-foreground">
          Seu cadastro foi recebido. Um administrador precisa aprovar seu acesso —
          você receberá a liberação em breve.
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => refresh()}>
            <RefreshCcw className="size-4 mr-2" />
            Verificar de novo
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="size-4 mr-2" />
            Sair
          </Button>
        </div>
      </CenteredShell>
    );
  }

  if (status === "rejected") {
    return (
      <CenteredShell>
        <ShieldAlert className="size-8 mx-auto text-destructive" />
        <h1 className="font-display text-xl font-bold">Acesso não autorizado</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta não foi aprovada para acessar a plataforma. Fale com um
          administrador se você acredita que isso é um engano.
        </p>
        <Button variant="outline" onClick={() => signOut()}>
          <LogOut className="size-4 mr-2" />
          Sair
        </Button>
      </CenteredShell>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

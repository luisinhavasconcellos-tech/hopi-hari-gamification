import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Check, X, ShieldCheck, Loader2 } from "lucide-react";

type AccessStatus = "pending" | "approved" | "rejected";

const statusBadge: Record<AccessStatus, JSX.Element> = {
  pending: <Badge variant="outline">Pendente</Badge>,
  approved: <Badge>Aprovado</Badge>,
  rejected: <Badge variant="destructive">Recusado</Badge>,
};

/**
 * Access management backed by the server's `platform_access` table — the same
 * table every API request is authorised against. (An earlier version wrote to
 * `profiles`/`user_roles` in the Supabase data project, which the server never
 * reads, so approvals had no effect.)
 */
export default function UsersAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: users, isLoading, error } = trpc.platformAccess.list.useQuery();

  const onError = (e: { message: string }) =>
    toast({ title: "Erro", description: e.message, variant: "destructive" });

  const setStatus = trpc.platformAccess.setStatus.useMutation({
    onSuccess: (row) => {
      void utils.platformAccess.list.invalidate();
      toast({ title: row?.status === "approved" ? "Usuário aprovado" : "Usuário recusado" });
    },
    onError,
  });

  const setRole = trpc.platformAccess.setRole.useMutation({
    onSuccess: () => {
      void utils.platformAccess.list.invalidate();
      toast({ title: "Permissões atualizadas" });
    },
    onError,
  });

  const busy = setStatus.isPending || setRole.isPending;
  const selfEmail = (user?.email ?? "").trim().toLowerCase();
  const pending = (users ?? []).filter((u) => u.status === "pending");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <header>
        <h1 className="font-display text-3xl">Gestão de Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Aprove novos cadastros e gerencie permissões de acesso à plataforma.
        </p>
      </header>

      {pending.length > 0 && (
        <Card className="glass border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Aguardando aprovação ({pending.length})</CardTitle>
            <CardDescription>Estes usuários criaram conta e aguardam liberação.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Todos os usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">Erro ao carregar usuários: {error.message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).map((u) => {
                  const isSelf = u.email.trim().toLowerCase() === selfEmail;
                  const isUserAdmin = u.role === "admin";
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.fullName || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{statusBadge[u.status]}</TableCell>
                      <TableCell>
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <ShieldCheck className="size-3.5" /> Admin
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Viewer</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {u.status !== "approved" && (
                          <Button size="sm" disabled={busy} onClick={() => setStatus.mutate({ id: u.id, status: "approved" })}>
                            <Check className="size-3.5 mr-1" /> Aprovar
                          </Button>
                        )}
                        {u.status !== "rejected" && !isSelf && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setStatus.mutate({ id: u.id, status: "rejected" })}
                          >
                            <X className="size-3.5 mr-1" /> Recusar
                          </Button>
                        )}
                        {!isSelf && u.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setRole.mutate({ id: u.id, role: isUserAdmin ? "viewer" : "admin" })}
                          >
                            {isUserAdmin ? "Remover admin" : "Tornar admin"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

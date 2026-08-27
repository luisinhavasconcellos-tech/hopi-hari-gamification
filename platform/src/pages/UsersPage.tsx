import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ShieldCheck, Loader2 } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  roles: string[];
}

async function fetchUsers(): Promise<UserRow[]> {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  const roleMap = new Map<string, string[]>();
  (roles ?? []).forEach((r: { user_id: string; role: string }) => {
    roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
  });
  return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })) as UserRow[];
}

const statusBadge: Record<UserRow["status"], JSX.Element> = {
  pending: <Badge variant="outline">Pendente</Badge>,
  approved: <Badge>Aprovado</Badge>,
  rejected: <Badge variant="destructive">Recusado</Badge>,
};

export default function UsersAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          status,
          approved_by: status === "approved" ? user?.id : null,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: v.status === "approved" ? "Usuário aprovado" : "Usuário recusado" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ id, makeAdmin }: { id: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Permissões atualizadas" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

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
            <p className="text-sm text-destructive">
              Erro ao carregar usuários: {(error as Error).message}
            </p>
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
                  const isSelf = u.id === user?.id;
                  const isUserAdmin = u.roles.includes("admin");
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
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
                          <Button size="sm" onClick={() => setStatus.mutate({ id: u.id, status: "approved" })}>
                            <Check className="size-3.5 mr-1" /> Aprovar
                          </Button>
                        )}
                        {u.status !== "rejected" && !isSelf && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus.mutate({ id: u.id, status: "rejected" })}
                          >
                            <X className="size-3.5 mr-1" /> Recusar
                          </Button>
                        )}
                        {!isSelf && u.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleAdmin.mutate({ id: u.id, makeAdmin: !isUserAdmin })}
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

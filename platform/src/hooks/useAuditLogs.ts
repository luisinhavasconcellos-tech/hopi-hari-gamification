import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuditLog = {
  id: string;
  action: string;
  area: string;
  record_ref: string | null;
  details: Record<string, unknown> | null;
  actor_id: string | null;
  actor_kind: string;
  created_at: string;
};

/** Logs de auditoria de dados pessoais (visíveis apenas para administradores). */
export function useAuditLogs(limit = 100) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    setLogs((data as unknown as AuditLog[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { logs, loading, reload: load };
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  consentimento_concedido: "Consentimento concedido",
  consentimento_atualizado: "Consentimento atualizado",
  consentimento_revogado: "Consentimento revogado",
  consentimento_excluido: "Consentimento excluído",
  politica_retencao_alterada: "Política de retenção alterada",
  expurgo_executado: "Expurgo de dados executado",
};

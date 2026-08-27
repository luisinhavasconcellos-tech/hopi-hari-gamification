import { useCallback, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import SearchDemandSection from "@/components/SearchDemandSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SearchDemandPage() {
  const [running, setRunning] = useState(false);
  const [nonce, setNonce] = useState(0);

  const sync = useCallback(async (days: number) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("gsc-sync", { body: { days } });
      if (error) throw error;
      const payload = (data ?? {}) as Record<string, unknown>;
      if (payload.ok === false) throw new Error(String(payload.error ?? "Falha na coleta"));
      toast({
        title: "Search Console sincronizado",
        description: `${payload.rows_totals ?? 0} dias · ${payload.rows_queries ?? 0} termos`,
      });
      setNonce((n) => n + 1);
    } catch (e) {
      toast({
        title: "Falha ao sincronizar Search Console",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Demanda de Busca"
        subtitle="Cliques, impressões e posição no Google (Search Console), com separação entre busca de marca e descoberta de categoria."
        actions={
          <>
            <Button variant="outline" disabled={running} onClick={() => sync(30)}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar 30 dias
            </Button>
            <Button variant="outline" disabled={running} onClick={() => sync(480)}>
              Carga histórica (16 meses)
            </Button>
          </>
        }
      />
      <SearchDemandSection key={nonce} />
    </div>
  );
}

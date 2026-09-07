import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { generateDailyReportPdf } from "@/lib/exportPdf";
import { useToast } from "@/hooks/use-toast";

interface Props {
  variant?: "sidebar" | "inline";
}

export default function ExportPdfButton({ variant = "sidebar" }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handle = async () => {
    setLoading(true);
    toast({
      title: "Gerando relatório…",
      description: "Consolidando dados e pedindo análise à IA. Pode levar 10–20s.",
    });
    try {
      const file = await generateDailyReportPdf({ withAi: true });
      toast({ title: "Relatório pronto", description: `Salvo como ${file}` });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Falha ao gerar PDF",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <button
        onClick={handle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
        {loading ? "Gerando…" : "Exportar PDF Diário"}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="inline-flex items-center gap-2 text-xs font-semibold py-1.5 px-3 rounded-lg border border-border bg-background hover:bg-accent transition disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
      {loading ? "Gerando…" : "Exportar PDF"}
    </button>
  );
}

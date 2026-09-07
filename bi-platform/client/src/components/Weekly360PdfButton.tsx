import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { exportWeekly360Pdf } from "@/lib/exportWeekly360Pdf";

export default function Weekly360PdfButton() {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const report = trpc.weekly360Report.get.useQuery(undefined, { enabled: false, retry: false });

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await report.refetch();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("O relatório consolidado não retornou dados.");
      const fileName = await exportWeekly360Pdf(
        result.data as unknown as Parameters<typeof exportWeekly360Pdf>[0],
      );
      toast({
        title: "Relatório 360° pronto",
        description: `${fileName} reúne a semana completa da plataforma.`,
      });
    } catch (error) {
      console.error("Weekly 360 PDF export failed:", error);
      toast({
        title: "Não foi possível gerar o relatório 360°",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={exporting}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
      aria-label={exporting ? "Gerando relatório executivo Hopi Hari 360 graus" : "Exportar relatório executivo Hopi Hari 360 graus da semana"}
    >
      {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {exporting ? "Consolidando a semana…" : "Exportar relatório 360°"}
    </button>
  );
}

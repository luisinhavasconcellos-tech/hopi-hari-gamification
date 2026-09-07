import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportPageMetricsPdf } from "@/lib/exportPagePdf";

type PageMetricPdfButtonProps = {
  targetId: string;
  reportTitle: string;
  fileNamePrefix: string;
};

export default function PageMetricPdfButton({
  targetId,
  reportTitle,
  fileNamePrefix,
}: PageMetricPdfButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const fileName = await exportPageMetricsPdf({ targetId, reportTitle, fileNamePrefix });
      toast({ title: "PDF pronto", description: `Relatório salvo como ${fileName}.` });
    } catch (error) {
      console.error("Page metrics PDF export failed:", error);
      toast({
        title: "Não foi possível exportar o PDF",
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
      data-pdf-ignore="true"
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
    >
      {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {exporting ? "Gerando PDF…" : "Exportar PDF"}
    </button>
  );
}

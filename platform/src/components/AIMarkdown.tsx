import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renderer padrão para as saídas de IA (relatório diário/semanal, deep-dive e chat).
 * Layout limpo: headings hierárquicos, listas com espaçamento, tabelas legíveis.
 */
export default function AIMarkdown({
  children,
  compact = false,
  className,
}: {
  children: string;
  compact?: boolean;
  className?: string;
}) {
  const base = compact ? "text-xs" : "text-sm";
  return (
    <div className={cn("text-foreground", base, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-0 mb-4 text-base font-semibold tracking-tight text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-3 border-b border-border pb-2 text-[15px] font-semibold tracking-tight text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-[13px] font-semibold uppercase tracking-wide text-primary first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 leading-relaxed text-muted-foreground last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="text-muted-foreground/90">{children}</em>,
          ul: ({ children }) => <ul className="mb-3 space-y-1.5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => (
            <li className="leading-relaxed text-muted-foreground marker:text-primary/70">{children}</li>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          hr: () => <hr className="my-5 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] text-primary">{children}</code>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border px-3 py-2 align-top text-foreground">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

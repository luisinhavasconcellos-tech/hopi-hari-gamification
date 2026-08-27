import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Globe, ShieldCheck } from "lucide-react";
import { PageHeader, Card, CardTitle } from "@/components/dashboard/primitives";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const LOVABLE_IP = "185.158.133.1";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copiado", description: label });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <button
        type="button"
        onClick={copy}
        className="w-full flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-sm hover:bg-muted/70 transition-colors"
      >
        <code className="flex-1 truncate font-mono text-xs">{value}</code>
        {copied ? (
          <Check className="size-3.5 text-primary shrink-0" />
        ) : (
          <Copy className="size-3.5 text-muted-foreground shrink-0" />
        )}
      </button>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 size-7 grid place-items-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </div>
      <div className="min-w-0 flex-1 pb-6 border-b border-border/60 last:border-0 last:pb-0">
        <div className="text-sm font-medium mb-2">{title}</div>
        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DomainSetupPage() {
  const [domain, setDomain] = useState("");
  const [txtValue, setTxtValue] = useState("");

  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const parts = clean.split(".").filter(Boolean);
  const isSubdomain = parts.length > 2;
  const txtHost = useMemo(() => {
    if (!clean) return "@";
    return isSubdomain ? parts.slice(0, parts.length - 2).join(".") : "@";
  }, [clean, isSubdomain, parts]);

  const txtRecord = txtValue.trim() || "exhibit-verify=SEU_TOKEN_AQUI";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
      <PageHeader
        title="Domínio próprio & verificação Exhibit"
        subtitle="Conecte um domínio que você controla e conclua a verificação por registro DNS TXT. Subdomínios *.lovable.app não podem ser verificados, pois o DNS deles não é seu."
        eyebrow="Configuração"
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle title="Passo a passo" hint="Leva ~10 minutos + propagação de DNS" />

          <div className="mt-4 space-y-6">
            <Step n={1} title="Informe o domínio que você vai usar">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="ex.: insights.suaempresa.com.br"
                aria-label="Domínio próprio"
              />
              {clean && (
                <p className="text-xs">
                  Detectado como <strong>{isSubdomain ? "subdomínio" : "domínio raiz"}</strong>.
                  Os nomes de registro abaixo já foram ajustados.
                </p>
              )}
            </Step>

            <Step n={2} title="Conecte o domínio ao projeto na Lovable">
              <p>
                Abra <strong>Project Settings → Project → Domains</strong>, clique em{" "}
                <strong>Connect Domain</strong> e informe o domínio. Adicione também a versão{" "}
                <code className="font-mono text-xs">www</code> se quiser que ela resolva.
              </p>
              <a
                href="https://docs.lovable.dev/features/custom-domain"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs"
              >
                Documentação de domínio personalizado <ExternalLink className="size-3" />
              </a>
            </Step>

            <Step n={3} title="Crie os registros DNS de apontamento">
              <div className="grid gap-3 sm:grid-cols-2">
                <CopyField label="Tipo A — nome" value={isSubdomain ? txtHost : "@"} />
                <CopyField label="Tipo A — valor" value={LOVABLE_IP} />
                <CopyField label="Tipo A (www) — nome" value="www" />
                <CopyField label="Tipo A (www) — valor" value={LOVABLE_IP} />
              </div>
              <p className="text-xs">
                Remova registros A/CNAME antigos conflitantes para o mesmo nome. Se usar Cloudflare
                ou proxy semelhante, marque a opção de proxy em <strong>Advanced</strong> no diálogo
                de conexão.
              </p>
            </Step>

            <Step n={4} title="Cole o token de verificação do Exhibit">
              <Input
                value={txtValue}
                onChange={(e) => setTxtValue(e.target.value)}
                placeholder="exhibit-verify=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                aria-label="Valor do registro TXT do Exhibit"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <CopyField label="Tipo TXT — nome" value={txtHost} />
                <CopyField label="Tipo TXT — valor" value={txtRecord} />
              </div>
              <p className="text-xs">
                Alguns provedores exigem o nome completo do host. Nesse caso use{" "}
                <code className="font-mono text-xs">{clean || "seudominio.com"}</code>.
              </p>
            </Step>

            <Step n={5} title="Verifique a propagação e conclua no Exhibit">
              <p>
                Aguarde de 5 minutos a algumas horas. Confira a propagação e então clique em{" "}
                <strong>Verify</strong> no Exhibit — no Exhibit use <strong>Edit</strong> para
                trocar o domínio antigo <code className="font-mono text-xs">*.lovable.app</code>{" "}
                pelo seu domínio próprio antes de verificar.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <a
                  href={`https://dnschecker.org/#TXT/${encodeURIComponent(clean || "seudominio.com")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  Checar TXT no DNSChecker <ExternalLink className="size-3" />
                </a>
                <a
                  href={`https://dnschecker.org/#A/${encodeURIComponent(clean || "seudominio.com")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  Checar registro A <ExternalLink className="size-3" />
                </a>
              </div>
            </Step>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle title="Por que o *.lovable.app não funciona" />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              A verificação do Exhibit exige um registro TXT publicado na zona DNS do domínio. O
              DNS de <code className="font-mono text-xs">lovable.app</code> é gerido pela Lovable,
              então não é possível publicar o TXT lá. Use sempre um domínio que você controle no
              registrador.
            </p>
          </Card>

          <Card>
            <CardTitle title="Checklist rápido" />
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[
                "Domínio adicionado em Project Settings → Domains",
                "Registro A do raiz e do www apontando para 185.158.133.1",
                "TXT do Exhibit publicado no host correto",
                "Sem registros conflitantes antigos",
                "CAA (se existir) permitindo Let's Encrypt",
                "Domínio atualizado dentro do Exhibit antes de clicar em Verify",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle title="Status esperado" />
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <Globe className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Verifying</strong> — aguardando propagação do
                  DNS. Nada a fazer.
                </span>
              </div>
              <div className="flex gap-2">
                <Globe className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Setting up</strong> — emissão do certificado
                  SSL em andamento.
                </span>
              </div>
              <div className="flex gap-2">
                <Globe className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Active</strong> — domínio no ar, já pode
                  verificar no Exhibit.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

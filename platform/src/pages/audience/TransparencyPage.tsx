import { Link } from "react-router-dom";
import { Database, Shield, Clock, Mail, Trash2, Cookie, BarChart3 } from "lucide-react";
import { PageHeader, Card, CardTitle } from "@/components/dashboard/primitives";
import { DataTable } from "@/components/audience/AudienceUI";
import { useRetention } from "@/hooks/useRetention";

type Category = {
  category: string;
  data: string;
  purpose: string;
  basis: string;
  retention: string;
};

const CATEGORIES: Category[] = [
  {
    category: "Cadastro de clientes",
    data: "Faixa etária derivada da data de nascimento, mês de aniversário, domínio de e-mail e região fiscal derivada do CPF",
    purpose: "Entender o perfil agregado do público para planejamento de mídia, produtos e atrações",
    basis: "Execução de contrato / legítimo interesse com dados agregados",
    retention: "Enquanto o cadastro estiver ativo (dados exibidos apenas de forma agregada)",
  },
  {
    category: "Identificador pseudonimizado",
    data: "Hash irreversível (HMAC-SHA256 com chave secreta) gerado a partir do CPF — o CPF nunca é armazenado nem exposto",
    purpose: "Unir, de forma segura, o perfil do cadastro com o comportamento de navegação sem identificar a pessoa",
    basis: "Consentimento explícito",
    retention: "12 meses após a última atividade ou até a revogação",
  },
  {
    category: "Consentimento",
    data: "Finalidades aceitas, versão da política, origem e datas de concessão/revogação",
    purpose: "Comprovar e respeitar a escolha do usuário",
    basis: "Obrigação legal (LGPD)",
    retention: "Até 30 dias após a revogação, quando não há mais dados vinculados",
  },
  {
    category: "Eventos de navegação",
    data: "Página visitada, nome do evento, sessão, canal de origem (UTM/referrer) e data",
    purpose: "Medir jornada, canais de aquisição e desempenho de campanhas por segmento",
    basis: "Consentimento explícito (finalidade analytics)",
    retention: "12 meses (TTL gravado em cada evento)",
  },
  {
    category: "Conteúdo de redes sociais",
    data: "Posts públicos, métricas de alcance, curtidas, comentários, compartilhamentos e visualizações",
    purpose: "Análise de desempenho de conteúdo e benchmark competitivo",
    basis: "Legítimo interesse sobre conteúdo público da marca",
    retention: "Enquanto for relevante para análise histórica",
  },
  {
    category: "Contas de acesso à plataforma",
    data: "E-mail, nome, status de aprovação e papel (admin/visualizador)",
    purpose: "Controlar quem acessa o painel interno",
    basis: "Legítimo interesse (segurança da informação)",
    retention: "Enquanto a conta existir",
  },
  {
    category: "Logs de auditoria",
    data: "Ação realizada, área, referência parcial do identificador pseudonimizado e origem (usuário ou sistema)",
    purpose: "Prestar contas sobre o tratamento de dados pessoais e detectar uso indevido",
    basis: "Obrigação legal / prestação de contas",
    retention: "24 meses",
  },
];

const NOT_COLLECTED = [
  "CPF em texto claro (é convertido em hash irreversível no servidor e descartado)",
  "Nome, telefone ou endereço vinculados ao comportamento de navegação",
  "Dados sensíveis (saúde, biometria, religião, opinião política)",
  "Venda ou compartilhamento de dados pessoais com terceiros para publicidade",
];

export default function TransparencyPage() {
  const { policies } = useRetention();

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Governança"
        title="Transparência de dados"
        subtitle="Quais categorias de dados esta plataforma usa, com qual finalidade, por quanto tempo e como solicitar exclusão."
      />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle title="Pseudonimização" hint="Nenhum CPF é armazenado" />
          <p className="text-sm text-muted-foreground flex gap-3">
            <Shield className="size-4 shrink-0 text-primary" />
            O CPF é transformado em um código irreversível no servidor, com chave secreta. Não é possível voltar do
            código para o CPF.
          </p>
        </Card>
        <Card>
          <CardTitle title="Análise agregada" hint="Sem perfis individuais" />
          <p className="text-sm text-muted-foreground flex gap-3">
            <BarChart3 className="size-4 shrink-0 text-primary" />
            Os relatórios mostram grupos (faixa etária, região, canal). A plataforma não exibe o comportamento de uma
            pessoa específica.
          </p>
        </Card>
        <Card>
          <CardTitle title="Retenção limitada" hint="Expurgo automático diário" />
          <p className="text-sm text-muted-foreground flex gap-3">
            <Clock className="size-4 shrink-0 text-primary" />
            Eventos comportamentais são apagados após 12 meses, e as junções pseudonimizadas sem consentimento ativo
            também são removidas.
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle
          title="Categorias de dados, finalidades e prazos"
          hint="Base de tratamento e tempo de guarda de cada categoria"
        />
        <DataTable
          rows={CATEGORIES}
          rowKey={(r) => r.category}
          columns={[
            { key: "cat", header: "Categoria", render: (r) => <span className="font-medium">{r.category}</span> },
            { key: "data", header: "Dados usados", render: (r) => r.data },
            { key: "purpose", header: "Finalidade", render: (r) => r.purpose },
            { key: "basis", header: "Base legal", render: (r) => r.basis },
            { key: "ret", header: "Retenção", render: (r) => r.retention },
          ]}
        />
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="O que não fazemos" hint="Limites explícitos do tratamento" />
          <ul className="space-y-2 text-sm text-muted-foreground">
            {NOT_COLLECTED.map((item) => (
              <li key={item} className="flex gap-3">
                <Trash2 className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle title="Prazos de retenção configurados" hint="Aplicados pelo expurgo automático diário" />
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Prazos padrão: 12 meses para eventos e junções.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {policies.map((p) => (
                <li key={p.key} className="flex items-center justify-between gap-4 border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">{p.description}</span>
                  <span className="font-medium">
                    {p.enabled ? `${p.retention_months} meses` : "desativado"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle title="Como exercer seus direitos" hint="Acesso, correção, portabilidade e exclusão (LGPD, art. 18)" />
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Cookie className="size-4 text-primary" /> Revogar o consentimento
            </div>
            <p className="mt-2 text-muted-foreground">
              Você pode retirar o consentimento a qualquer momento no banner de privacidade ou na página{" "}
              <Link to="/audience/identity" className="text-primary underline underline-offset-2">
                Identidade &amp; LGPD
              </Link>
              . A coleta de novos eventos para de imediato.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Mail className="size-4 text-primary" /> Solicitar exclusão
            </div>
            <p className="mt-2 text-muted-foreground">
              Envie um pedido para o canal de privacidade do Hopi Hari informando o e-mail ou CPF usado no cadastro. O
              CPF é usado apenas para localizar o código pseudonimizado correspondente e é descartado em seguida.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Database className="size-4 text-primary" /> O que acontece depois
            </div>
            <p className="mt-2 text-muted-foreground">
              Os eventos, a junção pseudonimizada e o registro de consentimento vinculados são apagados na próxima
              execução do expurgo (diária, às 03:00 UTC) e a ação fica registrada nos logs de auditoria.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Esta página descreve o tratamento de dados feito por esta plataforma interna do Hopi Hari. Os canais oficiais
          de contato e a política de privacidade completa devem ser confirmados pela equipe responsável antes da
          divulgação externa.
        </p>
      </Card>
    </div>
  );
}

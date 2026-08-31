// HopiPlay · Motor de emissão e resgate (secções 8–18 do documento T25).
// Porta do motor Node/SQLite original para Lovable Cloud (Postgres).
import { createHash, randomInt } from "node:crypto";

// Crockford Base32 — sem I, L, O, U (secção 8)
export const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

async function sb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Db = Awaited<ReturnType<typeof sb>>;

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
export function pinHash(pin: string, salt: string) {
  return sha256(`${salt}:${pin}`);
}

export function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function minutosDoDia(hhmm: string) {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function sorteia<T>(arr: T[]): T {
  return arr[randomInt(arr.length)]!;
}

export type RespostaGeral = {
  ok?: boolean;
  via?: string;
  regra?: string | null;
  erro?: string | null;
  mensagem?: string | null;
  codigo?: string | null;
  estado?: string | null;
  classe?: string | null;
  classe_id?: string | null;
  nome_revelado?: string | null;
  ponto?: string | null;
  ponto_label?: string | null;
  hariador?: { id: string; nome: string; album_completo?: boolean } | null;
  emitido_em?: string | null;
  expira_em?: string | null;
  resgatado_em?: string | null;
  staff?: string | null;
  staff_nome?: string | null;
  pontos?: number | null;
};

export type Classe = {
  id: string;
  nome_interno: string;
  nome_revelado: string;
  categoria: string;
  nivel: number;
  ponto_resgate: string;
  ponto_resgate_label: string;
  teto_diario: number | null;
  teto_orcamento_dia: number | null;
  custo_unitario: number;
  valor_percebido: number;
  quota_horaria_json: { de: string; ate: string; pct: number }[] | null;
  janela_uso_inicio: string | null;
  janela_uso_fim: string | null;
  ttl_horas: number | null;
  ativo: boolean;
};

async function mapaAlternativas(db: Db) {
  const { data } = await db
    .from("alternativa_janela")
    .select("classe_fechada, classe_alternativa, prioridade")
    .eq("ativo", true)
    .order("prioridade");
  const mapa = new Map<string, string[]>();
  for (const r of data ?? []) {
    const lista = mapa.get(r.classe_fechada) ?? [];
    lista.push(r.classe_alternativa);
    mapa.set(r.classe_fechada, lista);
  }
  return mapa;
}

async function getConfig(db: Db, chave: string, fallback: string) {
  const { data } = await db.from("config").select("valor").eq("chave", chave).maybeSingle();
  return data?.valor ?? fallback;
}

async function fechoDoParque(db: Db, data: string) {
  const fecha = await getConfig(db, "parque_fecha", "21:00");
  const [h = 21, m = 0] = fecha.split(":").map(Number);
  const d = new Date(`${data}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// Janela de uso (secção 13.2): uma recompensa só entra na pilha se ainda dá tempo
// de a usar hoje. Às 19h40 as atrações já fecharam — sobra A&B, loja e digital.
export function janelaAberta(classe: Classe, quando = new Date(), margemMin = 20) {
  const agora = quando.getHours() * 60 + quando.getMinutes();
  if (classe.janela_uso_inicio && agora < minutosDoDia(classe.janela_uso_inicio)) return false;
  if (classe.janela_uso_fim && agora + margemMin > minutosDoDia(classe.janela_uso_fim))
    return false;
  return true;
}

// ------------------------------------------------- indisponibilidade e substituição
// Uma recompensa pode cair por quatro motivos: fechou a janela de uso, o produto
// acabou (teto do dia), o orçamento esgotou, ou a operação pausou (stock a acabar).
export type MotivoIndisp = "fora_janela" | "esgotado" | "orcamento" | "pausado";

export type PoolLinha =
  | {
      pausado?: boolean | null;
      teto?: number | null;
      emitidos?: number | null;
      teto_orcamento?: number | string | null;
      gasto_orcamento?: number | string | null;
    }
  | null
  | undefined;

export const MOTIVO_LABEL: Record<MotivoIndisp, string> = {
  fora_janela: "Fora de janela",
  esgotado: "Esgotado",
  orcamento: "Orçamento esgotado",
  pausado: "Pausado pela operação",
};

export function indisponibilidade(
  classe: Classe,
  pool: PoolLinha,
  quando = new Date(),
  margemMin = 20,
): { motivo: MotivoIndisp; detalhe: string } | null {
  if (pool?.pausado)
    return {
      motivo: "pausado",
      detalhe: "A operação pausou esta recompensa (produto/serviço a acabar).",
    };
  const teto = pool?.teto ?? classe.teto_diario;
  if (teto != null && (pool?.emitidos ?? 0) >= teto)
    return { motivo: "esgotado", detalhe: `Acabou o stock do dia (${teto} unidades).` };
  const tetoOrc = pool?.teto_orcamento ?? classe.teto_orcamento_dia;
  if (
    tetoOrc != null &&
    Number(pool?.gasto_orcamento ?? 0) + Number(classe.custo_unitario ?? 0) > Number(tetoOrc)
  )
    return { motivo: "orcamento", detalhe: "O orçamento do dia para esta recompensa esgotou." };
  if (!janelaAberta(classe, quando, margemMin))
    return {
      motivo: "fora_janela",
      detalhe: classe.janela_uso_fim
        ? `Já não dá para usar hoje (usava até ${classe.janela_uso_fim}).`
        : "Já não dá para usar hoje.",
    };
  return null;
}

// Quão parecida é a alternativa com o que fechou: mesma categoria e mesmo ponto de
// resgate primeiro (comida por comida, atração por atração), depois mesmo nível e
// valor percebido próximo.
function pontuacaoSimilar(base: Classe, cand: Classe) {
  let s = 0;
  if (cand.categoria === base.categoria) s += 6;
  if (cand.ponto_resgate === base.ponto_resgate) s += 4;
  if (cand.nivel === base.nivel) s += 5;
  else s -= Math.abs(cand.nivel - base.nivel);
  const dv = Math.abs(Number(cand.valor_percebido ?? 0) - Number(base.valor_percebido ?? 0));
  s += Math.max(0, 3 - dv / 10);
  return s;
}

export function ordenarSubstitutos(base: Classe, candidatos: Classe[]) {
  return [...candidatos].sort((a, b) => pontuacaoSimilar(base, b) - pontuacaoSimilar(base, a));
}

async function poolDoDia(db: Db, data: string) {
  const { data: rows } = await db.from("pool_dia").select("*").eq("data", data);
  return new Map((rows ?? []).map((r) => [r.classe_id, r as PoolLinha]));
}

// Alerta no balcão: o código é de uma classe que já saiu da janela ou cujo produto
// acabou. Devolve a mensagem e as substituições parecidas que o staff pode oferecer.
async function alertaSubstituicao(db: Db, classe: Classe, quando = new Date()) {
  const data = hoje();
  const margem = Number(await getConfig(db, "margem_janela_min", "20"));
  const pools = await poolDoDia(db, data);
  const motivo = indisponibilidade(classe, pools.get(classe.id), quando, margem);
  if (!motivo) return null;
  const { data: classes } = await db.from("classe_recompensa").select("*").eq("ativo", true);
  const mapaAlt = await mapaAlternativas(db);
  const altAuto = (await getConfig(db, "alternativas_auto", "true")) !== "false";
  const ids = mapaAlt.get(classe.id) ?? [];
  const abertas = (classes ?? []).filter(
    (c) => c.id !== classe.id && !indisponibilidade(c as Classe, pools.get(c.id), quando, margem),
  ) as Classe[];
  const escolhidas = ids.length
    ? ids.map((id) => abertas.find((c) => c.id === id)).filter((c): c is Classe => !!c)
    : altAuto
      ? ordenarSubstitutos(classe, abertas)
      : [];
  return {
    classe_id: classe.id,
    nome: classe.nome_revelado,
    motivo: motivo.motivo,
    motivo_label: MOTIVO_LABEL[motivo.motivo],
    janela_fim: classe.janela_uso_fim,
    margem_min: margem,
    mensagem: `${classe.nome_revelado}: ${motivo.detalhe} Oferece uma substituição parecida ao hariador.`,
    alternativas: escolhidas.map((c) => ({
      classe_id: c.id,
      nome: c.nome_revelado,
      ponto_label: c.ponto_resgate_label as string | null,
      janela_fim: c.janela_uso_fim as string | null,
      categoria: c.categoria as string | null,
      nivel: c.nivel as number,
    })),
  };
}

// ---------------------------------------------------------------- cifra do dia (secção 9)

async function gerarCifraDoDia(db: Db, data: string, regenerar = false) {
  const { data: max } = await db
    .from("cifra_diaria")
    .select("geracao")
    .eq("data", data)
    .order("geracao", { ascending: false })
    .limit(1);
  const atual = max?.[0]?.geracao ?? 0;
  if (atual > 0 && !regenerar) return atual;
  const geracao = atual + 1;

  const { data: classes } = await db
    .from("classe_recompensa")
    .select("id")
    .eq("ativo", true)
    .order("id");

  const corte = new Date(`${data}T00:00:00`);
  corte.setDate(corte.getDate() - 7);
  const corteStr = corte.toISOString().slice(0, 10);

  const { data: recentes } = await db
    .from("cifra_diaria")
    .select("classe_id, letra_chave")
    .gte("data", corteStr)
    .lt("data", data);

  const usadasHoje = new Set<string>();
  const linhas: {
    data: string;
    classe_id: string;
    letra_chave: string;
    digito_dia: string;
    geracao: number;
  }[] = [];
  for (const c of classes ?? []) {
    const usadasClasse = new Set(
      (recentes ?? []).filter((r) => r.classe_id === c.id).map((r) => r.letra_chave),
    );
    const candidatas = [...ALFABETO].filter((l) => !usadasHoje.has(l) && !usadasClasse.has(l));
    const letra = sorteia(candidatas);
    usadasHoje.add(letra);
    linhas.push({
      data,
      classe_id: c.id,
      letra_chave: letra,
      digito_dia: sorteia([...ALFABETO]),
      geracao,
    });
  }
  await db.from("cifra_diaria").insert(linhas);
  return geracao;
}

export async function cifraAtiva(data: string) {
  const db = await sb();
  const { data: max } = await db
    .from("cifra_diaria")
    .select("geracao")
    .eq("data", data)
    .order("geracao", { ascending: false })
    .limit(1);
  const g = max?.[0]?.geracao;
  if (!g) return [];
  const { data: linhas } = await db
    .from("cifra_diaria")
    .select(
      "letra_chave, digito_dia, geracao, classe_id, classe_recompensa(nome_revelado, ponto_resgate_label, teto_diario, teto_orcamento_dia, nivel)",
    )
    .eq("data", data)
    .eq("geracao", g);
  return (linhas ?? [])
    .map((l) => {
      const c = l.classe_recompensa as unknown as {
        nome_revelado: string;
        ponto_resgate_label: string;
        teto_diario: number | null;
        teto_orcamento_dia: number | null;
        nivel: number;
      };
      return {
        letra_chave: l.letra_chave,
        digito_dia: l.digito_dia,
        geracao: l.geracao,
        classe_id: l.classe_id,
        nome_revelado: c.nome_revelado,
        ponto_resgate_label: c.ponto_resgate_label,
        teto_diario: c.teto_diario,
        teto_orcamento_dia: c.teto_orcamento_dia,
        nivel: c.nivel,
      };
    })
    .sort((a, b) => a.nivel - b.nivel || a.classe_id.localeCompare(b.classe_id));
}

// ---------------------------------------------------------------- abertura do dia (secção 13)

export async function abrirDia(data: string) {
  const db = await sb();
  await gerarCifraDoDia(db, data);
  const { data: classes } = await db.from("classe_recompensa").select("*").eq("ativo", true);
  const { data: pools } = await db.from("pool_dia").select("classe_id").eq("data", data);
  const existentes = new Set((pools ?? []).map((p) => p.classe_id));
  const novos = (classes ?? [])
    .filter((c) => !existentes.has(c.id))
    .map((c) => ({
      data,
      classe_id: c.id,
      teto: c.teto_diario,
      teto_orcamento: c.teto_orcamento_dia,
    }));
  if (novos.length) await db.from("pool_dia").insert(novos);
}

// Quota acumulada até agora (secção 13): teto repartido pelas faixas, com transporte.
export function quotaAcumulada(classe: Classe, teto: number | null, quando = new Date()) {
  if (!classe.quota_horaria_json || !teto) return teto;
  const faixas = classe.quota_horaria_json;
  const agora = quando.getHours() * 60 + quando.getMinutes();
  let pct = 0;
  for (const f of faixas) {
    if (agora >= minutosDoDia(f.ate)) pct += f.pct;
    else if (agora >= minutosDoDia(f.de)) pct += f.pct;
  }
  if (pct <= 0) pct = faixas[0]?.pct ?? 100;
  return Math.ceil((teto * Math.min(pct, 100)) / 100);
}

// ---------------------------------------------------------------- pilha de atribuição (secção 10)

type Ctx = {
  album_completo: boolean;
  cartas: number;
  pontos: number;
  ranking_dia: number;
  ranking_global: number;
  hora: number;
  passe_anual: boolean;
  primeira_visita: boolean;
};

type Cond = Record<string, number | boolean | undefined>;

export function condicaoBate(cond: Cond, ctx: Ctx) {
  if (cond["album_completo"] !== undefined && ctx.album_completo !== cond["album_completo"])
    return false;
  if (cond["cartas_min"] !== undefined && ctx.cartas < (cond["cartas_min"] as number)) return false;
  if (cond["pontos_min"] !== undefined && ctx.pontos < (cond["pontos_min"] as number)) return false;
  if (
    cond["ranking_dia_max"] !== undefined &&
    ctx.ranking_dia > (cond["ranking_dia_max"] as number)
  )
    return false;
  if (
    cond["ranking_global_max"] !== undefined &&
    ctx.ranking_global > (cond["ranking_global_max"] as number)
  )
    return false;
  if (cond["hora_min"] !== undefined && ctx.hora < (cond["hora_min"] as number)) return false;
  if (cond["hora_max"] !== undefined && ctx.hora >= (cond["hora_max"] as number)) return false;
  if (cond["passe_anual"] !== undefined && ctx.passe_anual !== cond["passe_anual"]) return false;
  if (cond["primeira_visita"] !== undefined && ctx.primeira_visita !== cond["primeira_visita"])
    return false;
  return true;
}

async function serieLivre(db: Db) {
  // Série resgatada sai de circulação para sempre (secção 17.1).
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    let s = "";
    for (let i = 0; i < 4; i++) s += ALFABETO[randomInt(32)];
    const { data: retirada } = await db
      .from("serie_retirada")
      .select("serie")
      .eq("serie", s)
      .maybeSingle();
    if (retirada) continue;
    const { data: emUso } = await db
      .from("codigo")
      .select("codigo")
      .eq("serie", s)
      .eq("estado", "EMITIDO")
      .maybeSingle();
    if (!emUso) return s;
  }
  throw new Error("POOL_DE_SERIES_ESGOTADO");
}

async function emitirClasse(
  db: Db,
  data: string,
  classe: Classe,
  jogadorId: string,
  origem: string,
  quando = new Date(),
) {
  const quota = quotaAcumulada(classe, classe.teto_diario, quando);
  const { data: ok } = await db.rpc("app_reservar_capacidade", {
    p_data: data,
    p_classe: classe.id,
    p_quota: quota as unknown as number,
    p_custo: classe.custo_unitario ?? 0,
  });
  if (!ok) return { indisponivel: true as const };

  const { data: max } = await db
    .from("cifra_diaria")
    .select("geracao, letra_chave, digito_dia")
    .eq("data", data)
    .eq("classe_id", classe.id)
    .order("geracao", { ascending: false })
    .limit(1);
  const cifra = max?.[0];
  if (!cifra) return { indisponivel: true as const };

  const prefixo = await getConfig(db, "prefixo_temporada", "H25");
  const fecho = await fechoDoParque(db, data);
  const expira = classe.ttl_horas
    ? new Date(
        Math.min(quando.getTime() + classe.ttl_horas * 3600e3, new Date(fecho).getTime()),
      ).toISOString()
    : fecho;

  for (let i = 0; i < 5; i++) {
    const serie = await serieLivre(db);
    // Letra-chave colada à série, sem separador — camuflagem deliberada (secção 8)
    const cod = `${prefixo}-${cifra.letra_chave}${serie}-${cifra.digito_dia}`;
    const { error } = await db.from("codigo").insert({
      codigo: cod,
      serie,
      player_id: jogadorId,
      classe_id: classe.id,
      data,
      estado: "EMITIDO",
      emitido_em: quando.toISOString(),
      expira_em: expira,
      regra_origem: origem,
      canal: "online",
    });
    if (!error)
      return {
        codigo: cod,
        expira_em: expira,
        classe_id: classe.id,
        nome_revelado: null as string | null,
      };
  }
  throw new Error("EMISSAO_FALHOU");
}

export async function atingirMarco(playerId: string) {
  const db = await sb();
  const data = hoje();
  await abrirDia(data);
  await expirarVencidos();

  const { data: jogador } = await db.from("jogador").select("*").eq("id", playerId).maybeSingle();
  if (!jogador) return { erro: "JOGADOR_INEXISTENTE" as const };

  const quando = new Date();
  const ctx: Ctx = {
    album_completo: jogador.album_completo,
    cartas: jogador.cartas,
    pontos: jogador.pontos,
    ranking_dia: jogador.posicao_ranking_dia ?? Number.POSITIVE_INFINITY,
    ranking_global: jogador.posicao_ranking_global ?? Number.POSITIVE_INFINITY,
    hora: quando.getHours() + quando.getMinutes() / 60,
    passe_anual: jogador.passe_anual,
    primeira_visita: jogador.primeira_visita,
  };

  const { data: classes } = await db.from("classe_recompensa").select("*").eq("ativo", true);
  const margem = Number(await getConfig(db, "margem_janela_min", "20"));
  const mapaAlt = await mapaAlternativas(db);
  const altAuto = (await getConfig(db, "alternativas_auto", "true")) !== "false";
  const pools = await poolDoDia(db, data);
  // Uma classe sai da pilha quando fecha a janela, quando o produto acaba (teto ou
  // orçamento) ou quando a operação a pausa — e a atribuição escorrega para o que
  // ainda está aberto (substituição parecida) ou para o reconhecimento digital.
  const indisponiveis = new Map<
    string,
    {
      classe_id: string;
      nome: string;
      janela_fim: string | null;
      motivo: MotivoIndisp;
      motivo_label: string;
      detalhe: string;
    }
  >();
  const classePorId = (id: string) => {
    const c = (classes ?? []).find((x) => x.id === id) as Classe | undefined;
    if (!c) return undefined;
    const m = indisponibilidade(c, pools.get(c.id), quando, margem);
    if (m) {
      indisponiveis.set(c.id, {
        classe_id: c.id,
        nome: c.nome_revelado,
        janela_fim: c.janela_uso_fim,
        motivo: m.motivo,
        motivo_label: MOTIVO_LABEL[m.motivo],
        detalhe: m.detalhe,
      });
      return undefined;
    }
    return c;
  };

  const avisoJanela = () => {
    const fechadas = [...indisponiveis.values()];
    if (!fechadas.length) return undefined;
    const abertas = (classes ?? []).filter(
      (c) =>
        !indisponiveis.has(c.id) &&
        !indisponibilidade(c as Classe, pools.get(c.id), quando, margem),
    ) as Classe[];
    const configuradas = new Set<string>();
    let temMapeamento = false;
    for (const f of fechadas) {
      const ids = mapaAlt.get(f.classe_id) ?? [];
      if (ids.length) temMapeamento = true;
      for (const id of ids) configuradas.add(id);
    }
    const base = (classes ?? []).find((c) => c.id === fechadas[0]!.classe_id) as Classe | undefined;
    const escolhidas = temMapeamento
      ? abertas.filter((c) => configuradas.has(c.id))
      : altAuto
        ? base
          ? ordenarSubstitutos(base, abertas)
          : abertas
        : [];
    const alternativas = escolhidas.map((c) => ({
      classe_id: c.id,
      nome: c.nome_revelado,
      ponto_label: c.ponto_resgate_label as string | null,
      janela_fim: c.janela_uso_fim as string | null,
      categoria: c.categoria as string | null,
      nivel: c.nivel as number,
    }));
    return { fechadas, alternativas, margem_min: margem };
  };

  // Registo para o relatório diário: cada classe barrada (janela ou stock) e a
  // alternativa que acabou por ser usada.
  const registarJanela = async (classeEmitida: string | null) => {
    if (!indisponiveis.size) return;
    for (const f of indisponiveis.values()) {
      await registarLog(
        db,
        null,
        f.motivo === "fora_janela" ? "janela_fechada" : "esgotado",
        null,
        null,
        f.motivo.toUpperCase(),
        f.classe_id,
      );
    }
    await registarLog(
      db,
      null,
      "alternativa_usada",
      null,
      null,
      classeEmitida ?? "fallback_digital",
      playerId,
    );
  };

  // Nível 0 · concessão manual
  const { data: conc } = await db
    .from("concessao_manual")
    .select("*")
    .eq("player_id", playerId)
    .eq("consumida", false)
    .order("id")
    .limit(1);
  const concessao = conc?.[0];
  if (concessao) {
    const classe = classePorId(concessao.classe_id);
    if (classe) {
      const r = await emitirClasse(db, data, classe, playerId, `concessao:${concessao.id}`, quando);
      if (!("indisponivel" in r)) {
        await db.from("concessao_manual").update({ consumida: true }).eq("id", concessao.id);
        await registarJanela(classe.id);
        return await decorar(db, { via: "concessao_manual", ...r, aviso_janela: avisoJanela() });
      }
    }
  }

  // Nível 1 · regras de segmento, por prioridade
  const { data: segmentos } = await db
    .from("regra")
    .select("*")
    .eq("ativo", true)
    .eq("modo", "segmento")
    .order("prioridade");
  for (const regra of segmentos ?? []) {
    const cond = (regra.condicao_json ?? {}) as Cond;
    if (!condicaoBate(cond, ctx)) continue;
    if (cond["sem_codigo_da_classe_hoje"]) {
      const { count } = await db
        .from("codigo")
        .select("codigo", { count: "exact", head: true })
        .eq("player_id", playerId)
        .eq("classe_id", regra.classe_id)
        .eq("data", data)
        .neq("estado", "ANULADO");
      if ((count ?? 0) > 0) continue;
    }
    const classe = classePorId(regra.classe_id);
    if (!classe) continue;
    const r = await emitirClasse(db, data, classe, playerId, `regra:${regra.id}`, quando);
    if (!("indisponivel" in r)) await registarJanela(classe.id);
    if (!("indisponivel" in r))
      return await decorar(db, {
        via: `regra:${regra.id}`,
        regra: regra.nome,
        ...r,
        aviso_janela: avisoJanela(),
      });
  }

  // Nível 2 · sorteio ponderado
  const { data: sorteiosRaw } = await db
    .from("regra")
    .select("*")
    .eq("ativo", true)
    .eq("modo", "sorteio")
    .gt("peso", 0)
    .order("prioridade");
  let candidatos = (sorteiosRaw ?? []).filter((rg) =>
    condicaoBate((rg.condicao_json ?? {}) as Cond, ctx),
  );
  while (candidatos.length) {
    const total = candidatos.reduce((s, rg) => s + rg.peso, 0);
    let alvo = randomInt(total);
    let escolhida = candidatos[0]!;
    for (const rg of candidatos) {
      if (alvo < rg.peso) {
        escolhida = rg;
        break;
      }
      alvo -= rg.peso;
    }
    const classe = classePorId(escolhida.classe_id);
    if (classe) {
      const r = await emitirClasse(db, data, classe, playerId, `sorteio:${escolhida.id}`, quando);
      if (!("indisponivel" in r)) await registarJanela(classe.id);
      if (!("indisponivel" in r))
        return await decorar(db, {
          via: `sorteio:${escolhida.id}`,
          regra: escolhida.nome,
          ...r,
          aviso_janela: avisoJanela(),
        });
    }
    candidatos = candidatos.filter((rg) => rg !== escolhida);
  }

  // Nível 3 · fallback digital — nunca sai de mãos vazias, mas sem código
  await db
    .from("jogador")
    .update({ pontos: jogador.pontos + 350 })
    .eq("id", playerId);
  await registarLog(db, null, "marco", null, null, "fallback_digital", playerId);
  await registarJanela(null);
  return {
    via: "fallback_digital" as const,
    pontos: 350,
    mensagem: "Pontos e reconhecimento no app — sem código.",
    aviso_janela: avisoJanela(),
  };
}

async function decorar(db: Db, r: Record<string, unknown>) {
  if (r["classe_id"]) {
    const { data: c } = await db
      .from("classe_recompensa")
      .select("nome_revelado, ponto_resgate_label")
      .eq("id", r["classe_id"] as string)
      .maybeSingle();
    r["nome_revelado"] = c?.nome_revelado ?? null;
    r["ponto_label"] = c?.ponto_resgate_label ?? null;
  }
  await registarLog(
    db,
    (r["codigo"] as string) ?? null,
    "marco",
    null,
    null,
    String(r["via"]),
    null,
  );
  return r;
}

async function registarLog(
  db: Db,
  codigo: string | null,
  acao: string,
  staffId: string | null,
  pontoId: string | null,
  resultado: string,
  detalhe: string | null,
  tsCliente?: string | null,
) {
  await db.from("log_resgate").insert({
    codigo,
    acao,
    staff_id: staffId,
    ponto_id: pontoId,
    resultado,
    detalhe,
    ts_cliente: tsCliente ?? null,
  });
}

// ---------------------------------------------------------------- estados (secção 12)

export async function expirarVencidos() {
  const db = await sb();
  await db
    .from("codigo")
    .update({ estado: "EXPIRADO" })
    .eq("estado", "EMITIDO")
    .lt("expira_em", new Date().toISOString());
}

type CodigoRow = {
  codigo: string;
  serie: string;
  player_id: string;
  classe_id: string;
  data: string;
  estado: string;
  emitido_em: string;
  expira_em: string;
  resgatado_em: string | null;
  staff_id: string | null;
  ponto_id: string | null;
  staff_nome: string | null;
  // A classe vem completa: alertaSubstituicao precisa de id, tetos, custo e
  // categoria para calcular a indisponibilidade e ordenar as substituições.
  classe_recompensa: Classe;
  jogador: { nome: string; album_completo: boolean } | null;
};

async function obterCodigo(db: Db, cod: string) {
  await expirarVencidos();
  const { data } = await db
    .from("codigo")
    .select(
      "codigo, serie, player_id, classe_id, data, estado, emitido_em, expira_em, resgatado_em, staff_id, ponto_id, classe_recompensa(*), jogador(nome, album_completo)",
    )
    .eq("codigo", cod.toUpperCase().trim())
    .maybeSingle();
  const row = (data as unknown as CodigoRow | null) ?? null;
  if (row) {
    row.staff_nome = null;
    if (row.staff_id) {
      const { data: st } = await db
        .from("staff")
        .select("nome")
        .eq("id", row.staff_id)
        .maybeSingle();
      row.staff_nome = st?.nome ?? null;
    }
  }
  return row;
}

function recusa(row: CodigoRow | null) {
  if (!row)
    return {
      erro: "CODIGO_INEXISTENTE",
      mensagem: "Este código não existe. Confirma a leitura — ou chama o supervisor.",
    };
  if (row.estado === "RESGATADO") {
    const hora = row.resgatado_em ? new Date(row.resgatado_em).toTimeString().slice(0, 5) : "";
    return {
      erro: "JA_RESGATADO",
      mensagem: `Este código já foi usado às ${hora}${row.ponto_id ? " · " + row.ponto_id : ""}.`,
      // Detalhes para permitir reimprimir o voucher no staff.
      codigo: row.codigo,
      nome_revelado: row.classe_recompensa.nome_revelado,
      hariador: { id: row.player_id, nome: row.jogador?.nome ?? "—" },
      emitido_em: row.emitido_em,
      expira_em: row.expira_em,
      resgatado_em: row.resgatado_em,
      staff_nome: row.staff_nome,
      ponto: row.ponto_id ?? row.classe_recompensa.ponto_resgate,
      ponto_label: row.classe_recompensa.ponto_resgate_label,
    };
  }
  if (row.estado === "EXPIRADO")
    return {
      erro: "EXPIRADO",
      mensagem: "Este código expirou no fecho do parque. Os prémios valem só no próprio dia.",
    };
  if (row.estado === "ANULADO")
    return { erro: "ANULADO", mensagem: "Este código foi anulado pela operação." };
  return null;
}

export async function verificar(codigo: string, pontoId: string) {
  const db = await sb();
  const row = await obterCodigo(db, codigo);
  const r = recusa(row);
  if (r) return { ok: false as const, ...r };
  const c = row!.classe_recompensa;
  if (pontoId && c.ponto_resgate !== pontoId)
    return {
      ok: false as const,
      erro: "PONTO_INCORRETO",
      mensagem: `Este prémio resgata-se em: ${c.ponto_resgate_label}. O código continua válido.`,
    };
  return {
    ok: true as const,
    codigo: row!.codigo,
    estado: row!.estado,
    classe: row!.classe_id,
    nome_revelado: c.nome_revelado,
    hariador: {
      id: row!.player_id,
      nome: row!.jogador?.nome ?? "—",
      album_completo: !!row!.jogador?.album_completo,
    },
    emitido_em: row!.emitido_em,
    expira_em: row!.expira_em,
    resgatado_em: row!.resgatado_em,
    staff_nome: row!.staff_nome,
    ponto: c.ponto_resgate,
    ponto_label: c.ponto_resgate_label,
    alerta_janela: await alertaSubstituicao(db, c),
  };
}

// ---------------------------------------------------------------- anti-fraude (secção 14)

async function validarPin(db: Db, pin: string, pontoId: string) {
  const { data: candidatos } = await db.from("staff").select("*").eq("ativo", true);
  for (const s of candidatos ?? []) {
    if (pinHash(String(pin), s.pin_salt) !== s.pin_hash) continue;
    if (s.bloqueado_ate && new Date(s.bloqueado_ate) > new Date())
      return { erro: "PIN_BLOQUEADO" as const };
    const pontos = (s.pontos_autorizados ?? []) as string[];
    if (pontoId && !pontos.includes(pontoId) && s.perfil !== "supervisor" && s.perfil !== "tecnico")
      return { erro: "PONTO_INCORRETO" as const };
    if (s.erros_pin > 0)
      await db.from("staff").update({ erros_pin: 0, primeiro_erro_ts: null }).eq("id", s.id);
    return { staff: s };
  }
  return { erro: "PIN_INVALIDO" as const };
}

// Acesso de admin às áreas restritas (Hub e Staff ficam públicos).
// Só perfis supervisor/tecnico desbloqueiam; PIN de ponto não serve.
export const AREAS_RESTRITAS = ["admin", "config", "simulador", "visitante"] as const;
export type AreaRestrita = (typeof AREAS_RESTRITAS)[number];

const AREA_LABEL: Record<AreaRestrita, string> = {
  admin: "Operação",
  config: "Configuração",
  simulador: "Simulador",
  visitante: "Visitante",
};

// Permissões por área: cada área tem o seu PIN próprio (config.pin_area_<area>).
// PIN de supervisão/técnico do staff continua a funcionar como chave-mestra.
export async function entrarArea(area: string, pin: string) {
  const alvo = (AREAS_RESTRITAS as readonly string[]).includes(area)
    ? (area as AreaRestrita)
    : null;
  if (!alvo) return { ok: false as const, erro: "AREA_INVALIDA" as const };

  const db = await sb();
  const { data: cfg } = await db
    .from("config")
    .select("valor")
    .eq("chave", `pin_area_${alvo}`)
    .maybeSingle();

  if (cfg?.valor && pinHash(String(pin), `area_${alvo}`) === cfg.valor) {
    return {
      ok: true as const,
      nome: `${AREA_LABEL[alvo]} (PIN de área)`,
      perfil: "area" as const,
    };
  }

  const { data: candidatos } = await db.from("staff").select("*").eq("ativo", true);
  for (const s of candidatos ?? []) {
    if (pinHash(String(pin), s.pin_salt) !== s.pin_hash) continue;
    if (s.bloqueado_ate && new Date(s.bloqueado_ate) > new Date())
      return { ok: false as const, erro: "PIN_BLOQUEADO" as const };
    if (s.perfil !== "supervisor" && s.perfil !== "tecnico")
      return { ok: false as const, erro: "SEM_PERMISSAO" as const };
    return { ok: true as const, nome: s.nome as string, perfil: s.perfil as string };
  }
  return { ok: false as const, erro: "PIN_INVALIDO" as const };
}

// Define/atualiza o PIN de uma área (só com PIN de supervisão/técnico).
export async function definirPinArea(area: string, pinNovo: string, pinSupervisor: string) {
  const alvo = (AREAS_RESTRITAS as readonly string[]).includes(area)
    ? (area as AreaRestrita)
    : null;
  if (!alvo) return { ok: false as const, erro: "AREA_INVALIDA" as const };
  if (!/^\d{4,12}$/.test(pinNovo)) return { ok: false as const, erro: "PIN_FRACO" as const };

  const db = await sb();
  const { data: candidatos } = await db.from("staff").select("*").eq("ativo", true);
  const mestre = (candidatos ?? []).find(
    (s) =>
      pinHash(String(pinSupervisor), s.pin_salt) === s.pin_hash &&
      (s.perfil === "supervisor" || s.perfil === "tecnico"),
  );
  if (!mestre) return { ok: false as const, erro: "SEM_PERMISSAO" as const };

  await db
    .from("config")
    .upsert(
      { chave: `pin_area_${alvo}`, valor: pinHash(pinNovo, `area_${alvo}`) },
      { onConflict: "chave" },
    );
  return { ok: true as const, area: alvo, label: AREA_LABEL[alvo] };
}

export async function resgatar(
  codigo: string,
  pin: string,
  pontoId: string,
  idempotencyKey?: string | null,
) {
  const db = await sb();
  if (idempotencyKey) {
    const { data: prev } = await db
      .from("idempotencia")
      .select("resposta_json")
      .eq("chave", idempotencyKey)
      .maybeSingle();
    if (prev) return prev.resposta_json as Record<string, unknown>;
  }

  const row = await obterCodigo(db, codigo);
  const r = recusa(row);
  if (r) {
    await registarLog(db, codigo, "resgatar", null, pontoId, r.erro, null);
    return { ok: false, ...r };
  }

  const v = await validarPin(db, pin, pontoId);
  if ("erro" in v) {
    const msgs: Record<string, string> = {
      PIN_INVALIDO: "PIN não reconhecido. Tenta outra vez ou chama o supervisor.",
      PIN_BLOQUEADO: "PIN bloqueado por tentativas erradas. Chama o supervisor.",
      PONTO_INCORRETO: "Este PIN não está autorizado neste ponto.",
    };
    await registarLog(db, row!.codigo, "resgatar", null, pontoId, v.erro, "tentativa falhada");
    return { ok: false, erro: v.erro, mensagem: msgs[v.erro] };
  }

  const c = row!.classe_recompensa;
  if (
    c.ponto_resgate !== pontoId &&
    v.staff.perfil !== "supervisor" &&
    v.staff.perfil !== "tecnico"
  ) {
    await registarLog(
      db,
      row!.codigo,
      "resgatar",
      v.staff.id,
      pontoId,
      "PONTO_INCORRETO",
      `classe pede ${c.ponto_resgate}`,
    );
    return {
      ok: false,
      erro: "PONTO_INCORRETO",
      mensagem: `Este prémio resgata-se em: ${c.ponto_resgate_label}. Indica o ponto certo — o código continua válido.`,
    };
  }

  const { data: transitou } = await db.rpc("app_transicao_resgate", {
    p_codigo: row!.codigo,
    p_staff: v.staff.id,
    p_ponto: pontoId,
    p_canal: "online",
  });
  if (!transitou) {
    await registarLog(db, row!.codigo, "resgatar", v.staff.id, pontoId, "JA_RESGATADO", "corrida");
    return { ok: false, erro: "JA_RESGATADO", mensagem: "Este código já foi usado." };
  }
  await registarLog(db, row!.codigo, "resgatar", v.staff.id, pontoId, "RESGATADO", row!.classe_id);

  const alertaJanela = await alertaSubstituicao(db, c);
  if (alertaJanela) {
    await registarLog(
      db,
      row!.codigo,
      alertaJanela.motivo === "fora_janela" ? "janela_fechada" : "esgotado",
      v.staff.id,
      pontoId,
      alertaJanela.motivo.toUpperCase(),
      `${alertaJanela.classe_id} · alternativas: ${alertaJanela.alternativas.map((a) => a.classe_id).join(",") || "nenhuma"}`,
    );
  }

  const resposta = {
    ok: true,
    estado: "RESGATADO",
    // O voucher impresso precisa do código, das horas e do rótulo do ponto.
    codigo: row!.codigo,
    classe: row!.classe_id,
    nome_revelado: c.nome_revelado,
    hariador: { id: row!.player_id, nome: row!.jogador?.nome ?? "—" },
    emitido_em: row!.emitido_em,
    expira_em: row!.expira_em,
    resgatado_em: new Date().toISOString(),
    staff: v.staff.id,
    staff_nome: v.staff.nome,
    ponto: pontoId,
    ponto_label: c.ponto_resgate_label,
    alerta_janela: alertaJanela,
  };

  if (idempotencyKey)
    await db
      .from("idempotencia")
      .upsert({ chave: idempotencyKey, resposta_json: resposta }, { onConflict: "chave" });
  return resposta;
}

export async function anular(codigo: string, motivo: string, autorizadoPor: string) {
  const db = await sb();
  const row = await obterCodigo(db, codigo);
  if (!row) return { ok: false, erro: "CODIGO_INEXISTENTE" };
  if (row.estado === "RESGATADO") return { ok: false, erro: "JA_RESGATADO" };
  await db
    .from("codigo")
    .update({ estado: "ANULADO", motivo_anulacao: motivo })
    .eq("codigo", row.codigo)
    .in("estado", ["EMITIDO", "PENDENTE_SYNC", "EXPIRADO"]);
  await registarLog(
    db,
    row.codigo,
    "anular",
    null,
    null,
    "ANULADO",
    `${motivo} · ${autorizadoPor}`,
  );
  return { ok: true, estado: "ANULADO" };
}

// ---------------------------------------------------------------- contingência (secção 15)

export async function syncOffline(
  linhas: {
    codigo: string;
    staff_id?: string | undefined;
    ponto_id?: string | undefined;
    hora?: string | undefined;
  }[],
) {
  const db = await sb();
  const out: {
    codigo: string;
    sinal: string;
    acao?: string | undefined;
    resgatado_em?: string | null;
  }[] = [];
  for (const l of linhas) {
    const row = await obterCodigo(db, l.codigo || "");
    if (!row) {
      out.push({
        codigo: l.codigo,
        sinal: "CODIGO_NAO_EXISTE",
        acao: "verificar caligrafia; se não bater, ANULADO e registar nº de Hariador",
      });
      continue;
    }
    if (row.estado === "RESGATADO") {
      out.push({
        codigo: l.codigo,
        sinal: "JA_RESGATADO",
        resgatado_em: row.resgatado_em,
        acao: "investigar; segunda entrada é anulada",
      });
      continue;
    }
    let sinal = "OK";
    if (row.classe_recompensa.ponto_resgate !== l.ponto_id) sinal = "CLASSE_NAO_CORRESPONDE";
    await db.rpc("app_transicao_resgate", {
      p_codigo: row.codigo,
      p_staff: (l.staff_id ?? null) as unknown as string,
      p_ponto: (l.ponto_id ?? null) as unknown as string,

      p_canal: "offline",
    });
    await registarLog(
      db,
      row.codigo,
      "sync_offline",
      l.staff_id ?? null,
      l.ponto_id ?? null,
      "RESGATADO",
      "folha de contingência",
    );
    out.push({
      codigo: l.codigo,
      sinal,
      acao: sinal === "OK" ? undefined : "incidente de treino, não fraude",
    });
  }
  return { lancados: linhas.length, sinalizacoes: out };
}

// ---------------------------------------------------------------- operação (secção 10 e 13)

export async function painel(data: string) {
  const db = await sb();
  await abrirDia(data);
  await expirarVencidos();
  const [pools, classes, codigos, regras, log, jogadores, concessoes] = await Promise.all([
    db.from("pool_dia").select("*").eq("data", data),
    db.from("classe_recompensa").select("*").order("nivel").order("id"),
    db
      .from("codigo")
      .select(
        "codigo, player_id, classe_id, estado, emitido_em, resgatado_em, staff_id, ponto_id, canal, jogador(nome)",
      )
      .eq("data", data)
      .order("emitido_em", { ascending: false })
      .limit(80),
    db.from("regra").select("*").order("prioridade"),
    db.from("log_resgate").select("*").order("id", { ascending: false }).limit(40),
    db.from("jogador").select("*").order("posicao_ranking_dia", { nullsFirst: false }),
    db.from("concessao_manual").select("*").order("id", { ascending: false }).limit(20),
  ]);

  const classeMap = new Map((classes.data ?? []).map((c) => [c.id, c as Classe]));
  const agora = new Date();
  const linhas = (classes.data ?? []).map((c) => {
    const p = (pools.data ?? []).find((x) => x.classe_id === c.id);
    const classe = classeMap.get(c.id)!;
    const indisp = indisponibilidade(classe, p as PoolLinha, agora, 20);
    return {
      classe_id: c.id,
      nome_revelado: c.nome_revelado,
      categoria: c.categoria,
      nivel: c.nivel,
      ponto_label: c.ponto_resgate_label,
      teto: p?.teto ?? c.teto_diario,
      quota_agora: quotaAcumulada(classe, p?.teto ?? c.teto_diario, agora),
      emitidos: p?.emitidos ?? 0,
      resgatados: p?.resgatados ?? 0,
      teto_orcamento: p?.teto_orcamento ?? c.teto_orcamento_dia,
      gasto_orcamento: Number(p?.gasto_orcamento ?? 0),
      custo_unitario: Number(c.custo_unitario),
      janela_fim: c.janela_uso_fim,
      janela_aberta: janelaAberta(classe, agora, 20),
      pausado: !!p?.pausado,
      disponivel: !indisp,
      motivo: (indisp?.motivo ?? null) as MotivoIndisp | null,
      motivo_label: indisp ? MOTIVO_LABEL[indisp.motivo] : null,
      motivo_detalhe: indisp?.detalhe ?? null,
    };
  });

  const fechadas = linhas.filter((l) => !l.disponivel);
  const mapaAlt = await mapaAlternativas(db);
  const altAuto = (await getConfig(db, "alternativas_auto", "true")) !== "false";
  const configuradas = new Set(fechadas.flatMap((l) => mapaAlt.get(l.classe_id) ?? []));
  const temMapeamento = configuradas.size > 0;
  const disponiveis = linhas.filter((l) => l.disponivel);
  const baseFechada = fechadas[0] ? classeMap.get(fechadas[0].classe_id) : undefined;
  const ordenadas = baseFechada
    ? ordenarSubstitutos(
        baseFechada,
        disponiveis.map((l) => classeMap.get(l.classe_id)!),
      ).map((c) => disponiveis.find((l) => l.classe_id === c.id)!)
    : disponiveis;
  const abertas = ordenadas.filter((l) =>
    temMapeamento ? configuradas.has(l.classe_id) : altAuto,
  );
  const avisoJanela = fechadas.length
    ? {
        fechadas: fechadas.map((l) => ({
          classe_id: l.classe_id,
          nome: l.nome_revelado,
          janela_fim: l.janela_fim,
          motivo: l.motivo,
          motivo_label: l.motivo_label,
          detalhe: l.motivo_detalhe,
        })),
        alternativas: abertas.map((l) => ({
          classe_id: l.classe_id,
          nome: l.nome_revelado,
          ponto_label: l.ponto_label,
          janela_fim: l.janela_fim,
          categoria: l.categoria,
          nivel: l.nivel,
        })),
      }
    : null;

  return {
    data,
    linhas,
    aviso_janela: avisoJanela,
    cifra: await cifraAtiva(data),
    codigos: (codigos.data ?? []).map((k) => ({
      ...k,
      jogador_nome: (k.jogador as unknown as { nome: string } | null)?.nome ?? "—",
    })),
    regras: regras.data ?? [],
    log: log.data ?? [],
    jogadores: jogadores.data ?? [],
    concessoes: concessoes.data ?? [],
  };
}

export async function pausarClasse(data: string, classeId: string, pausado: boolean) {
  const db = await sb();
  await db.from("pool_dia").update({ pausado }).eq("data", data).eq("classe_id", classeId);
  await registarLog(db, null, "pausar", null, null, pausado ? "PAUSADO" : "RETOMADO", classeId);
  return { ok: true };
}

export async function regenerarCifra(data: string) {
  const db = await sb();
  const geracao = await gerarCifraDoDia(db, data, true);
  await registarLog(db, null, "cifra_regenerar", null, null, "REGENERADA", `geracao ${geracao}`);
  return { ok: true, geracao };
}

export async function criarConcessao(
  playerId: string,
  classeId: string,
  motivo: string,
  autorizadoPor: string,
) {
  const db = await sb();
  const { error } = await db
    .from("concessao_manual")
    .insert({ player_id: playerId, classe_id: classeId, motivo, autorizado_por: autorizadoPor });
  if (error) return { ok: false, erro: error.message };
  await registarLog(db, null, "concessao", null, null, "CRIADA", `${playerId} · ${classeId}`);
  return { ok: true };
}

export async function listarJogadores() {
  const db = await sb();
  const { data } = await db
    .from("jogador")
    .select("*")
    .order("posicao_ranking_dia", { nullsFirst: false });
  return data ?? [];
}

export async function codigosDoJogador(playerId: string) {
  const db = await sb();
  await expirarVencidos();
  const { data } = await db
    .from("codigo")
    .select(
      "codigo, classe_id, estado, emitido_em, expira_em, classe_recompensa(nome_revelado, ponto_resgate_label)",
    )
    .eq("player_id", playerId)
    .eq("data", hoje())
    .order("emitido_em", { ascending: false });
  return (data ?? []).map((k) => {
    const c = k.classe_recompensa as unknown as {
      nome_revelado: string;
      ponto_resgate_label: string;
    };
    return {
      codigo: k.codigo,
      classe_id: k.classe_id,
      estado: k.estado,
      emitido_em: k.emitido_em,
      expira_em: k.expira_em,
      nome_revelado: c.nome_revelado,
      ponto_label: c.ponto_resgate_label,
    };
  });
}

// ---------------------------------------------------------------- simulador (secção 17.2)

export type SimParams = {
  visitantes: number;
  taxa_adesao: number;
  taxa_conclusao: number;
  tetos?: Record<string, number | null> | undefined;
  pesos?: Record<string, number> | undefined;
};

export async function simular(p: SimParams) {
  const db = await sb();
  const [{ data: classes }, { data: regras }] = await Promise.all([
    db.from("classe_recompensa").select("*").eq("ativo", true),
    db.from("regra").select("*").eq("ativo", true),
  ]);
  const jogadores = Math.round(p.visitantes * p.taxa_adesao);
  const completam = Math.round(jogadores * p.taxa_conclusao);
  const faixas = [
    { nome: "10h–12h", pct: 0.2, hora: 11 },
    { nome: "12h–14h", pct: 0.25, hora: 13 },
    { nome: "14h–16h", pct: 0.25, hora: 15 },
    { nome: "16h–18h", pct: 0.2, hora: 17 },
    { nome: "18h–fecho", pct: 0.1, hora: 19 },
  ];

  const porClasse = new Map(
    (classes ?? []).map((c) => [
      c.id,
      {
        classe: c.id,
        nome: c.nome_revelado,
        emitidos: 0,
        custo: 0,
        teto: p.tetos?.[c.id] !== undefined ? p.tetos[c.id] : c.teto_diario,
        teto_orcamento: c.teto_orcamento_dia,
        gasto: 0,
        por_faixa: faixas.map(() => 0),
      },
    ]),
  );

  const segmentos = (regras ?? [])
    .filter((r) => r.modo === "segmento")
    .sort((a, b) => a.prioridade - b.prioridade);
  const sorteios = (regras ?? [])
    .filter((r) => r.modo === "sorteio")
    .map((r) => ({ ...r, peso: p.pesos?.[r.classe_id] ?? r.peso }))
    .filter((r) => r.peso > 0);

  const cabe = (
    pc: {
      emitidos: number;
      teto: number | null | undefined;
      gasto: number;
      teto_orcamento: number | null;
    },
    custo: number,
  ) =>
    (pc.teto == null || pc.emitidos < pc.teto) &&
    (pc.teto_orcamento == null || pc.gasto + custo <= pc.teto_orcamento);

  const escolherFaixa = () => {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < faixas.length; i++) {
      acc += faixas[i]!.pct;
      if (r <= acc) return i;
    }
    return faixas.length - 1;
  };

  let comPremio = 0;
  let semNada = 0;
  for (let i = 0; i < jogadores; i++) {
    const fi = escolherFaixa();
    const faixa = faixas[fi]!;
    const album = i < completam;
    const rankingDia = album ? Math.floor((i / Math.max(completam, 1)) * completam) + 1 : 99999;
    const ctx: Ctx = {
      album_completo: album,
      cartas: album ? 6 : 3,
      pontos: 3000,
      ranking_dia: rankingDia,
      ranking_global: rankingDia * 5,
      hora: faixa.hora,
      passe_anual: false,
      primeira_visita: false,
    };

    let emitiu: {
      pc: NonNullable<ReturnType<typeof porClasse.get>>;
      custo: number;
      fi: number;
    } | null = null;
    for (const rg of segmentos) {
      if (!condicaoBate((rg.condicao_json ?? {}) as Cond, ctx)) continue;
      const pc = porClasse.get(rg.classe_id);
      const c = (classes ?? []).find((x) => x.id === rg.classe_id);
      if (pc && c && cabe(pc, Number(c.custo_unitario))) {
        emitiu = { pc, custo: Number(c.custo_unitario), fi };
        break;
      }
    }
    if (!emitiu) {
      let cands = sorteios.filter((rg) => condicaoBate((rg.condicao_json ?? {}) as Cond, ctx));
      while (cands.length && !emitiu) {
        const total = cands.reduce((s, r) => s + r.peso, 0);
        let alvo = Math.random() * total;
        let esc = cands[0]!;
        for (const r of cands) {
          if (alvo < r.peso) {
            esc = r;
            break;
          }
          alvo -= r.peso;
        }
        const pc = porClasse.get(esc.classe_id);
        const c = (classes ?? []).find((x) => x.id === esc.classe_id);
        if (pc && c && cabe(pc, Number(c.custo_unitario)))
          emitiu = { pc, custo: Number(c.custo_unitario), fi };
        else cands = cands.filter((r) => r !== esc);
      }
    }
    if (emitiu) {
      emitiu.pc.emitidos++;
      emitiu.pc.gasto += emitiu.custo;
      emitiu.pc.custo += emitiu.custo;
      emitiu.pc.por_faixa[emitiu.fi] = (emitiu.pc.por_faixa[emitiu.fi] ?? 0) + 1;
      comPremio++;
    } else semNada++;
  }

  const linhas = [...porClasse.values()].map((pc) => ({
    ...pc,
    custo: Math.round(pc.custo * 100) / 100,
    resultado:
      pc.teto != null && pc.emitidos >= pc.teto
        ? "Esgota o teto"
        : pc.teto_orcamento != null && pc.gasto >= Number(pc.teto_orcamento) * 0.98
          ? "Esgota o orçamento"
          : "Cabe",
  }));
  const nivel1 = [...porClasse.values()].find((pc) => {
    const c = (classes ?? []).find((x) => x.id === pc.classe);
    return c?.nivel === 1;
  });
  return {
    jogadores,
    completam_album: completam,
    faixas: faixas.map((f) => f.nome),
    classes: linhas,
    pct_jogadores_com_premio: Math.round((comPremio / Math.max(jogadores, 1)) * 1000) / 10,
    sem_premio_fisico: semNada,
    custo_total_dia: Math.round(linhas.reduce((s, l) => s + l.custo, 0) * 100) / 100,
    top_x_sugerido: nivel1?.teto ? Math.min(nivel1.teto, completam) : completam,
  };
}

// ---------------------------------------------------------------- relatório diário

export type LinhaRelatorio = {
  classe_id: string;
  nome: string;
  categoria: string;
  janela_fim: string | null;
  emitidos: number;
  resgatados: number;
  expirados: number;
  anulados: number;
  fora_janela: number;
  esgotado: number;
  usada_como_alternativa: number;
  custo: number;
};

export async function relatorioDiario(dataParam?: string) {
  const db = await sb();
  const data = dataParam || hoje();

  const [classes, codigos, logs] = await Promise.all([
    db.from("classe_recompensa").select("*").order("nivel"),
    db.from("codigo").select("classe_id, estado").eq("data", data),
    db
      .from("log_resgate")
      .select("acao, resultado, detalhe, ts_servidor")
      .in("acao", ["janela_fechada", "esgotado", "alternativa_usada"])
      .gte("ts_servidor", `${data}T00:00:00Z`)
      .lte("ts_servidor", `${data}T23:59:59Z`),
  ]);

  const contar = (classeId: string, estado: string) =>
    (codigos.data ?? []).filter((k) => k.classe_id === classeId && k.estado === estado).length;

  const linhas: LinhaRelatorio[] = (classes.data ?? []).map((c) => {
    const emitidos = (codigos.data ?? []).filter((k) => k.classe_id === c.id).length;
    return {
      classe_id: c.id,
      nome: c.nome_revelado,
      categoria: c.categoria,
      janela_fim: c.janela_uso_fim,
      emitidos,
      resgatados: contar(c.id, "RESGATADO"),
      expirados: contar(c.id, "EXPIRADO"),
      anulados: contar(c.id, "ANULADO"),
      fora_janela: (logs.data ?? []).filter(
        (l) => l.acao === "janela_fechada" && l.detalhe === c.id,
      ).length,
      esgotado: (logs.data ?? []).filter(
        (l) =>
          l.acao === "esgotado" &&
          (l.detalhe === c.id || String(l.detalhe ?? "").startsWith(`${c.id} `)),
      ).length,
      usada_como_alternativa: (logs.data ?? []).filter(
        (l) => l.acao === "alternativa_usada" && l.resultado === c.id,
      ).length,
      custo: contar(c.id, "RESGATADO") * Number(c.custo_unitario),
    };
  });

  const totais = {
    emitidos: linhas.reduce((s, l) => s + l.emitidos, 0),
    resgatados: linhas.reduce((s, l) => s + l.resgatados, 0),
    expirados: linhas.reduce((s, l) => s + l.expirados, 0),
    anulados: linhas.reduce((s, l) => s + l.anulados, 0),
    fora_janela: linhas.reduce((s, l) => s + l.fora_janela, 0),
    esgotado: linhas.reduce((s, l) => s + l.esgotado, 0),
    alternativas: linhas.reduce((s, l) => s + l.usada_como_alternativa, 0),
    fallback_digital: (logs.data ?? []).filter(
      (l) => l.acao === "alternativa_usada" && l.resultado === "fallback_digital",
    ).length,
    custo: linhas.reduce((s, l) => s + l.custo, 0),
  };

  const cabecalho = [
    "classe_id",
    "nome",
    "categoria",
    "janela_uso_fim",
    "emitidos",
    "resgatados",
    "expirados",
    "anulados",
    "fora_de_janela",
    "esgotado_ou_pausado",
    "usada_como_alternativa",
    "custo_resgatado",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const corpo = linhas.map((l) =>
    [
      l.classe_id,
      l.nome,
      l.categoria,
      l.janela_fim ?? "",
      l.emitidos,
      l.resgatados,
      l.expirados,
      l.anulados,
      l.fora_janela,
      l.esgotado,
      l.usada_como_alternativa,
      l.custo.toFixed(2),
    ]
      .map(esc)
      .join(","),
  );
  const rodape = [
    [
      "TOTAL",
      "",
      "",
      "",
      totais.emitidos,
      totais.resgatados,
      totais.expirados,
      totais.anulados,
      totais.fora_janela,
      totais.esgotado,
      totais.alternativas,
      totais.custo.toFixed(2),
    ]
      .map(esc)
      .join(","),
    [`# fallback digital (sem alternativa física): ${totais.fallback_digital}`].map(esc).join(","),
  ];

  return {
    data,
    linhas,
    totais,
    csv: [cabecalho.map(esc).join(","), ...corpo, ...rodape].join("\n"),
    ficheiro: `hopiplay-relatorio-${data}.csv`,
  };
}

// ---------------------------------------------------------------- histórico de janelas

export type DiaHistorico = {
  data: string;
  fechadas: { classe_id: string; nome: string; janela_fim: string | null; ocorrencias: number }[];
  esgotadas: { classe_id: string; nome: string; ocorrencias: number }[];
  alternativas: { classe_id: string; nome: string; ocorrencias: number }[];
  fallback_digital: number;
  total_fechadas: number;
  total_esgotadas: number;
  total_alternativas: number;
};

export async function historicoJanela(dias = 14) {
  const db = await sb();
  const fim = new Date();
  const inicio = new Date(fim.getTime() - (dias - 1) * 86400000);
  const inicioISO = `${inicio.toISOString().slice(0, 10)}T00:00:00Z`;

  const [classes, logs] = await Promise.all([
    db.from("classe_recompensa").select("id, nome_revelado, janela_uso_fim").order("nivel"),
    db
      .from("log_resgate")
      .select("acao, resultado, detalhe, ts_servidor")
      .in("acao", ["janela_fechada", "esgotado", "alternativa_usada"])
      .gte("ts_servidor", inicioISO)
      .order("ts_servidor", { ascending: false }),
  ]);

  const mapaClasses = new Map(
    (classes.data ?? []).map((c) => [
      c.id,
      { nome: c.nome_revelado, janela_fim: c.janela_uso_fim },
    ]),
  );
  const classeDoLog = (valor: string | null) => {
    if (!valor) return null;
    const id = valor.split("·")[0]?.trim().split(" ")[0]?.trim() ?? "";
    return mapaClasses.has(id) ? id : null;
  };

  const porDia = new Map<
    string,
    {
      fechadas: Map<string, number>;
      esgotadas: Map<string, number>;
      alternativas: Map<string, number>;
      fallback: number;
    }
  >();
  const garante = (d: string) => {
    let e = porDia.get(d);
    if (!e) {
      e = { fechadas: new Map(), esgotadas: new Map(), alternativas: new Map(), fallback: 0 };
      porDia.set(d, e);
    }
    return e;
  };

  for (const l of logs.data ?? []) {
    const dia = String(l.ts_servidor).slice(0, 10);
    const entrada = garante(dia);
    if (l.acao === "janela_fechada" || l.acao === "esgotado") {
      const id = classeDoLog(l.detalhe) ?? classeDoLog(l.resultado);
      const alvo = l.acao === "esgotado" ? entrada.esgotadas : entrada.fechadas;
      if (id) alvo.set(id, (alvo.get(id) ?? 0) + 1);
    } else {
      if (l.resultado === "fallback_digital") entrada.fallback += 1;
      else if (mapaClasses.has(l.resultado))
        entrada.alternativas.set(l.resultado, (entrada.alternativas.get(l.resultado) ?? 0) + 1);
    }
  }

  const historico: DiaHistorico[] = [...porDia.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([data, e]) => {
      const fechadas = [...e.fechadas.entries()]
        .map(([classe_id, ocorrencias]) => ({
          classe_id,
          nome: mapaClasses.get(classe_id)?.nome ?? classe_id,
          janela_fim: mapaClasses.get(classe_id)?.janela_fim ?? null,
          ocorrencias,
        }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias);
      const esgotadas = [...e.esgotadas.entries()]
        .map(([classe_id, ocorrencias]) => ({
          classe_id,
          nome: mapaClasses.get(classe_id)?.nome ?? classe_id,
          ocorrencias,
        }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias);
      const alternativas = [...e.alternativas.entries()]
        .map(([classe_id, ocorrencias]) => ({
          classe_id,
          nome: mapaClasses.get(classe_id)?.nome ?? classe_id,
          ocorrencias,
        }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias);
      return {
        data,
        fechadas,
        esgotadas,
        alternativas,
        fallback_digital: e.fallback,
        total_fechadas: fechadas.reduce((s, f) => s + f.ocorrencias, 0),
        total_esgotadas: esgotadas.reduce((s, f) => s + f.ocorrencias, 0),
        total_alternativas: alternativas.reduce((s, f) => s + f.ocorrencias, 0),
      };
    });

  return { dias, historico };
}

// ---------------------------------------------------------------- configuração de alternativas

export async function configAlternativas() {
  const db = await sb();
  const agora = new Date();
  const [classes, mapeamentos] = await Promise.all([
    db.from("classe_recompensa").select("*").order("nivel"),
    db.from("alternativa_janela").select("*").order("prioridade"),
  ]);
  const margem = Number(await getConfig(db, "margem_janela_min", "20"));
  return {
    auto: (await getConfig(db, "alternativas_auto", "true")) !== "false",
    margem_min: margem,
    classes: (classes.data ?? []).map((c) => ({
      id: c.id,
      nome: c.nome_revelado,
      categoria: c.categoria,
      nivel: c.nivel,
      ponto_label: c.ponto_resgate_label,
      janela_fim: c.janela_uso_fim,
      janela_aberta: janelaAberta(c as Classe, agora, margem),
    })),
    mapeamentos: mapeamentos.data ?? [],
  };
}

export async function guardarAlternativa(input: {
  classeFechada: string;
  classeAlternativa: string;
  prioridade?: number | undefined;
  ativo?: boolean | undefined;
}) {
  const db = await sb();
  if (input.classeFechada === input.classeAlternativa) return { ok: false, erro: "MESMA_CLASSE" };
  const { error } = await db.from("alternativa_janela").upsert(
    {
      classe_fechada: input.classeFechada,
      classe_alternativa: input.classeAlternativa,
      prioridade: input.prioridade ?? 1,
      ativo: input.ativo ?? true,
    },
    { onConflict: "classe_fechada,classe_alternativa" },
  );
  if (error) return { ok: false, erro: error.message };
  await registarLog(
    db,
    null,
    "config_alternativa",
    null,
    null,
    "GUARDADA",
    `${input.classeFechada} -> ${input.classeAlternativa}`,
  );
  return { ok: true };
}

export async function alternarAlternativa(id: number, ativo: boolean) {
  const db = await sb();
  await db.from("alternativa_janela").update({ ativo }).eq("id", id);
  return { ok: true };
}

export async function removerAlternativa(id: number) {
  const db = await sb();
  await db.from("alternativa_janela").delete().eq("id", id);
  await registarLog(db, null, "config_alternativa", null, null, "REMOVIDA", String(id));
  return { ok: true };
}

export async function definirAlternativasAuto(auto: boolean) {
  const db = await sb();
  await db
    .from("config")
    .upsert(
      { chave: "alternativas_auto", valor: auto ? "true" : "false" },
      { onConflict: "chave" },
    );
  return { ok: true, auto };
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RespostaGeral } from "./hopiplay.server";

export const fnPainel = createServerFn({ method: "GET" })
  .inputValidator((d: { data?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.painel(data.data ?? m.hoje());
  });

export const fnJogadores = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("./hopiplay.server");
  return m.listarJogadores();
});

export const fnCodigosJogador = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ playerId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.codigosDoJogador(data.playerId);
  });

export const fnAtingirMarco = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ playerId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return (await m.atingirMarco(data.playerId)) as RespostaGeral;
  });

export const fnVerificar = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ codigo: z.string(), pontoId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return (await m.verificar(data.codigo, data.pontoId)) as RespostaGeral;
  });

export const fnResgatar = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        codigo: z.string(),
        pin: z.string(),
        pontoId: z.string(),
        idempotencyKey: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return (await m.resgatar(
      data.codigo,
      data.pin,
      data.pontoId,
      data.idempotencyKey ?? null,
    )) as RespostaGeral;
  });

export const fnAnular = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ codigo: z.string(), motivo: z.string(), autorizadoPor: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return (await m.anular(data.codigo, data.motivo, data.autorizadoPor)) as RespostaGeral;
  });

export const fnPausar = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ data: z.string(), classeId: z.string(), pausado: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.pausarClasse(data.data, data.classeId, data.pausado);
  });

export const fnRegenerarCifra = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ data: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.regenerarCifra(data.data);
  });

export const fnConcessao = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        playerId: z.string(),
        classeId: z.string(),
        motivo: z.string(),
        autorizadoPor: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.criarConcessao(data.playerId, data.classeId, data.motivo, data.autorizadoPor);
  });

export const fnSyncOffline = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        linhas: z.array(
          z.object({
            codigo: z.string(),
            staff_id: z.string().optional(),
            ponto_id: z.string().optional(),
            hora: z.string().optional(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.syncOffline(data.linhas);
  });

export const fnSimular = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        visitantes: z.number(),
        taxa_adesao: z.number(),
        taxa_conclusao: z.number(),
        tetos: z.record(z.string(), z.number().nullable()).optional(),
        pesos: z.record(z.string(), z.number()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.simular(data);
  });

export const fnRelatorioDiario = createServerFn({ method: "GET" })
  .inputValidator((d: { data?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.relatorioDiario(data.data);
  });

export const fnHistoricoJanela = createServerFn({ method: "GET" })
  .inputValidator((d: { dias?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.historicoJanela(data.dias ?? 14);
  });

export const fnConfigAlternativas = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("./hopiplay.server");
  return m.configAlternativas();
});

export const fnGuardarAlternativa = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      classeFechada: z.string(),
      classeAlternativa: z.string(),
      prioridade: z.number().int().min(1).max(99).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.guardarAlternativa(data);
  });

export const fnAlternarAlternativa = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number(), ativo: z.boolean() }))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.alternarAlternativa(data.id, data.ativo);
  });

export const fnRemoverAlternativa = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.removerAlternativa(data.id);
  });

export const fnAlternativasAuto = createServerFn({ method: "POST" })
  .inputValidator(z.object({ auto: z.boolean() }))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.definirAlternativasAuto(data.auto);
  });

export const fnEntrarAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ pin: z.string().min(1).max(12), area: z.string().min(1).max(20) }))
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.entrarArea(data.area, data.pin);
  });

export const fnDefinirPinArea = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      area: z.string().min(1).max(20),
      pinNovo: z.string().min(4).max(12),
      pinSupervisor: z.string().min(1).max(12),
    }),
  )
  .handler(async ({ data }) => {
    const m = await import("./hopiplay.server");
    return m.definirPinArea(data.area, data.pinNovo, data.pinSupervisor);
  });

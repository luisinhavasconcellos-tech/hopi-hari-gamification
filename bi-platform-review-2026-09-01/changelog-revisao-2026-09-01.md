# Revisão externa · 01/09/2026

Alterações aplicadas ao pacote fora do ambiente Manus (auditoria de código + melhorias solicitadas). Quality gate executado após as mudanças: `tsc` (app + server) sem erros, `vitest` com 130 testes verdes e 0 falhas, build de produção concluído.

## Correções de bugs

1. **Suíte de testes portável.** Nove testes falhavam fora do sandbox Manus por dependerem de fixtures em `/home/ubuntu/upload`, segredos do Google Drive ou do banco de produção. Todos agora detectam o ambiente e são pulados com `describe.skip` quando a dependência não existe, mantendo a cobertura completa dentro do Manus:
   `facebookCsv.test.ts`, `instagramCsv.test.ts`, `tiktokImport.integration.test.ts`, `googleDriveServiceAccount.test.ts`, `biSnapshot.social.test.ts`, `dailyBriefing.social.test.ts`.
2. **`operationalSummary.ts` — seguidores de concorrentes.** A consulta somava snapshots de todas as datas por parque (`SUM` sem filtro de data), o que inflaria os totais a partir da segunda coleta semanal. Agora soma apenas o snapshot mais recente de cada perfil.
3. **`weekly360Report.ts` — variação semanal de seguidores.** Sem observação anterior ao início da janela, o baseline caía para o primeiro registro histórico (02/06) e o delta era rotulado como "semanal". Agora a variação fica indisponível (null) em vez de superestimada; o mesmo vale para o valor "mais recente" fora da janela.

## Narração do briefing diário (voz)

Em `server/lib/dailyBriefing.ts`:

- O gerador agora coleta um bloco `correlations` (registro oficial e correlações da Hora do Horror + campanhas × vendas, via `collectCorrelationDigest`) e o injeta no snapshot usado para gerar e validar o briefing. Falhas nessas fontes degradam para `null` sem quebrar a geração.
- O prompt da narração foi reescrito: roteiro de áudio de ~40 segundos em três movimentos (abertura que situa o dia, desenvolvimento que conecta campanhas recentes ao faturamento e público, fechamento com a prioridade), com estética editorial.
- Regra explícita contra números desconhecidos: a narração evita algarismos, descreve grandezas com palavras apenas quando o valor existe no snapshot e nunca menciona fonte indisponível como se tivesse dado. O validador determinístico de aterramento numérico permanece ativo.
- Limite da narração ampliado de 500 para 620 caracteres (zod + json-schema) para acomodar a prosa.
- `docs/daily-voice-agent-prompt.md`: direção de voz refinada (timbre quente, dicção clara, ritmo calmo, pausas naturais, leitura não mecânica de valores).

## Estado das correlações (referência rápida)

- Hora do Horror 2026 registrada: 27/08–30/09. Correlação exige 7 dias compartilhados dentro da janela; até 28/08 havia 1 dia → `insufficient_sample` (comportamento correto). Primeiro coeficiente possível a partir de 02/09 com importações diárias contínuas.
- Sinais precoces: e-commerce +20,8% intradia em 27/08 (R$ 200,4 mil, 21,4% da receita bruta, 2º maior canal); Instagram 3.165 cliques no link vs Facebook 1.006 em 28/08.
- Sync de seguidores verificado: log com 84 dias (02/06–24/08), total 3.006.848 em 24/08 conferindo com o dashboard de produção; TikTok +2.266 na semana 17–23/08, Facebook −220.

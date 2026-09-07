# Revisão externa integrada em 01/09/2026

O pacote `hopiharibiplatformcodeatualizado20260901.zip` foi comparado arquivo a arquivo com a versão publicada `0449cc7f`. As correções de produção e portabilidade de testes foram integradas seletivamente; arquivos gerados, histórico do projeto e infraestrutura gerenciada não foram sobrescritos.

## Correções integradas

1. **Suíte de testes portável.** Testes que dependem de banco, arquivos locais de importação ou credenciais de serviço agora detectam a disponibilidade dessas dependências e usam `describe.skip` quando o ambiente não as fornece.
2. **Seguidores de concorrentes.** O resumo operacional soma somente o snapshot mais recente de cada perfil elegível, evitando acúmulo de históricos semanais.
3. **Variação semanal de seguidores.** O relatório 360° não usa observações fora da janela como se fossem o último valor ou baseline do período; quando faltam observações válidas, o resultado permanece indisponível.
4. **Briefing diário.** O snapshot do briefing inclui o registro oficial e as correlações de Hora do Horror e campanhas × vendas. Falhas nessas fontes degradam para `null` sem interromper a geração.
5. **Narração.** O roteiro admite até 620 caracteres e orienta uma leitura editorial de aproximadamente quarenta segundos, conectando campanhas, faturamento e público sem tratar associação como causalidade.
6. **Direção de voz.** A documentação especifica voz adulta brasileira, timbre quente, dicção clara, ritmo calmo e pronúncia natural, sem inserir conteúdo além da narração aprovada.

## Arquivos não substituídos

`package-lock.json` e os arquivos `tsconfig.*.tsbuildinfo` são artefatos gerados e permaneceram sob controle do projeto atual. `todo.md` preserva todo o histórico e o checklist desta integração. `client/public/__manus__/debug-collector.js` permanece sob gestão do runtime da plataforma.

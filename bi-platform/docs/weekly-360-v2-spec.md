# Relatório 360° semanal — regras da revisão v2

## 1. Campanhas reconhecidas em posts

O relatório deve separar **reconhecimento editorial** de **atribuição comercial**. Uma campanha pode ser reconhecida e analisada socialmente quando o nome normalizado, uma hashtag compacta ou um alias inequívoco aparece na legenda de posts publicados. Termos genéricos isolados não criam vínculo. A evidência social mostra quantidade de posts, plataformas, primeira e última publicação, interações e visualizações.

Quando não há período oficial, o intervalo observado entre a primeira e a última publicação vinculada pode ser usado como `post_activity_window`, sempre identificado como inferido. Esse intervalo não transforma automaticamente a campanha em causalmente responsável por vendas. A análise comercial exige sobreposição com fechamentos de vendas e os mínimos já vigentes de três dias de campanha e três dias de baseline. Atribuição direta exige UTM, código promocional ou outro identificador transacional.

## 2. Comparação comercial ano contra ano

A fonte comparável é `sales_revenue_monthly`, agregada por mês e canal. O gráfico de linhas deve exibir o último ano disponível e o ano imediatamente anterior, somente nos meses que possuem dados no ano atual. Meses futuros ou ausentes não podem ser preenchidos com zero. O título deve explicitar que representa **faturamento / receita bruta comercial mensal**. A receita bruta operacional diária permanece separada e não recebe uma linha de ano anterior quando não existe fechamento diário equivalente.

## 3. Variação semanal de seguidores

O período de seguidores é independente da data operacional do relatório. A data final é a observação mais recente da planilha. A data-base alvo é exatamente sete dias antes; caso não exista, usa-se a observação anterior mais próxima. A variação consolidada é a diferença entre a soma das cinco plataformas nessas duas datas. Se não houver base anterior, a variação é `null`, nunca zero.

## 4. Audiência visual e privacidade

Composição de audiência deve priorizar gráficos: barras empilhadas para idade e gênero; barras horizontais para cidades, estados, territórios e segmentos CRM. Uma visualização só é renderizada quando há valores positivos observados. Dados de CPF são exclusivamente agregados por região; nenhum CPF, identificador individual ou linha de compra pode ser exposto. Sem agregado de compradores vinculado por data/campanha, o relatório não sugere essa atribuição.

## 5. Supressão de amostras insuficientes

O relatório não deve criar capítulos analíticos contendo apenas “amostra insuficiente”. Campanhas × vendas só aparece quando existe ao menos uma campanha `ready`. Coeficientes e deltas não prontos são omitidos. Blocos de reputação e social listening temático exigem pelo menos cinco registros; tendências de busca exigem pelo menos três dias observados. Ausências relevantes podem ser descritas somente na metodologia ou nos riscos, sem ocupar um capítulo de análise.

## 6. Hora do Horror

Hora do Horror deixa de ser apresentado como correlação de receita. O tema passa a integrar **Social Listening**, combinando apenas evidências observadas de busca orgânica, menções sociais e reputação. Cada domínio tem sua própria cobertura e pode ser exibido ou suprimido independentemente. Busca usa `gsc_daily_queries` e `gsc_daily_totals`; menções usam `x_mentions`; reputação usa `reputation_reviews`. Nenhuma associação é chamada de causalidade.

## 7. Critérios de aceitação

O PDF final deve manter A4, identidade Hopi Hari, Fraunces, paginação correta e ausência de cortes. A série YoY deve parar no último mês atual comparável. A variação semanal de seguidores deve reconciliar com 18/08/2026 → 25/08/2026 (`+6.458`) na base atual. Campanhas reconhecidas em posts devem aparecer mesmo quando a página comercial for suprimida. Tabelas de composição de audiência devem ser substituídas por gráficos. O capítulo independente de Hora do Horror não deve existir; seus sinais válidos devem aparecer em Social Listening.

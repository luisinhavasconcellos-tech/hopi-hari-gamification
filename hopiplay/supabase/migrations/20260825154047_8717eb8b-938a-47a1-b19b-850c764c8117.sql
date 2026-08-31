CREATE TABLE public.classe_recompensa (
  id text PRIMARY KEY,
  nome_interno text NOT NULL,
  nome_revelado text NOT NULL,
  categoria text NOT NULL,
  nivel int NOT NULL,
  ponto_resgate text NOT NULL,
  ponto_resgate_label text NOT NULL,
  teto_diario int,
  teto_orcamento_dia numeric,
  custo_unitario numeric NOT NULL DEFAULT 0,
  valor_percebido numeric NOT NULL DEFAULT 0,
  quota_horaria_json jsonb,
  janela_uso_inicio text,
  janela_uso_fim text,
  ttl_horas numeric,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.cifra_diaria (
  id bigserial PRIMARY KEY,
  data date NOT NULL,
  classe_id text NOT NULL REFERENCES public.classe_recompensa(id),
  letra_chave text NOT NULL,
  digito_dia text NOT NULL,
  geracao int NOT NULL DEFAULT 1,
  UNIQUE (data, letra_chave, geracao),
  UNIQUE (data, classe_id, geracao)
);

CREATE TABLE public.pool_dia (
  id bigserial PRIMARY KEY,
  data date NOT NULL,
  classe_id text NOT NULL REFERENCES public.classe_recompensa(id),
  teto int,
  teto_orcamento numeric,
  emitidos int NOT NULL DEFAULT 0,
  resgatados int NOT NULL DEFAULT 0,
  gasto_orcamento numeric NOT NULL DEFAULT 0,
  pausado boolean NOT NULL DEFAULT false,
  UNIQUE (data, classe_id)
);

CREATE TABLE public.serie_retirada (
  serie text PRIMARY KEY,
  retirada_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jogador (
  id text PRIMARY KEY,
  nome text NOT NULL,
  cartas int NOT NULL DEFAULT 0,
  album_completo boolean NOT NULL DEFAULT false,
  pontos int NOT NULL DEFAULT 0,
  posicao_ranking_dia int,
  posicao_ranking_global int,
  passe_anual boolean NOT NULL DEFAULT false,
  primeira_visita boolean NOT NULL DEFAULT false
);

CREATE TABLE public.codigo (
  codigo text PRIMARY KEY,
  serie text NOT NULL,
  player_id text NOT NULL REFERENCES public.jogador(id),
  classe_id text NOT NULL REFERENCES public.classe_recompensa(id),
  data date NOT NULL,
  estado text NOT NULL DEFAULT 'EMITIDO',
  emitido_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  regra_origem text,
  resgatado_em timestamptz,
  staff_id text,
  ponto_id text,
  canal text NOT NULL DEFAULT 'online',
  motivo_anulacao text
);
CREATE INDEX idx_codigo_player ON public.codigo (player_id, data);
CREATE INDEX idx_codigo_estado ON public.codigo (data, estado);

CREATE TABLE public.regra (
  id bigserial PRIMARY KEY,
  prioridade int NOT NULL,
  nome text NOT NULL,
  modo text NOT NULL DEFAULT 'segmento',
  condicao_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  classe_id text NOT NULL REFERENCES public.classe_recompensa(id),
  peso int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criada_por text
);

CREATE TABLE public.concessao_manual (
  id bigserial PRIMARY KEY,
  player_id text NOT NULL,
  classe_id text NOT NULL REFERENCES public.classe_recompensa(id),
  motivo text NOT NULL,
  autorizado_por text NOT NULL,
  criada_em timestamptz NOT NULL DEFAULT now(),
  consumida boolean NOT NULL DEFAULT false
);

CREATE TABLE public.staff (
  id text PRIMARY KEY,
  nome text NOT NULL,
  perfil text NOT NULL DEFAULT 'ponto',
  pontos_autorizados jsonb NOT NULL,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  pin_rodado_em timestamptz NOT NULL DEFAULT now(),
  erros_pin int NOT NULL DEFAULT 0,
  primeiro_erro_ts timestamptz,
  bloqueado_ate timestamptz,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.log_resgate (
  id bigserial PRIMARY KEY,
  codigo text,
  acao text NOT NULL,
  staff_id text,
  ponto_id text,
  ts_servidor timestamptz NOT NULL DEFAULT now(),
  ts_cliente timestamptz,
  ip text,
  resultado text NOT NULL,
  detalhe text
);

CREATE TABLE public.idempotencia (
  chave text PRIMARY KEY,
  resposta_json jsonb NOT NULL,
  criada_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.config (
  chave text PRIMARY KEY,
  valor text NOT NULL
);

GRANT ALL ON public.classe_recompensa TO service_role;
GRANT ALL ON public.cifra_diaria TO service_role;
GRANT ALL ON public.pool_dia TO service_role;
GRANT ALL ON public.serie_retirada TO service_role;
GRANT ALL ON public.jogador TO service_role;
GRANT ALL ON public.codigo TO service_role;
GRANT ALL ON public.regra TO service_role;
GRANT ALL ON public.concessao_manual TO service_role;
GRANT ALL ON public.staff TO service_role;
GRANT ALL ON public.log_resgate TO service_role;
GRANT ALL ON public.idempotencia TO service_role;
GRANT ALL ON public.config TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER TABLE public.classe_recompensa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cifra_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serie_retirada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concessao_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_resgate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.app_reservar_capacidade(
  p_data date, p_classe text, p_quota int, p_custo numeric
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.pool_dia
     SET emitidos = emitidos + 1,
         gasto_orcamento = gasto_orcamento + p_custo
   WHERE data = p_data AND classe_id = p_classe
     AND pausado = false
     AND (teto IS NULL OR emitidos < LEAST(teto, COALESCE(p_quota, teto)))
     AND (teto_orcamento IS NULL OR gasto_orcamento + p_custo <= teto_orcamento);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END; $$;

CREATE OR REPLACE FUNCTION public.app_transicao_resgate(
  p_codigo text, p_staff text, p_ponto text, p_canal text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; v_data date; v_classe text; v_serie text;
BEGIN
  UPDATE public.codigo
     SET estado = 'RESGATADO', resgatado_em = now(), staff_id = p_staff,
         ponto_id = p_ponto, canal = COALESCE(p_canal, canal)
   WHERE codigo = p_codigo AND estado IN ('EMITIDO', 'PENDENTE_SYNC')
   RETURNING data, classe_id, serie INTO v_data, v_classe, v_serie;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RETURN false; END IF;
  UPDATE public.pool_dia SET resgatados = resgatados + 1
   WHERE data = v_data AND classe_id = v_classe;
  INSERT INTO public.serie_retirada (serie) VALUES (v_serie) ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.app_reservar_capacidade(date, text, int, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_transicao_resgate(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_reservar_capacidade(date, text, int, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.app_transicao_resgate(text, text, text, text) TO service_role;

INSERT INTO public.classe_recompensa
 (id, nome_interno, nome_revelado, categoria, nivel, ponto_resgate, ponto_resgate_label,
  teto_diario, teto_orcamento_dia, custo_unitario, valor_percebido, quota_horaria_json)
VALUES
 ('FURA_FILA','Fura-fila','Fura-fila · próxima atração','best',3,'ATR','Atração',120,NULL,0,159.9,'[{"de":"10:00","ate":"12:00","pct":20},{"de":"12:00","ate":"14:00","pct":25},{"de":"14:00","ate":"16:00","pct":25},{"de":"16:00","ate":"18:00","pct":20},{"de":"18:00","ate":"23:59","pct":10}]'::jsonb),
 ('EXTRA_RIDE','Extra ride','Extra ride · mesma atração','best',3,'ATR','Atração',80,NULL,0,159.9,'[{"de":"10:00","ate":"12:00","pct":20},{"de":"12:00","ate":"14:00","pct":25},{"de":"14:00","ate":"16:00","pct":25},{"de":"16:00","ate":"18:00","pct":20},{"de":"18:00","ate":"23:59","pct":10}]'::jsonb),
 ('FOTO','Foto profissional','Foto profissional no ponto','mid',3,'FOTO','Ponto de foto',60,NULL,29.9,50.0,'[{"de":"10:00","ate":"12:00","pct":20},{"de":"12:00","ate":"14:00","pct":25},{"de":"14:00","ate":"16:00","pct":25},{"de":"16:00","ate":"18:00","pct":20},{"de":"18:00","ate":"23:59","pct":10}]'::jsonb),
 ('MID_ACAI','Mid win · açaí','Mid win · açaí ou gelaboca','mid',3,'FNB','Quiosque F&B',NULL,900,18.0,18.0,NULL),
 ('MID_LANCHE','Mid win · lanche','Mid win · pipoca ou combo de lanche','mid',3,'FNB','Quiosque F&B',NULL,600,46.0,46.0,NULL),
 ('BEST_AVENTURA','Best win · aventura','Best win · tirolesa, airsoft ou VR','best',3,'ATR_PAGA','Atração paga',40,NULL,69.95,210.0,'[{"de":"10:00","ate":"12:00","pct":20},{"de":"12:00","ate":"14:00","pct":25},{"de":"14:00","ate":"16:00","pct":25},{"de":"16:00","ate":"18:00","pct":20},{"de":"18:00","ate":"23:59","pct":10}]'::jsonb),
 ('SMALL_KAMINDA','Small win · Kaminda','Small win · jogos de Kaminda','small',2,'BALCAO_JOGOS','Balcão dos jogos',500,NULL,16.97,16.97,NULL),
 ('CERTIFICADO','Certificado T25','Certificado Hariador T25 + maquiagem HH','small',2,'LOJA','Loja',NULL,NULL,5.0,24.88,NULL),
 ('VIP_TOPO','Experiência VIP','Experiência VIP · cortesia ou annuali','best_topo',4,'SUPERVISAO','Supervisão',1,NULL,309.52,309.52,NULL);

INSERT INTO public.regra (prioridade, nome, modo, condicao_json, classe_id, peso, criada_por) VALUES
 (10,'Top 50 do dia + álbum → Fura-fila (11h–16h)','segmento','{"album_completo":true,"ranking_dia_max":50,"hora_min":11,"hora_max":16}'::jsonb,'FURA_FILA',0,'seed'),
 (20,'Top 80 do dia + álbum → Extra ride','segmento','{"album_completo":true,"ranking_dia_max":80}'::jsonb,'EXTRA_RIDE',0,'seed'),
 (30,'Topo do ranking global → Experiência VIP','segmento','{"ranking_global_max":1}'::jsonb,'VIP_TOPO',0,'seed'),
 (40,'Álbum completo → Certificado + brinde','segmento','{"album_completo":true,"sem_codigo_da_classe_hoje":true}'::jsonb,'CERTIFICADO',0,'seed'),
 (100,'Sorteio · small win Kaminda','sorteio','{}'::jsonb,'SMALL_KAMINDA',60,'seed'),
 (110,'Sorteio · foto profissional','sorteio','{"album_completo":true}'::jsonb,'FOTO',30,'seed'),
 (120,'Sorteio · mid win açaí','sorteio','{}'::jsonb,'MID_ACAI',20,'seed'),
 (130,'Sorteio · mid win lanche','sorteio','{}'::jsonb,'MID_LANCHE',15,'seed');

INSERT INTO public.staff (id, nome, perfil, pontos_autorizados, pin_hash, pin_salt) VALUES
 ('S-114','Carlos M.','ponto','["ATR"]'::jsonb, encode(digest('a1b2c3d4:4114','sha256'),'hex'),'a1b2c3d4'),
 ('S-097','Ana P.','ponto','["ATR"]'::jsonb, encode(digest('b2c3d4e5:4097','sha256'),'hex'),'b2c3d4e5'),
 ('S-201','Rafa L.','ponto','["FNB"]'::jsonb, encode(digest('c3d4e5f6:4201','sha256'),'hex'),'c3d4e5f6'),
 ('S-305','Bia T.','ponto','["LOJA","BALCAO_JOGOS"]'::jsonb, encode(digest('d4e5f607:4305','sha256'),'hex'),'d4e5f607'),
 ('S-402','Diego F.','ponto','["FOTO","ATR_PAGA"]'::jsonb, encode(digest('e5f60718:4402','sha256'),'hex'),'e5f60718'),
 ('SUP-01','Paula R.','supervisor','["ATR","ATR_PAGA","FNB","LOJA","BALCAO_JOGOS","FOTO","SUPERVISAO"]'::jsonb, encode(digest('f6071829:9001','sha256'),'hex'),'f6071829');

INSERT INTO public.jogador (id, nome, cartas, album_completo, pontos, posicao_ranking_dia, posicao_ranking_global, passe_anual, primeira_visita) VALUES
 ('HR-018342','Marina S.',6,true,5850,12,40,false,false),
 ('HR-004521','João V.',6,true,5320,34,122,true,false),
 ('HR-022108','Lucas T.',6,true,4980,61,240,false,true),
 ('HR-031277','Sofia B.',3,false,2100,310,1250,false,true),
 ('HR-000001','Pedro K.',6,true,9990,1,1,true,false);

INSERT INTO public.config (chave, valor) VALUES
 ('parque_abre','10:00'), ('parque_fecha','21:00'),
 ('prefixo_temporada','H25'), ('fator_emissao','1.0');
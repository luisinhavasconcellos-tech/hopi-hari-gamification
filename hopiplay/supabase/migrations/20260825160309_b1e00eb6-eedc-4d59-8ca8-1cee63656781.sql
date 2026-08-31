UPDATE public.classe_recompensa SET janela_uso_inicio = '10:00', janela_uso_fim = '19:30' WHERE id IN ('EXTRA_RIDE','FURA_FILA','BEST_AVENTURA');
UPDATE public.classe_recompensa SET janela_uso_inicio = '10:00', janela_uso_fim = '20:00' WHERE id IN ('FOTO','SMALL_KAMINDA');
UPDATE public.classe_recompensa SET janela_uso_inicio = '10:00', janela_uso_fim = '20:45' WHERE id IN ('MID_ACAI','MID_LANCHE','CERTIFICADO');
INSERT INTO public.config (chave, valor) VALUES ('margem_janela_min','20')
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;
CREATE TABLE public.alternativa_janela (
  id bigserial PRIMARY KEY,
  classe_fechada text NOT NULL REFERENCES public.classe_recompensa(id) ON DELETE CASCADE,
  classe_alternativa text NOT NULL REFERENCES public.classe_recompensa(id) ON DELETE CASCADE,
  prioridade integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classe_fechada, classe_alternativa)
);

GRANT ALL ON public.alternativa_janela TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.alternativa_janela_id_seq TO service_role;

ALTER TABLE public.alternativa_janela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alternativa_janela_service_role" ON public.alternativa_janela FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_alternativa_janela_updated_at
BEFORE UPDATE ON public.alternativa_janela
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.config (chave, valor)
VALUES ('alternativas_auto', 'true')
ON CONFLICT (chave) DO NOTHING;
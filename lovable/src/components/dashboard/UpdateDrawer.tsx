import { useEffect, useState } from 'react';
import { DashState } from '@/lib/dashboardData';

interface Props {
  open: boolean;
  state: DashState;
  onSave: (next: DashState) => void;
  onReset: () => void;
  onClose: () => void;
}

// Gaveta de atualização diária — só preencher e salvar; o painel recalcula tudo.
export default function UpdateDrawer({ open, state, onSave, onReset, onClose }: Props) {
  const [form, setForm] = useState({
    refDate: state.refDate,
    realizado: String(state.realizado),
    metaGeral: String(state.metaGeral),
    realizado25: String(state.realizado25),
    site: String(state.site),
    metaSite: String(state.metaSite),
    site25: String(state.site25),
    parcialPct: String(state.parcialPct),
  });

  useEffect(() => {
    if (open) {
      setForm({
        refDate: state.refDate,
        realizado: String(state.realizado),
        metaGeral: String(state.metaGeral),
        realizado25: String(state.realizado25),
        site: String(state.site),
        metaSite: String(state.metaSite),
        site25: String(state.site25),
        parcialPct: String(state.parcialPct),
      });
    }
  }, [open, state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const num = (v: string, fallback: number) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const save = () => {
    const next: DashState = {
      ...state,
      refDate: form.refDate || state.refDate,
      realizado: num(form.realizado, state.realizado),
      metaGeral: num(form.metaGeral, state.metaGeral),
      realizado25: num(form.realizado25, state.realizado25),
      site: num(form.site, state.site),
      metaSite: num(form.metaSite, state.metaSite),
      site25: num(form.site25, state.site25),
      parcialPct: num(form.parcialPct, state.parcialPct),
    };
    // mantém a linha "Site" do quadro de canais em sincronia
    next.canais = next.canais.map((c) =>
      c.n === 'Site'
        ? { ...c, r: next.site, m: next.metaSite, yoy: Math.round((next.site / next.site25 - 1) * 100) }
        : c
    );
    onSave(next);
  };

  const field = (label: string, key: keyof typeof form, type: 'text' | 'number' = 'number') => (
    <div className="field">
      <label htmlFor={`in-${key}`}>{label}</label>
      <input
        id={`in-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <aside className={`drawer${open ? ' open' : ''}`} aria-label="Atualização diária de dados" aria-hidden={!open}>
      <h2>Atualização diária</h2>
      <p className="hint">Só preencher e salvar — o painel recalcula tudo sozinho. Os dados ficam guardados neste navegador.</p>
      {field('Dados até (ex.: 24/08)', 'refDate', 'text')}
      <div className="sec">Total do parque</div>
      {field('Realizado acumulado (R$)', 'realizado')}
      {field('Meta Geral do mês (R$)', 'metaGeral')}
      {field('Realizado mesmo período 25 (R$)', 'realizado25')}
      <div className="sec">Canal Site (Marketing)</div>
      {field('Realizado site (R$)', 'site')}
      {field('Meta Site (R$)', 'metaSite')}
      {field('Site mesmo período 25 (R$)', 'site25')}
      <div className="sec">Ritmo</div>
      {field('Parcial esperada até a data — % da meta', 'parcialPct')}
      <div className="btns">
        <button className="btn primary" onClick={save}>Salvar</button>
        <button className="btn ghost" onClick={onReset}>Restaurar padrão</button>
      </div>
    </aside>
  );
}

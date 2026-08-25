import '@/styles/hopi-brand.css';

// Página de referência do branding — cole no Lovable para conferir a
// identidade aplicada e usar como fonte de verdade ao criar telas novas.
export default function BrandShowcase() {
  return (
    <div className="hh-brand" style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 24 }}>

        <header>
          <span className="hh-kicker">Identidade visual</span>
          <h1 style={{ fontSize: 40, lineHeight: 1.06, margin: '10px 0 8px' }}>Hopi Hari</h1>
          <p style={{ color: 'var(--hh-ink-dim)', fontSize: 15, lineHeight: 1.55 }}>
            Azul royal + verde Hopi, CTAs em pílula amarela, superfícies brancas,
            tipografia bold arredondada e cantos generosos.
          </p>
        </header>

        <section className="hh-hero">
          <span className="hh-kicker">Faixa hero</span>
          <h2 style={{ fontSize: 26, margin: '8px 0' }}>Gradiente azul assinatura</h2>
          <p style={{ opacity: 0.85, fontSize: 14 }}>Para cabeçalhos de página e destaques.</p>
        </section>

        <section className="hh-card">
          <span className="hh-kicker">Botões</span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
            <button className="hh-btn-primary">Garanta seu ingresso</button>
            <button className="hh-btn-secondary">Saiba mais</button>
            <button className="hh-btn-ghost" style={{ color: 'var(--hh-blue)' }}>Ver detalhes →</button>
          </div>
        </section>

        <section className="hh-card">
          <span className="hh-kicker">Chips</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <span className="hh-chip">🪙 120 Hari Coins</span>
            <span className="hh-chip green">✓ Missão completa</span>
            <span className="hh-chip blue">Novidade</span>
            <span className="hh-chip soft">Zona Aribabiba</span>
          </div>
        </section>

        <section className="hh-card">
          <span className="hh-kicker">Progresso</span>
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            <div className="hh-progress"><div className="hh-progress-fill" style={{ width: '68%' }} /></div>
            <div className="hh-progress slim"><div className="hh-progress-fill yellow" style={{ width: '45%' }} /></div>
            <div className="hh-progress slim"><div className="hh-progress-fill blue" style={{ width: '82%' }} /></div>
          </div>
        </section>

        <section className="hh-card">
          <span className="hh-kicker">Paleta</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
            {[
              ['Azul royal', '#1c3eb8', '#fff'],
              ['Azul vivo', '#2b57e0', '#fff'],
              ['Azul profundo', '#122a80', '#fff'],
              ['Verde Hopi', '#62bb46', '#fff'],
              ['Amarelo Hopi', '#ffc72c', '#122a80'],
              ['Vermelho', '#e84b3c', '#fff'],
              ['Tinta', '#122456', '#fff'],
              ['Fundo', '#f2f6ff', '#122456'],
            ].map(([name, hex, fg]) => (
              <div key={hex} style={{ background: hex, color: fg, borderRadius: 12, padding: '18px 12px', border: '1px solid var(--hh-line)' }}>
                <strong style={{ display: 'block', fontSize: 13 }}>{name}</strong>
                <code style={{ fontSize: 11.5, opacity: 0.8 }}>{hex}</code>
              </div>
            ))}
          </div>
        </section>

        <section className="hh-brand hh-horror hh-card" style={{ borderRadius: 18, padding: 24 }}>
          <span className="hh-kicker">Hora do Horror</span>
          <h2 style={{ fontSize: 24, margin: '8px 0', color: 'var(--hh-horror-gold)' }}>Variante sazonal</h2>
          <p style={{ fontSize: 14, opacity: 0.85 }}>
            Roxo profundo + dourado + laranja, para campanhas da temporada.
          </p>
        </section>

      </div>
    </div>
  );
}

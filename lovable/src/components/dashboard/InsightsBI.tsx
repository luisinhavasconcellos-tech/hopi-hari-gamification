import { Derived, pct } from '@/lib/dashboardData';

// Leituras de BI sobre o comportamento do visitante HH.
export default function InsightsBI({ d }: { d: Derived }) {
  return (
    <section>
      <div className="kicker">Leitura de BI · comportamento do visitante</div>
      <div className="insights">
        <div className="panel insight">
          <div className="t" style={{ color: 'var(--cyan)' }}>O visitante compra digital</div>
          <p>
            O site cresce <b>+53% vs 25</b> e já responde por <b>{pct(d.shareExterno)}</b> de todas as vendas
            externas — a principal porta de entrada do parque. A demanda gerada pelo Marketing sustenta o
            funil enquanto canais tradicionais encolhem.
          </p>
        </div>
        <div className="panel insight amber">
          <div className="t" style={{ color: 'var(--amber)' }}>Celebração puxa receita</div>
          <p>
            <b>Eventos/Hopi Niver: +107% YoY</b> e a única linha do parque acima de 100% da parcial. O
            consumidor HH busca ocasião e experiência — mesmo padrão dos perfis Família Aventureira e
            Conquistador Radical do programa de gamificação.
          </p>
        </div>
        <div className="panel insight green">
          <div className="t" style={{ color: 'var(--green)' }}>Migração de canal em curso</div>
          <p>
            Bilheteria <b>−47%</b>, telemarketing <b>−24%</b>, turismo <b>−53%</b>: a compra migrou para o
            digital e para a antecipação. Cada real que sai do balcão precisa ser recapturado no site — e
            está sendo.
          </p>
        </div>
      </div>
    </section>
  );
}

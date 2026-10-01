import type { TurmaId } from "./data";
// STUB — replaced by the Mapa da Turma implementation.
export function TurmaMap({ onBack }: { onBack: () => void; onHunt: (id: TurmaId) => void }) {
  return <div className="screen"><button onClick={onBack}>Voltar</button></div>;
}

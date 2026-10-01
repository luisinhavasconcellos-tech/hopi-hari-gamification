import type { TurmaId } from "./data";
// STUB — replaced by the Caça à Turma implementation.
export function TurmaHunt({ onBack }: { onBack: () => void; startWith?: TurmaId; onTakeHome: (id: TurmaId) => void }) {
  return <div className="screen"><button onClick={onBack}>Voltar</button></div>;
}

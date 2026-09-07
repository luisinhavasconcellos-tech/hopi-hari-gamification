// Hopi Hari — formatadores compartilhados.
// Os dados de Audience Intelligence vêm do backend (Lovable Cloud).
// Nenhum mock é mantido aqui — páginas sem dados mostram <EmptyState />.

export function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatNumber(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

export function formatPct(v: number, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

/** Mapa oficial DDD → UF (Anatel). Usado para cruzar filtros de telefone com geografia. */
export const DDD_TO_UF: Record<string, string> = {
  "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP", "16": "SP", "17": "SP", "18": "SP", "19": "SP",
  "21": "RJ", "22": "RJ", "24": "RJ",
  "27": "ES", "28": "ES",
  "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG", "37": "MG", "38": "MG",
  "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
  "47": "SC", "48": "SC", "49": "SC",
  "51": "RS", "53": "RS", "54": "RS", "55": "RS",
  "61": "DF",
  "62": "GO", "64": "GO",
  "63": "TO",
  "65": "MT", "66": "MT",
  "67": "MS",
  "68": "AC",
  "69": "RO",
  "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA",
  "79": "SE",
  "81": "PE", "87": "PE",
  "82": "AL",
  "83": "PB",
  "84": "RN",
  "85": "CE", "88": "CE",
  "86": "PI", "89": "PI",
  "91": "PA", "93": "PA", "94": "PA",
  "92": "AM", "97": "AM",
  "95": "RR",
  "96": "AP",
  "98": "MA", "99": "MA",
};

/**
 * Extrai o DDD (2 dígitos) de um DDD solto ("11", "011", "(11)") ou de um
 * telefone completo ("11987654321", "+55 11 98765-4321", "0 11 ...").
 * Retorna null quando não há dígitos suficientes.
 */
export const normalizeDdd = (key: string | null | undefined): string | null => {
  let digits = (key ?? "").replace(/\D/g, "");
  if (!digits) return null;
  // código do país só faz sentido em número completo (55 + DDD + 8/9 dígitos)
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  // prefixo de operadora / zero à esquerda ("011", "0xx11...")
  while (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 1) digits = digits.padStart(2, "0");
  if (digits.length < 2) return null;
  return digits.slice(0, 2);
};

export const dddUf = (key: string | null | undefined): string | null => {
  const ddd = normalizeDdd(key);
  return ddd ? DDD_TO_UF[ddd] ?? null : null;
};

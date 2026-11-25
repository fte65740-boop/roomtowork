const DIA_MS = 86_400_000;
export const LIMITE_DIAS = 28;

export function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function dataISO(data) {
  return data.toISOString().slice(0, 10);
}

export function lerData(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor ?? '')) return null;
  const data = new Date(`${valor}T00:00:00Z`);
  return Number.isFinite(data.getTime()) && dataISO(data) === valor ? data : null;
}

export function quantidadeDias(inicio, fim) {
  const primeira = lerData(inicio);
  const ultima = lerData(fim);
  return primeira && ultima ? (ultima - primeira) / DIA_MS + 1 : 0;
}

export function periodoValido(inicio, fim) {
  const dias = quantidadeDias(inicio, fim);
  return inicio >= hojeEmSaoPaulo() && dias >= 1 && dias <= LIMITE_DIAS;
}

const dataBR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
export const dataTexto = iso => dataBR.format(lerData(iso));
export const periodoTexto = (inicio, fim) => inicio === fim
  ? dataTexto(inicio)
  : `${dataTexto(inicio)} a ${dataTexto(fim)}`;

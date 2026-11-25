import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function inicializar() {
  if (!url || !chave) return null;
  try {
    return createClient(url, chave);
  } catch {
    return null;
  }
}

export const supabase = inicializar();
export const mensagemConfiguracao = 'Conecte o Supabase para acessar contas, anúncios e reservas.';

export function clienteSupabase() {
  if (!supabase) throw new Error(mensagemConfiguracao);
  return supabase;
}

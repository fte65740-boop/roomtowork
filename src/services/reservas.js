import { clienteSupabase } from '../lib/supabase.js';

export async function consultarOcupacao(sala, inicio, fim) {
  const { data, error } = await clienteSupabase().rpc('periodos_ocupados', {
    p_sala: sala, p_inicio: inicio, p_fim: fim,
  });
  if (error) throw error;
  return data;
}

export async function confirmarReserva({ id, sala, inicio, fim, metodo, precoCentavos }) {
  const { data, error, status } = await clienteSupabase().rpc('criar_reserva', {
    p_id: id,
    p_sala: sala,
    p_inicio: inicio,
    p_fim: fim,
    p_metodo: metodo,
    p_preco_centavos: precoCentavos,
  }).select('id, inicio, fim, total_centavos').single();
  if (!error) return data;
  if (['23P01', '22023', 'P0002'].includes(error.code)) throw new Error(error.message);
  if (error.code === '42501' || status === 401) {
    throw new Error('Sua sessão expirou. Entre na sua conta e tente novamente.');
  }
  throw new Error('Não foi possível confirmar a reserva. Confira a conexão e tente novamente.');
}

export async function listarReservas() {
  const { data, error } = await clienteSupabase().from('reservas')
    .select('id, inicio, fim, total_centavos, metodo, salas(id, titulo)')
    .order('criada_em', { ascending: false });
  if (error) throw error;
  return data;
}

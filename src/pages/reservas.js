import { exigirUsuario } from '../lib/auth.js';
import { periodoTexto } from '../lib/datas.js';
import { mensagemConfiguracao, supabase } from '../lib/supabase.js';
import { elemento, inicioMenu, moeda, porId, rotulosMetodo } from '../lib/ui.js';
import { listarReservas } from '../services/reservas.js';
import { linkSala } from '../services/salas.js';

const mensagem = porId('mensagem');

function exibirReserva(reserva) {
  const item = elemento('li', 'painel');
  const titulo = elemento('h3');
  const link = elemento('a', '', reserva.salas.titulo);
  link.href = linkSala(reserva.salas.id);
  titulo.append(link);
  item.append(
    titulo,
    elemento('p', '', periodoTexto(reserva.inicio, reserva.fim)),
    elemento('p', '', `${moeda(reserva.total_centavos)} · ${rotulosMetodo[reserva.metodo]} simulado`),
    elemento('p', 'codigo-reserva', `Código: ${reserva.id}`),
  );
  return item;
}

inicioMenu();
if (!supabase) {
  mensagem.textContent = mensagemConfiguracao;
} else {
  try {
    if (await exigirUsuario()) {
      const sair = porId('sair');
      sair.hidden = false;
      sair.addEventListener('click', async evento => {
        evento.preventDefault();
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (!error) location.replace('/');
        else {
          mensagem.hidden = false;
          mensagem.textContent = 'Não foi possível sair. Tente novamente.';
        }
      });
      const reservas = await listarReservas();
      porId('reservas').append(...reservas.map(exibirReserva));
      mensagem.textContent = 'Você ainda não tem reservas.';
      mensagem.hidden = reservas.length > 0;
    }
  } catch {
    mensagem.textContent = 'Não foi possível carregar suas reservas. Atualize a página para tentar novamente.';
  }
}

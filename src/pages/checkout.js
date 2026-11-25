import { linkLogin, linksConta, usuarioAtual } from '../lib/auth.js';
import { periodoTexto, periodoValido, quantidadeDias } from '../lib/datas.js';
import { mensagemConfiguracao, supabase } from '../lib/supabase.js';
import { inicioMenu, moeda, porId } from '../lib/ui.js';
import { confirmarReserva } from '../services/reservas.js';
import { buscarSala, linkSala, localSala, urlFoto } from '../services/salas.js';

const form = porId('formReserva');
const estado = porId('estado');
const mensagem = porId('mensagem');
const botao = porId('confirmar');
const params = new URLSearchParams(location.search);
const inicio = params.get('inicio');
const fim = params.get('fim');

function preencher(sala) {
  const dias = quantidadeDias(inicio, fim);
  porId('foto').src = urlFoto(sala);
  porId('foto').alt = sala.titulo;
  porId('nome').textContent = sala.titulo;
  porId('local').textContent = localSala(sala);
  porId('capacidade').textContent = `${sala.capacidade} pessoa(s)`;
  porId('tomadas').textContent = sala.tomadas;
  porId('mesas').textContent = sala.mesas;
  porId('periodo').textContent = dias > 0 ? periodoTexto(inicio, fim) : '—';
  porId('calculo').textContent = dias > 0 ? `${moeda(sala.preco_centavos)} × ${dias} dia(s)` : '';
  porId('total').textContent = dias > 0 ? moeda(sala.preco_centavos * dias) : '—';
  porId('voltar').href = linkSala(sala.id);
  porId('checkout').hidden = false;
  estado.hidden = true;
}

async function prepararFormulario(sala) {
  if (!periodoValido(inicio, fim)) {
    mensagem.textContent = 'Volte para o espaço e escolha um período válido de 1 a 28 dias.';
    return;
  }
  if (!supabase) {
    mensagem.textContent = mensagemConfiguracao;
    return;
  }
  const usuario = await usuarioAtual();
  if (!usuario) {
    const entrar = porId('entrar');
    entrar.href = linkLogin();
    entrar.hidden = false;
    botao.hidden = true;
    return;
  }
  botao.disabled = false;

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const metodo = new FormData(form).get('metodo');
    const chave = `room2work:reserva:${usuario.id}:${sala.id}:${inicio}:${fim}:${metodo}:${sala.preco_centavos}`;
    const id = sessionStorage.getItem(chave) ?? crypto.randomUUID();
    sessionStorage.setItem(chave, id);
    botao.disabled = true;
    mensagem.textContent = 'Confirmando reserva…';
    try {
      const reserva = await confirmarReserva({
        id, sala: sala.id, inicio, fim, metodo, precoCentavos: sala.preco_centavos,
      });
      sessionStorage.removeItem(chave);
      mensagem.textContent = 'Reserva confirmada.';
      porId('detalhesConf').textContent = `${sala.titulo} · ${periodoTexto(reserva.inicio, reserva.fim)} · ${moeda(reserva.total_centavos)}`;
      porId('codigo').textContent = `Código: ${reserva.id}`;
      porId('confirmacao').showModal();
    } catch (erro) {
      mensagem.textContent = erro.message;
      botao.disabled = false;
    }
  });
}

inicioMenu();
linksConta();
try {
  const sala = await buscarSala(params.get('id'));
  if (!sala) {
    estado.textContent = 'Escolha um espaço no catálogo antes de reservar.';
  } else {
    preencher(sala);
    await prepararFormulario(sala);
  }
} catch {
  const aviso = estado.hidden ? mensagem : estado;
  aviso.textContent = 'Não foi possível preparar a reserva. Atualize a página para tentar novamente.';
}

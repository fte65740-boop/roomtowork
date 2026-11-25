import { linksConta } from '../lib/auth.js';
import { dataISO, dataTexto, hojeEmSaoPaulo, lerData, LIMITE_DIAS, periodoTexto, quantidadeDias } from '../lib/datas.js';
import { supabase } from '../lib/supabase.js';
import { elemento, inicioMenu, moeda, porId } from '../lib/ui.js';
import { consultarOcupacao } from '../services/reservas.js';
import { buscarSala, localSala, urlFoto } from '../services/salas.js';

function montarGaleria(sala) {
  const principal = porId('imagemPrincipal');
  const galeria = principal.parentElement;
  const miniaturas = porId('miniaturas');
  const botoes = [];

  function selecionar(indice) {
    principal.src = urlFoto(sala, sala.fotos[indice]);
    principal.alt = `${sala.titulo} · foto ${indice + 1}`;
    galeria.style.backgroundImage = `url("${principal.src}")`;
    for (const [posicao, botao] of botoes.entries()) {
      botao.setAttribute('aria-pressed', String(posicao === indice));
    }
  }

  if (sala.fotos.length > 1) {
    for (const [indice, caminho] of sala.fotos.entries()) {
      const botao = elemento('button');
      const img = elemento('img');
      img.src = urlFoto(sala, caminho);
      img.alt = '';
      botao.type = 'button';
      botao.setAttribute('aria-label', `Exibir foto ${indice + 1}`);
      botao.append(img);
      botao.addEventListener('click', () => selecionar(indice));
      botoes.push(botao);
    }
    miniaturas.append(...botoes);
  }
  selecionar(0);
  galeria.addEventListener('mousemove', evento => {
    const area = galeria.getBoundingClientRect();
    galeria.style.backgroundPosition = `${(evento.clientX - area.left) / area.width * 100}% ${(evento.clientY - area.top) / area.height * 100}%`;
    galeria.classList.add('zoom-ativo');
  });
  galeria.addEventListener('mouseleave', () => galeria.classList.remove('zoom-ativo'));
}

function montarCalendario(sala) {
  const seletor = porId('seletorDataInput');
  const popup = porId('calendarioPopup');
  const grid = porId('calendarioGrid');
  const texto = porId('textoData');
  const info = porId('calendarioInfo');
  const continuar = porId('continuar');
  const hoje = hojeEmSaoPaulo();
  const mes = lerData(hoje);
  const rotuloMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  mes.setUTCDate(1);
  let inicio = null;
  let fim = null;
  let ocupados = [];
  let carregando = false;
  let indisponivel = false;
  let consultaMes = 0;
  let selecao = 0;

  function abrir(aberto) {
    popup.classList.toggle('aberto', aberto);
    seletor.setAttribute('aria-expanded', String(aberto));
  }

  function desenhar() {
    const foco = grid.contains(document.activeElement) ? document.activeElement.dataset.dia : null;
    porId('mesAtualLabel').textContent = rotuloMes.format(mes);
    porId('mesAnterior').disabled = dataISO(mes).slice(0, 7) <= hoje.slice(0, 7);
    const dias = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() + 1, 0)).getUTCDate();
    const fragmento = document.createDocumentFragment();
    for (let indice = 0; indice < mes.getUTCDay(); indice += 1) {
      fragmento.append(elemento('span', 'vazio'));
    }
    for (let dia = 1; dia <= dias; dia += 1) {
      const iso = `${dataISO(mes).slice(0, 7)}-${String(dia).padStart(2, '0')}`;
      const ocupado = ocupados.some(periodo => periodo.inicio <= iso && periodo.fim >= iso);
      const botao = elemento('button', '', String(dia));
      botao.type = 'button';
      botao.dataset.dia = iso;
      botao.disabled = carregando || indisponivel || ocupado || iso < hoje;
      botao.setAttribute('aria-label', ocupado ? `${dataTexto(iso)} · ocupado` : dataTexto(iso));
      botao.setAttribute('aria-pressed', String(iso === inicio || iso === fim));
      botao.classList.toggle('dia-inicio', iso === inicio);
      botao.classList.toggle('dia-fim', iso === fim);
      botao.classList.toggle('dia-unico', iso === inicio && (!fim || inicio === fim));
      botao.classList.toggle('no-intervalo', Boolean(inicio && fim && iso > inicio && iso < fim));
      botao.addEventListener('click', evento => {
        evento.stopPropagation();
        selecionar(iso);
      });
      fragmento.append(botao);
    }
    grid.replaceChildren(fragmento);
    if (foco) grid.querySelector(`[data-dia="${foco}"]:enabled`)?.focus({ preventScroll: true });
  }

  async function carregarMes() {
    const consulta = ++consultaMes;
    ocupados = [];
    indisponivel = false;
    carregando = Boolean(supabase);
    desenhar();
    if (!supabase) return;
    const ultimo = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() + 1, 0));
    try {
      const resultado = await consultarOcupacao(sala.id, dataISO(mes), dataISO(ultimo));
      if (consulta === consultaMes) ocupados = resultado;
    } catch {
      if (consulta === consultaMes) indisponivel = true;
    } finally {
      if (consulta === consultaMes) {
        carregando = false;
        if (indisponivel) info.textContent = 'A disponibilidade está indisponível. Tente abrir o calendário novamente.';
        desenhar();
      }
    }
  }

  async function selecionar(iso) {
    const tentativa = ++selecao;
    if (!inicio || fim || iso < inicio) {
      inicio = iso;
      fim = null;
      continuar.disabled = true;
      texto.textContent = `${dataTexto(inicio)} — …`;
      info.textContent = 'Selecione a data de término.';
      desenhar();
      return;
    }
    const dias = quantidadeDias(inicio, iso);
    if (dias > LIMITE_DIAS) {
      info.textContent = `Selecione no máximo ${LIMITE_DIAS} dias.`;
      return;
    }
    if (supabase) {
      info.textContent = 'Verificando período…';
      try {
        const conflitos = await consultarOcupacao(sala.id, inicio, iso);
        if (tentativa !== selecao) return;
        if (conflitos.length) {
          info.textContent = 'Há datas ocupadas no período escolhido.';
          return;
        }
      } catch {
        if (tentativa === selecao) info.textContent = 'Não foi possível verificar o período. Tente novamente.';
        return;
      }
    }
    fim = iso;
    texto.textContent = periodoTexto(inicio, fim);
    info.textContent = `${dias} dia(s) selecionado(s).`;
    continuar.disabled = false;
    desenhar();
    abrir(false);
    seletor.focus();
  }

  seletor.addEventListener('click', () => {
    const aberto = !popup.classList.contains('aberto');
    abrir(aberto);
    if (aberto && indisponivel) carregarMes();
  });
  document.addEventListener('click', evento => {
    if (!popup.contains(evento.target) && !seletor.contains(evento.target)) abrir(false);
  });
  popup.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') {
      abrir(false);
      seletor.focus();
    }
  });
  for (const [id, deslocamento] of [['mesAnterior', -1], ['proximoMes', 1]]) {
    porId(id).addEventListener('click', () => {
      mes.setUTCMonth(mes.getUTCMonth() + deslocamento);
      carregarMes();
    });
  }
  porId('limparDatas').addEventListener('click', () => {
    selecao += 1;
    inicio = fim = null;
    continuar.disabled = true;
    texto.textContent = 'Selecione as datas';
    info.textContent = 'Selecione a data de início.';
    desenhar();
  });
  continuar.addEventListener('click', async () => {
    if (!inicio || !fim) return;
    if (!supabase) {
      porId('avisoReserva').textContent = 'Não foi possível consultar o contato do anunciante.';
      return;
    }
    continuar.disabled = true;
    try {
      const { data: telefone, error } = await supabase.rpc('telefone_anuncio', { p_sala: sala.id });
      if (error) throw error;
      if (!telefone) {
        porId('avisoReserva').textContent = 'Este espaço ainda não possui um telefone de contato disponível.';
        return;
      }
      const mensagem = `Olá! Tenho interesse em reservar ${sala.titulo} no período de ${periodoTexto(inicio, fim)}. Podemos conversar?`;
      location.assign(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`);
    } catch {
      porId('avisoReserva').textContent = 'Não foi possível consultar o contato. Tente novamente.';
    } finally {
      continuar.disabled = false;
    }
  });
  carregarMes();
}

inicioMenu();
linksConta();
const estado = porId('estado');
try {
  const sala = await buscarSala(new URLSearchParams(location.search).get('id'));
  if (!sala) {
    estado.textContent = 'Espaço não encontrado.';
  } else {
    document.title = `${sala.titulo} — RoomToWORK`;
    porId('nomeSala').textContent = sala.titulo;
    porId('descricao').textContent = sala.descricao;
    porId('local').textContent = `Local: ${localSala(sala)}`;
    porId('capacidade').textContent = `Capacidade máxima: ${sala.capacidade}`;
    porId('tomadas').textContent = `Tomadas: ${sala.tomadas}`;
    porId('mesas').textContent = `Mesas: ${sala.mesas}`;
    porId('preco').textContent = moeda(sala.preco_centavos);
    if (!supabase) porId('avisoReserva').textContent = 'O envio de reservas fica disponível após a conexão com o Supabase.';
    montarGaleria(sala);
    montarCalendario(sala);
    estado.hidden = true;
    porId('sala').hidden = false;
  }
} catch {
  estado.textContent = 'Não foi possível carregar o espaço. Atualize a página para tentar novamente.';
}

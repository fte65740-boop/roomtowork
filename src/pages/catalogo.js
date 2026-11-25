import { linksConta } from '../lib/auth.js';
import { elemento, inicioMenu, moeda, porId, rotulosTipo } from '../lib/ui.js';
import { linkSala, listarSalas, localSala, urlFoto } from '../services/salas.js';

const catalogo = porId('catalogo');
const contagem = porId('contagem');
const preco = porId('precoRange');
const capacidade = porId('capRange');
const busca = porId('buscaTexto');
const chips = [...document.querySelectorAll('.chip')];
const tiposAtivos = new Set();
const precoMaximo = Number(preco.max);
let salas = [];

const normalizar = texto => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function cartao(sala) {
  const card = elemento('article', 'card');
  const foto = elemento('img', 'card-foto');
  foto.src = urlFoto(sala);
  foto.alt = sala.titulo;
  foto.loading = 'lazy';
  const corpo = elemento('div', 'card-corpo');
  const tags = elemento('div', 'card-tags');
  tags.append(elemento('span', '', rotulosTipo[sala.tipo]), elemento('span', '', `${sala.capacidade} pessoa(s)`));
  const rodape = elemento('div', 'card-rodape');
  const link = elemento('a', 'card-btn', 'Ver mais');
  link.href = linkSala(sala.id);
  link.setAttribute('aria-label', `Ver mais sobre ${sala.titulo}`);
  rodape.append(elemento('div', 'card-preco', `${moeda(sala.preco_centavos)}/dia`), link);
  corpo.append(elemento('h3', '', sala.titulo), elemento('div', 'card-local', `📍 ${localSala(sala)}`), tags, rodape);
  card.append(foto, corpo);
  return card;
}

function atualizar() {
  const texto = normalizar(busca.value.trim());
  const filtradas = salas.filter(sala => {
    return normalizar(`${sala.titulo} ${localSala(sala)}`).includes(texto)
      && (!tiposAtivos.size || tiposAtivos.has(sala.tipo))
      && sala.preco_centavos <= Number(preco.value) * 100
      && sala.capacidade >= Number(capacidade.value);
  });
  const resultado = filtradas.length
    ? filtradas.map(cartao)
    : [elemento('p', 'sem-resultado', 'Nenhum espaço encontrado com esses filtros.')];
  catalogo.replaceChildren(...resultado);
  contagem.textContent = `${filtradas.length} espaço(s) encontrado(s)`;
  porId('precoValor').textContent = moeda(Number(preco.value) * 100);
  porId('capValor').textContent = `${capacidade.value} pessoa${capacidade.value === '1' ? '' : 's'}`;
}

function iniciarFiltros() {
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const ativo = chip.classList.toggle('active');
      chip.setAttribute('aria-pressed', String(ativo));
      if (ativo) tiposAtivos.add(chip.dataset.tipo);
      else tiposAtivos.delete(chip.dataset.tipo);
      atualizar();
    });
  }
  for (const campo of [busca, preco, capacidade]) campo.addEventListener('input', atualizar);
  document.querySelector('.search-box button').addEventListener('click', atualizar);
  porId('limparFiltros').addEventListener('click', () => {
    tiposAtivos.clear();
    for (const chip of chips) {
      chip.classList.remove('active');
      chip.setAttribute('aria-pressed', 'false');
    }
    busca.value = '';
    preco.value = precoMaximo;
    capacidade.value = 1;
    atualizar();
  });
}

inicioMenu();
linksConta();
try {
  salas = await listarSalas();
  iniciarFiltros();
  atualizar();
} catch {
  contagem.textContent = 'Não foi possível carregar o catálogo. Atualize a página para tentar novamente.';
}

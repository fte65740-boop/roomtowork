export const porId = id => document.getElementById(id);

const real = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const moeda = centavos => real.format(centavos / 100);
export const rotulosTipo = {
  privativa: 'Sala privativa',
  compartilhada: 'Estação compartilhada',
  reuniao: 'Sala de reunião',
  estudio: 'Estúdio criativo',
};
export const rotulosMetodo = { credito: 'Crédito', debito: 'Débito', pix: 'Pix', boleto: 'Boleto' };

export function elemento(tag, classe, texto) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== undefined) node.textContent = texto;
  return node;
}

export function inicioMenu() {
  const botao = porId('menuToggle');
  if (!botao) return;
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', 'navLinks');
  botao.addEventListener('click', () => {
    const aberto = botao.classList.toggle('active');
    porId('navLinks').classList.toggle('open', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  });
}

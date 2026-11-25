import { porId } from './ui.js';

export const digitos = valor => valor.replace(/\D/g, '');
export const valorCampo = id => porId(id).value.trim();
export const opcional = id => valorCampo(id) || null;

function mascara(valor, etapas) {
  let texto = digitos(valor);
  for (const [posicao, separador] of etapas) {
    if (texto.length > posicao) texto = texto.slice(0, posicao) + separador + texto.slice(posicao);
  }
  return texto;
}

export function iniciarMascara(id, etapas = []) {
  const campo = porId(id);
  campo.addEventListener('input', () => {
    campo.value = mascara(campo.value, etapas);
  });
}

export function iniciarEndereco(aviso) {
  const cep = porId('cep');
  iniciarMascara('cep', [[5, '-']]);
  let consulta = 0;
  cep.addEventListener('blur', async () => {
    const codigo = digitos(cep.value);
    const vez = ++consulta;
    if (codigo.length !== 8) return;
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${codigo}/json/`);
      if (!resposta.ok) throw new Error();
      const dados = await resposta.json();
      if (vez !== consulta || codigo !== digitos(cep.value)) return;
      if (dados.erro) {
        aviso.textContent = 'CEP não encontrado. Você pode preencher o endereço manualmente.';
        return;
      }
      porId('endereco').value = dados.logradouro ?? '';
      porId('bairro').value = dados.bairro ?? '';
      porId('cidade').value = dados.localidade ?? '';
      porId('uf').value = dados.uf ?? '';
    } catch {
      if (vez === consulta && codigo === digitos(cep.value)) {
        aviso.textContent = 'A consulta de CEP falhou. Você pode preencher o endereço manualmente.';
      }
    }
  });
}

export function dadosEndereco() {
  const cep = digitos(valorCampo('cep')) || null;
  const uf = opcional('uf')?.toUpperCase() ?? null;
  if (cep && cep.length !== 8) throw new Error('Informe um CEP com oito dígitos ou deixe o campo vazio.');
  if (uf && !/^[A-Z]{2}$/.test(uf)) throw new Error('Informe a UF com duas letras.');
  return {
    cep,
    endereco: opcional('endereco'),
    bairro: opcional('bairro'),
    cidade: opcional('cidade'),
    uf,
    numero: opcional('numero'),
  };
}

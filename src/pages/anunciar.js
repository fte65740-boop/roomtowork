import { exigirUsuario } from '../lib/auth.js';
import { dadosEndereco, digitos, iniciarEndereco, opcional, valorCampo } from '../lib/formularios.js';
import { mensagemConfiguracao, supabase } from '../lib/supabase.js';
import { elemento, moeda, porId } from '../lib/ui.js';
import { alterarVisibilidadeSala, dadosEdicao, editarSala, excluirSala, extensoesFotos, linkSala, meusAnuncios, publicarSala } from '../services/salas.js';

const LIMITE_FOTOS = 6;
const LIMITE_BYTES = 5 * 1024 * 1024;
const fotos = [];
const form = porId('formSala');
const estado = porId('estado');
const mensagem = porId('mensagem');
const publicar = porId('publicar');
const input = porId('fotos');
const area = porId('areaUpload');
let enviando = false;

function atualizarFotos() {
  const itens = fotos.map((foto, indice) => {
    const item = elemento('div', 'foto-item');
    const img = elemento('img');
    img.src = foto.previa;
    img.alt = `Foto ${indice + 1} do espaço`;
    const remover = elemento('button', '', '×');
    remover.type = 'button';
    remover.setAttribute('aria-label', `Remover foto ${indice + 1}`);
    remover.addEventListener('click', () => {
      if (enviando) return;
      URL.revokeObjectURL(foto.previa);
      fotos.splice(indice, 1);
      atualizarFotos();
      input.focus();
    });
    item.append(img, remover);
    return item;
  });
  porId('listaFotos').replaceChildren(...itens);
  porId('contadorFotos').textContent = `${fotos.length} de ${LIMITE_FOTOS} fotos`;
  area.classList.toggle('cheio', fotos.length === LIMITE_FOTOS);
}

function adicionarFotos(arquivos) {
  if (enviando) return;
  const avisos = new Set();
  for (const arquivo of arquivos) {
    if (fotos.length === LIMITE_FOTOS) {
      avisos.add('Você pode enviar até seis fotos.');
      break;
    }
    if (!extensoesFotos.has(arquivo.type) || !arquivo.size || arquivo.size > LIMITE_BYTES) {
      avisos.add(`“${arquivo.name}” deve ser JPG, PNG ou WebP de até 5 MB.`);
      continue;
    }
    fotos.push({ arquivo, previa: URL.createObjectURL(arquivo) });
  }
  mensagem.textContent = [...avisos].join(' ');
  atualizarFotos();
}

async function prepararEnvio(usuario) {
  iniciarEndereco(mensagem);
  const { data: perfil, error: erroPerfil } = await supabase.from('perfis').select('telefone').eq('id', usuario.id).single();
  if (erroPerfil) throw new Error('Não foi possível carregar seus dados. Tente novamente.');
  porId('telefoneContato').value = perfil.telefone ?? '';
  const lista = porId('listaAnuncios');
  const areaAnuncios = porId('meusAnuncios');
  const estadoAnuncios = porId('estadoAnuncios');
  const idEdicao = new URLSearchParams(location.search).get('id');
  areaAnuncios.hidden = false;
  porId('novoAnuncio').addEventListener('click', () => location.assign('/anunciar/'));
  try {
    const anuncios = await meusAnuncios();
    estadoAnuncios.textContent = anuncios.length ? '' : 'Você ainda não publicou espaços.';
    for (const anuncio of anuncios) {
      const item = elemento('li');
      const link = elemento('a', '', `Editar ${anuncio.titulo}`);
      link.href = `/anunciar/?${new URLSearchParams({ id: anuncio.id })}`;
      const status = elemento('span', '', anuncio.ativa ? 'Publicado' : 'Fora do ar');
      const botao = elemento('button', '', anuncio.ativa ? 'Tirar do ar' : 'Publicar novamente');
      botao.type = 'button';
      botao.setAttribute('aria-label', `${botao.textContent} ${anuncio.titulo}`);
      botao.addEventListener('click', async () => {
        botao.disabled = true;
        try {
          await alterarVisibilidadeSala(anuncio.id, !anuncio.ativa);
          anuncio.ativa = !anuncio.ativa;
          status.textContent = anuncio.ativa ? 'Publicado' : 'Fora do ar';
          botao.textContent = anuncio.ativa ? 'Tirar do ar' : 'Publicar novamente';
          botao.setAttribute('aria-label', `${botao.textContent} ${anuncio.titulo}`);
          estadoAnuncios.textContent = `${anuncio.titulo}: ${status.textContent.toLowerCase()}.`;
        } catch (erro) {
          estadoAnuncios.textContent = erro.message;
        } finally {
          botao.disabled = false;
        }
      });
      const excluir = elemento('button', '', 'Excluir');
      excluir.type = 'button';
      excluir.setAttribute('aria-label', `Excluir ${anuncio.titulo}`);
      excluir.addEventListener('click', async () => {
        if (!window.confirm(`Excluir definitivamente o anúncio “${anuncio.titulo}”?`)) return;
        excluir.disabled = true;
        botao.disabled = true;
        try {
          const fotosRemovidas = await excluirSala(anuncio.id);
          if (idEdicao === anuncio.id) {
            location.assign('/anunciar/');
            return;
          }
          item.remove();
          estadoAnuncios.textContent = fotosRemovidas
            ? 'Anúncio excluído.'
            : 'Anúncio excluído, mas não foi possível remover as fotos do armazenamento.';
        } catch (erro) {
          estadoAnuncios.textContent = erro.message;
          excluir.disabled = false;
          botao.disabled = false;
        }
      });
      item.append(link, document.createTextNode(` · ${anuncio.bairro} · ${moeda(anuncio.preco_centavos)}/dia · `), status, document.createTextNode(' '), botao, excluir);
      lista.append(item);
    }
  } catch {
    estadoAnuncios.textContent = 'Não foi possível carregar seus anúncios.';
  }
  if (idEdicao) {
    const sala = await dadosEdicao(idEdicao);
    if (!sala) throw new Error('Anúncio não encontrado ou sem permissão para editar.');
    for (const campo of ['titulo', 'tipo', 'descricao', 'bairro', 'cidade', 'uf', 'capacidade', 'tomadas', 'mesas', 'cep', 'endereco', 'numero', 'complemento']) {
      porId(campo).value = sala[campo] ?? '';
    }
    porId('preco').value = (sala.preco_centavos / 100).toFixed(2);
    document.querySelector('h1').textContent = 'Editar espaço';
    publicar.textContent = 'Salvar alterações';
    porId('secaoFotos').hidden = true;
  }
  input.addEventListener('change', () => {
    adicionarFotos(input.files);
    input.value = '';
  });
  for (const evento of ['dragenter', 'dragover', 'dragleave', 'drop']) {
    area.addEventListener(evento, e => {
      e.preventDefault();
      area.classList.toggle('arrastando', evento === 'dragenter' || evento === 'dragover');
      if (evento === 'drop') adicionarFotos(e.dataTransfer.files);
    });
  }

  const id = idEdicao || crypto.randomUUID();
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    if (enviando) return;
    if (!idEdicao && !fotos.length) {
      mensagem.textContent = 'Adicione pelo menos uma foto.';
      input.focus();
      return;
    }
    enviando = true;
    publicar.disabled = true;
    input.disabled = true;
    try {
      const titulo = valorCampo('titulo');
      const descricao = valorCampo('descricao');
      const endereco = dadosEndereco();
      if (!endereco.cep || !endereco.endereco || !endereco.numero) {
        throw new Error('Informe o CEP, o endereço e o número do espaço.');
      }
      const telefone = digitos(valorCampo('telefoneContato'));
      if (![10, 11].includes(telefone.length)) {
        throw new Error('Informe o WhatsApp com DDD e 8 ou 9 dígitos.');
      }
      if (titulo.length < 2 || descricao.length < 2 || !endereco.bairro) {
        throw new Error('Preencha o nome, a descrição e o bairro do espaço.');
      }
      mensagem.textContent = idEdicao ? 'Salvando alterações…' : 'Enviando fotos e publicando o espaço…';
      const { error: erroTelefone } = await supabase.from('perfis').update({ telefone }).eq('id', usuario.id);
      if (erroTelefone) throw new Error('Não foi possível salvar seu telefone. Tente novamente.');
      const dados = {
        titulo,
        descricao,
        tipo: valorCampo('tipo'),
        preco_centavos: Math.round(Number(valorCampo('preco')) * 100),
        capacidade: Number(valorCampo('capacidade')),
        tomadas: Number(valorCampo('tomadas')),
        mesas: Number(valorCampo('mesas')),
        complemento: opcional('complemento'),
        ...endereco,
      };
      const salaId = idEdicao
        ? await editarSala(id, dados)
        : await publicarSala(id, usuario.id, dados, fotos.map(foto => foto.arquivo));
      location.assign(linkSala(salaId));
    } catch (erro) {
      mensagem.textContent = erro.message;
    } finally {
      enviando = false;
      publicar.disabled = false;
      input.disabled = false;
    }
  });
}

if (!supabase) {
  estado.textContent = mensagemConfiguracao;
} else {
  try {
    const usuario = await exigirUsuario();
    if (usuario) {
      await prepararEnvio(usuario);
      form.hidden = false;
      estado.hidden = true;
    }
  } catch (erro) {
    estado.textContent = erro.message || 'Não foi possível carregar a página. Tente novamente.';
  }
}

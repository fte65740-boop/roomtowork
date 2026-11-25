import { exigirUsuario } from '../lib/auth.js';
import { hojeEmSaoPaulo } from '../lib/datas.js';
import { dadosEndereco, digitos, iniciarEndereco, iniciarMascara, opcional, valorCampo } from '../lib/formularios.js';
import { mensagemConfiguracao, supabase } from '../lib/supabase.js';
import { elemento, moeda, porId } from '../lib/ui.js';
import { meusAnuncios } from '../services/salas.js';

const estado = porId('estado');
const mensagem = porId('mensagem');
const form = porId('formPerfil');
const salvar = porId('salvar');
const campos = ['nome', 'telefone', 'cpf', 'cep', 'endereco', 'bairro', 'cidade', 'uf', 'numero'];

async function carregarAnuncios() {
  const estadoAnuncios = porId('estadoAnuncios');
  try {
    const anuncios = await meusAnuncios();
    estadoAnuncios.textContent = anuncios.length ? '' : 'Você ainda não anunciou espaços.';
    for (const anuncio of anuncios) {
      const item = elemento('li');
      const link = elemento('a', '', `Editar ${anuncio.titulo}`);
      link.href = `/anunciar/?${new URLSearchParams({ id: anuncio.id })}`;
      item.append(link, document.createTextNode(` · ${anuncio.bairro} · ${moeda(anuncio.preco_centavos)}/dia · ${anuncio.ativa ? 'Publicado' : 'Fora do ar'}`));
      porId('listaAnuncios').append(item);
    }
  } catch {
    estadoAnuncios.textContent = 'Não foi possível carregar seus anúncios. Atualize a página para tentar novamente.';
  }
}

function iniciarFormulario(usuario, perfil) {
  for (const campo of campos) porId(campo).value = perfil[campo] ?? '';
  porId('nascimento').value = perfil.data_nascimento ?? '';
  porId('nascimento').max = hojeEmSaoPaulo();
  porId('email').value = usuario.email ?? '';
  porId('formEmail').addEventListener('submit', async evento => {
    evento.preventDefault();
    const email = valorCampo('email');
    const aviso = porId('mensagemEmail');
    if (email.toLowerCase() === (usuario.email ?? '').toLowerCase()) {
      aviso.textContent = 'Este já é o e-mail da conta.';
      return;
    }
    const botao = porId('salvarEmail');
    botao.disabled = true;
    try {
      const { error } = await supabase.auth.updateUser({ email }, {
        emailRedirectTo: new URL('/login/', location.origin).href,
      });
      if (error) throw error;
      aviso.textContent = 'Confira as mensagens enviadas aos seus e-mails para confirmar a alteração.';
    } catch {
      aviso.textContent = 'Não foi possível solicitar a alteração de e-mail. Tente novamente.';
    } finally {
      botao.disabled = false;
    }
  });
  iniciarEndereco(mensagem);
  iniciarMascara('cpf', [[3, '.'], [7, '.'], [11, '-']]);
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    salvar.disabled = true;
    try {
      const nome = valorCampo('nome');
      const telefone = digitos(valorCampo('telefone')) || null;
      const cpf = digitos(valorCampo('cpf')) || null;
      const dataNascimento = opcional('nascimento');
      if (nome.length < 2) throw new Error('Informe seu nome completo.');
      if (telefone && ![10, 11].includes(telefone.length)) throw new Error('Informe o WhatsApp com DDD e 8 ou 9 dígitos.');
      if (cpf && cpf.length !== 11) throw new Error('Informe um CPF com onze dígitos.');
      if (dataNascimento && dataNascimento > hojeEmSaoPaulo()) throw new Error('Revise a data de nascimento.');
      mensagem.textContent = 'Salvando dados…';
      const { data, error } = await supabase.from('perfis').update({
        nome, telefone, cpf, data_nascimento: dataNascimento, ...dadosEndereco(),
      }).eq('id', usuario.id).select('id').maybeSingle();
      if (error || !data) throw new Error('Não foi possível salvar seus dados. Tente novamente.');
      mensagem.textContent = 'Dados atualizados com sucesso.';
    } catch (erro) {
      mensagem.textContent = erro.message;
    } finally {
      salvar.disabled = false;
    }
  });
}

if (!supabase) {
  estado.textContent = mensagemConfiguracao;
} else {
  try {
    const usuario = await exigirUsuario();
    if (usuario) {
      const { data: perfil, error } = await supabase.from('perfis')
        .select('nome, data_nascimento, telefone, cpf, cep, endereco, bairro, cidade, uf, numero')
        .eq('id', usuario.id).maybeSingle();
      if (error || !perfil) throw new Error('Não foi possível carregar seu perfil. Tente novamente.');
      iniciarFormulario(usuario, perfil);
      porId('sair').addEventListener('click', async () => {
        const { error: erro } = await supabase.auth.signOut({ scope: 'local' });
        if (erro) mensagem.textContent = 'Não foi possível sair. Tente novamente.';
        else location.replace('/');
      });
      estado.hidden = true;
      porId('conteudo').hidden = false;
      await carregarAnuncios();
    }
  } catch (erro) {
    estado.textContent = erro.message || 'Não foi possível carregar seu perfil.';
  }
}

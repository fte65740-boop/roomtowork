import { concluirLogin } from '../lib/auth.js';
import { hojeEmSaoPaulo } from '../lib/datas.js';
import { dadosEndereco, digitos, iniciarEndereco, iniciarMascara, opcional, valorCampo } from '../lib/formularios.js';
import { mensagemConfiguracao, supabase } from '../lib/supabase.js';
import { porId } from '../lib/ui.js';

const form = porId('cadastro');
const enviar = porId('enviar');
const mensagem = porId('mensagem');
const nascimento = porId('nascimento');

function perfil() {
  const nome = valorCampo('nome');
  const ddd = digitos(valorCampo('ddd'));
  const numeroTelefone = digitos(valorCampo('telefone'));
  const telefone = ddd + numeroTelefone || null;
  const cpf = digitos(valorCampo('cpf')) || null;
  const dataNascimento = opcional('nascimento');
  if (nome.length < 2) throw new Error('Informe seu nome.');
  if (telefone && (ddd.length !== 2 || ![8, 9].includes(numeroTelefone.length))) {
    throw new Error('Informe o DDD e um telefone com oito ou nove dígitos.');
  }
  if (cpf && cpf.length !== 11) throw new Error('Informe um CPF com onze dígitos.');
  if (dataNascimento && dataNascimento > hojeEmSaoPaulo()) throw new Error('Revise a data de nascimento.');
  return { nome, telefone, cpf, data_nascimento: dataNascimento, ...dadosEndereco() };
}

iniciarEndereco(mensagem);
iniciarMascara('ddd');
iniciarMascara('telefone', [[5, '-']]);
iniciarMascara('cpf', [[3, '.'], [7, '.'], [11, '-']]);
nascimento.max = hojeEmSaoPaulo();

if (!supabase) {
  enviar.disabled = true;
  mensagem.textContent = mensagemConfiguracao;
}

form.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (!supabase) return;
  enviar.disabled = true;
  try {
    const dados = perfil();
    mensagem.textContent = 'Criando conta…';
    const { data, error } = await supabase.auth.signUp({
      email: valorCampo('email'),
      password: porId('senha').value,
      options: { data: dados, emailRedirectTo: new URL('/login/', location.origin).href },
    });
    if (error) {
      const texto = error.code === 'over_email_send_rate_limit'
        ? 'Muitos e-mails foram solicitados. Aguarde e tente novamente.'
        : 'Não foi possível criar a conta. Confira os dados e tente novamente.';
      throw new Error(texto);
    }
    if (data.session) concluirLogin();
    else {
      form.hidden = true;
      mensagem.textContent = 'Confira seu e-mail e siga o link para confirmar a conta.';
    }
  } catch (erro) {
    mensagem.textContent = erro.message;
  } finally {
    enviar.disabled = false;
  }
});

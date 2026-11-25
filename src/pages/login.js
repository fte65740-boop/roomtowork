import { concluirLogin, destinoLogin } from '../lib/auth.js';
import { mensagemConfiguracao, supabase } from '../lib/supabase.js';
import { porId } from '../lib/ui.js';

const email = porId('email');
const senha = porId('senha');
const mensagem = porId('mensagem');
const enviar = porId('enviar');
const params = new URLSearchParams(location.search);
const retornoAuth = new URLSearchParams(location.hash.slice(1));
let modo = params.get('recuperar') ? 'pedido' : 'login';

function configurarFormulario() {
  const dados = {
    login: ['Entrar no RoomToWORK', 'Entrar', 'Senha'],
    pedido: ['Recuperar senha', 'Enviar link', 'Senha'],
    nova: ['Definir nova senha', 'Salvar senha', 'Nova senha (mínimo de 8 caracteres)'],
  };
  const [titulo, rotulo, rotuloSenha] = dados[modo];
  porId('titulo').textContent = titulo;
  porId('campoEmail').hidden = modo === 'nova';
  porId('campoSenha').hidden = modo === 'pedido';
  email.required = modo !== 'nova';
  senha.required = modo !== 'pedido';
  senha.placeholder = rotuloSenha;
  senha.setAttribute('aria-label', rotuloSenha);
  senha.autocomplete = modo === 'nova' ? 'new-password' : 'current-password';
  senha.minLength = modo === 'nova' ? 8 : 0;
  enviar.textContent = rotulo;
  porId('voltarLogin').hidden = modo === 'login';
  porId('linksConta').hidden = modo !== 'login';
}

destinoLogin();
configurarFormulario();

if (!supabase) {
  enviar.disabled = true;
  mensagem.textContent = mensagemConfiguracao;
} else {
  if (retornoAuth.has('error') || params.has('error')) {
    mensagem.textContent = 'O link expirou ou é inválido. Solicite um novo link.';
  }
  supabase.auth.onAuthStateChange((evento, sessao) => {
    if (evento === 'PASSWORD_RECOVERY') {
      modo = 'nova';
      configurarFormulario();
      return;
    }
    if (evento === 'SIGNED_IN' && sessao && retornoAuth.get('type') === 'signup') concluirLogin();
  });
}

const respostas = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  same_password: 'Escolha uma senha diferente da atual.',
  over_email_send_rate_limit: 'Aguarde alguns instantes antes de solicitar outro link.',
  weak_password: 'Escolha uma senha mais forte.',
};

porId('formLogin').addEventListener('submit', async evento => {
  evento.preventDefault();
  if (!supabase) return;
  enviar.disabled = true;
  mensagem.textContent = 'Processando…';
  try {
    if (modo === 'pedido') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
        redirectTo: new URL('/login/', location.origin).href,
      });
      if (error) throw error;
      mensagem.textContent = 'Se o e-mail estiver cadastrado, você receberá o link para redefinir a senha.';
      return;
    }
    const { error } = modo === 'nova'
      ? await supabase.auth.updateUser({ password: senha.value })
      : await supabase.auth.signInWithPassword({ email: email.value.trim(), password: senha.value });
    if (error) throw error;
    concluirLogin();
  } catch (erro) {
    mensagem.textContent = respostas[erro.code] ?? 'Não foi possível completar a operação. Tente novamente.';
  } finally {
    enviar.disabled = false;
  }
});

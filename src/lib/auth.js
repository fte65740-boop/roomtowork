import { clienteSupabase, supabase } from './supabase.js';

const destinos = new Set(['/anunciar/', '/checkout/', '/reservas/', '/perfil/']);
const chaveDestino = 'room2work-destino-auth';

function destinoInterno(valor) {
  if (!valor) return '/';
  try {
    const destino = new URL(valor, location.origin);
    if (destino.origin === location.origin && destinos.has(destino.pathname)) {
      return destino.pathname + destino.search;
    }
  } catch {
    // Endereço inválido volta para o catálogo.
  }
  return '/';
}

export function linkLogin(destino = location.pathname + location.search) {
  return `/login/?${new URLSearchParams({ next: destinoInterno(destino) })}`;
}

export function destinoLogin() {
  const destino = new URLSearchParams(location.search).get('next');
  if (destino) sessionStorage.setItem(chaveDestino, destinoInterno(destino));
  return destinoInterno(destino ?? sessionStorage.getItem(chaveDestino));
}

export function concluirLogin() {
  const destino = destinoLogin();
  sessionStorage.removeItem(chaveDestino);
  location.replace(destino);
}

export async function usuarioAtual() {
  const client = clienteSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function exigirUsuario() {
  const usuario = await usuarioAtual();
  if (!usuario) location.replace(linkLogin());
  return usuario;
}

export function linksConta() {
  const nav = document.getElementById('navLinks');
  const login = nav?.querySelector('a[href="/login/"]');
  if (!supabase || !login) return;

  supabase.auth.onAuthStateChange((_evento, sessao) => {
    login.textContent = sessao ? 'Meu perfil' : 'Entrar';
    login.href = sessao ? '/perfil/' : linkLogin();
  });
}

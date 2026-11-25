import exemplos from '../data/salas-exemplo.json';
import { clienteSupabase, supabase } from '../lib/supabase.js';

const camposCatalogo = 'id, titulo, tipo, bairro, cidade, uf, slug, preco_centavos, capacidade, fotos';
const camposDetalhe = `${camposCatalogo}, descricao, tomadas, mesas`;
const tamanhoPagina = 200;
const bucketFotos = 'fotos-salas';
export const extensoesFotos = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export const idSalaValido = id => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id ?? '');
export const localSala = sala => [sala.bairro, sala.cidade, sala.uf].filter(Boolean).join(', ');
export const linkSala = id => `/sala/?${new URLSearchParams({ id })}`;

export function urlFoto(sala, caminho = sala.fotos[0]) {
  if (sala.slug) return `/assets/salas/${encodeURIComponent(caminho)}`;
  return clienteSupabase().storage.from(bucketFotos).getPublicUrl(caminho).data.publicUrl;
}

export async function listarSalas() {
  if (!supabase) return exemplos;
  const salas = [];
  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await supabase.from('salas')
      .select(camposCatalogo).eq('ativa', true)
      .order('criado_em').order('id')
      .range(inicio, inicio + tamanhoPagina - 1);
    if (error) throw error;
    salas.push(...data);
    if (data.length < tamanhoPagina) return salas;
  }
}

export async function buscarSala(id) {
  if (!idSalaValido(id)) return null;
  if (!supabase) return exemplos.find(sala => sala.id === id.toLowerCase()) ?? null;
  const { data, error } = await supabase.from('salas').select(camposDetalhe).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function meusAnuncios() {
  const { data, error } = await clienteSupabase().rpc('meus_anuncios');
  if (error) throw error;
  return data;
}

export async function dadosEdicao(id) {
  if (!idSalaValido(id)) return null;
  const client = clienteSupabase();
  const { data: endereco, error } = await client.from('enderecos_salas')
    .select('cep, endereco, numero, complemento').eq('sala_id', id).maybeSingle();
  if (error) throw error;
  if (!endereco) return null;
  const sala = await buscarSala(id);
  return sala && { ...sala, ...endereco };
}

export async function editarSala(id, dados) {
  const { data, error } = await clienteSupabase().rpc('editar_sala', { p_id: id, p_dados: dados });
  if (error?.code === '23505') throw new Error('Este endereço já está cadastrado em outro anúncio.');
  if (error) throw new Error('Não foi possível salvar o anúncio. Confira os dados e tente novamente.');
  return data;
}

export async function alterarVisibilidadeSala(id, ativa) {
  const { error } = await clienteSupabase().rpc('alterar_visibilidade_sala', { p_id: id, p_ativa: ativa });
  if (error) throw new Error('Não foi possível alterar o anúncio. Tente novamente.');
}

export async function excluirSala(id) {
  const client = clienteSupabase();
  const { data: fotos, error } = await client.rpc('excluir_sala', { p_id: id });
  if (error) {
    if (error.code === '23503') throw new Error(error.message);
    throw new Error('Não foi possível excluir o anúncio. Tente novamente.');
  }
  const { error: erroFotos } = await client.storage.from(bucketFotos).remove(fotos);
  return !erroFotos;
}

export async function publicarSala(id, dono, dados, fotos) {
  const client = clienteSupabase();
  const storage = client.storage.from(bucketFotos);
  const tentativas = [];
  try {
    for (const foto of fotos) {
      const caminho = `${dono}/${id}/${crypto.randomUUID()}.${extensoesFotos.get(foto.type)}`;
      tentativas.push(caminho);
      const { error } = await storage.upload(caminho, foto, { contentType: foto.type });
      if (error) throw new Error('Falha ao enviar uma das fotos. Confira a conexão e tente novamente.');
    }
    const { data, error } = await client.rpc('publicar_sala', { p_id: id, p_dados: dados, p_fotos: tentativas });
    if (error?.code === '23505') throw new Error('Este endereço já está cadastrado em outro anúncio.');
    if (error) throw new Error('Falha ao publicar. Confira os campos e tente novamente.');
    return data;
  } catch (erro) {
    const consulta = await client.from('salas').select('id').eq('id', id).maybeSingle();
    if (consulta.data?.id) return consulta.data.id;
    // A política de Storage preserva as fotos se a publicação já tiver sido concluída.
    if (tentativas.length) await storage.remove(tentativas);
    throw erro;
  }
}

import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import salas from './src/data/salas-exemplo.json' with { type: 'json' };

const paginas = ['index.html', 'login/index.html', 'cadastro/index.html', 'anunciar/index.html',
  'sala/index.html', 'checkout/index.html', 'reservas/index.html', 'perfil/index.html'];

const rotasAntigas = {
  'Pagina inicial/room2work.html': '/',
  'quartos/quartos.html': '/',
  'login/login.html': '/login/',
  'cadastro/cadastro.html': '/cadastro/',
  'cadastro-quarto/cadastroquarto.html': '/anunciar/',
  'cadastro quarto/cadastroquarto.html': '/anunciar/',
  'Salas/sala.html': '/sala/',
  'compra/compra.html': '/checkout/',
};

for (const { id, slug } of salas) {
  const detalhe = { 'sala-aurora': 'sala-auroras', 'hub-colmeia': 'hub-colmeias' }[slug] ?? slug;
  const pasta = `Salas/${slug}`;
  rotasAntigas[`${pasta}/${detalhe}.html`] = `/sala/?id=${id}`;
  for (const checkout of ['pagamento/checkout.html', `pagamento-${slug}/checkout.html`, `pagamento-${slug}/checkout-${slug}.html`]) {
    rotasAntigas[`${pasta}/${checkout}`] = `/checkout/?id=${id}`;
  }
}
rotasAntigas['Salas/hub colmeia/hub-colmeias.html'] = rotasAntigas['Salas/hub-colmeia/hub-colmeias.html'];

function paginaRedirecionamento(destino) {
  return `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><title>RoomToWORK</title>
<script>
  const destino = new URL(${JSON.stringify(destino)}, location.origin);
  const antigos = new URLSearchParams(location.search);
  for (const chave of ['id', 'inicio', 'fim']) {
    if (antigos.has(chave) && !destino.searchParams.has(chave)) destino.searchParams.set(chave, antigos.get(chave));
  }
  location.replace(destino);
</script>
<p><a href="${destino}">Acessar o RoomToWORK</a></p></html>`;
}

function linksAntigos() {
  const rotas = Object.entries(rotasAntigas).map(([origem, destino]) =>
    [origem, paginaRedirecionamento(destino)]);
  const porCaminho = new Map(rotas.map(([origem, html]) => [`/${origem.toLowerCase()}`, html]));
  return {
    name: 'room2work-links-antigos',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const caminho = new URL(req.url, 'http://localhost').pathname;
        if (!caminho.toLowerCase().endsWith('.html')) return next();
        let html;
        try {
          html = porCaminho.get(decodeURIComponent(caminho).toLowerCase());
        } catch {
          return next();
        }
        if (!html) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    },
    generateBundle() {
      for (const [fileName, source] of rotas) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}

function chavePublica(chave) {
  if (!chave || chave.startsWith('sb_publishable_')) return true;
  try {
    return JSON.parse(Buffer.from(chave.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const { VITE_SUPABASE_PUBLISHABLE_KEY: chave } = loadEnv(mode, process.cwd());
  if (!chavePublica(chave?.trim())) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY deve conter a chave pública do Supabase.');
  }
  return {
    plugins: [linksAntigos()],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    build: {
      rolldownOptions: {
        input: paginas.map(pagina => fileURLToPath(new URL(pagina, import.meta.url))),
      },
    },
  };
});

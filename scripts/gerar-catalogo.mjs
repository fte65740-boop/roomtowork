import { readFileSync, writeFileSync } from 'node:fs';

const destino = new URL('../supabase/migrations/20261125143951_catalogo_inicial.sql', import.meta.url);
const salas = JSON.parse(readFileSync(new URL('../src/data/salas-exemplo.json', import.meta.url), 'utf8'));
const campos = ['id', 'slug', 'titulo', 'tipo', 'descricao', 'bairro', 'capacidade', 'tomadas', 'mesas', 'preco_centavos', 'fotos'];

function literal(valor) {
  if (Array.isArray(valor)) return `array[${valor.map(literal).join(', ')}]`;
  if (typeof valor === 'number') return String(valor);
  return `'${valor.replaceAll("'", "''")}'`;
}

const linhas = salas.map(sala => `    (${campos.map(campo => literal(sala[campo])).join(', ')})`);
const sql = `-- Gerado por npm run catalogo:sql a partir de src/data/salas-exemplo.json.
insert into public.salas (${campos.join(', ')})
values
${linhas.join(',\n')};
`;

if (process.argv.includes('--check')) {
  if (readFileSync(destino, 'utf8').replaceAll('\r\n', '\n') !== sql) {
    throw new Error('O catálogo inicial diverge da migração. Confira src/data/salas-exemplo.json.');
  }
} else {
  writeFileSync(destino, sql);
}

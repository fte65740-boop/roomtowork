const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PASTA = path.join(__dirname, 'data', 'quartos');
fs.mkdirSync(PASTA, { recursive: true });

app.use(express.json({ limit: '50mb' })); // fotos em base64 são grandes

// Remove dados sensíveis antes de mandar ao navegador
const publico = ({ cpf, telefone, ...resto }) => resto;

const TIPOS = ['privativa', 'compartilhada', 'reuniao', 'estudio'];

// CADASTRAR
app.post('/api/quartos', (req, res) => {
  const q = req.body;

  if (!q.titulo || !TIPOS.includes(q.tipo) || !(q.preco > 0) || !(q.capacidade >= 1)
      || !Array.isArray(q.fotos) || q.fotos.length < 1 || q.fotos.length > 6
      || !q.fotos.every(f => typeof f === 'string' && f.startsWith('data:image/'))) {
    return res.status(400).json({ erro: 'Dados inválidos. Confira todos os campos.' });
  }

  const id = crypto.randomUUID();
  fs.writeFileSync(path.join(PASTA, id + '.json'), JSON.stringify({ id, ...q }, null, 2));
  res.status(201).json({ id });
});

// LISTAR (só a 1ª foto, para o catálogo carregar rápido)
app.get('/api/quartos', (req, res) => {
  const lista = fs.readdirSync(PASTA)
    .filter(a => a.endsWith('.json'))
    .map(a => JSON.parse(fs.readFileSync(path.join(PASTA, a), 'utf8')))
    .map(q => ({ ...publico(q), fotos: q.fotos.slice(0, 1) }));
  res.json(lista);
});

// BUSCAR UM
app.get('/api/quartos/:id', (req, res) => {
  if (!/^[a-f0-9-]{36}$/.test(req.params.id)) return res.status(400).json({ erro: 'ID inválido.' });
  const arquivo = path.join(PASTA, req.params.id + '.json');
  if (!fs.existsSync(arquivo)) return res.status(404).json({ erro: 'Sala não encontrada.' });
  res.json(publico(JSON.parse(fs.readFileSync(arquivo, 'utf8'))));
});

// Serve o site inteiro (quartos/, Salas/, imagens/, etc.) — a pasta data/ fica bloqueada
app.use('/data', (req, res) => res.status(404).end());
app.use(express.static(__dirname));

app.listen(3000, () => console.log('Rodando em http://localhost:3000/quartos/quartos.html'));

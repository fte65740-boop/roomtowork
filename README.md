# Room2WORK

Projeto de TCC para anunciar, buscar e reservar espaços de trabalho. O catálogo permite filtrar os anúncios por nome ou região, tipo de espaço, diária e capacidade.

## Executar o projeto

Use o Node.js LTS 22.12 ou superior.

```powershell
npm ci
npm run dev
```

Abra [localhost:5173](http://localhost:5173). Sem as variáveis do Supabase, é possível navegar pelos oito espaços de exemplo e conferir o resumo da reserva. As contas, os anúncios de usuários e as reservas ficam disponíveis ao conectar o banco.

## Conectar um projeto Supabase na nuvem

1. Crie um projeto no [Dashboard do Supabase](https://supabase.com/dashboard). Na opção **Connect**, copie a URL do projeto e a chave **Publishable**.
2. Na raiz do repositório, copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Use apenas a chave pública do projeto.
3. Vincule o repositório ao projeto e aplique as migrações. A referência do projeto aparece na URL do Dashboard.

   ```powershell
   npx supabase@3.4.0 login
   npx supabase@3.4.0 link --project-ref SUA_REFERENCIA
   npx supabase@3.4.0 db push --remote
   ```

4. Em **Authentication → URL Configuration**, configure **Site URL** com a URL do site e inclua a rota `/login/` em **Redirect URLs**. Durante o desenvolvimento, adicione `http://localhost:5173/login/`. Para testar o build, adicione também `http://localhost:4173/login/`.
5. Em **Authentication**, deixe o provedor de e-mail habilitado. Configure a confirmação de e-mail e o mínimo de oito caracteres para a senha. Para enviar e-mails de confirmação e recuperação a usuários externos, configure um provedor SMTP no projeto.
6. Reinicie o Vite após alterar `.env.local`. O catálogo conectado consulta o banco e encontra os oito espaços que a migração inicial insere.

O frontend usa a Data API no esquema `public`. As migrações criam tabelas, permissões, funções, políticas de acesso e o bucket `fotos-salas`.

## Usar o Supabase local

Com Docker Desktop em execução, inicie os serviços na raiz do repositório.

```powershell
npx supabase@3.4.0 start
npx supabase@3.4.0 status
```

Copie a URL da API e a chave **Publishable** da saída para `.env.local`. Reinicie o Vite com `npm run dev`. Use [Mailpit](http://localhost:54324) para abrir as mensagens de confirmação e recuperação de senha do ambiente local. O [Supabase Studio](http://localhost:54323) permite consultar os dados e o Storage.

## Estrutura do repositório

```text
index.html                   Entrada do catálogo
login/ cadastro/ anunciar/  Páginas de conta e publicação
sala/ checkout/ reservas/   Detalhe, confirmação e histórico
src/pages/                  Comportamento das páginas
src/services/               Consultas e operações do Supabase
src/lib/                    Cliente, sessão e utilitários compartilhados
src/data/                   Dados dos espaços de exemplo
src/styles/                 Estilos gerais e por página
public/assets/              Logotipo e fotos dos espaços de exemplo
supabase/migrations/        Estrutura do PostgreSQL e catálogo inicial
docs/tcc/                   Apresentações e materiais acadêmicos
```

O Vite gera redirecionamentos para os links antigos do catálogo, das salas e dos checkouts. As páginas compartilhadas carregam os dados pelo identificador da sala.

As contas da demonstração antiga precisam ser criadas no Supabase Auth.

## Dados e regras

- O Supabase Auth guarda as credenciais. A tabela `perfis` mantém o nome e os campos opcionais da conta. Cada pessoa autenticada consulta o próprio perfil.
- `salas` guarda as informações do catálogo. O endereço completo fica em `enderecos_salas`, acessível pelo anunciante. O catálogo mostra bairro, cidade e UF.
- Cada anúncio aceita até seis fotos JPEG, PNG ou WebP de até 5 MB por arquivo. O bucket oferece leitura pública das imagens e restringe o envio à pasta da conta autenticada.
- As reservas aceitam períodos de 1 a 28 dias corridos, com início e fim inclusivos. O PostgreSQL calcula o valor pela diária vigente e impede a sobreposição de reservas. As consultas públicas de disponibilidade retornam apenas os períodos ocupados.
- O checkout acadêmico salva a reserva e o método simulado. A demonstração funciona sem cobrança ou coleta de dados de cartão.

## Verificar o projeto

```powershell
npm run check
npm run preview
```

`check` confere a correspondência entre os exemplos e a migração inicial, além de gerar a versão de produção em `dist/`. A prévia abre em [localhost:4173](http://localhost:4173).

Para verificar o fluxo com uma instância Supabase conectada, crie e confirme uma conta, anuncie um espaço com uma foto, reserve uma data e confira **Minhas reservas**. Consulte a mesma sala com outra conta para verificar que o período está ocupado.

O catálogo inicial vem de `src/data/salas-exemplo.json`. `npm run catalogo:sql` gera a migração correspondente. Depois de aplicar uma migração a um projeto compartilhado, registre mudanças ao catálogo em uma nova migração.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create type public.tipo_sala as enum ('privativa', 'compartilhada', 'reuniao', 'estudio');
create type public.metodo_simulado as enum ('credito', 'debito', 'pix', 'boleto');

create table public.perfis (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null check (char_length(trim(nome)) between 2 and 120),
    data_nascimento date check (isfinite(data_nascimento) and data_nascimento <= (now() at time zone 'America/Sao_Paulo')::date),
    telefone text check (telefone ~ '^[0-9]{10,11}$'),
    cpf text check (cpf ~ '^[0-9]{11}$'),
    cep text check (cep ~ '^[0-9]{8}$'),
    endereco text check (char_length(endereco) <= 200),
    bairro text check (char_length(bairro) <= 100),
    cidade text check (char_length(cidade) <= 100),
    uf text check (uf ~ '^[A-Z]{2}$'),
    numero text check (char_length(numero) <= 20),
    criado_em timestamptz not null default now()
);

create table public.salas (
    id uuid primary key default gen_random_uuid(),
    responsavel_id uuid references public.perfis(id) on delete set null,
    slug text unique,
    titulo text not null check (char_length(trim(titulo)) between 2 and 120),
    tipo public.tipo_sala not null,
    descricao text not null check (char_length(trim(descricao)) between 2 and 2000),
    bairro text not null check (char_length(trim(bairro)) between 1 and 100),
    cidade text check (char_length(cidade) <= 100),
    uf text check (uf ~ '^[A-Z]{2}$'),
    preco_centavos integer not null check (preco_centavos between 100 and 30000),
    capacidade integer not null check (capacidade between 1 and 9999),
    tomadas integer not null default 0 check (tomadas between 0 and 999),
    mesas integer not null default 0 check (mesas between 0 and 999),
    fotos text[] not null check (cardinality(fotos) between 1 and 6),
    criado_em timestamptz not null default now()
);

create table public.enderecos_salas (
    sala_id uuid primary key references public.salas(id) on delete cascade,
    cep text check (cep ~ '^[0-9]{8}$'),
    endereco text check (char_length(endereco) <= 200),
    numero text check (char_length(numero) <= 20),
    complemento text check (char_length(complemento) <= 120)
);

create table public.reservas (
    id uuid primary key,
    sala_id uuid not null references public.salas(id),
    usuario_id uuid not null references public.perfis(id) on delete cascade,
    inicio date not null,
    fim date not null,
    preco_diaria_centavos integer not null check (preco_diaria_centavos between 100 and 30000),
    total_centavos integer generated always as (preco_diaria_centavos * (fim - inicio + 1)) stored,
    metodo public.metodo_simulado not null,
    criada_em timestamptz not null default now(),
    constraint periodo_reserva_valido check (fim - inicio between 0 and 27),
    constraint reservas_sem_sobreposicao exclude using gist (
        sala_id with =,
        daterange(inicio, fim, '[]') with &&
    )
);

create index salas_catalogo_idx on public.salas (criado_em, id);
create index reservas_usuario_idx on public.reservas (usuario_id, criada_em desc);
create index salas_responsavel_idx on public.salas (responsavel_id);

alter table public.perfis enable row level security;
alter table public.salas enable row level security;
alter table public.enderecos_salas enable row level security;
alter table public.reservas enable row level security;

revoke all on public.perfis, public.salas, public.enderecos_salas, public.reservas
    from public, anon, authenticated;
grant select on public.perfis, public.enderecos_salas, public.reservas to authenticated;
grant select (
    id, slug, titulo, tipo, descricao, bairro, cidade, uf,
    preco_centavos, capacidade, tomadas, mesas, fotos, criado_em
) on public.salas to anon, authenticated;
grant all on public.perfis, public.salas, public.enderecos_salas, public.reservas to service_role;

create function public.titular_sala(p_sala uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.salas where id = p_sala and responsavel_id = (select auth.uid())
    );
$$;
revoke all on function public.titular_sala(uuid) from public, anon, authenticated;
grant execute on function public.titular_sala(uuid) to authenticated;

create policy "Leitura do próprio perfil"
    on public.perfis for select to authenticated using (id = (select auth.uid()));
create policy "Leitura do catálogo"
    on public.salas for select to anon, authenticated using (true);
create policy "Leitura do endereço pelo anunciante"
    on public.enderecos_salas for select to authenticated using (public.titular_sala(sala_id));
create policy "Leitura das próprias reservas"
    on public.reservas for select to authenticated using (usuario_id = (select auth.uid()));

create function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.perfis (id, nome, data_nascimento, telefone, cpf, cep, endereco, bairro, cidade, uf, numero)
    values (
        new.id,
        coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), 'Usuário'),
        nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
        nullif(new.raw_user_meta_data->>'telefone', ''),
        nullif(new.raw_user_meta_data->>'cpf', ''),
        nullif(new.raw_user_meta_data->>'cep', ''),
        nullif(new.raw_user_meta_data->>'endereco', ''),
        nullif(new.raw_user_meta_data->>'bairro', ''),
        nullif(new.raw_user_meta_data->>'cidade', ''),
        nullif(new.raw_user_meta_data->>'uf', ''),
        nullif(new.raw_user_meta_data->>'numero', '')
    );
    return new;
end;
$$;

revoke all on function public.criar_perfil() from public, anon, authenticated;
create trigger criar_perfil_ao_cadastrar
    after insert on auth.users for each row execute function public.criar_perfil();

insert into public.perfis (id, nome)
select id, case when char_length(trim(raw_user_meta_data->>'nome')) between 2 and 120
                then trim(raw_user_meta_data->>'nome') else 'Usuário' end
from auth.users
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-salas', 'fotos-salas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create function public.pode_remover_foto(p_sala text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform pg_advisory_xact_lock(hashtextextended(p_sala, 1));
    return not exists (
        select 1 from public.salas
        where id::text = p_sala and responsavel_id = (select auth.uid())
    );
end;
$$;

revoke all on function public.pode_remover_foto(text) from public, anon, authenticated;
grant execute on function public.pode_remover_foto(text) to authenticated;

create policy "Enviar foto em pasta própria"
    on storage.objects for insert to authenticated with check (
        bucket_id = 'fotos-salas'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}[.](jpg|png|webp)$'
        and public.pode_remover_foto((storage.foldername(name))[2])
    );
create policy "Listar fotos próprias"
    on storage.objects for select to authenticated using (
        bucket_id = 'fotos-salas' and owner_id = (select auth.uid())::text
    );
create policy "Limpar fotos de anúncio ainda não publicado"
    on storage.objects for delete to authenticated using (
        bucket_id = 'fotos-salas'
        and owner_id = (select auth.uid())::text
        and public.pode_remover_foto((storage.foldername(name))[2])
    );

create function public.publicar_sala(p_id uuid, p_dados jsonb, p_fotos text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    usuario uuid := auth.uid();
    dados public.salas := jsonb_populate_record(null::public.salas, p_dados);
    endereco_privado public.enderecos_salas := jsonb_populate_record(null::public.enderecos_salas, p_dados);
    foto text;
begin
    if usuario is null then
        raise exception 'Entre na sua conta para anunciar.' using errcode = '42501';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_id::text, 1));
    if exists (select 1 from public.salas where id = p_id and responsavel_id = usuario) then
        return p_id;
    end if;

    if p_fotos is null or cardinality(p_fotos) not between 1 and 6
       or (select count(distinct f) from unnest(p_fotos) as f) <> cardinality(p_fotos) then
        raise exception 'Envie de 1 a 6 fotos diferentes.' using errcode = '22023';
    end if;

    foreach foto in array p_fotos loop
        perform 1 from storage.objects
        where bucket_id = 'fotos-salas' and name = foto and owner_id = usuario::text
          and (storage.foldername(name))[2] = p_id::text
        for share;
        if not found then
            raise exception 'Uma das fotos do anúncio é inválida.' using errcode = '22023';
        end if;
    end loop;

    insert into public.salas (
        id, responsavel_id, titulo, tipo, descricao, bairro, cidade, uf,
        preco_centavos, capacidade, tomadas, mesas, fotos
    ) values (
        p_id, usuario, dados.titulo, dados.tipo, dados.descricao, dados.bairro, dados.cidade, dados.uf,
        dados.preco_centavos, dados.capacidade, coalesce(dados.tomadas, 0), coalesce(dados.mesas, 0), p_fotos
    );

    insert into public.enderecos_salas (sala_id, cep, endereco, numero, complemento)
    values (p_id, endereco_privado.cep, endereco_privado.endereco, endereco_privado.numero, endereco_privado.complemento);

    return p_id;
end;
$$;

create function public.periodos_ocupados(p_sala uuid, p_inicio date, p_fim date)
returns table (inicio date, fim date)
language sql
stable
security definer
set search_path = ''
as $$
    select r.inicio, r.fim
    from public.reservas as r
    where r.sala_id = p_sala
      and p_fim - p_inicio between 0 and 90
      and r.inicio <= p_fim and r.fim >= p_inicio
    order by r.inicio;
$$;

create function public.criar_reserva(
    p_id uuid, p_sala uuid, p_inicio date, p_fim date,
    p_metodo public.metodo_simulado, p_preco_centavos integer
)
returns public.reservas
language plpgsql
security definer
set search_path = ''
as $$
declare
    usuario uuid := auth.uid();
    hoje date := (now() at time zone 'America/Sao_Paulo')::date;
    diaria integer;
    reserva public.reservas;
begin
    if usuario is null then
        raise exception 'Entre na sua conta para reservar.' using errcode = '42501';
    end if;
    if p_id is null or p_sala is null or p_inicio is null or p_fim is null
       or p_metodo is null or p_preco_centavos is null then
        raise exception 'Informe os dados da reserva.' using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_id::text, 2));
    select * into reserva from public.reservas where id = p_id;
    if found then
        if reserva.usuario_id = usuario and reserva.sala_id = p_sala and reserva.inicio = p_inicio
           and reserva.fim = p_fim and reserva.metodo = p_metodo
           and reserva.preco_diaria_centavos = p_preco_centavos then
            return reserva;
        end if;
        raise exception 'Identificador de reserva já utilizado.' using errcode = '23505';
    end if;

    if not isfinite(p_inicio) or not isfinite(p_fim)
       or p_inicio < hoje or p_fim - p_inicio not between 0 and 27 then
        raise exception 'Selecione de 1 a 28 dias a partir de hoje.' using errcode = '22023';
    end if;

    select preco_centavos into diaria from public.salas where id = p_sala for share;
    if not found then
        raise exception 'Espaço não encontrado.' using errcode = 'P0002';
    end if;
    if p_preco_centavos <> diaria then
        raise exception 'A diária mudou. Atualize a página para conferir o preço.' using errcode = '22023';
    end if;
    insert into public.reservas (id, sala_id, usuario_id, inicio, fim, preco_diaria_centavos, metodo)
    values (p_id, p_sala, usuario, p_inicio, p_fim, diaria, p_metodo) returning * into reserva;
    return reserva;
exception
    when exclusion_violation then
        raise exception 'O espaço já está reservado em parte do período escolhido.' using errcode = '23P01';
end;
$$;

revoke all on function public.publicar_sala(uuid, jsonb, text[]),
    public.periodos_ocupados(uuid, date, date),
    public.criar_reserva(uuid, uuid, date, date, public.metodo_simulado, integer)
    from public, anon, authenticated;
grant execute on function public.publicar_sala(uuid, jsonb, text[]),
    public.criar_reserva(uuid, uuid, date, date, public.metodo_simulado, integer) to authenticated;
grant execute on function public.periodos_ocupados(uuid, date, date) to anon, authenticated;

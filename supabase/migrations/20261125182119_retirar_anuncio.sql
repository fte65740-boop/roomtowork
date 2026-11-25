alter table public.salas add column ativa boolean not null default true;
grant select (ativa) on public.salas to anon, authenticated;
drop policy "Leitura do catálogo" on public.salas;
create policy "Leitura de anúncios disponíveis"
on public.salas for select to anon, authenticated using (ativa);
create policy "Leitura de anúncios relacionados"
on public.salas for select to authenticated using (
    responsavel_id = (select auth.uid()) or exists (
        select 1 from public.reservas r
        where r.sala_id = salas.id and r.usuario_id = (select auth.uid())
    )
);

drop function public.meus_anuncios();
create function public.meus_anuncios()
returns table (id uuid, titulo text, bairro text, preco_centavos integer, ativa boolean)
language sql stable security definer set search_path = ''
as $$
    select s.id, s.titulo, s.bairro, s.preco_centavos, s.ativa
    from public.salas s
    where s.responsavel_id = (select auth.uid())
    order by s.criado_em desc, s.id;
$$;
revoke all on function public.meus_anuncios() from public, anon, authenticated;
grant execute on function public.meus_anuncios() to authenticated;

create function public.alterar_visibilidade_sala(p_id uuid, p_ativa boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
    if auth.uid() is null or p_ativa is null then
        raise exception 'Entre na sua conta.' using errcode = '42501';
    end if;
    update public.salas set ativa = p_ativa
    where id = p_id and responsavel_id = auth.uid();
    if not found then
        raise exception 'Anúncio não encontrado.' using errcode = '42501';
    end if;
    return p_ativa;
end;
$$;
revoke all on function public.alterar_visibilidade_sala(uuid, boolean) from public, anon, authenticated;
grant execute on function public.alterar_visibilidade_sala(uuid, boolean) to authenticated;
create or replace function public.criar_reserva(
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

    select preco_centavos into diaria from public.salas where id = p_sala and ativa for share;
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

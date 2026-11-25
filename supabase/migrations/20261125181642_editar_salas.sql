create function public.meus_anuncios()
returns table (id uuid, titulo text, bairro text, preco_centavos integer)
language sql stable security definer set search_path = ''
as $$
    select s.id, s.titulo, s.bairro, s.preco_centavos
    from public.salas s
    where s.responsavel_id = (select auth.uid())
    order by s.criado_em desc, s.id;
$$;

create function public.editar_sala(p_id uuid, p_dados jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    dados public.salas := jsonb_populate_record(null::public.salas, p_dados);
    endereco public.enderecos_salas := jsonb_populate_record(null::public.enderecos_salas, p_dados);
begin
    if auth.uid() is null then
        raise exception 'Entre na sua conta.' using errcode = '42501';
    end if;
    update public.salas set
        titulo = dados.titulo, tipo = dados.tipo, descricao = dados.descricao,
        bairro = dados.bairro, cidade = dados.cidade, uf = dados.uf,
        preco_centavos = dados.preco_centavos, capacidade = dados.capacidade,
        tomadas = dados.tomadas, mesas = dados.mesas
    where id = p_id and responsavel_id = auth.uid();
    if not found then
        raise exception 'Anúncio não encontrado.' using errcode = '42501';
    end if;
    insert into public.enderecos_salas (sala_id, cep, endereco, numero, complemento)
    values (p_id, endereco.cep, endereco.endereco, endereco.numero, endereco.complemento)
    on conflict (sala_id) do update set
        cep = excluded.cep, endereco = excluded.endereco,
        numero = excluded.numero, complemento = excluded.complemento;
    return p_id;
end;
$$;

revoke all on function public.meus_anuncios(), public.editar_sala(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.meus_anuncios(), public.editar_sala(uuid, jsonb) to authenticated;

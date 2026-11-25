create function public.excluir_sala(p_id uuid)
returns text[] language plpgsql security definer set search_path = ''
as $$
declare
    fotos_sala text[];
begin
    if auth.uid() is null then
        raise exception 'Entre na sua conta.' using errcode = '42501';
    end if;
    select fotos into fotos_sala from public.salas
    where id = p_id and responsavel_id = auth.uid() for update;
    if not found then
        raise exception 'Anúncio não encontrado.' using errcode = '42501';
    end if;
    if exists (select 1 from public.reservas where sala_id = p_id) then
        raise exception 'Este espaço possui reservas registradas. Retire o anúncio do ar para impedir novas reservas.' using errcode = '23503';
    end if;
    delete from public.salas where id = p_id and responsavel_id = auth.uid();
    return fotos_sala;
end;
$$;
revoke all on function public.excluir_sala(uuid) from public, anon, authenticated;
grant execute on function public.excluir_sala(uuid) to authenticated;

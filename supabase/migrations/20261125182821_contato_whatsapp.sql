grant update (telefone) on public.perfis to authenticated;
create policy "Atualizar próprio telefone" on public.perfis
for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function public.telefone_anuncio(p_sala uuid)
returns text language sql stable security definer set search_path = ''
as $$
    select p.telefone
    from public.salas s join public.perfis p on p.id = s.responsavel_id
    where s.id = p_sala and s.ativa;
$$;
revoke all on function public.telefone_anuncio(uuid) from public, anon, authenticated;
grant execute on function public.telefone_anuncio(uuid) to anon, authenticated;

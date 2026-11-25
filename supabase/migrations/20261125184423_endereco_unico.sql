alter table public.enderecos_salas add constraint endereco_obrigatorio
check (cep is not null and endereco is not null and btrim(endereco) <> ''
       and numero is not null and btrim(numero) <> '') not valid;

create unique index enderecos_salas_unicos on public.enderecos_salas (
    cep,
    regexp_replace(lower(numero), '[^[:alnum:]]', '', 'g'),
    regexp_replace(lower(coalesce(complemento, '')), '[^[:alnum:]]', '', 'g')
) where cep is not null and numero is not null;

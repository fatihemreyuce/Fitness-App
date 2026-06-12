-- Oturumdaki kullanıcının hesabını siler; ON DELETE CASCADE ile tüm verisi gider.
-- SECURITY DEFINER: auth.users üzerinde silme yetkisi için. search_path='' ile şema-enjeksiyonu kapalı.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Yalnız giriş yapmış kullanıcı çağırabilsin
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Code-review #8: profiles için açık DELETE politikası (cascade zaten siler; CRUD simetrisi için)
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

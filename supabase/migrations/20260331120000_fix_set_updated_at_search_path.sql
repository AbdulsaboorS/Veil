-- Security Advisor: Function Search Path Mutable (public.set_updated_at)
-- Pin search_path so object resolution cannot be hijacked via mutable search_path.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

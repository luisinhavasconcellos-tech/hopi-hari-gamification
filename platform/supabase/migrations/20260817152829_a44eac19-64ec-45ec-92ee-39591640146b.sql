update public.ci_competitors set instagram = 'betocarrero' where slug = 'beto-carrero';
update public.ci_competitors set instagram = 'thermasdoslaranjaisoficial' where slug = 'thermas-laranjais';

delete from public.ci_social_snapshots s
using public.ci_competitors c
where c.id = s.competitor_id
  and s.platform = 'instagram'
  and c.slug in ('beto-carrero','thermas-laranjais');

delete from public.ci_social_snapshots s
using public.ci_competitors c
where c.id = s.competitor_id
  and s.platform = 'tiktok'
  and c.slug = 'cacau-park';
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'nao autenticado' }, 401)
  }

  const url = new URL(req.url)
  const daysRaw = Number(url.searchParams.get('days') ?? '30')
  const ttlRaw = Number(url.searchParams.get('ttl') ?? '15')
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 365) : 30
  const ttl = Number.isFinite(ttlRaw) ? Math.min(Math.max(Math.trunc(ttlRaw), 1), 1440) : 15
  const refresh = url.searchParams.get('refresh') === 'true'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return json({ error: 'sessao invalida' }, 401)

  if (refresh) {
    const { error } = await supabase.rpc('invalidate_audience_aggregates')
    if (error) return json({ error: error.message }, 403)
  }

  const started = Date.now()
  const { data, error } = await supabase.rpc('get_audience_aggregates', {
    _days: days,
    _ttl_minutes: ttl,
  })

  if (error) {
    console.error('get_audience_aggregates failed', error.message)
    return json({ error: error.message }, 400)
  }

  return json({ ...(data as Record<string, unknown>), elapsed_ms: Date.now() - started })
})

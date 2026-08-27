create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('ci-collect-trends') where exists (select 1 from cron.job where jobname='ci-collect-trends');
select cron.unschedule('ci-collect-social') where exists (select 1 from cron.job where jobname='ci-collect-social');
select cron.unschedule('ci-generate-insights') where exists (select 1 from cron.job where jobname='ci-generate-insights');

select cron.schedule('ci-collect-trends', '0 9 * * 3', $$
  select net.http_post(
    url:='https://ylduczowjvbtxixvakxx.supabase.co/functions/v1/collect-trends',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZHVjem93anZidHhpeHZha3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzY5OTMsImV4cCI6MjA5MTgxMjk5M30.w2oKqIYXi6ZlxLLNOoxOPHSYylvZYrgDaYWTsz-zzFo"}'::jsonb,
    body:=jsonb_build_object('triggered_by','cron')
  ) as request_id;
$$);

select cron.schedule('ci-collect-social', '5 9 * * 3', $$
  select net.http_post(
    url:='https://ylduczowjvbtxixvakxx.supabase.co/functions/v1/collect-social',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZHVjem93anZidHhpeHZha3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzY5OTMsImV4cCI6MjA5MTgxMjk5M30.w2oKqIYXi6ZlxLLNOoxOPHSYylvZYrgDaYWTsz-zzFo"}'::jsonb,
    body:=jsonb_build_object('triggered_by','cron')
  ) as request_id;
$$);

select cron.schedule('ci-generate-insights', '40 9 * * 3', $$
  select net.http_post(
    url:='https://ylduczowjvbtxixvakxx.supabase.co/functions/v1/generate-insights',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZHVjem93anZidHhpeHZha3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzY5OTMsImV4cCI6MjA5MTgxMjk5M30.w2oKqIYXi6ZlxLLNOoxOPHSYylvZYrgDaYWTsz-zzFo"}'::jsonb,
    body:=jsonb_build_object('triggered_by','cron')
  ) as request_id;
$$);
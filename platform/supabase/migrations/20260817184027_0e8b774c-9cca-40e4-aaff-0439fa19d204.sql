select cron.unschedule('gsc-sync-daily') where exists (select 1 from cron.job where jobname = 'gsc-sync-daily');

select cron.schedule(
  'gsc-sync-daily',
  '30 9 * * *',
  $$
  select net.http_post(
    url := 'https://ylduczowjvbtxixvakxx.supabase.co/functions/v1/gsc-sync',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZHVjem93anZidHhpeHZha3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzY5OTMsImV4cCI6MjA5MTgxMjk5M30.w2oKqIYXi6ZlxLLNOoxOPHSYylvZYrgDaYWTsz-zzFo"}'::jsonb,
    body := '{"days":7}'::jsonb
  );
  $$
);
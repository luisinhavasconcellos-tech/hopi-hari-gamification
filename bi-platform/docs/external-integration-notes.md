# External Integration Notes

## X API

Official documentation confirms that the X API provides v2 REST access for posts, users, search, timelines, and engagement metrics. App-only Bearer authentication is supported for user lookup and recent post search. Recent search uses `GET https://api.x.com/2/tweets/search/recent`, covers the last seven days, and supports `tweet.fields=created_at,public_metrics,author_id`, pagination, and query operators. The platform integration uses only server-side `X_BEARER_TOKEN`; no X credential is exposed to browser code. X now describes usage as pay-per-use, so the daily job requests a bounded result set.

Sources:

1. https://docs.x.com/x-api/introduction
2. https://docs.x.com/x-api/posts/search/quickstart/recent-search
3. https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping

## Supabase Authentication

The live project settings endpoint reported email authentication enabled, signup enabled, and automatic email confirmation disabled. The deployed client therefore must show a confirmation-pending state and provide resend controls. The confirmation and password-reset callbacks are origin-aware, so the active custom domain is used at runtime.

Live settings checked at `https://ylduczowjvbtxixvakxx.supabase.co/auth/v1/settings` on 2026-08-27.

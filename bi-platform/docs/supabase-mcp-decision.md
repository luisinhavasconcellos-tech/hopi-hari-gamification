# Supabase MCP integration decision

The supplied project-scoped endpoint targets Supabase project `afqidjbyfrhtxheenhhp` with documentation, account, database, debugging, development, functions, and branching capabilities.

The exact URL-mode connector was attempted, but this environment requires a manually registered Supabase OAuth `client_id` for custom OAuth MCP servers. No Supabase OAuth client credentials were provided, so the custom connector was not created.

The official built-in **Supabase** connector is the intentional substitute. It is enabled, authenticated, exposes 29 Supabase MCP tools, and successfully listed `afqidjbyfrhtxheenhhp` as an active healthy project. A schema inspection confirmed that project currently has no public tables. It remains isolated from the BI platform's production Supabase project `ylduczowjvbtxixvakxx`, which continues as the source of truth.

This preserves production data and avoids an accidental migration. If exact URL-scoped connector registration is required later, create a Supabase OAuth application and supply its client ID and client secret through the connector's secure setup flow.

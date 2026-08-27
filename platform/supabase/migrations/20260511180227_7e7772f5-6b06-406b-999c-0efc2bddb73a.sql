
INSERT INTO public.facebook_insights (period_start, period_end, source, metrics)
VALUES (
  '2026-04-11', '2026-05-11', 'buzzmonitor',
  '{
    "headline": {
      "new_fans_total": -1610,
      "new_fans_avg_per_day": -53.67,
      "posts_total": 22,
      "posts_avg_per_day": 0.73,
      "interactions_total": 2286,
      "interactions_avg_per_day": 76.2
    },
    "interaction_distribution": {
      "reactions": {"value": 2110, "pct": 92.30},
      "comments": {"value": 100, "pct": 4.37},
      "shares": {"value": 76, "pct": 3.32}
    },
    "reactions_breakdown": {
      "like": {"value": 1822, "pct": 86.35},
      "love": {"value": 274, "pct": 12.99},
      "haha": {"value": 8, "pct": 0.38},
      "wow": {"value": 4, "pct": 0.19},
      "sad": {"value": 1, "pct": 0.05},
      "angry": {"value": 1, "pct": 0.05}
    },
    "top_posts": [
      {"rank": 1, "page": "Hopi Hari", "caption": "Seja na luz do dia ou na noite iluminada, o Aero Venturi entrega tudo!", "interactions": 268, "reactions": 240, "comments": 16, "shares": 12},
      {"rank": 2, "page": "Hopi Hari", "caption": "A segurança no Hopi Hari é inegociável. Bastidores Aero Venturi ep.3", "interactions": 203, "reactions": 180, "comments": 11, "shares": 12, "reach": 8515, "views": 8742, "engagement_reached_pct": 2.38, "clicks_total": 406},
      {"rank": 3, "page": "Hopi Hari", "date": "2026-04-21T19:00", "caption": "Não tem como explicar, só sentir", "interactions": 179},
      {"rank": 5, "page": "Hopi Hari", "date": "2026-05-02T19:55", "caption": "E esse show dos Rosa, hein?! Energia lá no alto"},
      {"rank": 7, "page": "Hopi Hari", "date": "2026-04-25T12:05", "caption": "Pros tikitos corajosos, a aventura também tá garantida", "interactions": 98},
      {"rank": 9, "page": "Hopi Hari", "date": "2026-04-12T12:00", "caption": "Quando você fala que vai ficar de pernas pro ar nesse feriadão"},
      {"rank": 11, "page": "Hopi Hari", "date": "2026-05-03T19:21", "caption": "Já estamos com saudades amís! O show Dos Rosa", "interactions": 65}
    ]
  }'::jsonb
)
ON CONFLICT (period_start, period_end, source) DO UPDATE SET metrics = EXCLUDED.metrics, updated_at = now();

INSERT INTO public.instagram_insights (period_start, period_end, source, metrics)
VALUES (
  '2026-04-11', '2026-05-11', 'buzzmonitor',
  '{
    "headline": {
      "new_followers_total": 4601,
      "new_followers_avg_per_day": 153.37,
      "posts_total": 29,
      "posts_avg_per_day": 0.97,
      "interactions_total": 137714,
      "interactions_avg_per_day": 4442.4
    },
    "interaction_distribution": {
      "likes": {"value": 114766, "pct": 83.02},
      "comments": {"value": 2233, "pct": 1.62},
      "shares": {"value": 19501, "pct": 14.11},
      "saves": {"value": 1739, "pct": 1.26}
    },
    "top_posts": [
      {"rank": 1, "account": "hopihari", "date": "2026-04-26T18:00", "caption": "PREPARADOS? A partir de 30 de abril — Aero Venturi & Kipi Raia", "interactions": 25313, "reposts": 277, "evasion_rate_pct": 62.2},
      {"rank": 3, "account": "hopihari", "date": "2026-05-02T19:55", "caption": "E esse show Dos Rosa, hein?!", "interactions": 14863, "reposts": 1729, "evasion_rate_pct": 66.9},
      {"rank": 5, "account": "hopihari", "date": "2026-04-27T18:00", "caption": "Em maio o País Mais Divertido é dedicado a elas — Mãe Não Paga", "reach": 89670, "reposts": 132},
      {"rank": 7, "account": "hopihari", "date": "2026-04-30T20:16", "caption": "Vem pro Hopi Hari em maio? Mãe Não Paga", "interactions": 6380}
    ],
    "other_channels": {
      "video_channel": {
        "interactions_total": 1944464,
        "interactions_avg_per_day": 62724.6,
        "likes": 5291,
        "comments": 47,
        "views": 1939126,
        "posts_total": 3,
        "posts_avg_per_day": 0.1
      },
      "threads": {
        "likes": 26,
        "reposts": 2,
        "replies": 2,
        "posts_total": 3,
        "posts_avg_per_day": 0.1,
        "top_post": {"account": "hopihari", "date": "2026-04-26T16:58", "caption": "Kipi raiá: 30 de abril", "interactions": 20, "likes": 18}
      }
    },
    "source_report": "Buzzmonitor"
  }'::jsonb
)
ON CONFLICT (period_start, period_end, source) DO UPDATE SET metrics = EXCLUDED.metrics, updated_at = now();

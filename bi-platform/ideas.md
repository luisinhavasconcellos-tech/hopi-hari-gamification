# Hopi Hari BI Platform — Deployment Design Specification

## Ground-Truth Reference

The source application at `/home/ubuntu/hopi-hari-gamification/platform/` is the ground-truth specification. The standalone deployment must preserve its information architecture, Supabase authentication model, protected-route behavior, internal dashboard layout, and 2025 Hopi Hari visual identity.

## Design Movement

The interface follows a **heritage editorial dashboard** direction: operational BI structure paired with expressive Fraunces display typography and an Art Nouveau-inspired theme-park identity.

## Core Principles

1. Preserve the asymmetrical login composition and persistent dashboard navigation.
2. Use only semantic Tailwind tokens for brand color application in components.
3. Keep data-dense views legible through clear hierarchy, restrained depth, and warm cream surfaces.
4. Treat authentication and access status as first-class product states, not incidental screens.

## Color Philosophy

Hopi green communicates institutional confidence and access control; cream reduces fatigue across dense analytical views; gold provides selective emphasis and brand warmth. The palette remains centralized in `src/index.css`, with component code consuming semantic tokens rather than hardcoded color values.

## Layout Paradigm

The login portal uses an asymmetric split composition. Authenticated BI views retain the existing persistent sidebar and wide analytical canvas, prioritizing scanability over centered marketing layouts.

## Signature Elements

The application keeps the Hopi flag cut, the multicolor brand rule, softly layered cream surfaces, and restrained botanical/aurora depth.

## Interaction Philosophy

Interactions remain direct and operational: immediate route guarding, clear focus states, concise feedback, and no decorative motion that delays frequent BI actions.

## Animation

Use short opacity and transform transitions under 300ms, preserve reduced-motion support, and reserve stronger entrance effects for login and access-status states.

## Typography System

Fraunces remains the display face for titles and major metrics. Inter remains the body and interface face, while JetBrains Mono is reserved for technical values.

## Brand Essence

**Positioning:** Hopi Hari’s internal intelligence system for authorized teams who need unified commercial, audience, and operational evidence.

**Personality:** Confident, warm, analytical.

## Brand Voice

Headlines are concise and assured; calls to action are explicit; microcopy explains access and data states without jargon.

Examples: “O parque inteiro, em um só painel.” and “Entre com sua conta para abrir a plataforma.”

## Wordmark & Logo

Retain the established Hopi Hari identity and its flag-derived geometric language. The official source asset remains authoritative; deployment-specific icons should echo the flag cut without replacing the brand mark.

## Signature Brand Color

**Hopi Green — `#006B59`**, exposed through the semantic `primary` token.

## Deployment Decisions

The standalone managed website uses clean root routes such as `/auth` and `/dashboard`, preserves the existing Supabase client configuration, and keeps every application route behind the existing `ProtectedRoute` gate except the explicitly public authentication and recovery endpoints.

## Style Decisions

All public authentication and access-status routes share one branded editorial shell: a Hopi green identity field or masthead, cream operational surface, Fraunces title, and a visible multicolor rule or flag-derived cue. Primary operational actions use semantic `primary` styling; gold remains reserved for selective emphasis and brand warmth. Password recovery is treated as a first-class access state rather than a generic utility card.

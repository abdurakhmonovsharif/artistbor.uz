# Codex Handoff

Date: 2026-05-02

## Current Status

This project is a Next.js admin dashboard for Artistbor. The current codebase has authentication, protected admin layout, theme switching, reusable CRUD/table/modal UI, and real Axios API service wiring for the main admin resources.

No mock data is used in the inspected admin pages. Pages call the API services in `src/lib/api/admin-content.ts` and auth calls `src/lib/api/auth.ts`.

## Implemented Routes

- `/` redirects to `/admin`
- `/login`
- `/admin`
- `/admin/categories`
- `/admin/faq`
- `/admin/regions`
- `/admin/services`
- `/admin/users`
- `/admin/artists`
- `/admin/applications`
- `/admin/orders`
- `/admin/comments`

## Auth, Layout, Theme

- `src/app/layout.tsx` wraps the app with `Providers`.
- `src/app/providers.tsx` composes `ThemeProvider`, `ToastProvider`, and `AuthProvider`.
- `src/lib/auth/auth-provider.tsx` loads `/api/admin-auth/me`, redirects unauthenticated users to `/login`, and supports development-only auth preview through `NEXT_PUBLIC_ADMIN_AUTH_PREVIEW`.
- `src/app/api/admin-auth/*` stores the backend auth token in an httpOnly cookie and never exposes it to browser JavaScript.
- `src/app/api/admin-proxy/[...path]/route.ts` forwards admin API requests to `/v1/admin/*` with server-side Bearer auth.
- `src/components/admin/admin-layout.tsx` protects admin children, shows loading state during session check, and renders sidebar/header after auth.
- `src/lib/theme/theme-provider.tsx` persists light/dark theme in localStorage under `artistbor_theme`.

## Completed Phases

- Base Next.js app structure.
- Admin auth flow with login/logout/httpOnly session cookie.
- Axios API client with same-origin BFF proxy and 401 handling.
- Protected admin layout with sidebar, header, responsive mobile menu, theme toggle, and toast provider.
- Reusable admin CRUD surface: data table, pagination, modal, form field, confirm dialog, status badge, loading/empty/error states.
- Real API wiring for categories, FAQ, regions/districts, services, users, artists, applications, orders, and artist comments.
- `.env.example` checkpoint with public API base URL and auth preview flag.

## Remaining Phases

- Validate all request/response shapes against live Swagger/backend responses.
- Fix any lint/build issues found by verification.
- Complete richer table columns for resources that currently render raw JSON previews, especially orders and comments.
- Wire remaining artist detail tabs to real endpoints if backend provides them: services, availability, gallery, comments, ratings.
- Add routes or remove sidebar entries for currently unwired menu links: `/admin/ratings`, `/admin/notifications`, `/admin/trash`.
- Continue production hardening: backend role enforcement, safer error display, endpoint exposure review, and API failure UX.
- Add focused tests after API shapes stabilize.

## Known Risks

- Several API service methods contain TODO comments because Swagger response schemas were missing or incomplete.
- `NEXT_PUBLIC_*` variables are browser-visible and must not contain secrets.
- Some sidebar links point to pages that do not currently exist.

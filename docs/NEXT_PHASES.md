# Next Phases

Date: 2026-05-02

## Recommended Next Phase

Phase 1: Verification and stabilization.

Goal: make the current admin routes compile cleanly, match live backend response shapes, and remove broken navigation before adding new features.

## Phase 1 Checklist

- Run `npm run lint` and fix reported issues.
- Run `npm run build` and fix compile/runtime build issues.
- Compare `src/lib/api/admin-content.ts` payloads and normalized responses with live Swagger/backend responses.
- Confirm each implemented route loads under authenticated admin session:
  - `/admin/categories`
  - `/admin/faq`
  - `/admin/regions`
  - `/admin/services`
  - `/admin/users`
  - `/admin/artists`
  - `/admin/applications`
  - `/admin/orders`
  - `/admin/comments`
- Decide whether to implement or remove sidebar entries for:
  - `/admin/ratings`
  - `/admin/notifications`
  - `/admin/trash`

## Phase 2

Improve resource-specific UX after API response shapes are verified.

- Replace raw JSON preview columns on orders and comments with stable columns from backend data.
- Improve detail modals for artists, applications, orders, and comments.
- Add safer validation for destructive actions.

## Phase 3

Security and production hardening.

- Verify role/permission behavior for admin/operator.
- Review public endpoint exposure and error messages.
- Confirm no secrets are stored in `NEXT_PUBLIC_*` variables.
- Add rate-limit/error handling guidance if backend supports it.

## Phase 4

Tests and regression protection.

- Add focused tests for API normalization helpers.
- Add smoke tests for protected route redirects and main admin pages.
- Add manual QA checklist for real backend credentials and production deploy flow.

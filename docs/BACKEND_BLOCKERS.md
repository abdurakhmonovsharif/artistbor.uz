# Backend Blockers

Date: 2026-05-02

## Summary

Live authenticated smoke testing confirmed that the frontend auth flow works with
the corrected real admin credentials, but several admin resources are blocked by
backend CORS / OPTIONS behavior or backend runtime errors.

## Swagger Verification

- Swagger UI is available at `https://api.artistbor.uz/docs`.
- Swagger UI is protected by Basic Auth. Access was verified with provided
  Swagger credentials, but credentials are not stored in this repository.
- Swagger UI loads the OpenAPI spec from `https://api.artistbor.uz/docs/api`.
- The spec is OpenAPI `3.0.0` and contains 64 `/v1/admin/*` paths.
- The spec does not define `OPTIONS` for admin paths: `0` `/v1/admin/*` paths
  include an `options` operation.
- Several Swagger response schemas are incomplete or differ from the live API
  envelope. For example, live list responses use `data.list` and `data.meta`.

## Auth Status

- `POST /v1/admin/auth/login` returns `200` with corrected credentials.
- Frontend stores the backend token in an httpOnly admin session cookie through
  `/api/admin-auth/login`; the token is not available to browser JavaScript.
- `GET /v1/admin/auth/me` returns `200`.
- Frontend auth flow is working.

## Fixed Frontend Issue

- API list normalization now supports the live API response shape `data.list`.
- Frontend verification commands currently pass:
  - `npm run lint`
  - `npm run build`

## Browser CORS / OPTIONS Failures

The following endpoints were previously blocked in the browser by
CORS/preflight when the frontend called the backend directly:

- `/v1/admin/categories`
- `/v1/admin/regions`
- `/v1/admin/artists`
- `/v1/admin/order`
- `/v1/admin/artist-comments`
- Category lookup used by `/admin/services`

Backend should allow `OPTIONS` preflight for `/v1/admin/*` and allow:

- `Authorization` header
- `Content-Type` header
- `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` methods
- Frontend origin used by local and production dashboard environments

The frontend now calls same-origin `/api/admin-proxy/*`; the Next.js route
handler attaches `Authorization` server-side. Backend CORS should still be fixed
for any non-BFF clients that call the API directly.

## Backend 500 Errors

- `/v1/admin/regions` returns backend `500`: missing `BaseAdminController`.
- `/v1/admin/artist-comments` returns backend `500`: missing
  `artist_comment.deleted_at`.

## Routes Smoke Tested

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

Implemented after the initial smoke test and pending full live verification
after backend fixes:

- `/admin/ratings`
- `/admin/notifications`
- `/admin/trash`

## Remaining Manual Verification

- Destructive actions were not submitted.
- Most detail/edit flows need real rows.
- Pagination needs data with multiple pages.

# Backend/runtime notes

Date: 2026-08-26

## Current verified contract state

- `https://api.artistbor.uz/docs/api` is reachable and returns OpenAPI 3.0 YAML.
- The current spec contains 99 `/v1/admin/*` paths and 129 admin operations.
- The dashboard calls the backend through same-origin `/api/admin-proxy/*`; the
  proxy attaches the httpOnly admin session token server-side.
- `GET /v1/admin/notifications` documents only `type`, `date_from`, and
  `date_to`; the frontend does not send invented pagination/sort parameters.
- Availability, artist service, gallery, video, notification, balance and
  transaction requests in the dashboard were matched to the current spec.

## Historical issues — reproduction required

The following failures were recorded on 2026-05-02 but were not reproduced with
authenticated requests during this UI delivery:

- Direct browser-to-backend CORS/OPTIONS failures.
- `/v1/admin/regions` returning a missing `BaseAdminController` error.
- `/v1/admin/artist-comments` returning a missing `artist_comment.deleted_at`
  error.

They must not be reported as current blockers without a new request/response and
backend log from the active environment. Direct-backend CORS also does not block
the current same-origin proxy flow.

## Remaining backend contract risks

- Several list/detail responses still omit concrete item schemas.
- Stable machine-readable error `code` values should remain separate from
  localized human messages.
- New status values must define their domain and numeric/string aliases; a
  numeric value cannot be mapped globally across account, order, payment and
  application domains.
- Mutating endpoints require staging/test-data verification; no production data
  was changed as part of this implementation.

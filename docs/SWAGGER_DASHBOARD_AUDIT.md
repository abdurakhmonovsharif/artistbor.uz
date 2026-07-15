# Swagger Dashboard Audit

Date: 2026-05-02

## Scope

This audit compares the current admin dashboard implementation against the
Swagger/OpenAPI spec at:

- Swagger UI: `https://api.artistbor.uz/docs`
- OpenAPI spec: `https://api.artistbor.uz/docs/api`

The spec was re-inspected with Swagger Basic Auth. Credentials were used only
for inspection and are not stored in this repository.

No live resource smoke testing was retried in this pass because backend
CORS/OPTIONS and known 500 errors are still blocking browser verification.
No destructive API actions were submitted.

## Swagger Summary

- OpenAPI version: `3.0.0`
- Admin paths found: `64`
- Admin `OPTIONS` operations found: `0`
- Main implemented dashboard routes found:
  - `/admin/categories`
  - `/admin/faq`
  - `/admin/regions`
  - `/admin/services`
  - `/admin/users`
  - `/admin/artists`
  - `/admin/applications`
  - `/admin/orders`
  - `/admin/comments`
  - `/admin/ratings`
  - `/admin/notifications`
  - `/admin/trash`

## Global Findings

| Area | Status | Notes |
|---|---:|---|
| Mock data | Pass | Admin pages call API services. The only non-live user object is `previewAdmin`, gated by development-only `NEXT_PUBLIC_ADMIN_AUTH_PREVIEW`. |
| Invented endpoints | Pass | Implemented API methods use documented Swagger admin endpoints. |
| Undocumented query params | Pass with notes | No unsupported params are sent for notifications or trash search. Trash still shows page/limit fields while search mode does not send them. |
| Destructive confirmations | Pass | Delete, block, approve/reject, cancel/complete, restore, and permanent delete actions open confirmation or submit modals before API calls. |
| Response normalization | Pass with risk | `normalizeList` supports arrays and `data.items`, `data.list`, `data.data`, `data.results` with `_meta`, `pagination`, or `meta`. Many Swagger responses omit concrete schemas. |
| Raw JSON fallback | Expected | Orders, comments, ratings, notifications, and trash use raw JSON previews where Swagger omits stable row schemas. |
| Live browser status | Blocked | Backend CORS/OPTIONS and backend 500 errors remain documented in `docs/BACKEND_BLOCKERS.md`. |

## API Client Audit

| Check | Status | Notes |
|---|---:|---|
| Bearer token usage | Pass | Browser calls same-origin `/api/admin-proxy/*`; the route handler reads the httpOnly session cookie and sends `Authorization: Bearer <token>` server-side. |
| Auth login | Pass | `POST /api/admin-auth/login` calls backend `/v1/admin/auth/login` and sets an httpOnly cookie. |
| Current admin | Pass | `GET /api/admin-auth/me` is used on refresh. |
| Logout | Pass | `POST /api/admin-auth/logout` calls backend logout when possible, then clears the session cookie. |
| 401 handling | Pass | Response interceptor redirects to `/login`, except development auth preview; BFF route handlers clear invalid session cookies. |
| Response unwrap | Pass | `unwrapData` supports the API envelope shape `{ success, data }`. |
| Live `data.list` shape | Pass | `normalizeList` supports live list response shape `data.list` and `data.meta`. |

## Sidebar Audit

| Sidebar item | Route exists? | Resource status | Notes |
|---|---:|---:|---|
| `/admin` | Yes | Implemented | Dashboard home exists. No Swagger stats endpoint exists for dashboard home. |
| `/admin/users` | Yes | Implemented | Maps to `/v1/admin/user`. |
| `/admin/artists` | Yes | Partial | Main artist list/detail/update implemented. Artist nested resources are not wired yet. |
| `/admin/applications` | Yes | Implemented | Maps to `/v1/admin/application`. |
| `/admin/categories` | Yes | Implemented | Maps to `/v1/admin/categories`. |
| `/admin/services` | Yes | Implemented | Maps to `/v1/admin/service`. |
| `/admin/orders` | Yes | Implemented | Maps to `/v1/admin/order`. |
| `/admin/regions` | Yes | Implemented | Regions and districts are grouped under one route. |
| `/admin/comments` | Yes | Implemented | Maps to `/v1/admin/artist-comments`. |
| `/admin/ratings` | Yes | Implemented | Maps to `/v1/admin/artist-ratings`. |
| `/admin/notifications` | Yes | Implemented | Maps to `/v1/admin/notifications`. |
| `/admin/faq` | Yes | Implemented | Maps to `/v1/admin/faq`. |
| `/admin/trash` | Yes | Implemented | Maps to `/v1/admin/trash/*`. |

Every sidebar item maps to a real implemented route. Every implemented main
resource route appears in the sidebar.

## Route Audit

| Dashboard route | Swagger endpoint | Implemented? | Dashboard component | Missing filters | Missing form fields | Missing actions | Wrong endpoint paths | Wrong request body | Pagination mismatch | Response schema risk | Notes/TODO |
|---|---|---:|---|---|---|---|---|---|---|---|---|
| `/admin/categories` | `GET/POST /v1/admin/categories`; `GET/PUT/DELETE /v1/admin/categories/{id}`; `POST /v1/admin/categories/{id}/restore` | Yes | `src/app/admin/categories/page.tsx` via `CrudPage` | None. Swagger filters `parent_id`, `status`, `name` are present. | None. Create/update fields match Swagger. | None. View, edit, delete, restore are present. | None found. | None found. | None. Swagger does not document page/limit for categories. | Medium. Category schema exists, but list envelope shape is not fully concrete. | Restore action is shown for all rows, not only deleted rows. This is UI-state risk, not Swagger mismatch. |
| `/admin/faq` | `GET/POST /v1/admin/faq`; `GET/PUT/DELETE /v1/admin/faq/{id}` | Yes | `src/app/admin/faq/page.tsx` via `CrudPage` | None. Swagger filters `status`, `search`, `page`, `limit` are present through initial/pagination state. | None. Create/update fields match Swagger. | None. View, edit, delete are present. | None found. | None found. | None. `page` and `limit` are sent. | Low/medium. `Faq` schema exists, list envelope remains backend-dependent. | Good Swagger alignment. |
| `/admin/regions` | `GET/POST /v1/admin/regions`; `GET/PUT/DELETE /v1/admin/regions/{id}`; `GET /v1/admin/regions/{id}/districts`; `GET/POST /v1/admin/districts`; `GET/PUT/DELETE /v1/admin/districts/{id}` | Yes | `src/app/admin/regions/page.tsx` | None. Region filters `name`, `status`; district filters `region_id`, `name`, `status` are present. | None. Region and district forms match Swagger. | None. Region district lookup is present. | None found. | None found. | None. Swagger does not document page/limit for regions/districts. | Medium. Region/District schemas exist, list envelopes omitted. | Districts are correctly nested under regions route instead of sidebar. |
| `/admin/services` | `GET/POST /v1/admin/service`; `PUT/DELETE /v1/admin/service/{id}` | Yes | `src/app/admin/services/page.tsx` via `CrudPage` | None. Swagger filters `category_id`, `status` are present. | None. Create/update fields match Swagger. | Partial by Swagger design. View uses row data because Swagger has no `GET /v1/admin/service/{id}`. | None found. | None found. | None. Swagger does not document page/limit for services. | Medium. Service schema exists, list envelope omitted. | Category lookup uses documented `/v1/admin/categories`. |
| `/admin/users` | `GET /v1/admin/user`; `POST /v1/admin/user/create-staff`; `PUT /v1/admin/user/{id}`; `POST /v1/admin/user/{id}/block`; `POST /v1/admin/user/{id}/unblock` | Partial | `src/app/admin/users/page.tsx` | Role filter exists but options omit `artist`; Swagger says role is string and User schema includes `client`, `artist`, `admin`. | None for documented create-staff/update payloads. | Missing read-only detail modal; Swagger has no `GET /v1/admin/user/{id}`. Block/unblock present. | None found. | None found. | None. `page` and `limit` are sent. | Medium. User schema exists, list envelope omitted. | Recommended patch: add `Artist` to role filter options or make role free-form/select with documented values. |
| `/admin/artists` | `GET /v1/admin/artists`; `GET/PUT /v1/admin/artist/{id}` | Partial | `src/app/admin/artists/page.tsx` | None. Swagger filters `search`, `is_verified`, `is_top`, `status`, `page`, `limit` are present. | None for artist profile update body. | Main artist view/edit present. Nested detail tabs are placeholders. | None found. | None found. | None. `page` and `limit` are sent. | Medium. ArtistProfile schema exists, list/detail envelopes still need live verification. | Detail tabs mention services/availability/gallery/comments/ratings but are not wired yet. This is known deferred work, not a broken route. |
| `/admin/applications` | `GET /v1/admin/application`; `GET/PUT /v1/admin/application/{id}`; `POST /v1/admin/application/approve/{id}`; `POST /v1/admin/application/reject/{id}` | Yes with enum risk | `src/app/admin/applications/page.tsx` | None technically. Swagger only says `status` string; UI assumes `pending`, `approved`, `rejected`. | None. Update fields and reject `reason` match Swagger. | None. View, edit, approve, reject are present. | None found. | None found. | None. `page` and `limit` are sent. | Medium/high. Application response schema is not concrete in Swagger. | Recommended patch after backend confirmation: verify actual status enum values. |
| `/admin/orders` | `GET /v1/admin/order`; `GET/PUT /v1/admin/order/{id}`; `POST /v1/admin/order/{id}/confirm`; `POST /v1/admin/order/{id}/cancel`; `POST /v1/admin/order/{id}/complete`; `POST /v1/admin/order/{id}/reschedule`; `GET /v1/admin/order/{id}/conflicts` | Yes with enum risk | `src/app/admin/orders/page.tsx` | None technically. Swagger only says `status` string; UI assumes common order statuses. | None. Update, cancel, and reschedule bodies match Swagger. | None. View, edit, confirm, complete, cancel, reschedule, conflicts are present. | None found. | None found. | None. `page` and `limit` are sent. | High. Order row/detail schemas are omitted; UI uses raw JSON preview/detail. | Recommended patch after live data: replace raw JSON table with stable backend fields. |
| `/admin/comments` | `GET /v1/admin/artist-comments`; `GET /v1/admin/artist-comments/pending`; `GET/PUT/DELETE /v1/admin/artist-comments/{id}`; `POST /v1/admin/artist-comments/{id}/publish`; `POST /v1/admin/artist-comments/{id}/unpublish`; `POST /v1/admin/artist-comments/{id}/restore`; `GET /v1/admin/artists/{artistId}/comments` | Yes | `src/app/admin/comments/page.tsx` | None. Filters `status`, `artist_id`, `client_id`, `page`, `limit` are present for all comments; pending uses page/limit. | None. Edit fields match Swagger. | None. View, edit, delete, publish, unpublish, restore, pending list, artist comments are present. | None found. | None found. | None. `page` and `limit` are sent where Swagger supports them. | High. Comment item schema is omitted; UI uses raw JSON preview/detail. | Backend currently has known 500 for `artist_comment.deleted_at`. |
| `/admin/ratings` | `GET /v1/admin/artist-ratings`; `GET/DELETE /v1/admin/artist-ratings/{id}`; `GET /v1/admin/artists/{artistId}/ratings` | Yes | `src/app/admin/ratings/page.tsx` | None. Filters `artist_id`, `client_id`, `rating`, `is_published`, `page`, `limit` are present. | N/A. Swagger has no create/update rating body. | None. View, delete, artist-specific lookup are present. | None found. | None found. | None. `page` and `limit` are sent. | High. Rating item schema is omitted; UI uses defensive raw JSON preview. | Good endpoint coverage for Phase 10. |
| `/admin/notifications` | `GET /v1/admin/notifications`; `GET /v1/admin/notifications/{id}`; `POST /v1/admin/notifications/send`; `POST /v1/admin/notifications/send-all` | Yes with pagination UI risk | `src/app/admin/notifications/page.tsx` | None. Filters `type`, `date_from`, `date_to` are present. | None. Send filtered and send-all bodies match Swagger. | None. Detail, send filtered, send-all are present. | None found. | None found. | Minor risk. Swagger does not document page/limit; page does not send them, but renders `Pagination` if backend returns meta and the handler is a no-op. | High. Notification list/detail schemas are omitted. | Recommended patch: hide pagination unless Swagger adds list pagination params, or wire page/limit only after backend documents them. |
| `/admin/trash` | `GET /v1/admin/trash/stats`; `GET /v1/admin/trash/search`; `GET /v1/admin/trash/{model}`; `GET/DELETE /v1/admin/trash/{model}/{id}`; `POST /v1/admin/trash/{model}/{id}/restore` | Yes with schema risk | `src/app/admin/trash/page.tsx` | None. Search `q`, `model`; list `model`, `page`, `limit` are present. | N/A. Swagger has no create/update payloads. | None. Stats, search, list, detail, restore, permanent delete are present. | None found. | None found. | Search endpoint has no page/limit in Swagger; page correctly does not send page/limit in search mode. List by model sends page/limit. | High. Trash stats/list/detail schemas are omitted; UI uses raw key/value and JSON previews. | Actions require numeric `id`; if live API returns another key, action mapping will need a patch. |

## Swagger Resources Not Exposed As Separate Pages

| Swagger resource | Current dashboard treatment | Recommendation |
|---|---|---|
| `/v1/admin/districts` | Implemented inside `/admin/regions` as a tab. | Keep nested under regions. |
| `/v1/admin/artist-service` | Not implemented yet. Artist detail has placeholder Services tab. | Implement under Artist detail tabs rather than sidebar unless product wants top-level management. |
| `/v1/admin/artist-gallery` | Not implemented yet. Artist detail has placeholder Gallery tab. | Implement under Artist detail tabs. |
| `/v1/admin/artist-videos` | Not implemented yet. No visible tab currently. | Add under Artist detail tabs when Phase for artist detail resources starts. |
| `/v1/admin/artist/{artistId}/availability`, `/busy-slot` | Not implemented yet. Artist detail has placeholder Availability tab. | Implement under Artist detail Availability tab. |
| `/v1/admin/file/upload` | Not implemented as standalone page. | Keep as utility used by forms that need upload. |

## Critical Mismatches

No critical broken endpoint path or build-blocking mismatch was found in the
current implemented dashboard routes.

The main risks are:

1. Backend live verification remains blocked by CORS/OPTIONS and backend 500s.
2. Several Swagger responses omit concrete schemas, so multiple pages must use
   raw JSON and defensive normalization.
3. `/admin/notifications` has a pagination display risk because Swagger does
   not document list pagination.
4. `/admin/users` role filter is missing the documented `artist` role option.
5. Artist nested resources are represented by placeholder tabs but are not
   wired yet.

## Recommended Fixes

1. Backend: fix CORS/OPTIONS for `/v1/admin/*` and the known backend 500 errors
   before another full browser smoke test.
2. Frontend: add `Artist` to the `/admin/users` role filter options.
3. Frontend: remove or disable notification pagination UI unless backend adds
   documented `page` and `limit` params for `GET /v1/admin/notifications`.
4. Frontend/backend: verify real enum values for application and order statuses,
   then update select options to match backend constants.
5. Frontend: implement Artist detail nested resources from Swagger:
   artist services, availability/busy slots, gallery, videos, comments, ratings.
6. Frontend: replace raw JSON previews for orders/comments/ratings/notifications
   after backend provides stable response fields or live data confirms them.
7. Frontend/backend: verify Trash live response IDs and model fields before
   relying on restore/permanent delete actions in production.

## Build Verification

This audit should be followed by:

- `npm run lint`
- `npm run build`

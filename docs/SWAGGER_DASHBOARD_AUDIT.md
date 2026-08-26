# Live OpenAPI dashboard audit

Date: 2026-08-26

Source: `https://api.artistbor.uz/docs/api`

## Summary

| Check | Result |
|---|---|
| OpenAPI | 3.0 YAML, reachable |
| Admin paths | 99 |
| Admin operations | 129 |
| Mock dashboard data | None in production flows |
| API transport | Same-origin `/api/admin-proxy/*` with server-side Bearer token |
| Status/feedback localization | Centralized UZ/RU catalog |
| Response normalization | Arrays and common `data.list/items/results` envelopes supported |

## Contracts verified for this delivery

| Feature | Live endpoint/shape | Dashboard state |
|---|---|---|
| Availability | `GET /v1/admin/artist/{artistId}/availability` | Expired holds excluded |
| Busy slot create | `POST /v1/admin/artist/{artistId}/busy-slot` with `date`, `time_from`, `time_to`, optional `note` | Implemented |
| Busy slot delete | `DELETE /v1/admin/busy-slot/{id}` | Implemented |
| Busy slot edit | No update endpoint | Delete/create with restore-on-failure |
| Artist service | list, `assign`, update/delete, region prices | Implemented in artist detail/create flows |
| Artist finance | `/artist/{id}/balance`, `/artist/{id}/transactions` | Implemented |
| Gallery upload | `POST /v1/admin/artist-gallery/{artist_id}`, multipart array field `files` | Implemented |
| Gallery delete | `DELETE /v1/admin/artist-gallery/{id}` | Implemented |
| Artist video CRUD | `/v1/admin/artist-videos`, `/v1/admin/artist-videos/{id}` | Implemented at `/admin/videos` |
| Filtered notification | `POST /v1/admin/notifications/send`; `title` and `message` required, role/location optional | Implemented with mandatory UI audience guard |
| Send all | `POST /v1/admin/notifications/send-all` | Kept as a separate explicit flow |
| Notification list | `type`, `date_from`, `date_to` only | No invented `page`, `limit`, or `sort` params |

## Safety decisions

- The dashboard does not treat `source: hold` as active when `is_expired: true`.
- No non-existent busy-slot update endpoint was invented.
- If a delete/create edit fails after deletion, the original busy slot is
  recreated. A failed rollback produces a distinct localized critical message.
- Filtered notification submit is blocked unless role, region or district is
  selected, preventing accidental all-user delivery through the filtered API.
- Gallery upload uses the exact `files` field documented by OpenAPI.
- Artist video update sends only fields accepted by the update contract.

## Remaining contract risks

- Several list/detail item schemas remain absent or broad, so defensive parsing
  is still required.
- Live authenticated read-back is required for mutation verification.
- Newly added backend resources should be reviewed as separate product scope
  with explicit permissions and UX before being added to navigation.

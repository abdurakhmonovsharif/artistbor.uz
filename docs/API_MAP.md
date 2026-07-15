# API Map

Date: 2026-05-02

## Client

- `src/lib/api/client.ts`
  - `NEXT_PUBLIC_API_BASE_URL`, default `https://api.artistbor.uz`
  - Browser Axios instance calls local `/api/admin-proxy/*`
  - Next.js route handlers attach the admin Bearer token from an httpOnly cookie
  - 401 redirects to `/login` unless development auth preview is enabled
  - `unwrapData` and normalized error message handling

## Auth API

- `src/lib/api/auth.ts`
  - `POST /api/admin-auth/login`
  - `GET /api/admin-auth/me`
  - `POST /api/admin-auth/logout`
- `src/app/api/admin-auth/*`
  - Calls backend `/v1/admin/auth/*`
  - Stores the backend token in an httpOnly, sameSite cookie
  - Does not expose the token to browser JavaScript

## Admin Content API

- `categoriesApi`
  - `GET /v1/admin/categories`
  - `GET /v1/admin/categories/{id}`
  - `POST /v1/admin/categories`
  - `PUT /v1/admin/categories/{id}`
  - `DELETE /v1/admin/categories/{id}`
  - `POST /v1/admin/categories/{id}/restore`

- `faqApi`
  - `GET /v1/admin/faq`
  - `GET /v1/admin/faq/{id}`
  - `POST /v1/admin/faq`
  - `PUT /v1/admin/faq/{id}`
  - `DELETE /v1/admin/faq/{id}`

- `regionsApi`
  - `GET /v1/admin/regions`
  - `GET /v1/admin/regions/{id}`
  - `POST /v1/admin/regions`
  - `PUT /v1/admin/regions/{id}`
  - `DELETE /v1/admin/regions/{id}`
  - `GET /v1/admin/regions/{id}/districts`

- `districtsApi`
  - `GET /v1/admin/districts`
  - `GET /v1/admin/districts/{id}`
  - `POST /v1/admin/districts`
  - `PUT /v1/admin/districts/{id}`
  - `DELETE /v1/admin/districts/{id}`

- `servicesApi`
  - `GET /v1/admin/service`
  - `POST /v1/admin/service`
  - `PUT /v1/admin/service/{id}`
  - `DELETE /v1/admin/service/{id}`

- `usersApi`
  - `GET /v1/admin/user`
  - `POST /v1/admin/user/create-staff`
  - `PUT /v1/admin/user/{id}`
  - `POST /v1/admin/user/{id}/block`
  - `POST /v1/admin/user/{id}/unblock`

- `artistsApi`
  - `GET /v1/admin/artists`
  - `GET /v1/admin/artist/{id}`
  - `PUT /v1/admin/artist/{id}`

- `applicationsApi`
  - `GET /v1/admin/application`
  - `GET /v1/admin/application/{id}`
  - `PUT /v1/admin/application/{id}`
  - `POST /v1/admin/application/approve/{id}`
  - `POST /v1/admin/application/reject/{id}`

- `ordersApi`
  - `GET /v1/admin/order`
  - `GET /v1/admin/order/{id}`
  - `PUT /v1/admin/order/{id}`
  - `POST /v1/admin/order/{id}/confirm`
  - `POST /v1/admin/order/{id}/reschedule`
  - `POST /v1/admin/order/{id}/cancel`
  - `POST /v1/admin/order/{id}/complete`
  - `GET /v1/admin/order/{id}/conflicts`

- `commentsApi`
  - `GET /v1/admin/artist-comments`
  - `GET /v1/admin/artist-comments/pending`
  - `GET /v1/admin/artist-comments/{id}`
  - `PUT /v1/admin/artist-comments/{id}`
  - `DELETE /v1/admin/artist-comments/{id}`
  - `POST /v1/admin/artist-comments/{id}/publish`
  - `POST /v1/admin/artist-comments/{id}/unpublish`
  - `POST /v1/admin/artist-comments/{id}/restore`
  - `GET /v1/admin/artists/{artistId}/comments`

## Response Handling Notes

- List responses are normalized by `normalizeList` from arrays, `items`, `data`, or `results`.
- Pagination is read from `_meta`, `pagination`, or `meta`.
- Many endpoint response bodies are marked TODO in code because Swagger schemas were missing or incomplete.

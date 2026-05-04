# Backend Task Message

Salom. Admin dashboard frontend live API bilan test qilindi. Auth flow ishlayapti,
lekin admin resource endpointlarda backend tarafda blockerlar bor.

## Frontend Auth Holati

- `POST /v1/admin/auth/login` ishlayapti, `200` qaytyapti.
- Token olinadi va frontendda saqlanadi.
- `GET /v1/admin/auth/me` ishlayapti, `200` qaytyapti.
- Demak frontend login/auth flow ishlayapti.

## Asosiy Blocker: CORS Preflight

Browser admin endpointlarga `Authorization` header bilan request yuborgani uchun
oldin `OPTIONS` preflight ketadi. Hozir backend `OPTIONS /v1/admin/*`
requestlarni handle qilmayapti va ayrim endpointlarda `404` qaytyapti.

Shu sabab browser requestni bloklayapti.

Iltimos backendda `/v1/admin/*` uchun CORS/OPTIONS handling qo'shib bering.

## Kerakli CORS Sozlamalar

- `OPTIONS` method barcha `/v1/admin/*` endpointlar uchun ishlashi kerak.
- Quyidagi headers ruxsat berilishi kerak:
  - `Authorization`
  - `Content-Type`
- Quyidagi methods ruxsat berilishi kerak:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
  - `OPTIONS`
- Frontend originlariga ruxsat berish kerak:
  - local dashboard origin
  - production dashboard domain/subdomain

## Browserda Bloklanayotgan Endpointlar

- `OPTIONS /v1/admin/categories`
- `OPTIONS /v1/admin/regions`
- `OPTIONS /v1/admin/artists`
- `OPTIONS /v1/admin/order`
- `OPTIONS /v1/admin/artist-comments`
- `/admin/services` sahifasida category lookup uchun ishlatiladigan
  `/v1/admin/categories`

## Backend Runtime Xatolari

### 1. Regions Endpoint

`GET /v1/admin/regions`

- `500` qaytyapti
- Error: `Class "backend\base\BaseAdminController" not found`

### 2. Artist Comments Endpoint

`GET /v1/admin/artist-comments`

- `500` qaytyapti
- Error: `column artist_comment.deleted_at does not exist`

## Swagger Tekshiruvi

- Swagger: `https://api.artistbor.uz/docs`
- OpenAPI spec: `https://api.artistbor.uz/docs/api`
- Specda `/v1/admin/*` endpointlar bor.
- Lekin admin pathlar uchun `OPTIONS` operation yo'q.
- Shu sabab browser preflight uchun backendda alohida CORS/OPTIONS support
  kerak.

## Frontendda Qilingan Moslashuv

Frontend tarafda bitta moslashuv fix qilindi:

- Live API list response `data.list` va `data.meta` qaytaryapti.
- Frontend normalizer endi `data.list` ni ham o'qiydi.

## Backendda Kerakli Tasklar

1. `/v1/admin/*` uchun CORS preflight `OPTIONS` requestlarni to'g'ri handle
   qilish.
2. `Authorization` va `Content-Type` headersga ruxsat berish.
3. `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` methodsga ruxsat berish.
4. Local va production frontend originlarini allow qilish.
5. `GET /v1/admin/regions` dagi `BaseAdminController` xatosini tuzatish.
6. `GET /v1/admin/artist-comments` dagi `artist_comment.deleted_at`
   database/schema xatosini tuzatish.
7. Fixdan keyin frontend admin dashboardda quyidagi sahifalarni qayta test
   qilamiz:
   - categories
   - regions
   - services
   - artists
   - orders
   - comments

## Xulosa

Hozircha frontendda auth ishlayapti, lekin yuqoridagi backend blockerlar sabab
admin resource sahifalar to'liq ishlamayapti.

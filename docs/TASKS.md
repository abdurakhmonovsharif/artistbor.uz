Audit read-only qilindi. FRONTEND_INTEGRATION_GUIDE.md admin + mobile + artist panel uchun yozilgan, lekin bu checkout Next.js admin dashboard.
Shuning uchun “bizda” deganda admin panel qismini solishtirdim.

Bajarilgan

- Order confirm’da deadline_minutes yuborish bor.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:30
  Code: src/app/admin/orders/page.tsx:420

- Order detail’da advance_amount, payment_deadline, payment status va orderPayments ko‘rsatish bor.
  Code: src/types/api.ts:115, src/app/admin/orders/page.tsx:997

- Payment verify/reject API va UI action bor. Pending payment topiladi, tasdiqlash/rad etish modalga ulangan.
  Code: src/lib/api/admin-content.ts:908, src/app/admin/orders/page.tsx:447

- Artist service region price get/upsert/delete bor. Artist detail ichida viloyat narxlarini ko‘rish, qo‘shish/yangilash, o‘chirish UI bor.
  Code: src/lib/api/admin-content.ts:775, src/app/admin/artists/page.tsx:3443

- Admin config/settings sahifasi bor: order.advance_percent, order.advance_deadline_minutes, commission.default_percent; GET/POST /v1/admin/
  config ishlatiladi.
  Code: src/app/admin/settings/page.tsx:11, src/lib/api/admin-content.ts:1054

- PAYMENT_PENDING status dashboard/orderlarda ko‘rsatiladi.
  Code: src/lib/order-status.ts:20, src/app/admin/orders/page.tsx:100

Qisman / risk bor

- Status qiymati guide’da PAYMENT_PENDING = 5, lekin code’da order status mapping payment_pending = 20 qilib turibdi. Bu backend real qiymati
  bilan tekshirilishi kerak.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:460
  Code: src/lib/order-status.ts:43, src/app/admin/orders/page.tsx:107

- payment_status guide’da string pending/paid/overdue, code’da filter numeric 10/20/30 ishlatyapti, lekin type string/number qabul qiladi.
  Backend bilan contractni aniqlashtirish kerak.
  Code: src/app/admin/orders/page.tsx:762

Qolgan / bajarilmagan

- POST /v1/admin/artist-service/assign frontend wrapper/UI yo‘q. Guide bo‘yicha artistga xizmat biriktirish region_prices bilan bo‘lishi kerak.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:101
  Hozir code’da faqat list + region price endpointlari bor: src/lib/api/admin-content.ts:767

- PUT /v1/admin/artist-service/{id} full sync region_prices bilan yo‘q. Hozir region narxlar alohida upsert qilinadi, lekin artist-service
  umumiy price/note/status update yo‘q.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:132

- DELETE /v1/admin/artist-service/{id} ya’ni artistdan xizmatni detach/delete qilish yo‘q.
  Contextda endpoint bor, code’da wrapper yo‘q: docs/artistbor-admin-context.md:107

- POST /v1/admin/artist yaratishda services: [{ service_id, price, region_prices }] qo‘shish yo‘q. Hozir create artist form faqat profil/
  category/contact/location yuboradi.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:151
  Code: src/app/admin/artists/page.tsx:5757

- Artist profil edit’da card_last_four va card_token yo‘q. Type’da ham, formda ham, payload builderda ham qo‘shilmagan.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:174
  Code: src/lib/api/admin-content.ts:188

- GET /v1/admin/artist/{id}/balance va artist profilida balans/qarz ko‘rsatish yo‘q.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:270

- GET /v1/admin/artist/{id}/transactions va transactions tarixi UI yo‘q.
  Guide: /Users/abdurakhmonovsharif/Library/Containers/ru.keepcoder.Telegram/Data/tmp/FRONTEND_INTEGRATION_GUIDE.md:281

Bu repo uchun alohida emas

- Mobile client tasklari: GET/POST /v1/client/order/{id}/payment, chek yuklash, countdown, artist card ko‘rsatish. Bu Next.js admin repo emas,
  mobile app repo’da tekshiriladi.

- Artist panel mobile tasklari: artist profile card/balance/debt va GET /v1/client/artist-service region prices. Bu ham mobile/artist panel
  tomonida.

Qisqa xulosa: admin dashboardda payment flow va settings asosan bajarilgan. Qolgan eng muhim ishlar: artistga service assign/update/delete
qilish, artist yaratishda services + region_prices yuborish, artist karta/balance/transactions bloklarini qo‘shish, va status numeric mappingni
backend bilan tekshirish.

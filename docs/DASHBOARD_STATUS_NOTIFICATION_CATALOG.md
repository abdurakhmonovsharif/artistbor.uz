# Dashboard status va xabarnoma katalogi

Bu hujjat ko‘rib chiqish uchun snapshot. Ishlaydigan source of truth:
`src/lib/i18n/dashboard-copy.ts`.

## Qisqa hisob

| Guruh | Soni | Izoh |
|---|---:|---|
| Status domainlari | 13 | Bir xil backend qiymati domain bo‘yicha boshqa ma’noga ega bo‘lishi mumkin |
| Canonical status mappinglari | 56 | Aliaslar bitta canonical statusga birlashtirilgan |
| Push notification turlari | 3 | `system`, `order`, `promo` |
| Amal natijasi notificationlari | 52 | Dashboard toast/feedback xabarlari |
| Tanilgan API xatolari | 28 | Backend code/message UZ/RU foydalanuvchi xabariga aylantiriladi |
| Jami dashboard feedback holatlari | 80 | 52 ta success/info + 28 ta error |

## Statuslar

| Domain | Canonical key | Backend qiymatlari | O‘zbekcha | Русский |
|---|---|---|---|---|
| Account | `active` | `1`, `10`, `active` | Faol | Активный |
| Account | `inactive` | `9`, `inactive` | Nofaol | Неактивный |
| Account | `blocked` | `20`, `blocked` | Bloklangan | Заблокирован |
| Account | `deleted` | `0`, `deleted` | O‘chirilgan | Удален |
| Application | `pending` | `10`, `pending`, `review` | Kutilmoqda | Ожидает |
| Application | `approved` | `20`, `approved`, `accepted` | Tasdiqlangan | Подтверждена |
| Application | `rejected` | `30`, `rejected`, `declined`, `denied` | Rad etilgan | Отклонена |
| Availability | `available` | `1`, `true`, `available`, `free` | Bo‘sh | Свободно |
| Availability | `busy` | `0`, `false`, `busy`, `unavailable` | Band | Занято |
| Availability | `expired` | `expired` | Muddati o‘tgan | Истекло |
| Availability source | `manual` | `manual` | Qo‘lda band qilingan | Заблокировано вручную |
| Availability source | `hold` | `hold` | Vaqtincha band | Временно удерживается |
| Availability source | `order` | `order` | Tasdiqlangan buyurtma | Подтвержденный заказ |
| Contract | `draft` | `draft` | Qoralama | Черновик |
| Contract | `pending_signatures` | `pending_signatures` | Imzolar kutilmoqda | Ожидает подписей |
| Contract | `partially_signed` | `partially_signed` | Qisman imzolangan | Частично подписан |
| Contract | `signed` | `signed` | Imzolangan | Подписан |
| Contract | `cancelled` | `cancelled`, `canceled` | Bekor qilingan | Отменен |
| Generic | `active` | `active` | Faol | Активный |
| Generic | `inactive` | `inactive` | Nofaol | Неактивный |
| Generic | `pending` | `pending`, `waiting`, `new` | Kutilmoqda | Ожидает |
| Generic | `pending_review` | `pending_review`, `review` | Ko‘rib chiqilmoqda | На рассмотрении |
| Generic | `approved` | `approved` | Tasdiqlangan | Подтверждено |
| Generic | `accepted` | `accepted` | Qabul qilingan | Принято |
| Generic | `rejected` | `rejected`, `declined`, `denied` | Rad etilgan | Отклонено |
| Generic | `confirmed` | `confirmed` | Tasdiqlangan | Подтверждено |
| Generic | `processing` | `processing`, `in_progress` | Jarayonda | В процессе |
| Generic | `completed` | `completed`, `done`, `finished` | Yakunlangan | Завершено |
| Generic | `cancelled` | `cancelled`, `canceled` | Bekor qilingan | Отменено |
| Generic | `expired` | `expired` | Muddati o‘tgan | Истекло |
| Generic | `blocked` | `blocked` | Bloklangan | Заблокировано |
| Generic | `published` | `published` | Ko‘rsatilgan | Опубликовано |
| Generic | `unpublished` | `unpublished`, `hidden` | Ko‘rsatilmagan | Не отображается |
| Generic | `deleted` | `deleted` | O‘chirilgan | Удалено |
| Notification type | `system` | `system` | Tizim | Системное |
| Notification type | `order` | `order` | Buyurtma | Заказ |
| Notification type | `promo` | `promo` | Promo | Промо |
| Order | `pending` | `10`, `pending` | Kutilmoqda | Ожидает |
| Order | `payment_pending` | `20`, `payment_pending`, `unpaid` | To‘lov kutilmoqda | Ожидает оплаты |
| Order | `payment_verification` | `25`, `payment_verification` | Chek tekshirilmoqda | Чек проверяется |
| Order | `confirmed` | `30`, `confirmed` | Tasdiqlangan | Подтвержден |
| Order | `rejected` | `35`, `rejected` | Rad etilgan | Отклонен |
| Order | `cancelled` | `40`, `cancelled`, `canceled` | Bekor qilingan | Отменен |
| Order | `completed` | `50`, `completed`, `done`, `finished` | Yakunlangan | Завершен |
| Payment | `pending` | `10`, `pending` | To‘lov kutilmoqda | Ожидает оплаты |
| Payment | `paid` | `20`, `paid` | To‘langan | Оплачено |
| Payment | `refunded` | `30`, `refunded` | Qaytarilgan | Возвращено |
| Payment record | `pending` | `pending` | Tekshiruvda | На проверке |
| Payment record | `verified` | `verified`, `approved` | Tasdiqlangan | Подтвержден |
| Payment record | `rejected` | `rejected`, `declined` | Rad etilgan | Отклонен |
| Publication | `published` | `1`, `true`, `published` | Ko‘rsatilgan | Опубликовано |
| Publication | `not_published` | `0`, `false`, `unpublished`, `hidden`, `pending` | Ko‘rsatilmagan | Не отображается |
| Resource | `active` | `1`, `10`, `true`, `active` | Faol | Активно |
| Resource | `inactive` | `0`, `9`, `false`, `inactive` | Nofaol | Неактивно |
| Signature | `signed` | `1`, `true`, `signed` | Imzolangan | Подписано |
| Signature | `waiting` | `0`, `false`, `waiting`, `pending` | Kutilmoqda | Ожидается |

Muhim qoidalar:

- `20` accountda `blocked`, orderda `payment_pending`, paymentda `paid`, applicationda `approved`. Shuning uchun global numeric mapping ishlatilmaydi.
- Availability yozuvida `is_expired: true` bo‘lsa u band vaqt sifatida ko‘rsatilmaydi. `source: hold`ning o‘zi aktiv bandlik degani emas.
- `is_published: 0` backendda `pending` va `hidden`ni ajratmaydi. Dashboard hozir neytral `Ko‘rsatilmagan / Не отображается` matnini ishlatadi.
- Noma’lum qiymat UZ’da `Noma’lum`, RU’da `Неизвестно` bo‘lib chiqadi; backendning inglizcha labeli status sifatida ko‘rsatilmaydi.

## Amal natijasi notificationlari

| Key | O‘zbekcha | Русский |
|---|---|---|
| `genericCreated` | Yaratildi | Создано |
| `genericUpdated` | Yangilandi | Обновлено |
| `genericDeleted` | O‘chirildi | Удалено |
| `genericRestored` | Tiklandi | Восстановлено |
| `recordPermanentlyDeleted` | Yozuv butunlay o‘chirildi | Запись удалена навсегда |
| `applicationApproved` | Ariza tasdiqlandi | Заявка подтверждена |
| `applicationRejected` | Ariza rad etildi | Заявка отклонена |
| `orderPaymentPending` | Buyurtma to‘lov kutilmoqda holatiga o‘tkazildi | Заказ переведен в ожидание оплаты |
| `orderCompleted` | Buyurtma yakunlandi | Заказ завершен |
| `orderCancelled` | Buyurtma bekor qilindi | Заказ отменен |
| `orderRescheduled` | Buyurtma vaqti o‘zgartirildi | Время заказа изменено |
| `orderUpdated` | Buyurtma yangilandi | Заказ обновлен |
| `paymentVerified` | To‘lov tasdiqlandi | Платеж подтвержден |
| `paymentRejected` | To‘lov rad etildi | Платеж отклонен |
| `userBlocked` | Foydalanuvchi bloklandi | Пользователь заблокирован |
| `userUnblocked` | Foydalanuvchi blokdan chiqarildi | Пользователь разблокирован |
| `userUpdated` | Foydalanuvchi yangilandi | Пользователь обновлен |
| `operatorCreated` | Operator yaratildi | Оператор создан |
| `operatorUpdated` | Operator yangilandi | Оператор обновлен |
| `operatorUpdatedWithPassword` | Operator va parol yangilandi | Оператор и пароль обновлены |
| `operatorBlocked` | Operator bloklandi | Оператор заблокирован |
| `operatorUnblocked` | Operator blokdan chiqarildi | Оператор разблокирован |
| `artistCreated` | San’atkor yaratildi | Артист создан |
| `artistUpdated` | San’atkor yangilandi | Артист обновлен |
| `artistPasswordReset` | San’atkor paroli yangilandi | Пароль артиста обновлен |
| `commentPublished` | Izoh ko‘rsatildi | Комментарий опубликован |
| `commentHidden` | Izoh yashirildi | Комментарий скрыт |
| `commentRestored` | Izoh tiklandi | Комментарий восстановлен |
| `commentDeleted` | Izoh o‘chirildi | Комментарий удален |
| `commentUpdated` | Izoh yangilandi | Комментарий обновлен |
| `ratingDeleted` | Reyting o‘chirildi | Рейтинг удален |
| `busySlotCreated` | Band vaqt qo‘shildi | Занятое время добавлено |
| `busySlotUpdated` | Band vaqt yangilandi | Занятое время обновлено |
| `busySlotDeleted` | Band vaqt o‘chirildi | Занятое время удалено |
| `artistServiceSaved` | San’atkor xizmati saqlandi | Услуга артиста сохранена |
| `artistServiceDeleted` | San’atkor xizmati o‘chirildi | Услуга артиста удалена |
| `artistGalleryUploaded` | Galereya rasmlari yuklandi | Изображения галереи загружены |
| `artistGalleryDeleted` | Galereya rasmi o‘chirildi | Изображение галереи удалено |
| `artistVideoCreated` | San’atkor videosi qo‘shildi | Видео артиста добавлено |
| `artistVideoUpdated` | San’atkor videosi yangilandi | Видео артиста обновлено |
| `artistVideoDeleted` | San’atkor videosi o‘chirildi | Видео артиста удалено |
| `regionPriceSaved` | Hudud narxi saqlandi | Региональная цена сохранена |
| `regionPriceDeleted` | Hudud narxi o‘chirildi | Региональная цена удалена |
| `locationCreated` | Joylashuv yaratildi | Локация создана |
| `locationUpdated` | Joylashuv yangilandi | Локация обновлена |
| `locationDeleted` | Joylashuv o‘chirildi | Локация удалена |
| `notificationSentAll` | Xabarnoma barcha foydalanuvchilarga yuborildi | Уведомление отправлено всем пользователям |
| `notificationSentFiltered` | Xabarnoma tanlangan foydalanuvchilarga yuborildi | Уведомление отправлено выбранным пользователям |
| `settingsSaved` | Sozlamalar saqlandi | Настройки сохранены |
| `profileUpdated` | Profil yangilandi | Профиль обновлен |
| `loginSuccess` | Tizimga muvaffaqiyatli kirildi | Вход выполнен успешно |
| `logoutSuccess` | Tizimdan chiqildi | Вы вышли из системы |

## Tanilgan API xatolari

| Key/code | O‘zbekcha | Русский |
|---|---|---|
| `requestFailed` | So‘rovni bajarib bo‘lmadi. Qayta urinib ko‘ring. | Не удалось выполнить запрос. Попробуйте еще раз. |
| `VALIDATION_FAILED` | Kiritilgan ma’lumotlarni tekshiring. | Проверьте введенные данные. |
| `ARTIST_BUSY` | Tanlangan vaqtda san’atkor band. Boshqa vaqtni tanlang. | Артист занят в выбранное время. Выберите другое время. |
| `PARTIAL_PAYMENT` | To‘langan summa kutilgan summadan kam. | Оплаченная сумма меньше ожидаемой. |
| `INVALID_PRICE` | Buyurtma narxini noldan katta qilib kiriting. | Укажите стоимость заказа больше нуля. |
| `ORDER_NOT_CONFIRMED` | Faqat to‘lovi tasdiqlangan buyurtma vaqtini o‘zgartirish mumkin. | Изменить время можно только у заказа с подтвержденной оплатой. |
| `TIME_TO_REQUIRED` | Buyurtmaning tugash vaqtini kiriting. | Укажите время окончания заказа. |
| `TIME_CONFLICT` | Tanlangan vaqtda san’atkor band. Boshqa vaqtni tanlang. | Артист занят в выбранное время. Выберите другое время. |
| `ADVANCE_EXCEEDS_PRICE` | Avans miqdori xizmat narxidan katta bo‘lishi mumkin emas. | Сумма аванса не может превышать стоимость услуги. |
| `ADVANCE_NEGATIVE` | Avans miqdori manfiy bo‘lishi mumkin emas. | Сумма аванса не может быть отрицательной. |
| `SIGNATURE_REQUIRED` | Imzo yuborilmadi. | Подпись не отправлена. |
| `SIGNATURE_INVALID` | Imzo PNG yoki JPEG rasm bo‘lishi kerak. | Подпись должна быть изображением PNG или JPEG. |
| `SIGNATURE_TOO_LARGE` | Imzo fayli ruxsat etilgan hajmdan katta. | Файл подписи превышает допустимый размер. |
| `CONTRACT_ALREADY_SIGNED` | Bu taraf shartnomani allaqachon imzolagan. | Эта сторона уже подписала договор. |
| `CONTRACT_NOT_SIGNABLE` | Bu shartnomani hozir imzolash mumkin emas. | Этот договор сейчас нельзя подписать. |
| `CONTRACT_NOT_FOUND` | Buyurtma shartnomasi topilmadi. | Договор заказа не найден. |
| `CONTRACT_FILE_MISSING` | Shartnoma PDF fayli topilmadi. | PDF-файл договора не найден. |
| `AUDIT_ACCESS_DENIED` | Audit logni ko‘rishga ruxsat yo‘q. | Нет доступа к журналу аудита. |
| `SESSION_MISSING` | Sessiya tugagan. Qayta kiring. | Сессия завершена. Войдите снова. |
| `SESSION_INVALID` | Sessiyani tasdiqlab bo‘lmadi. Qayta kiring. | Не удалось подтвердить сессию. Войдите снова. |
| `ENDPOINT_FORBIDDEN` | Bu amal uchun ruxsat yetarli emas. | Недостаточно прав для этого действия. |
| `PANEL_ACCESS_DENIED` | Bu panelga kirish huquqi yo‘q. | Нет доступа к панели управления. |
| `ADMIN_PROFILE_MISSING` | Administrator profili topilmadi. | Профиль администратора не найден. |
| `ADMIN_ID_MISSING` | Administrator ID topilmadi. | ID администратора не найден. |
| `ADMIN_ROLE_INVALID` | Administrator roli aniqlanmadi. | Не удалось определить роль администратора. |
| `LOGIN_REQUIRED` | Telefon va parolni kiriting. | Введите телефон и пароль. |
| `LOGIN_FAILED` | Tizimga kirib bo‘lmadi. | Не удалось войти в систему. |
| `AUTH_RESPONSE_INVALID` | Autentifikatsiya javobi noto‘g‘ri. Administratorga murojaat qiling. | Некорректный ответ авторизации. Обратитесь к администратору. |

## Backend uchun tavsiya etilgan contract

- `message` tarjima kaliti bo‘lmasin; mashina o‘qiydigan barqaror `code` yuborilsin.
- Dashboard `code`ni UZ/RU katalogiga aylantirsin, backendning raw `message`i diagnostika uchun saqlansin.
- Yangi status qo‘shilganda uning domaini, canonical key’i, backend qiymati, UZ/RU labeli va semantic tone’i birga qo‘shilsin.
- `is_published` uchun `pending` va `hidden` alohida ko‘rsatilishi kerak bo‘lsa backend alohida status/code qaytarsin.

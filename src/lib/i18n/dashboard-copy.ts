import {
  defaultLocale,
  isLocale,
  localeStorageKey,
  type Locale,
} from "./translations";

type LocalizedText = Readonly<Record<Locale, string>>;

export type DashboardStatusTone = "success" | "danger" | "warning" | "info" | "neutral";

export type DashboardStatusDomain =
  | "account"
  | "application"
  | "availability"
  | "availability_source"
  | "contract"
  | "generic"
  | "notification_type"
  | "order"
  | "payment"
  | "payment_record"
  | "publication"
  | "resource"
  | "signature";

type StatusDefinition = {
  key: string;
  values: readonly unknown[];
  label: LocalizedText;
  tone: DashboardStatusTone;
};

const text = (uz: string, ru: string): LocalizedText => ({ uz, ru });

export const dashboardStatusCatalog = {
  account: [
    { key: "active", values: [1, 10, "active", "faol", "активный"], label: text("Faol", "Активный"), tone: "success" },
    { key: "inactive", values: [9, "inactive", "nofaol", "неактивный"], label: text("Nofaol", "Неактивный"), tone: "neutral" },
    { key: "blocked", values: [20, "blocked", "bloklangan", "заблокирован"], label: text("Bloklangan", "Заблокирован"), tone: "danger" },
    { key: "deleted", values: [0, "deleted", "o'chirilgan", "удален"], label: text("O‘chirilgan", "Удален"), tone: "danger" },
  ],
  application: [
    { key: "pending", values: [10, "pending", "review"], label: text("Kutilmoqda", "Ожидает"), tone: "warning" },
    { key: "approved", values: [20, "approved", "accepted"], label: text("Tasdiqlangan", "Подтверждена"), tone: "success" },
    { key: "rejected", values: [30, "rejected", "declined", "denied"], label: text("Rad etilgan", "Отклонена"), tone: "danger" },
  ],
  availability: [
    { key: "available", values: [1, true, "available", "free"], label: text("Bo‘sh", "Свободно"), tone: "success" },
    { key: "busy", values: [0, false, "busy", "unavailable"], label: text("Band", "Занято"), tone: "warning" },
    { key: "expired", values: ["expired"], label: text("Muddati o‘tgan", "Истекло"), tone: "neutral" },
  ],
  availability_source: [
    { key: "manual", values: ["manual"], label: text("Qo‘lda band qilingan", "Заблокировано вручную"), tone: "neutral" },
    { key: "hold", values: ["hold"], label: text("Vaqtincha band", "Временно удерживается"), tone: "warning" },
    { key: "order", values: ["order"], label: text("Tasdiqlangan buyurtma", "Подтвержденный заказ"), tone: "success" },
  ],
  contract: [
    { key: "draft", values: ["draft"], label: text("Qoralama", "Черновик"), tone: "neutral" },
    { key: "pending_signatures", values: ["pending_signatures"], label: text("Imzolar kutilmoqda", "Ожидает подписей"), tone: "warning" },
    { key: "partially_signed", values: ["partially_signed"], label: text("Qisman imzolangan", "Частично подписан"), tone: "info" },
    { key: "signed", values: ["signed"], label: text("Imzolangan", "Подписан"), tone: "success" },
    { key: "cancelled", values: ["cancelled", "canceled"], label: text("Bekor qilingan", "Отменен"), tone: "danger" },
  ],
  generic: [
    { key: "active", values: ["active", "faol"], label: text("Faol", "Активный"), tone: "success" },
    { key: "inactive", values: ["inactive", "nofaol"], label: text("Nofaol", "Неактивный"), tone: "neutral" },
    { key: "pending", values: ["pending", "waiting", "new"], label: text("Kutilmoqda", "Ожидает"), tone: "warning" },
    { key: "pending_review", values: ["pending_review", "pending review", "review"], label: text("Ko‘rib chiqilmoqda", "На рассмотрении"), tone: "warning" },
    { key: "approved", values: ["approved"], label: text("Tasdiqlangan", "Подтверждено"), tone: "success" },
    { key: "accepted", values: ["accepted"], label: text("Qabul qilingan", "Принято"), tone: "success" },
    { key: "rejected", values: ["rejected", "declined", "denied"], label: text("Rad etilgan", "Отклонено"), tone: "danger" },
    { key: "confirmed", values: ["confirmed"], label: text("Tasdiqlangan", "Подтверждено"), tone: "success" },
    { key: "processing", values: ["processing", "in_progress", "in progress"], label: text("Jarayonda", "В процессе"), tone: "info" },
    { key: "completed", values: ["completed", "done", "finished"], label: text("Yakunlangan", "Завершено"), tone: "success" },
    { key: "cancelled", values: ["cancelled", "canceled"], label: text("Bekor qilingan", "Отменено"), tone: "danger" },
    { key: "expired", values: ["expired"], label: text("Muddati o‘tgan", "Истекло"), tone: "neutral" },
    { key: "blocked", values: ["blocked"], label: text("Bloklangan", "Заблокировано"), tone: "danger" },
    { key: "published", values: ["published"], label: text("Ko‘rsatilgan", "Опубликовано"), tone: "success" },
    { key: "unpublished", values: ["unpublished", "hidden"], label: text("Ko‘rsatilmagan", "Не отображается"), tone: "neutral" },
    { key: "deleted", values: ["deleted"], label: text("O‘chirilgan", "Удалено"), tone: "danger" },
  ],
  notification_type: [
    { key: "system", values: ["system"], label: text("Tizim", "Системное"), tone: "neutral" },
    { key: "order", values: ["order"], label: text("Buyurtma", "Заказ"), tone: "info" },
    { key: "promo", values: ["promo"], label: text("Promo", "Промо"), tone: "success" },
  ],
  order: [
    { key: "pending", values: [10, "pending"], label: text("Kutilmoqda", "Ожидает"), tone: "warning" },
    { key: "payment_pending", values: [20, "payment_pending", "payment pending", "awaiting payment", "unpaid"], label: text("To‘lov kutilmoqda", "Ожидает оплаты"), tone: "info" },
    { key: "payment_verification", values: [25, "payment_verification", "payment verification"], label: text("Chek tekshirilmoqda", "Чек проверяется"), tone: "warning" },
    { key: "confirmed", values: [30, "confirmed"], label: text("Tasdiqlangan", "Подтвержден"), tone: "success" },
    { key: "rejected", values: [35, "rejected", "declined", "denied"], label: text("Rad etilgan", "Отклонен"), tone: "danger" },
    { key: "cancelled", values: [40, "cancelled", "canceled"], label: text("Bekor qilingan", "Отменен"), tone: "danger" },
    { key: "completed", values: [50, "completed", "done", "finished"], label: text("Yakunlangan", "Завершен"), tone: "success" },
  ],
  payment: [
    { key: "pending", values: [10, "pending"], label: text("To‘lov kutilmoqda", "Ожидает оплаты"), tone: "warning" },
    { key: "paid", values: [20, "paid"], label: text("To‘langan", "Оплачено"), tone: "success" },
    { key: "refunded", values: [30, "refunded"], label: text("Qaytarilgan", "Возвращено"), tone: "neutral" },
  ],
  payment_record: [
    { key: "pending", values: ["pending"], label: text("Tekshiruvda", "На проверке"), tone: "warning" },
    { key: "verified", values: ["verified", "approved"], label: text("Tasdiqlangan", "Подтвержден"), tone: "success" },
    { key: "rejected", values: ["rejected", "declined"], label: text("Rad etilgan", "Отклонен"), tone: "danger" },
  ],
  publication: [
    { key: "published", values: [1, true, "published"], label: text("Ko‘rsatilgan", "Опубликовано"), tone: "success" },
    { key: "not_published", values: [0, false, "unpublished", "hidden", "pending"], label: text("Ko‘rsatilmagan", "Не отображается"), tone: "neutral" },
  ],
  resource: [
    { key: "active", values: [1, 10, true, "active"], label: text("Faol", "Активно"), tone: "success" },
    { key: "inactive", values: [0, 9, false, "inactive"], label: text("Nofaol", "Неактивно"), tone: "neutral" },
  ],
  signature: [
    { key: "signed", values: [1, true, "signed"], label: text("Imzolangan", "Подписано"), tone: "success" },
    { key: "waiting", values: [0, false, "waiting", "pending"], label: text("Kutilmoqda", "Ожидается"), tone: "warning" },
  ],
} satisfies Record<DashboardStatusDomain, readonly StatusDefinition[]>;

export const dashboardNotificationCatalog = {
  genericCreated: text("Yaratildi", "Создано"),
  genericUpdated: text("Yangilandi", "Обновлено"),
  genericDeleted: text("O‘chirildi", "Удалено"),
  genericRestored: text("Tiklandi", "Восстановлено"),
  recordPermanentlyDeleted: text("Yozuv butunlay o‘chirildi", "Запись удалена навсегда"),
  applicationApproved: text("Ariza tasdiqlandi", "Заявка подтверждена"),
  applicationRejected: text("Ariza rad etildi", "Заявка отклонена"),
  orderPaymentPending: text("Buyurtma to‘lov kutilmoqda holatiga o‘tkazildi", "Заказ переведен в ожидание оплаты"),
  orderCompleted: text("Buyurtma yakunlandi", "Заказ завершен"),
  orderCancelled: text("Buyurtma bekor qilindi", "Заказ отменен"),
  orderRescheduled: text("Buyurtma vaqti o‘zgartirildi", "Время заказа изменено"),
  orderUpdated: text("Buyurtma yangilandi", "Заказ обновлен"),
  paymentVerified: text("To‘lov tasdiqlandi", "Платеж подтвержден"),
  paymentRejected: text("To‘lov rad etildi", "Платеж отклонен"),
  userBlocked: text("Foydalanuvchi bloklandi", "Пользователь заблокирован"),
  userUnblocked: text("Foydalanuvchi blokdan chiqarildi", "Пользователь разблокирован"),
  userUpdated: text("Foydalanuvchi yangilandi", "Пользователь обновлен"),
  operatorCreated: text("Operator yaratildi", "Оператор создан"),
  operatorUpdated: text("Operator yangilandi", "Оператор обновлен"),
  operatorUpdatedWithPassword: text("Operator va parol yangilandi", "Оператор и пароль обновлены"),
  operatorBlocked: text("Operator bloklandi", "Оператор заблокирован"),
  operatorUnblocked: text("Operator blokdan chiqarildi", "Оператор разблокирован"),
  artistCreated: text("San’atkor yaratildi", "Артист создан"),
  artistUpdated: text("San’atkor yangilandi", "Артист обновлен"),
  artistPasswordReset: text("San’atkor paroli yangilandi", "Пароль артиста обновлен"),
  commentPublished: text("Izoh ko‘rsatildi", "Комментарий опубликован"),
  commentHidden: text("Izoh yashirildi", "Комментарий скрыт"),
  commentRestored: text("Izoh tiklandi", "Комментарий восстановлен"),
  commentDeleted: text("Izoh o‘chirildi", "Комментарий удален"),
  commentUpdated: text("Izoh yangilandi", "Комментарий обновлен"),
  ratingDeleted: text("Reyting o‘chirildi", "Рейтинг удален"),
  busySlotCreated: text("Band vaqt qo‘shildi", "Занятое время добавлено"),
  busySlotUpdated: text("Band vaqt yangilandi", "Занятое время обновлено"),
  busySlotDeleted: text("Band vaqt o‘chirildi", "Занятое время удалено"),
  artistServiceSaved: text("San’atkor xizmati saqlandi", "Услуга артиста сохранена"),
  artistServiceDeleted: text("San’atkor xizmati o‘chirildi", "Услуга артиста удалена"),
  artistGalleryUploaded: text("Galereya rasmlari yuklandi", "Изображения галереи загружены"),
  artistGalleryDeleted: text("Galereya rasmi o‘chirildi", "Изображение галереи удалено"),
  artistVideoCreated: text("San’atkor videosi qo‘shildi", "Видео артиста добавлено"),
  artistVideoUpdated: text("San’atkor videosi yangilandi", "Видео артиста обновлено"),
  artistVideoDeleted: text("San’atkor videosi o‘chirildi", "Видео артиста удалено"),
  regionPriceSaved: text("Hudud narxi saqlandi", "Региональная цена сохранена"),
  regionPriceDeleted: text("Hudud narxi o‘chirildi", "Региональная цена удалена"),
  locationCreated: text("Joylashuv yaratildi", "Локация создана"),
  locationUpdated: text("Joylashuv yangilandi", "Локация обновлена"),
  locationDeleted: text("Joylashuv o‘chirildi", "Локация удалена"),
  notificationSentAll: text("Xabarnoma barcha foydalanuvchilarga yuborildi", "Уведомление отправлено всем пользователям"),
  notificationSentFiltered: text("Xabarnoma tanlangan foydalanuvchilarga yuborildi", "Уведомление отправлено выбранным пользователям"),
  settingsSaved: text("Sozlamalar saqlandi", "Настройки сохранены"),
  profileUpdated: text("Profil yangilandi", "Профиль обновлен"),
  loginSuccess: text("Tizimga muvaffaqiyatli kirildi", "Вход выполнен успешно"),
  logoutSuccess: text("Tizimdan chiqildi", "Вы вышли из системы"),
} as const;

export const dashboardApiErrorCatalog = {
  requestFailed: text("So‘rovni bajarib bo‘lmadi. Qayta urinib ko‘ring.", "Не удалось выполнить запрос. Попробуйте еще раз."),
  validationFailed: text("Kiritilgan ma’lumotlarni tekshiring.", "Проверьте введенные данные."),
  artistBusy: text("Tanlangan vaqtda san’atkor band. Boshqa vaqtni tanlang.", "Артист занят в выбранное время. Выберите другое время."),
  partialPayment: text("To‘langan summa kutilgan summadan kam.", "Оплаченная сумма меньше ожидаемой."),
  invalidPrice: text("Buyurtma narxini noldan katta qilib kiriting.", "Укажите стоимость заказа больше нуля."),
  orderNotConfirmed: text("Faqat to‘lovi tasdiqlangan buyurtma vaqtini o‘zgartirish mumkin.", "Изменить время можно только у заказа с подтвержденной оплатой."),
  timeToRequired: text("Buyurtmaning tugash vaqtini kiriting.", "Укажите время окончания заказа."),
  timeConflict: text("Tanlangan vaqtda san’atkor band. Boshqa vaqtni tanlang.", "Артист занят в выбранное время. Выберите другое время."),
  advanceExceedsPrice: text("Avans miqdori xizmat narxidan katta bo‘lishi mumkin emas.", "Сумма аванса не может превышать стоимость услуги."),
  advanceNegative: text("Avans miqdori manfiy bo‘lishi mumkin emas.", "Сумма аванса не может быть отрицательной."),
  signatureRequired: text("Imzo yuborilmadi.", "Подпись не отправлена."),
  signatureInvalid: text("Imzo PNG yoki JPEG rasm bo‘lishi kerak.", "Подпись должна быть изображением PNG или JPEG."),
  signatureTooLarge: text("Imzo fayli ruxsat etilgan hajmdan katta.", "Файл подписи превышает допустимый размер."),
  contractAlreadySigned: text("Bu taraf shartnomani allaqachon imzolagan.", "Эта сторона уже подписала договор."),
  contractNotSignable: text("Bu shartnomani hozir imzolash mumkin emas.", "Этот договор сейчас нельзя подписать."),
  contractNotFound: text("Buyurtma shartnomasi topilmadi.", "Договор заказа не найден."),
  contractFileMissing: text("Shartnoma PDF fayli topilmadi.", "PDF-файл договора не найден."),
  auditAccessDenied: text("Audit logni ko‘rishga ruxsat yo‘q.", "Нет доступа к журналу аудита."),
  sessionMissing: text("Sessiya tugagan. Qayta kiring.", "Сессия завершена. Войдите снова."),
  sessionInvalid: text("Sessiyani tasdiqlab bo‘lmadi. Qayta kiring.", "Не удалось подтвердить сессию. Войдите снова."),
  endpointForbidden: text("Bu amal uchun ruxsat yetarli emas.", "Недостаточно прав для этого действия."),
  panelAccessDenied: text("Bu panelga kirish huquqi yo‘q.", "Нет доступа к панели управления."),
  adminProfileMissing: text("Administrator profili topilmadi.", "Профиль администратора не найден."),
  adminIdMissing: text("Administrator ID topilmadi.", "ID администратора не найден."),
  adminRoleInvalid: text("Administrator roli aniqlanmadi.", "Не удалось определить роль администратора."),
  loginRequired: text("Telefon va parolni kiriting.", "Введите телефон и пароль."),
  loginFailed: text("Tizimga kirib bo‘lmadi.", "Не удалось войти в систему."),
  authResponseInvalid: text("Autentifikatsiya javobi noto‘g‘ri. Administratorga murojaat qiling.", "Некорректный ответ авторизации. Обратитесь к администратору."),
} as const;

export type DashboardNotificationKey = keyof typeof dashboardNotificationCatalog;
export type DashboardApiErrorKey = keyof typeof dashboardApiErrorCatalog;

export type DashboardStatus = {
  key: string;
  label: string;
  tone: DashboardStatusTone;
};

export function getDashboardStatus(
  domain: DashboardStatusDomain,
  value: unknown,
  locale: Locale = defaultLocale,
): DashboardStatus {
  const definition = findStatusDefinition(domain, value) ??
    (domain === "generic" ? undefined : findStatusDefinition("generic", value));

  if (definition) {
    return {
      key: definition.key,
      label: definition.label[locale],
      tone: definition.tone,
    };
  }

  return {
    key: "unknown",
    label: locale === "ru" ? "Неизвестно" : "Noma’lum",
    tone: "neutral",
  };
}

export function getDashboardStatusDomain(fieldKey?: string): DashboardStatusDomain {
  const key = normalizeToken(fieldKey);
  if (key === "contract status") return "contract";
  if (key === "notification type" || key === "type") return "notification_type";
  if (key === "payment status") return "payment";
  if (key === "payment record status") return "payment_record";
  if (key === "application status") return "application";
  if (key === "order status" || key === "status code") return "order";
  if (key === "availability source" || key === "source") return "availability_source";
  if (key === "availability status") return "availability";
  if (key === "signature status") return "signature";
  if (key === "is published" || key === "published") return "publication";
  if (key === "is active" || key === "active") return "resource";
  if (key === "status" || key === "status label" || key === "user status" || key === "account status") return "account";
  return "generic";
}

export function getDashboardNotification(key: DashboardNotificationKey, locale: Locale = defaultLocale) {
  return dashboardNotificationCatalog[key][locale];
}

export function getDashboardApiError(key: DashboardApiErrorKey, locale: Locale = defaultLocale) {
  return dashboardApiErrorCatalog[key][locale];
}

export function getCurrentDashboardLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = window.localStorage.getItem(localeStorageKey);
  return isLocale(stored) ? stored : defaultLocale;
}

export function resolveKnownApiError(
  values: readonly unknown[],
  locale: Locale = defaultLocale,
): { code?: string; message: string } | undefined {
  const searchable = values
    .flatMap(flattenErrorValue)
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  const definitions: Array<{ patterns: readonly string[]; key: DashboardApiErrorKey; code?: string }> = [
    { patterns: ["PARTIAL_PAYMENT"], key: "partialPayment", code: "PARTIAL_PAYMENT" },
    { patterns: ["INVALID_PRICE"], key: "invalidPrice", code: "INVALID_PRICE" },
    { patterns: ["ORDER_NOT_CONFIRMED"], key: "orderNotConfirmed", code: "ORDER_NOT_CONFIRMED" },
    { patterns: ["TIME_TO_REQUIRED"], key: "timeToRequired", code: "TIME_TO_REQUIRED" },
    { patterns: ["TIME_CONFLICT"], key: "timeConflict", code: "TIME_CONFLICT" },
    { patterns: ["ARTIST IS BUSY", "ARTIST_BUSY"], key: "artistBusy", code: "ARTIST_BUSY" },
    { patterns: ["ADVANCE_AMOUNT CANNOT EXCEED PRICE"], key: "advanceExceedsPrice", code: "ADVANCE_EXCEEDS_PRICE" },
    { patterns: ["ADVANCE_AMOUNT MUST BE >= 0"], key: "advanceNegative", code: "ADVANCE_NEGATIVE" },
    { patterns: ["SIGNATURE_REQUIRED"], key: "signatureRequired", code: "SIGNATURE_REQUIRED" },
    { patterns: ["SIGNATURE_INVALID"], key: "signatureInvalid", code: "SIGNATURE_INVALID" },
    { patterns: ["SIGNATURE_TOO_LARGE"], key: "signatureTooLarge", code: "SIGNATURE_TOO_LARGE" },
    { patterns: ["CONTRACT_ALREADY_SIGNED"], key: "contractAlreadySigned", code: "CONTRACT_ALREADY_SIGNED" },
    { patterns: ["CONTRACT_NOT_SIGNABLE"], key: "contractNotSignable", code: "CONTRACT_NOT_SIGNABLE" },
    { patterns: ["CONTRACT_NOT_FOUND"], key: "contractNotFound", code: "CONTRACT_NOT_FOUND" },
    { patterns: ["CONTRACT_FILE_MISSING"], key: "contractFileMissing", code: "CONTRACT_FILE_MISSING" },
    { patterns: ["AUDIT_ACCESS_DENIED"], key: "auditAccessDenied", code: "AUDIT_ACCESS_DENIED" },
    { patterns: ["SESSIYA TOPILMADI"], key: "sessionMissing", code: "SESSION_MISSING" },
    { patterns: ["SESSION_INVALID", "SESSIYA TASDIQLANMADI"], key: "sessionInvalid", code: "SESSION_INVALID" },
    { patterns: ["ENDPOINT RUXSAT ETILMAGAN"], key: "endpointForbidden", code: "ENDPOINT_FORBIDDEN" },
    { patterns: ["BU PANELGA KIRISH HUQUQI YO'Q", "PANEL_ACCESS_DENIED"], key: "panelAccessDenied", code: "PANEL_ACCESS_DENIED" },
    { patterns: ["ADMIN_PROFILE_MISSING", "ADMIN PROFIL MA'LUMOTLARI TOPILMADI"], key: "adminProfileMissing", code: "ADMIN_PROFILE_MISSING" },
    { patterns: ["ADMIN_ID_MISSING", "ADMIN ID TOPILMADI"], key: "adminIdMissing", code: "ADMIN_ID_MISSING" },
    { patterns: ["ADMIN_ROLE_INVALID", "ADMIN ROLI ANIQLANMADI"], key: "adminRoleInvalid", code: "ADMIN_ROLE_INVALID" },
    { patterns: ["TELEFON VA PAROL MAJBURIY", "LOGIN_REQUIRED"], key: "loginRequired", code: "LOGIN_REQUIRED" },
    { patterns: ["LOGIN_FAILED"], key: "loginFailed", code: "LOGIN_FAILED" },
    { patterns: ["AUTH JAVOBI TO'LIQ EMAS", "AUTH_RESPONSE_INVALID"], key: "authResponseInvalid", code: "AUTH_RESPONSE_INVALID" },
  ];

  const match = definitions.find((definition) =>
    definition.patterns.some((pattern) => searchable.includes(pattern)),
  );
  if (match) return { code: match.code, message: getDashboardApiError(match.key, locale) };

  if (searchable.includes("VALIDATION FAILED")) {
    return { code: "VALIDATION_FAILED", message: getDashboardApiError("validationFailed", locale) };
  }

  return undefined;
}

function findStatusDefinition(domain: DashboardStatusDomain, value: unknown) {
  const normalized = normalizeStatusValue(value);
  return dashboardStatusCatalog[domain].find((definition) =>
    definition.values.some((candidate) => normalizeStatusValue(candidate) === normalized),
  );
}

function normalizeStatusValue(value: unknown) {
  if (typeof value === "boolean") return value ? "true" : "false";
  return normalizeToken(value);
}

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function flattenErrorValue(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(flattenErrorValue);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenErrorValue);
  return [];
}

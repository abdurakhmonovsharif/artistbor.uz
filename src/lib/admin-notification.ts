import type {
  SendAllNotificationPayload,
  SendNotificationPayload,
} from "@/lib/api/admin-content";

export type NotificationDraft = {
  title: string;
  message: string;
  type: string;
  data: string;
};

export type TargetedNotificationDraft = NotificationDraft & {
  role: string;
  region_id: string;
  district_id: string;
};

export type NotificationPayloadError =
  | "target_required"
  | "data_json_invalid"
  | "data_json_object";

type PayloadResult<T> =
  | { payload: T; error?: never }
  | { payload?: never; error: NotificationPayloadError };

export function buildSendAllNotificationPayload(
  draft: NotificationDraft,
): PayloadResult<SendAllNotificationPayload> {
  const parsedData = parseNotificationData(draft.data);
  if (parsedData.error) return { error: parsedData.error };

  const payload: SendAllNotificationPayload = {
    title: draft.title,
    message: draft.message,
  };
  if (draft.type) payload.type = draft.type;
  if (parsedData.data) payload.data = parsedData.data;
  return { payload };
}

export function buildTargetedNotificationPayload(
  draft: TargetedNotificationDraft,
): PayloadResult<SendNotificationPayload> {
  if (!draft.role && !draft.region_id && !draft.district_id) {
    return { error: "target_required" };
  }

  const parsedData = parseNotificationData(draft.data);
  if (parsedData.error) return { error: parsedData.error };

  const payload: SendNotificationPayload = {
    title: draft.title,
    message: draft.message,
  };
  if (draft.type) payload.type = draft.type;
  if (draft.role) payload.role = draft.role;
  if (draft.region_id) payload.region_id = Number(draft.region_id);
  if (draft.district_id) payload.district_id = Number(draft.district_id);
  if (parsedData.data) payload.data = parsedData.data;
  return { payload };
}

function parseNotificationData(
  value: string,
): { data?: Record<string, unknown>; error?: never } | { error: NotificationPayloadError } {
  if (!value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "data_json_object" };
    }
    return { data: parsed as Record<string, unknown> };
  } catch {
    return { error: "data_json_invalid" };
  }
}

export type VerifyOrderPaymentPayload = {
  payment_id: number;
  allow_partial?: true;
};

export type PaymentVerificationDialogType = "verify-payment" | "confirm-partial-payment";

type ApiErrorWithStatus = Error & {
  status?: number;
  code?: string;
};

export function buildVerifyPaymentPayload(paymentId: number, allowPartial = false): VerifyOrderPaymentPayload {
  if (allowPartial) {
    return {
      payment_id: paymentId,
      allow_partial: true,
    };
  }

  return { payment_id: paymentId };
}

export function canSubmitVerifyPayment(
  dialogType: PaymentVerificationDialogType,
  allowPartial: boolean,
) {
  return allowPartial
    ? dialogType === "confirm-partial-payment"
    : dialogType === "verify-payment";
}

export function isPartialPaymentApiError(error: unknown): error is ApiErrorWithStatus {
  if (!(error instanceof Error)) return false;

  const apiError = error as ApiErrorWithStatus;
  return apiError.status === 422 && (
    apiError.code === "PARTIAL_PAYMENT" ||
    /\bPARTIAL_PAYMENT\b/i.test(apiError.message)
  );
}

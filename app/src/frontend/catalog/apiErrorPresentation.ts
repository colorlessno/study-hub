export interface ApiErrorPresentation {
  code: string;
  message: string;
  requestId: string;
  destination: string;
  fieldErrors: Array<{ field: string; message: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createApiErrorPresentation(output: unknown): ApiErrorPresentation | undefined {
  if (!isRecord(output) || !isRecord(output.error)) return undefined;
  const error = output.error;
  if (typeof error.code !== 'string' || typeof error.message !== 'string') return undefined;

  const fieldErrors = Array.isArray(error.details)
    ? error.details.flatMap((detail) => (
      isRecord(detail) && typeof detail.field === 'string' && typeof detail.message === 'string'
        ? [{ field: detail.field, message: detail.message }]
        : []
    ))
    : [];
  const destination = error.code === 'VALIDATION_ERROR'
    ? '入力項目の近く'
    : error.code === 'INTERNAL_ERROR'
      ? '共通の通知欄'
      : 'フォームまたは画面の上部';

  return {
    code: error.code,
    message: error.message,
    requestId: typeof error.requestId === 'string' ? error.requestId : '',
    destination,
    fieldErrors
  };
}

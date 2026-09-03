import { AppError } from '../../core/errors/AppError.ts';

export type DataAccessCode =
  | 'DATA_FORBIDDEN'
  | 'DATA_CONFLICT'
  | 'DATA_REFERENCE_CONFLICT'
  | 'DATA_VALIDATION_FAILED'
  | 'DATA_UNAVAILABLE'
  | 'DATA_OUTCOME_UNKNOWN'
  | 'DATA_OPERATION_FAILED';

export type DataOperationKind = 'read' | 'write';

export interface DataFailureLike {
  readonly code?: string;
  readonly message?: string;
  readonly details?: string;
  readonly hint?: string;
}

export class DataAccessError extends AppError {
  readonly dataCode: DataAccessCode;

  constructor(message: string, dataCode: DataAccessCode, cause?: unknown) {
    super(message, {
      code: dataCode === 'DATA_FORBIDDEN'
        ? 'FORBIDDEN'
        : dataCode === 'DATA_UNAVAILABLE' || dataCode === 'DATA_OUTCOME_UNKNOWN'
          ? 'NETWORK_UNAVAILABLE'
          : dataCode === 'DATA_VALIDATION_FAILED'
            ? 'VALIDATION_FAILED'
            : 'UNKNOWN',
      cause,
      userMessage: dataCode === 'DATA_FORBIDDEN'
        ? 'لا تملك صلاحية الوصول إلى هذه البيانات.'
        : dataCode === 'DATA_CONFLICT'
          ? 'يوجد سجل آخر يتعارض مع هذه العملية.'
          : dataCode === 'DATA_REFERENCE_CONFLICT'
            ? 'تعذر إكمال العملية بسبب ارتباط السجل ببيانات أخرى.'
            : dataCode === 'DATA_VALIDATION_FAILED'
              ? 'بعض البيانات غير صالحة. تحقق من المدخلات.'
              : dataCode === 'DATA_UNAVAILABLE'
                ? 'تعذر الاتصال بخدمة البيانات. تحقق من الشبكة وحاول مجدداً.'
                : dataCode === 'DATA_OUTCOME_UNKNOWN'
                  ? 'تعذر تأكيد نتيجة العملية. حدّث البيانات أولاً قبل إعادة المحاولة حتى لا تتكرر العملية.'
                  : 'تعذر إكمال عملية البيانات. حاول مرة أخرى.',
    });
    this.name = 'DataAccessError';
    this.dataCode = dataCode;
  }
}

function asFailureLike(error: unknown): DataFailureLike | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as Readonly<Record<string, unknown>>;
  return {
    ...(typeof record.code === 'string' ? { code: record.code } : {}),
    ...(typeof record.message === 'string' ? { message: record.message } : {}),
    ...(typeof record.details === 'string' ? { details: record.details } : {}),
    ...(typeof record.hint === 'string' ? { hint: record.hint } : {}),
  };
}

export function normalizeDataFailure(error: DataFailureLike | null | undefined): DataAccessError {
  const code = error?.code ?? '';
  if (code === '42501' || code === 'PGRST301') return new DataAccessError('Database access forbidden', 'DATA_FORBIDDEN', error);
  if (code === '23505') return new DataAccessError('Database unique conflict', 'DATA_CONFLICT', error);
  if (code === '23503') return new DataAccessError('Database reference conflict', 'DATA_REFERENCE_CONFLICT', error);
  if (code === '23514' || code === '22023' || code === '22P02') return new DataAccessError('Database validation rejected operation', 'DATA_VALIDATION_FAILED', error);
  const message = error?.message ?? '';
  if (/failed to fetch|network|timeout|connection|abort/i.test(message)) return new DataAccessError('Data service unavailable', 'DATA_UNAVAILABLE', error);
  return new DataAccessError('Data operation failed', 'DATA_OPERATION_FAILED', error);
}

export function normalizeThrownDataFailure(error: unknown, operation: DataOperationKind): DataAccessError {
  if (error instanceof DataAccessError) return error;
  const failure = asFailureLike(error);
  if (failure?.code) return normalizeDataFailure(failure);
  const message = failure?.message ?? (error instanceof Error ? error.message : '');
  if (/failed to fetch|network|timeout|connection|abort/i.test(message)) {
    return operation === 'write'
      ? new DataAccessError('Write outcome could not be confirmed', 'DATA_OUTCOME_UNKNOWN', error)
      : new DataAccessError('Data service unavailable', 'DATA_UNAVAILABLE', error);
  }
  return new DataAccessError('Data operation failed', 'DATA_OPERATION_FAILED', error);
}

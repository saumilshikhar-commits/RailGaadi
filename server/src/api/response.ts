import { ApiSuccess, ApiError, ApiMeta } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function successResponse<T>(
  data: T,
  meta: Partial<ApiMeta> = {},
): ApiSuccess<T> {
  return {
    data,
    meta: {
      requestId: meta.requestId ?? uuidv4(),
      cached: meta.cached ?? false,
      updatedAt: meta.updatedAt ?? new Date().toISOString(),
      ...meta,
    },
    error: null,
  };
}

export function errorResponse(
  code: string,
  message: string,
  requestId?: string,
  details?: unknown,
): ApiError {
  return {
    data: null,
    meta: {
      requestId: requestId ?? uuidv4(),
    },
    error: { code, message, details },
  };
}

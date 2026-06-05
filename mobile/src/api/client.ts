import { getToken } from '@/auth/tokenStorage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8081/api/mobile/v1';

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  if (options.auth !== false) {
    const token = await getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      `Tidak bisa terhubung ke API (${API_URL}). ${error instanceof Error ? error.message : 'Periksa koneksi perangkat.'}`,
      0,
      { network: ['Pastikan HP/emulator bisa mengakses alamat API dan OpenSID sedang berjalan.'] }
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Request gagal.', response.status, payload.errors ?? {});
  }

  return payload as T;
}

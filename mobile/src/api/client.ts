import { getToken } from '@/auth/tokenStorage';

let activeApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8081/api/mobile/v1';

export function getApiUrl() {
  return activeApiUrl;
}

export function setApiUrl(url: string) {
  activeApiUrl = url;
}

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
    const baseUrl = getApiUrl();
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    const baseUrl = getApiUrl();
    throw new ApiError(
      `Tidak bisa terhubung ke API (${baseUrl}). ${error instanceof Error ? error.message : 'Periksa koneksi perangkat.'}`,
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

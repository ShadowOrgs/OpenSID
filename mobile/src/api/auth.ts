import { apiRequest } from './client';
import type { AuthResponse, MandiriUser } from '@/types/mandiri';

type Envelope<T> = {
  message?: string;
  data: T;
};

export type MobileHealth = {
  desa: {
    nama: string;
    kode_desa: string;
    kecamatan: string;
    kabupaten: string;
    logo_url: string | null;
  };
  time: string;
};

export type LoginPayload = {
  nik: string;
  password: string;
  device_name?: string;
};

export type RegisterPayload = {
  nama: string;
  tanggallahir: string;
  nik: string;
  no_kk: string;
  email: string;
  telegram?: string;
  password: string;
  password_confirmation: string;
  scan_1: { uri: string; name: string; type: string };
  scan_2: { uri: string; name: string; type: string };
  scan_3: { uri: string; name: string; type: string };
};

export async function login(payload: LoginPayload) {
  return apiRequest<Envelope<AuthResponse>>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterPayload) {
  const form = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (key.startsWith('scan_')) {
      form.append(key, value as never);
    } else if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });

  return apiRequest<Envelope<AuthResponse>>('/auth/register', {
    method: 'POST',
    auth: false,
    body: form,
  });
}

export async function logout() {
  return apiRequest<{ message: string }>('/auth/logout', { method: 'POST' });
}

export async function me() {
  return apiRequest<Envelope<{ user: MandiriUser }>>('/auth/me');
}

export async function getMobileHealth() {
  return apiRequest<Envelope<MobileHealth>>('/health', { auth: false });
}

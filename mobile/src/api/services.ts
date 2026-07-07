import { apiRequest, getApiUrl } from './client';
import { getToken } from '@/auth/tokenStorage';

export type Biodata = Record<string, string | number | null>;

export type FamilyMember = {
  id: number;
  nama: string;
  nik: string;
  kk_level: number | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: number | null;
};

export type Assistance = {
  id: number;
  nama: string | null;
  sasaran: string | number | null;
  keterangan: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  no_kartu: string | null;
  kartu_nama: string | null;
  status: string;
};

export type Perangkat = {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  niap: string | null;
  foto_url: string | null;
};

export type LapakProduct = {
  id: number;
  nama: string;
  kategori: string | null;
  harga: number;
  harga_diskon: number;
  satuan: string | null;
  potongan: string | number | null;
  deskripsi: string | null;
  pelapak: string;
  telepon: string | null;
  foto_url: string | null;
};

export type LapakCategory = {
  id: number;
  nama: string;
};

export function getProfile() {
  return apiRequest<{ data: { biodata: Biodata } }>('/profile');
}

export function getFamily() {
  return apiRequest<{
    data: {
      keluarga: {
        id: number;
        no_kk: string | null;
        alamat: string | null;
        rt: string | null;
        rw: string | null;
        dusun: string | null;
        anggota: FamilyMember[];
      };
    };
  }>('/family');
}

export function changePin(payload: { current_pin: string; new_pin: string; new_pin_confirmation: string }) {
  return apiRequest<{ message: string }>('/profile/change-pin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAssistance() {
  return apiRequest<{ data: { items: Assistance[] } }>('/assistance');
}

export function getPerangkat() {
  return apiRequest<{ data: { items: Perangkat[] } }>('/perangkat');
}

export function getLapak(params?: { keyword?: string; category_id?: number }) {
  const search = new URLSearchParams();
  if (params?.keyword) {
    search.set('keyword', params.keyword);
  }
  if (params?.category_id) {
    search.set('category_id', String(params.category_id));
  }

  return apiRequest<{ data: { items: LapakProduct[]; categories: LapakCategory[] } }>(
    `/lapak${search.toString() ? `?${search.toString()}` : ''}`
  );
}

export async function getPrintUrl(type: 'biodata' | 'kk') {
  const token = await getToken();
  return `${getApiUrl()}/print/${type}?token=${encodeURIComponent(token ?? '')}`;
}

import { apiRequest } from './client';

export type SuratType = {
  id: number;
  nama: string;
  judul: string;
  url_surat: string;
  kode_surat: string | null;
  syarat: { id: number; nama: string }[];
  fields: SuratField[];
};

export type SuratField = {
  name: string;
  label: string;
  description: string;
  type: string;
  required: boolean;
  options: string[];
};

export type SuratRequest = {
  id: number;
  id_surat: number;
  nama_surat: string | null;
  judul_surat: string | null;
  status: number;
  status_label: string;
  keterangan: string | null;
  alasan: string | null;
  no_hp_aktif: string;
  isian_form?: Record<string, unknown>;
  syarat?: Record<string, unknown> | unknown[];
  created_at: string | null;
  updated_at: string | null;
};

type ListResponse<T> = {
  data: {
    items: T[];
  };
};

type ItemResponse<T> = {
  message?: string;
  data: {
    item: T;
  };
};

export function getSuratTypes() {
  return apiRequest<ListResponse<SuratType>>('/surat/types');
}

export function getSuratType(id: number) {
  return apiRequest<ItemResponse<SuratType>>(`/surat/types/${id}`);
}

export function getSuratRequests() {
  return apiRequest<ListResponse<SuratRequest>>('/surat/requests');
}

export function getSuratRequest(id: number) {
  return apiRequest<ItemResponse<SuratRequest>>(`/surat/requests/${id}`);
}

export function createSuratRequest(payload: {
  id_surat: number;
  no_hp_aktif: string;
  keterangan?: string;
  isian_form?: Record<string, string>;
  syarat?: Record<string, number>;
}) {
  return apiRequest<ItemResponse<SuratRequest>>('/surat/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

import { apiRequest } from './client';

export type MandiriDocument = {
  id: number;
  nama: string;
  id_syarat: number | null;
  nama_syarat: string | null;
  file_name: string | null;
  file_url: string | null;
  uploaded_at: string | null;
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

export function getDocuments() {
  return apiRequest<ListResponse<MandiriDocument>>('/documents');
}

export function uploadDocument(payload: FormData) {
  return apiRequest<ItemResponse<MandiriDocument>>('/documents', {
    method: 'POST',
    body: payload,
  });
}

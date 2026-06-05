import { apiRequest } from './client';

export type MessageBox = 'masuk' | 'keluar';

export type MandiriMessage = {
  uuid: string;
  box: MessageBox;
  owner: string;
  subjek: string | null;
  pesan: string;
  status: number;
  is_read: boolean;
  tgl_upload: string | null;
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

export function getMessages(box: MessageBox) {
  return apiRequest<ListResponse<MandiriMessage>>(`/pesan/${box}`);
}

export function getMessageDetail(uuid: string) {
  return apiRequest<ItemResponse<MandiriMessage>>(`/pesan/detail/${uuid}`);
}

export function sendMessage(payload: { subjek: string; pesan: string }) {
  return apiRequest<ItemResponse<MandiriMessage>>('/pesan', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

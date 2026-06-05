import { apiRequest } from './client';

export type PublicArticle = {
  id: number;
  judul: string;
  slug: string | null;
  ringkasan: string;
  isi: string | null;
  gambar_url: string | null;
  tgl_upload: string | null;
  url: string;
};

export type GalleryItem = {
  id: number;
  parent_id: number;
  nama: string;
  gambar_url: string | null;
  tgl_upload: string | null;
  jenis: number;
  child_count: number;
};

export type SynergyProgram = {
  uuid: string;
  judul: string;
  tautan: string | null;
  gambar_url: string | null;
};

export type AgendaItem = {
  id: number;
  id_artikel: number;
  judul: string;
  ringkasan: string;
  tanggal: string | null;
  lokasi: string | null;
  koordinator: string | null;
  gambar_url: string | null;
};

export type PublicDocument = {
  id: number;
  nama: string;
  kategori: string | null;
  tahun: string | number | null;
  file_name: string | null;
  file_url: string | null;
  uploaded_at: string | null;
};

export type Complaint = {
  id: number;
  judul: string;
  isi: string;
  status: number;
  status_label: string;
  foto_url: string | null;
  replies: Array<{
    id: number;
    nama: string | null;
    isi: string;
    status: number;
    created_at: string | null;
  }>;
  created_at: string | null;
  updated_at: string | null;
};

export type VillageInfo = {
  nama: string;
  kode_desa: string | null;
  kecamatan: string | null;
  kode_kecamatan: string | null;
  kabupaten: string | null;
  kode_kabupaten: string | null;
  provinsi: string | null;
  kode_provinsi: string | null;
  alamat_kantor: string | null;
  telepon: string | null;
  email: string | null;
  website: string | null;
  nama_kontak: string | null;
  hp_kontak: string | null;
  jabatan_kontak: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  map_url: string | null;
  static_map_url: string | null;
};

export type SatisfactionOption = {
  value: number;
  label: string;
};

export type SatisfactionSummary = SatisfactionOption & {
  total: number;
  percentage: number;
};

export type SatisfactionEntry = {
  id: number;
  pilihan: number;
  label: string;
  tanggal: string | null;
};

export function getArticles() {
  return apiRequest<{ data: { items: PublicArticle[] } }>('/articles');
}

export function getArticle(id: number) {
  return apiRequest<{ data: { item: PublicArticle } }>(`/articles/${id}`);
}

export function getGallery() {
  return apiRequest<{ data: { items: GalleryItem[] } }>('/gallery');
}

export function getGalleryDetail(id: number) {
  return apiRequest<{ data: { item: GalleryItem; children: GalleryItem[] } }>(`/gallery/${id}`);
}

export function getSynergyPrograms() {
  return apiRequest<{ data: { items: SynergyProgram[] } }>('/sinergi-program');
}

export function getAgenda() {
  return apiRequest<{ data: { items: AgendaItem[] } }>('/agenda');
}

export function getPublicDocuments() {
  return apiRequest<{ data: { items: PublicDocument[] } }>('/informasi-publik');
}

export function getVillageInfo() {
  return apiRequest<{ data: { desa: VillageInfo } }>('/info-desa');
}

export function getComplaints() {
  return apiRequest<{ data: { items: Complaint[] } }>('/complaints');
}

export function createComplaint(payload: { judul: string; isi: string; telepon?: string }) {
  return apiRequest<{ message: string; data: { item: Complaint } }>('/complaints', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSatisfaction() {
  return apiRequest<{
    data: {
      options: SatisfactionOption[];
      summary: SatisfactionSummary[];
      total: number;
      history: SatisfactionEntry[];
      current_month: SatisfactionEntry | null;
      available_at: string;
    };
  }>('/satisfaction');
}

export function createSatisfaction(payload: { pilihan: number }) {
  return apiRequest<{ message: string; data: { item: SatisfactionEntry } }>('/satisfaction', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

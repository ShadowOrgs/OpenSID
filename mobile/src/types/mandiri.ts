export type MandiriUser = {
  id_pend: number;
  aktif: number;
  nama: string;
  nik: string;
  no_kk: string | null;
  email: string | null;
  telegram: string | null;
  jenis_kelamin: number | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  alamat: string | null;
  foto_url: string | null;
};

export type AuthResponse = {
  token_type: 'Bearer';
  access_token: string;
  expires_at: string | null;
  user: MandiriUser;
};

export type DashboardResponse = {
  desa: {
    nama: string;
    kode_desa: string;
    kecamatan: string;
    kabupaten: string;
    logo_url: string | null;
  };
  user: MandiriUser;
  slider: Array<{
    id: number;
    judul: string;
    gambar_url: string | null;
    url: string;
  }>;
  teks_berjalan: Array<{
    id: number;
    teks: string;
    tautan: string | null;
    judul_tautan: string | null;
  }>;
  menus: Array<{ key: string; label: string; icon: string }>;
  quick_links: Array<{ key: string; label: string }>;
};

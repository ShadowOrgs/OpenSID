<?php

use App\Models\Dokumen;
use App\Models\DokumenHidup;
use App\Models\Agenda;
use App\Models\Artikel;
use App\Models\BantuanPeserta;
use App\Models\FormatSurat;
use App\Models\Galery;
use App\Models\Pamong;
use App\Models\Penduduk;
use App\Models\PendudukMandiri;
use App\Models\PendudukMandiriToken;
use App\Models\Pendapat;
use App\Models\Pengaduan;
use App\Models\PermohonanSurat;
use App\Models\PesanMandiri;
use App\Models\SinergiProgram;
use App\Models\SyaratSurat;
use App\Models\TeksBerjalan;
use App\Enums\KategoriPublicEnum;
use App\Enums\JawabanKepuasanEnum;
use Modules\Lapak\Models\Produk as LapakProduk;
use Modules\Lapak\Models\ProdukKategori;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Spipu\Html2Pdf\Html2Pdf;

defined('BASEPATH') || exit('No direct script access allowed');

class Mandiri extends Api_Controller
{
    private ?PendudukMandiri $mobileUser = null;
    private ?PendudukMandiriToken $mobileToken = null;

    public function health(): void
    {
        $this->ok([
            'message' => 'Mobile API aktif.',
            'data'    => [
                'desa' => $this->desaPayload(),
                'time' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }

    public function register(): void
    {
        $input = $this->inputData();
        $errors = $this->validateRegister($input);

        if ($errors !== []) {
            $this->fail('Data pendaftaran belum valid.', $errors, 422);
        }

        $penduduk = Penduduk::query()
            ->whereRelation('keluarga', 'no_kk', $input['no_kk'])
            ->where([
                'nik'          => $input['nik'],
                'nama'         => $input['nama'],
                'tanggallahir' => $input['tanggallahir'],
            ])
            ->first();

        if (! $penduduk) {
            $this->failPendudukMatch($input);
        }

        DB::beginTransaction();

        try {
            $penduduk->email = $input['email'];
            $penduduk->email_tgl_verifikasi = $penduduk->email_tgl_verifikasi ?? Carbon::now();

            if (filled($input['telegram'] ?? null)) {
                $penduduk->telegram = $input['telegram'];
                $penduduk->telegram_tgl_verifikasi = $penduduk->telegram_tgl_verifikasi ?? Carbon::now();
            }

            $penduduk->save();

            $mandiri = $penduduk->mandiri()->first();

            if (! $mandiri) {
                $mandiri = $penduduk->mandiri()->create([
                    'aktif'       => 1,
                    'scan_ktp'    => basename(request()->file('scan_1')->store('upload/pendaftaran', 'desa')),
                    'scan_kk'     => basename(request()->file('scan_2')->store('upload/pendaftaran', 'desa')),
                    'foto_selfie' => basename(request()->file('scan_3')->store('upload/pendaftaran', 'desa')),
                    'ganti_pin'   => 0,
                    'pin'         => Hash::make($input['password']),
                ]);
            } else {
                $mandiri->aktif = 1;
                $mandiri->pin = Hash::make($input['password']);
                $mandiri->save();
            }

            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            logger()->error($e);
            $this->fail('Pendaftaran gagal diproses.', ['server' => ['Terjadi kesalahan saat menyimpan data pendaftaran.']], 500);
        }

        $this->ok([
            'message' => 'Pendaftaran berhasil.',
            'data'    => $this->authPayload($mandiri, $input['device_name'] ?? null),
        ], 201);
    }

    public function login(): void
    {
        $input = $this->inputData();
        $errors = [];

        if (empty($input['nik']) || ! preg_match('/^\d{16}$/', (string) $input['nik'])) {
            $errors['nik'][] = 'NIK harus berisi 16 digit.';
        }

        if (empty($input['password'])) {
            $errors['password'][] = 'PIN wajib diisi.';
        }

        if ($errors !== []) {
            $this->fail('Data login belum valid.', $errors, 422);
        }

        $mandiri = PendudukMandiri::query()
            ->whereRelation('penduduk', 'nik', $input['nik'])
            ->where('aktif', 1)
            ->first();

        if (! $mandiri || ! Hash::check($input['password'], $mandiri->pin)) {
            $this->fail('NIK atau PIN salah.', ['credentials' => ['NIK atau PIN salah.']], 401);
        }

        $mandiri->last_login = Carbon::now();
        $mandiri->save();

        $this->ok([
            'message' => 'Login berhasil.',
            'data'    => $this->authPayload($mandiri, $input['device_name'] ?? null),
        ]);
    }

    public function logout(): void
    {
        $this->requireMobileAuth();
        $this->mobileToken?->delete();

        $this->ok(['message' => 'Logout berhasil.']);
    }

    public function me(): void
    {
        $user = $this->requireMobileAuth();

        $this->ok([
            'data' => [
                'user' => $this->userPayload($user),
            ],
        ]);
    }

    public function dashboard(): void
    {
        $user = $this->requireMobileAuth();

        $this->ok([
            'data' => [
                'desa'          => $this->desaPayload(),
                'user'          => $this->userPayload($user),
                'slider'        => $this->dashboardSliderPayload(),
                'teks_berjalan' => $this->runningTextPayload(),
                'menus'         => [
                    ['key' => 'surat', 'label' => 'Surat', 'icon' => 'file-text'],
                    ['key' => 'pesan', 'label' => 'Pesan', 'icon' => 'mail'],
                    ['key' => 'lapak', 'label' => 'Lapak', 'icon' => 'shopping-cart'],
                    ['key' => 'artikel', 'label' => 'Artikel', 'icon' => 'newspaper'],
                    ['key' => 'galeri', 'label' => 'Galeri', 'icon' => 'images'],
                    ['key' => 'agenda', 'label' => 'Agenda', 'icon' => 'calendar'],
                    ['key' => 'informasi_publik', 'label' => 'Info Publik', 'icon' => 'megaphone'],
                    ['key' => 'pengaduan', 'label' => 'Pengaduan', 'icon' => 'chat-alert'],
                    ['key' => 'kepuasan', 'label' => 'Kepuasan', 'icon' => 'happy'],
                    ['key' => 'info_desa', 'label' => 'Info Desa', 'icon' => 'map-pin'],
                    ['key' => 'sinergi_program', 'label' => 'Sinergi', 'icon' => 'link'],
                    ['key' => 'bantuan', 'label' => 'Bantuan', 'icon' => 'heart-handshake'],
                    ['key' => 'perangkat', 'label' => 'Perangkat', 'icon' => 'users'],
                    ['key' => 'dokumen', 'label' => 'Dokumen', 'icon' => 'folder'],
                ],
                'quick_links' => [
                    ['key' => 'profil', 'label' => 'Profil'],
                    ['key' => 'kartu_keluarga', 'label' => 'Cetak Salinan KK'],
                    ['key' => 'biodata', 'label' => 'Cetak Biodata'],
                    ['key' => 'ganti_pin', 'label' => 'Ganti PIN'],
                ],
            ],
        ]);
    }

    public function profile(): void
    {
        $user = $this->requireMobileAuth();

        $this->ok([
            'data' => [
                'user'    => $this->userPayload($user),
                'biodata' => $this->biodataPayload($user->penduduk),
            ],
        ]);
    }

    public function family(): void
    {
        $user = $this->requireMobileAuth();
        $keluarga = $user->penduduk->keluarga;

        $this->ok([
            'data' => [
                'keluarga' => [
                    'id'         => $keluarga->id,
                    'no_kk'      => $keluarga->no_kk,
                    'alamat'     => $keluarga->alamat,
                    'rt'         => $keluarga->wilayah?->rt,
                    'rw'         => $keluarga->wilayah?->rw,
                    'dusun'      => $keluarga->wilayah?->dusun,
                    'anggota'    => $keluarga->anggota->map(fn (Penduduk $penduduk): array => $this->familyMemberPayload($penduduk))->values(),
                ],
            ],
        ]);
    }

    public function printBiodataPdf(): void
    {
        $user = $this->requireMobileAuth();

        $html = view('layanan_mandiri.kependudukan.cetak_biodata', [
            'desa'     => identitas(),
            'penduduk' => Penduduk::find($user->id_pend),
        ], [], true)->render();

        $this->outputPdf($html, 'biodata-' . $user->penduduk->nik, 'P', 'A4');
    }

    public function printKkPdf(): void
    {
        $user = $this->requireMobileAuth();
        $idKk = $user->penduduk->id_kk;

        if (! $idKk) {
            $this->fail('Penduduk belum terhubung dengan KK.', ['kk' => ['Penduduk belum terhubung dengan data Kartu Keluarga.']], 422);
        }

        $keluarga = $user->penduduk->keluarga()->with(['anggota', 'kepalaKeluarga'])->find($idKk);

        $html = view('layanan_mandiri.kependudukan.cetak_kk', [
            'main'      => $keluarga->anggota,
            'desa'      => identitas(),
            'kepala_kk' => $keluarga->kepalaKeluarga,
        ], [], true)->render();

        $html = $this->normalizeMobileKkHtml($html);
        $html = '<html><head><meta charset="UTF-8"><link href="' . asset('assets/css/report.css') . '" rel="stylesheet" type="text/css"><style>' . $this->mobileKkPdfCss() . '</style></head><body><div id="container" class="mobile-kk-pdf">' . $html . '</div></body></html>';

        $this->outputPdf($html, 'salinan-kk-' . $keluarga->no_kk, 'L', 'A4');
    }

    public function changePin(): void
    {
        $user = $this->requireMobileAuth();
        $input = $this->inputData();
        $errors = [];

        if (blank($input['current_pin'] ?? null)) {
            $errors['current_pin'][] = 'PIN lama wajib diisi.';
        }

        if (blank($input['new_pin'] ?? null) || ! preg_match('/^\d{6}$/', (string) ($input['new_pin'] ?? ''))) {
            $errors['new_pin'][] = 'PIN baru harus berisi 6 digit angka.';
        }

        if (($input['new_pin_confirmation'] ?? null) !== ($input['new_pin'] ?? null)) {
            $errors['new_pin_confirmation'][] = 'Konfirmasi PIN baru tidak sama.';
        }

        if ($errors !== []) {
            $this->fail('Data ganti PIN belum valid.', $errors, 422);
        }

        if (! Hash::check($input['current_pin'], $user->pin)) {
            $this->fail('PIN lama salah.', ['current_pin' => ['PIN lama salah.']], 422);
        }

        $user->pin = Hash::make($input['new_pin']);
        $user->ganti_pin = 0;
        $user->save();

        $this->ok(['message' => 'PIN berhasil diganti.']);
    }

    public function assistance(): void
    {
        $user = $this->requireMobileAuth();

        $items = BantuanPeserta::with('bantuan')
            ->where('peserta', $user->penduduk->nik)
            ->latest('id')
            ->get()
            ->map(fn (BantuanPeserta $item): array => $this->assistancePayload($item))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function perangkat(): void
    {
        $this->requireMobileAuth();

        $items = Pamong::with(['penduduk', 'jabatan'])
            ->aktif()
            ->urut()
            ->get()
            ->map(fn (Pamong $pamong): array => $this->pamongPayload($pamong))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function articles(): void
    {
        $this->requireMobileAuth();

        $items = Artikel::query()
            ->active()
            ->whereNotIn('tipe', Artikel::TIPE_NOT_IN_ARTIKEL)
            ->latest('tgl_upload')
            ->limit(50)
            ->get()
            ->map(fn (Artikel $artikel): array => $this->articlePayload($artikel))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function article($id): void
    {
        $this->requireMobileAuth();

        $artikel = Artikel::query()
            ->active()
            ->whereNotIn('tipe', Artikel::TIPE_NOT_IN_ARTIKEL)
            ->find($id);

        if (! $artikel) {
            $this->fail('Artikel tidak ditemukan.', ['id' => ['Artikel tidak ditemukan.']], 404);
        }

        $this->ok([
            'data' => [
                'item' => $this->articlePayload($artikel, true),
            ],
        ]);
    }

    public function gallery(): void
    {
        $this->requireMobileAuth();

        $parents = Galery::query()
            ->where('enabled', 1)
            ->where('parrent', 0)
            ->orderBy('urut')
            ->latest('tgl_upload')
            ->get();

        $items = ($parents->isNotEmpty() ? $parents : Galery::query()->where('enabled', 1)->orderBy('urut')->latest('tgl_upload')->limit(50)->get())
            ->map(fn (Galery $galeri): array => $this->galleryPayload($galeri))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function galleryDetail($id): void
    {
        $this->requireMobileAuth();

        $album = Galery::query()
            ->where('enabled', 1)
            ->find($id);

        if (! $album) {
            $this->fail('Galeri tidak ditemukan.', ['id' => ['Galeri tidak ditemukan.']], 404);
        }

        $children = Galery::query()
            ->where('enabled', 1)
            ->where('parrent', $album->id)
            ->orderBy('urut')
            ->latest('tgl_upload')
            ->get()
            ->map(fn (Galery $galeri): array => $this->galleryPayload($galeri))
            ->values();

        $this->ok([
            'data' => [
                'item'     => $this->galleryPayload($album),
                'children' => $children,
            ],
        ]);
    }

    public function synergyPrograms(): void
    {
        $this->requireMobileAuth();

        $items = SinergiProgram::query()
            ->where('status', 1)
            ->orderBy('urut')
            ->get()
            ->map(static fn (SinergiProgram $item): array => [
                'uuid'      => $item->uuid,
                'judul'     => $item->judul,
                'tautan'    => $item->tautan,
                'gambar_url'=> $item->gambar ? site_url(LOKASI_SINERGI_PROGRAM . $item->gambar) : null,
            ])
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function agenda(): void
    {
        $this->requireMobileAuth();

        $items = Agenda::query()
            ->select('agenda.*', 'artikel.judul', 'artikel.isi', 'artikel.gambar', 'artikel.tgl_upload')
            ->join('artikel', 'artikel.id', '=', 'agenda.id_artikel')
            ->where('artikel.enabled', 1)
            ->orderByDesc('agenda.tgl_agenda')
            ->limit(50)
            ->get()
            ->map(fn ($agenda): array => [
                'id'          => $agenda->id,
                'id_artikel'  => $agenda->id_artikel,
                'judul'       => $agenda->judul,
                'ringkasan'   => $this->plainText($agenda->isi, 180),
                'tanggal'     => $agenda->tgl_agenda ? Carbon::parse($agenda->tgl_agenda)->toIso8601String() : null,
                'lokasi'      => $agenda->lokasi_kegiatan,
                'koordinator' => $agenda->koordinator_kegiatan,
                'gambar_url'  => $this->imageUrl(LOKASI_FOTO_ARTIKEL, $agenda->gambar),
            ])
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function publicDocuments(): void
    {
        $this->requireMobileAuth();

        $items = DokumenHidup::query()
            ->informasiPublik()
            ->where('enabled', DokumenHidup::ENABLE)
            ->where('deleted', 0)
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (DokumenHidup $dokumen): array => $this->publicDocumentPayload($dokumen))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function villageInfo(): void
    {
        $this->requireMobileAuth();

        $desa = identitas();
        $lat = filled($desa->lat) ? (float) $desa->lat : null;
        $lng = filled($desa->lng) ? (float) $desa->lng : null;
        $query = $lat !== null && $lng !== null ? "{$lat},{$lng}" : trim((string) $desa->alamat_kantor . ' ' . $desa->nama_desa . ' ' . $desa->nama_kabupaten);

        $this->ok([
            'data' => [
                'desa' => [
                    'nama'            => $desa->nama_desa,
                    'kode_desa'       => $desa->kode_desa,
                    'kecamatan'       => $desa->nama_kecamatan,
                    'kode_kecamatan'  => $desa->kode_kecamatan,
                    'kabupaten'       => $desa->nama_kabupaten,
                    'kode_kabupaten'  => $desa->kode_kabupaten,
                    'provinsi'        => $desa->nama_propinsi,
                    'kode_provinsi'   => $desa->kode_propinsi,
                    'alamat_kantor'   => $desa->alamat_kantor,
                    'telepon'         => $desa->telepon,
                    'email'           => $desa->email_desa,
                    'website'         => $desa->website,
                    'nama_kontak'     => $desa->nama_kontak,
                    'hp_kontak'       => $desa->hp_kontak,
                    'jabatan_kontak'  => $desa->jabatan_kontak,
                    'lat'             => $lat,
                    'lng'             => $lng,
                    'logo_url'        => $this->desaLogoUrl($desa->logo),
                    'map_url'         => $query ? 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($query) : null,
                    'static_map_url'  => $lat !== null && $lng !== null ? "https://staticmap.openstreetmap.de/staticmap.php?center={$lat},{$lng}&zoom=15&size=640x360&markers={$lat},{$lng},red-pushpin" : null,
                ],
            ],
        ]);
    }

    public function complaints(): void
    {
        $user = $this->requireMobileAuth();

        $items = Pengaduan::query()
            ->where('nik', $user->penduduk->nik)
            ->whereNull('id_pengaduan')
            ->with(['child' => static fn ($query) => $query->orderBy('created_at')])
            ->latest('created_at')
            ->limit(50)
            ->get()
            ->map(fn (Pengaduan $pengaduan): array => $this->complaintPayload($pengaduan))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function createComplaint(): void
    {
        $user = $this->requireMobileAuth();
        $input = $this->inputData();
        $errors = [];

        if (blank($input['judul'] ?? null)) {
            $errors['judul'][] = 'Judul pengaduan wajib diisi.';
        }

        if (blank($input['isi'] ?? null)) {
            $errors['isi'][] = 'Isi pengaduan wajib diisi.';
        }

        if ($errors !== []) {
            $this->fail('Data pengaduan belum valid.', $errors, 422);
        }

        $pengaduan = Pengaduan::create([
            'config_id'   => identitas()->id,
            'id_pengaduan'=> null,
            'nik'         => $user->penduduk->nik,
            'nama'        => $user->penduduk->nama,
            'email'       => $user->penduduk->email,
            'telepon'     => trim((string) ($input['telepon'] ?? $user->penduduk->telepon)),
            'judul'       => trim((string) $input['judul']),
            'isi'         => trim((string) $input['isi']),
            'status'      => 1,
            'ip_address'  => $this->input->ip_address(),
        ]);

        $this->ok([
            'message' => 'Pengaduan berhasil dikirim.',
            'data'    => [
                'item' => $this->complaintPayload($pengaduan),
            ],
        ], 201);
    }

    public function satisfaction(): void
    {
        $user = $this->requireMobileAuth();
        $options = collect(JawabanKepuasanEnum::all())
            ->map(fn (string $label, int $value): array => $this->satisfactionOptionPayload($value, $label))
            ->values();

        $summary = Pendapat::query()
            ->selectRaw('pilihan, COUNT(*) as total')
            ->groupBy('pilihan')
            ->pluck('total', 'pilihan');

        $total = (int) $summary->sum();
        $history = Pendapat::query()
            ->where('pengguna', $user->id_pend)
            ->latest('tanggal')
            ->limit(20)
            ->get()
            ->map(fn (Pendapat $pendapat): array => $this->satisfactionPayload($pendapat))
            ->values();
        $currentMonth = Pendapat::query()
            ->where('pengguna', $user->id_pend)
            ->whereYear('tanggal', Carbon::now()->year)
            ->whereMonth('tanggal', Carbon::now()->month)
            ->latest('tanggal')
            ->first();

        $this->ok([
            'data' => [
                'options'       => $options,
                'summary'       => $options
                    ->map(static fn (array $option): array => [
                        'value'      => $option['value'],
                        'label'      => $option['label'],
                        'total'      => (int) ($summary[$option['value']] ?? 0),
                        'percentage' => $total > 0 ? round(((int) ($summary[$option['value']] ?? 0) / $total) * 100, 2) : 0,
                    ])
                    ->values(),
                'total'         => $total,
                'history'       => $history,
                'current_month' => $currentMonth ? $this->satisfactionPayload($currentMonth) : null,
                'available_at'  => Carbon::now()->addMonthNoOverflow()->startOfMonth()->toIso8601String(),
            ],
        ]);
    }

    public function createSatisfaction(): void
    {
        $user = $this->requireMobileAuth();
        $input = $this->inputData();
        $choice = (int) ($input['pilihan'] ?? 0);
        $options = array_keys(JawabanKepuasanEnum::all());

        if (! in_array($choice, $options, true)) {
            $this->fail('Pilihan kepuasan belum valid.', ['pilihan' => ['Pilih salah satu tingkat kepuasan.']], 422);
        }

        $alreadyRated = Pendapat::query()
            ->where('pengguna', $user->id_pend)
            ->whereYear('tanggal', Carbon::now()->year)
            ->whereMonth('tanggal', Carbon::now()->month)
            ->exists();

        if ($alreadyRated) {
            $this->fail('Anda sudah memberi penilaian bulan ini.', [
                'pilihan' => ['Penilaian kepuasan hanya dapat dikirim satu kali setiap bulan.'],
            ], 409);
        }

        $pendapat = Pendapat::create([
            'config_id' => identitas()->id,
            'pengguna'  => $user->id_pend,
            'pilihan'   => $choice,
        ]);

        $this->ok([
            'message' => 'Terima kasih, penilaian Anda berhasil disimpan.',
            'data'    => [
                'item' => $this->satisfactionPayload($pendapat),
            ],
        ], 201);
    }

    public function lapak(): void
    {
        $this->requireMobileAuth();
        $input = $this->inputData();
        $keyword = trim((string) ($input['keyword'] ?? $this->input->get('keyword', true)));
        $category = $input['category_id'] ?? $this->input->get('category_id', true);

        $products = LapakProduk::with(['kategori', 'pelapak', 'pelapak.penduduk'])
            ->where('status', 1)
            ->whereHas('kategori', static fn ($query) => $query->where('status', 1))
            ->whereHas('pelapak', static fn ($query) => $query->where('status', 1))
            ->when($category, static fn ($query) => $query->where('id_produk_kategori', $category))
            ->when($keyword, static function ($query) use ($keyword): void {
                $query->where(static function ($query) use ($keyword): void {
                    $query->where('nama', 'like', "%{$keyword}%")
                        ->orWhere('deskripsi', 'like', "%{$keyword}%");
                });
            })
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (LapakProduk $produk): array => $this->lapakProductPayload($produk))
            ->values();

        $categories = ProdukKategori::where('status', 1)
            ->orderBy('kategori')
            ->get()
            ->map(static fn (ProdukKategori $kategori): array => [
                'id'   => $kategori->id,
                'nama' => $kategori->kategori,
            ])
            ->values();

        $this->ok([
            'data' => [
                'items'      => $products,
                'categories' => $categories,
            ],
        ]);
    }

    public function suratTypes(): void
    {
        $this->requireMobileAuth();

        $items = FormatSurat::query()
            ->kunci(FormatSurat::KUNCI_DISABLE)
            ->mandiri()
            ->orderBy('nama')
            ->get()
            ->map(fn (FormatSurat $surat): array => $this->suratTypePayload($surat))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function suratType($id): void
    {
        $this->requireMobileAuth();

        $surat = FormatSurat::query()
            ->kunci(FormatSurat::KUNCI_DISABLE)
            ->mandiri()
            ->find($id);

        if (! $surat) {
            $this->fail('Jenis surat tidak ditemukan.', ['id_surat' => ['Jenis surat tidak tersedia untuk layanan mandiri.']], 404);
        }

        $this->ok([
            'data' => [
                'item' => $this->suratTypePayload($surat, true),
            ],
        ]);
    }

    public function suratRequests(): void
    {
        $user = $this->requireMobileAuth();

        $items = PermohonanSurat::query()
            ->where('id_pemohon', $user->id_pend)
            ->belumDiambil()
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (PermohonanSurat $permohonan): array => $this->suratRequestPayload($permohonan))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function suratRequest($id): void
    {
        $user = $this->requireMobileAuth();

        $permohonan = PermohonanSurat::query()
            ->where('id_pemohon', $user->id_pend)
            ->find($id);

        if (! $permohonan) {
            $this->fail('Permohonan surat tidak ditemukan.', ['id' => ['Permohonan surat tidak ditemukan.']], 404);
        }

        $this->ok([
            'data' => [
                'item' => $this->suratRequestPayload($permohonan),
            ],
        ]);
    }

    public function createSuratRequest(): void
    {
        $user = $this->requireMobileAuth();
        $input = $this->inputData();
        $errors = [];

        if (blank($input['id_surat'] ?? null)) {
            $errors['id_surat'][] = 'Jenis surat wajib dipilih.';
        }

        if (blank($input['no_hp_aktif'] ?? null)) {
            $errors['no_hp_aktif'][] = 'Nomor HP aktif wajib diisi.';
        }

        if ($errors !== []) {
            $this->fail('Data permohonan surat belum valid.', $errors, 422);
        }

        $surat = FormatSurat::query()
            ->kunci(FormatSurat::KUNCI_DISABLE)
            ->mandiri()
            ->find($input['id_surat']);

        if (! $surat) {
            $this->fail('Jenis surat tidak tersedia untuk layanan mandiri.', ['id_surat' => ['Jenis surat tidak tersedia untuk layanan mandiri.']], 422);
        }

        $fieldErrors = $this->validateSuratFields($surat, is_array($input['isian_form'] ?? null) ? $input['isian_form'] : []);
        $syaratErrors = $this->validateSuratSyarat($surat, is_array($input['syarat'] ?? null) ? $input['syarat'] : [], $user->id_pend);

        if ($fieldErrors !== [] || $syaratErrors !== []) {
            $this->fail('Data permohonan surat belum valid.', array_merge($fieldErrors, $syaratErrors), 422);
        }

        $isianForm = is_array($input['isian_form'] ?? null) ? $input['isian_form'] : [];
        $isianForm = array_merge($isianForm, [
            'id_surat'     => $surat->id,
            'url_surat'    => $surat->url_surat,
            'nik'          => $user->penduduk->nik,
            'nama'         => $user->penduduk->nama,
            'no_hp_aktif'  => trim((string) $input['no_hp_aktif']),
        ]);

        $permohonan = PermohonanSurat::create([
            'config_id'    => identitas()->id,
            'id_pemohon'   => $user->id_pend,
            'id_surat'     => $surat->id,
            'isian_form'   => $isianForm,
            'status'       => PermohonanSurat::SEDANG_DIPERIKSA,
            'keterangan'   => trim((string) ($input['keterangan'] ?? '')),
            'no_hp_aktif'  => trim((string) $input['no_hp_aktif']),
            'syarat'       => is_array($input['syarat'] ?? null) ? $input['syarat'] : [],
        ]);

        $this->ok([
            'message' => 'Permohonan surat berhasil dikirim.',
            'data'    => [
                'item' => $this->suratRequestPayload($permohonan->fresh()),
            ],
        ], 201);
    }

    public function documents(): void
    {
        $user = $this->requireMobileAuth();

        $items = DokumenHidup::query()
            ->where('id_pend', $user->id_pend)
            ->where('enabled', DokumenHidup::ENABLE)
            ->orderBy('id_syarat')
            ->latest('updated_at')
            ->get()
            ->map(fn (DokumenHidup $dokumen): array => $this->documentPayload($dokumen))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function documentFile($id): void
    {
        $user = $this->requireMobileAuth();

        $dokumen = DokumenHidup::query()
            ->where('id_pend', $user->id_pend)
            ->where('enabled', DokumenHidup::ENABLE)
            ->find($id);

        if (! $dokumen || blank($dokumen->satuan)) {
            $this->fail('Dokumen tidak ditemukan.', ['id' => ['Dokumen tidak ditemukan.']], 404);
        }

        $path = FCPATH . LOKASI_DOKUMEN . $dokumen->satuan;

        if (! is_file($path)) {
            $this->fail('File dokumen tidak ditemukan.', ['file' => ['File dokumen tidak ditemukan di server.']], 404);
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $mime = mime_content_type($path) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="' . basename($dokumen->satuan) . '"');
        readfile($path);
        exit;
    }

    public function uploadDocument(): void
    {
        $user = $this->requireMobileAuth();
        $input = $this->inputData();
        $errors = [];

        if (blank($input['nama'] ?? null)) {
            $errors['nama'][] = 'Nama dokumen wajib diisi.';
        }

        if (blank($input['id_syarat'] ?? null) || ! SyaratSurat::where('ref_syarat_id', $input['id_syarat'])->exists()) {
            $errors['id_syarat'][] = 'Jenis dokumen wajib dipilih.';
        }

        if (! request()->hasFile('file')) {
            $errors['file'][] = 'File dokumen wajib diunggah.';
        }

        if ($errors !== []) {
            $this->fail('Data dokumen belum valid.', $errors, 422);
        }

        $file = request()->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['jpg', 'jpeg', 'png', 'pdf'], true)) {
            $this->fail('Tipe file dokumen tidak didukung.', ['file' => ['File harus jpg, jpeg, png, atau pdf.']], 422);
        }

        $baseName = preg_replace('/[^a-z0-9_-]+/i', '-', trim((string) $input['nama']));
        $fileName = trim($baseName, '-') . '-' . time() . '.' . $extension;
        $uploadPath = FCPATH . LOKASI_DOKUMEN;

        if (! is_dir($uploadPath)) {
            mkdir($uploadPath, 0775, true);
        }

        $file->move($uploadPath, $fileName);

        $dokumen = Dokumen::create([
            'nama'       => trim((string) $input['nama']),
            'satuan'     => $fileName,
            'enabled'    => Dokumen::ENABLE,
            'id_pend'    => $user->id_pend,
            'kategori'   => 1,
            'attr'       => [],
            'tipe'       => 1,
            'id_syarat'  => (int) $input['id_syarat'],
            'dok_warga'  => 1,
            'created_by' => $user->id_pend,
            'updated_by' => $user->id_pend,
            'status'     => '1',
        ]);

        $this->ok([
            'message' => 'Dokumen berhasil diunggah.',
            'data'    => [
                'item' => $this->documentPayload(DokumenHidup::find($dokumen->id)),
            ],
        ], 201);
    }

    public function messages($box = 'masuk'): void
    {
        $user = $this->requireMobileAuth();
        $tipe = $this->messageTypeForBox($box);

        $items = PesanMandiri::query()
            ->where('penduduk_id', $user->id_pend)
            ->where('tipe', $tipe)
            ->where('is_archived', 0)
            ->latest('tgl_upload')
            ->limit(50)
            ->get()
            ->map(fn (PesanMandiri $pesan): array => $this->messagePayload($pesan))
            ->values();

        $this->ok([
            'data' => [
                'items' => $items,
            ],
        ]);
    }

    public function message($uuid): void
    {
        $user = $this->requireMobileAuth();

        $pesan = PesanMandiri::query()
            ->where('penduduk_id', $user->id_pend)
            ->where('is_archived', 0)
            ->find($uuid);

        if (! $pesan) {
            $this->fail('Pesan tidak ditemukan.', ['uuid' => ['Pesan tidak ditemukan.']], 404);
        }

        if ((int) $pesan->tipe === PesanMandiri::KELUAR && (int) $pesan->status !== PesanMandiri::READ) {
            $pesan->status = PesanMandiri::READ;
            $pesan->save();
        }

        $this->ok([
            'data' => [
                'item' => $this->messagePayload($pesan->fresh()),
            ],
        ]);
    }

    public function sendMessage(): void
    {
        $user = $this->requireMobileAuth();
        $input = $this->inputData();
        $errors = [];

        if (blank($input['subjek'] ?? null)) {
            $errors['subjek'][] = 'Subjek wajib diisi.';
        }

        if (blank($input['pesan'] ?? null)) {
            $errors['pesan'][] = 'Pesan wajib diisi.';
        }

        if ($errors !== []) {
            $this->fail('Data pesan belum valid.', $errors, 422);
        }

        if (PesanMandiri::hasDelay($user->id_pend, PesanMandiri::MASUK)) {
            $this->fail('Pesan terlalu cepat dikirim.', ['pesan' => ['Tunggu beberapa saat sebelum mengirim pesan berikutnya.']], 429);
        }

        $pesan = PesanMandiri::create([
            'config_id'   => identitas()->id,
            'owner'       => $user->penduduk->nama,
            'penduduk_id' => $user->id_pend,
            'subjek'      => trim((string) $input['subjek']),
            'komentar'    => trim((string) $input['pesan']),
            'status'      => PesanMandiri::UNREAD,
            'tipe'        => PesanMandiri::MASUK,
            'is_archived' => 0,
        ]);

        $this->ok([
            'message' => 'Pesan berhasil dikirim.',
            'data'    => [
                'item' => $this->messagePayload($pesan),
            ],
        ], 201);
    }

    private function authPayload(PendudukMandiri $mandiri, ?string $deviceName): array
    {
        [$plainTextToken, $token] = $this->createToken($mandiri, $deviceName);

        return [
            'token_type'   => 'Bearer',
            'access_token' => $plainTextToken,
            'expires_at'   => $token->expires_at?->toIso8601String(),
            'user'         => $this->userPayload($mandiri),
        ];
    }

    private function createToken(PendudukMandiri $mandiri, ?string $deviceName): array
    {
        $plainTextToken = Str::random(80);

        $token = PendudukMandiriToken::create([
            'id_pend'      => $mandiri->id_pend,
            'device_name'  => $deviceName ?: 'Mobile App',
            'token_hash'   => hash('sha256', $plainTextToken),
            'last_used_at' => Carbon::now(),
            'expires_at'   => Carbon::now()->addDays(60),
        ]);

        return [$plainTextToken, $token];
    }

    private function requireMobileAuth(): PendudukMandiri
    {
        if ($this->mobileUser) {
            return $this->mobileUser;
        }

        $token = $this->bearerToken();

        if (! $token) {
            $this->fail('Token tidak ditemukan.', ['token' => ['Header Authorization Bearer wajib dikirim.']], 401);
        }

        $record = PendudukMandiriToken::query()
            ->where('token_hash', hash('sha256', $token))
            ->where(static fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', Carbon::now()))
            ->first();

        if (! $record || ! $record->mandiri || (int) $record->mandiri->aktif !== 1) {
            $this->fail('Token tidak valid atau sudah kadaluarsa.', ['token' => ['Token tidak valid atau sudah kadaluarsa.']], 401);
        }

        $record->last_used_at = Carbon::now();
        $record->save();

        $this->mobileToken = $record;
        $this->mobileUser = $record->mandiri;

        return $this->mobileUser;
    }

    private function bearerToken(): ?string
    {
        if ($token = $this->input->get('token', true)) {
            return trim((string) $token);
        }

        $header = $this->input->get_request_header('Authorization', true)
            ?: $this->input->server('HTTP_AUTHORIZATION')
            ?: $this->input->server('REDIRECT_HTTP_AUTHORIZATION');

        if (! $header || ! preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            return null;
        }

        return trim($matches[1]);
    }

    private function outputPdf(string $html, string $filename, string $orientation = 'P', string $pageSize = 'A4'): void
    {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $html = $this->localizePdfAssets($html);

        $pdf = new Html2Pdf($orientation, $pageSize, 'en', true, 'UTF-8');
        foreach (array_filter([
            parse_url(site_url(), PHP_URL_HOST),
            parse_url(APP_URL, PHP_URL_HOST),
            $this->input->server('HTTP_HOST') ? explode(':', (string) $this->input->server('HTTP_HOST'))[0] : null,
            '127.0.0.1',
            'localhost',
        ]) as $host) {
            $pdf->getSecurityService()->addAllowedHost($host);
        }
        $pdf->setDefaultFont('Arial');
        $pdf->writeHTML($html);
        $pdf->output($filename . '.pdf', 'I');
        exit;
    }

    private function localizePdfAssets(string $html): string
    {
        $hosts = array_filter([
            rtrim(site_url(), '/') . '/',
            rtrim(APP_URL, '/') . '/',
            $this->input->server('HTTP_HOST') ? (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'http') . '://' . $this->input->server('HTTP_HOST') . '/' : null,
        ]);

        foreach ($hosts as $host) {
            $html = str_replace($host, FCPATH, $html);
        }

        return preg_replace('/(src|href)="([^"]+?)\\?v[^"]*"/i', '$1="$2"', $html) ?? $html;
    }

    private function mobileKkPdfCss(): string
    {
        return <<<'CSS'
            @page { margin: 5mm 4mm; }
            body { margin: 0; padding: 0; font-size: 7.2pt; }
            .mobile-kk-pdf {
                width: 289mm;
                overflow: hidden;
            }
            .mobile-kk-pdf #body {
                width: 289mm;
                overflow: hidden;
            }
            .mobile-kk-pdf table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                max-width: 100%;
            }
            .mobile-kk-pdf table.border {
                width: 100%;
                font-size: 6.1pt;
            }
            .mobile-kk-pdf th,
            .mobile-kk-pdf td {
                padding: 1.4mm 0.8mm;
                line-height: 1.08;
                vertical-align: top;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            .mobile-kk-pdf h3,
            .mobile-kk-pdf h4,
            .mobile-kk-pdf h5 {
                margin: 0 0 1.5mm;
            }
        CSS;
    }

    private function normalizeMobileKkHtml(string $html): string
    {
        return preg_replace('/\swidth=(["\']).*?\1/i', '', $html) ?? $html;
    }

    private function inputData(): array
    {
        $json = json_decode($this->input->raw_input_stream ?: '', true);

        if (is_array($json)) {
            return $json;
        }

        return $this->input->post() ?: [];
    }

    private function validateRegister(array $input): array
    {
        $errors = [];

        foreach (['nama' => 'Nama', 'tanggallahir' => 'Tanggal lahir', 'nik' => 'NIK', 'no_kk' => 'Nomor KK', 'email' => 'Email', 'password' => 'PIN'] as $field => $label) {
            if (blank($input[$field] ?? null)) {
                $errors[$field][] = "{$label} wajib diisi.";
            }
        }

        if (! empty($input['tanggallahir']) && ! preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $input['tanggallahir'])) {
            $errors['tanggallahir'][] = 'Tanggal lahir harus memakai format YYYY-MM-DD.';
        }

        foreach (['nik' => 'NIK', 'no_kk' => 'Nomor KK'] as $field => $label) {
            if (! empty($input[$field]) && ! preg_match('/^\d{16}$/', (string) $input[$field])) {
                $errors[$field][] = "{$label} harus berisi 16 digit.";
            }
        }

        if (! empty($input['email']) && ! filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'][] = 'Format email tidak valid.';
        }

        if (! empty($input['telegram']) && ! preg_match('/^[0-9]{1,20}$/', (string) $input['telegram'])) {
            $errors['telegram'][] = 'Telegram hanya boleh berisi angka maksimal 20 digit.';
        }

        if (! empty($input['password']) && ! preg_match('/^\d{6}$/', (string) $input['password'])) {
            $errors['password'][] = 'PIN harus berisi 6 digit angka.';
        }

        if (($input['password_confirmation'] ?? $input['password'] ?? null) !== ($input['password'] ?? null)) {
            $errors['password_confirmation'][] = 'Konfirmasi PIN tidak sama dengan PIN.';
        }

        foreach (['scan_1' => 'Scan KTP', 'scan_2' => 'Scan KK', 'scan_3' => 'Foto selfie'] as $field => $label) {
            if (! request()->hasFile($field)) {
                $errors[$field][] = "{$label} wajib diunggah.";
            }
        }

        return $errors;
    }

    private function failPendudukMatch(array $input): void
    {
        $penduduk = Penduduk::where('nik', $input['nik'])->first();

        if (! $penduduk) {
            $this->fail('NIK tidak ditemukan.', ['nik' => ['NIK tidak ditemukan pada data penduduk aktif.']], 422);
        }

        if (empty($penduduk->id_kk) || empty($penduduk->keluarga->no_kk)) {
            $this->fail('Penduduk belum terhubung dengan KK.', ['no_kk' => ['NIK ditemukan, tetapi penduduk belum terhubung dengan data Kartu Keluarga.']], 422);
        }

        if ($penduduk->keluarga->no_kk !== $input['no_kk']) {
            $this->fail('Nomor KK tidak sesuai.', ['no_kk' => ['Nomor KK tidak sesuai dengan data penduduk untuk NIK tersebut.']], 422);
        }

        if (strcasecmp(trim($penduduk->nama), trim($input['nama'])) !== 0) {
            $this->fail('Nama tidak sesuai.', ['nama' => ['Nama tidak sesuai dengan data penduduk untuk NIK dan Nomor KK tersebut.']], 422);
        }

        if ($penduduk->tanggallahir?->format('Y-m-d') !== $input['tanggallahir']) {
            $this->fail('Tanggal lahir tidak sesuai.', ['tanggallahir' => ['Tanggal lahir tidak sesuai dengan data penduduk untuk NIK dan Nomor KK tersebut.']], 422);
        }

        $this->fail('Data penduduk tidak cocok.', ['penduduk' => ['Data penduduk tidak dapat dicocokkan.']], 422);
    }

    private function userPayload(PendudukMandiri $mandiri): array
    {
        $penduduk = $mandiri->penduduk;

        return [
            'id_pend'       => $mandiri->id_pend,
            'aktif'         => (int) $mandiri->aktif,
            'nama'          => $penduduk->nama,
            'nik'           => $penduduk->nik,
            'no_kk'         => $penduduk->keluarga->no_kk,
            'email'         => $penduduk->email,
            'telegram'      => $penduduk->telegram,
            'jenis_kelamin' => $penduduk->sex,
            'tempat_lahir'  => $penduduk->tempatlahir,
            'tanggal_lahir' => $penduduk->tanggallahir?->format('Y-m-d'),
            'alamat'        => $penduduk->alamat_sekarang ?: $penduduk->keluarga->alamat,
            'foto_url'      => $penduduk->foto ? site_url("desa/upload/user_pict/{$penduduk->foto}") : null,
        ];
    }

    private function biodataPayload(Penduduk $penduduk): array
    {
        return [
            'nama'           => $penduduk->nama,
            'nik'            => $penduduk->nik,
            'no_kk'          => $penduduk->keluarga->no_kk,
            'tempat_lahir'   => $penduduk->tempatlahir,
            'tanggal_lahir'  => $penduduk->tanggallahir?->format('Y-m-d'),
            'jenis_kelamin'  => $penduduk->sex,
            'alamat'         => $penduduk->alamat_sekarang ?: $penduduk->keluarga->alamat,
            'ayah_nik'       => $penduduk->ayah_nik,
            'nama_ayah'      => $penduduk->nama_ayah,
            'ibu_nik'        => $penduduk->ibu_nik,
            'nama_ibu'       => $penduduk->nama_ibu,
            'dokumen_paspor' => $penduduk->dokumen_pasport,
            'dokumen_kitas'  => $penduduk->dokumen_kitas,
            'email'          => $penduduk->email,
            'telepon'        => $penduduk->telepon,
        ];
    }

    private function familyMemberPayload(Penduduk $penduduk): array
    {
        return [
            'id'             => $penduduk->id,
            'nama'           => $penduduk->nama,
            'nik'            => $penduduk->nik,
            'kk_level'       => $penduduk->kk_level,
            'tempat_lahir'   => $penduduk->tempatlahir,
            'tanggal_lahir'  => $penduduk->tanggallahir?->format('Y-m-d'),
            'jenis_kelamin'  => $penduduk->sex,
        ];
    }

    private function desaPayload(): array
    {
        $desa = identitas();

        return [
            'nama'      => $desa->nama_desa,
            'kode_desa' => $desa->kode_desa,
            'kecamatan' => $desa->nama_kecamatan,
            'kabupaten' => $desa->nama_kabupaten,
            'logo_url'  => $this->desaLogoUrl($desa->logo),
        ];
    }

    private function dashboardSliderPayload(): array
    {
        $limit = (int) (setting('jumlah_gambar_slider') ?? 10);

        return Artikel::query()
            ->select(['id', 'judul', 'gambar', 'slug', 'tgl_upload'])
            ->where('enabled', 1)
            ->where('tgl_upload', '<', Carbon::now())
            ->whereNotNull('gambar')
            ->where('gambar', '!=', '')
            ->latest('tgl_upload')
            ->limit($limit > 0 ? $limit : 10)
            ->get()
            ->map(fn (Artikel $artikel): array => [
                'id'         => $artikel->id,
                'judul'      => $artikel->judul,
                'gambar_url' => $this->imageUrl(LOKASI_FOTO_ARTIKEL, $artikel->gambar),
                'url'        => $this->assetUrl('artikel/' . ($artikel->slug ?: $artikel->id)),
            ])
            ->values()
            ->all();
    }

    private function runningTextPayload(): array
    {
        return TeksBerjalan::query()
            ->status(1)
            ->orderBy('urut')
            ->get()
            ->map(static fn (TeksBerjalan $item): array => [
                'id'           => $item->id,
                'teks'         => trim((string) $item->teks),
                'tautan'       => $item->tautan,
                'judul_tautan' => $item->judul_tautan,
            ])
            ->filter(static fn (array $item): bool => filled($item['teks']))
            ->values()
            ->all();
    }

    private function suratTypePayload(FormatSurat $surat, bool $withFields = false): array
    {
        $syaratIds = collect($this->decodeJsonArray($surat->getRawOriginal('syarat_surat')))
            ->filter(static fn ($id): bool => filled($id))
            ->map(static fn ($id): int => (int) $id)
            ->values();

        $syarat = $syaratIds->isEmpty()
            ? collect()
            : SyaratSurat::query()
                ->whereIn('ref_syarat_id', $syaratIds)
                ->get()
                ->map(static fn (SyaratSurat $item): array => [
                    'id'   => $item->ref_syarat_id,
                    'nama' => $item->ref_syarat_nama,
                ])
                ->values();

        return [
            'id'          => $surat->id,
            'nama'        => $surat->nama,
            'judul'       => $surat->judul_surat,
            'url_surat'   => $surat->url_surat,
            'kode_surat'  => $surat->kode_surat,
            'syarat'      => $syarat,
            'fields'      => $withFields ? $this->suratFieldPayloads($surat) : [],
        ];
    }

    private function suratFieldPayloads(FormatSurat $surat): array
    {
        return collect($this->decodeJsonArray($surat->getRawOriginal('kode_isian')))
            ->map(function (array $field): array {
                $type = $field['tipe'] ?? 'text';
                $options = [];

                if ($type === 'select-manual') {
                    $options = array_values((array) ($field['pilihan'] ?? []));
                } elseif ($type === 'select-otomatis' && filled($field['refrensi'] ?? null)) {
                    $options = collect(ref($field['refrensi']))
                        ->map(static fn ($item): string => (string) $item->nama)
                        ->values()
                        ->all();
                }

                return [
                    'name'        => underscore((string) ($field['nama'] ?? ''), true, true),
                    'label'       => $field['label'] ?: ($field['nama'] ?? ''),
                    'description' => $field['deskripsi'] ?? '',
                    'type'        => $type,
                    'required'    => (bool) (int) ($field['required'] ?? 0),
                    'options'     => $options,
                ];
            })
            ->filter(static fn (array $field): bool => filled($field['name']) && filled($field['label']))
            ->values()
            ->all();
    }

    private function validateSuratFields(FormatSurat $surat, array $input): array
    {
        $errors = [];

        foreach ($this->suratFieldPayloads($surat) as $field) {
            if ($field['required'] && blank($input[$field['name']] ?? null)) {
                $errors["isian_form.{$field['name']}"][] = "{$field['label']} wajib diisi.";
            }
        }

        return $errors;
    }

    private function validateSuratSyarat(FormatSurat $surat, array $input, int $idPend): array
    {
        $errors = [];
        $syaratIds = collect($this->decodeJsonArray($surat->getRawOriginal('syarat_surat')))
            ->map(static fn ($id): int => (int) $id)
            ->filter()
            ->values();

        foreach ($syaratIds as $syaratId) {
            $dokumenId = $input[$syaratId] ?? $input[(string) $syaratId] ?? null;

            if (blank($dokumenId)) {
                $namaSyarat = SyaratSurat::find($syaratId)?->ref_syarat_nama ?? "Syarat {$syaratId}";
                $errors["syarat.{$syaratId}"][] = "{$namaSyarat} wajib dipilih.";
                continue;
            }

            $exists = DokumenHidup::where('id_pend', $idPend)
                ->where('id_syarat', $syaratId)
                ->where('id', $dokumenId)
                ->exists();

            if (! $exists) {
                $errors["syarat.{$syaratId}"][] = 'Dokumen syarat tidak ditemukan pada akun Anda.';
            }
        }

        return $errors;
    }

    private function suratRequestPayload(PermohonanSurat $permohonan): array
    {
        return [
            'id'            => $permohonan->id,
            'id_surat'      => $permohonan->id_surat,
            'nama_surat'    => $permohonan->surat?->nama,
            'judul_surat'   => $permohonan->surat?->judul_surat,
            'status'        => (int) $permohonan->status,
            'status_label'  => $permohonan->status_permohonan,
            'keterangan'    => $permohonan->keterangan,
            'alasan'        => $permohonan->alasan,
            'no_hp_aktif'   => $permohonan->no_hp_aktif,
            'isian_form'    => $permohonan->isian_form ?: [],
            'syarat'        => $permohonan->syarat ?: [],
            'created_at'    => $permohonan->created_at?->toIso8601String(),
            'updated_at'    => $permohonan->updated_at?->toIso8601String(),
        ];
    }

    private function messageTypeForBox(?string $box): int
    {
        return $box === 'keluar' ? PesanMandiri::MASUK : PesanMandiri::KELUAR;
    }

    private function messagePayload(PesanMandiri $pesan): array
    {
        return [
            'uuid'        => $pesan->uuid,
            'box'         => (int) $pesan->tipe === PesanMandiri::MASUK ? 'keluar' : 'masuk',
            'owner'       => $pesan->owner,
            'subjek'      => $pesan->subjek,
            'pesan'       => $pesan->komentar,
            'status'      => (int) $pesan->status,
            'is_read'     => (int) $pesan->status === PesanMandiri::READ,
            'tgl_upload'  => $pesan->tgl_upload ? Carbon::parse($pesan->tgl_upload)->toIso8601String() : null,
            'created_at'  => $pesan->created_at?->toIso8601String(),
            'updated_at'  => $pesan->updated_at?->toIso8601String(),
        ];
    }

    private function documentPayload(DokumenHidup $dokumen): array
    {
        $token = $this->bearerToken();

        return [
            'id'          => $dokumen->id,
            'nama'        => $dokumen->nama,
            'id_syarat'   => $dokumen->id_syarat,
            'nama_syarat' => SyaratSurat::find($dokumen->id_syarat)?->ref_syarat_nama,
            'file_name'   => $dokumen->satuan,
            'file_url'    => $dokumen->satuan ? $this->mobileUrl('documents/' . $dokumen->id . '/file') . ($token ? '?token=' . rawurlencode($token) : '') : null,
            'uploaded_at' => $dokumen->tgl_upload ? Carbon::parse($dokumen->tgl_upload)->toIso8601String() : null,
        ];
    }

    private function assistancePayload(BantuanPeserta $item): array
    {
        return [
            'id'              => $item->id,
            'nama'            => $item->bantuan?->nama,
            'sasaran'         => $item->bantuan?->sasaran,
            'keterangan'      => $item->bantuan?->ndesc,
            'tanggal_mulai'   => $item->bantuan?->sdate?->format('Y-m-d'),
            'tanggal_selesai' => $item->bantuan?->edate?->format('Y-m-d'),
            'no_kartu'        => $item->no_id_kartu,
            'kartu_nama'      => $item->kartu_nama,
            'status'          => $item->bantuan && $item->bantuan->sdate <= Carbon::today() && $item->bantuan->edate >= Carbon::today() ? 'Aktif' : 'Tidak Aktif',
        ];
    }

    private function pamongPayload(Pamong $pamong): array
    {
        return [
            'id'       => $pamong->pamong_id,
            'nama'     => $pamong->pamong_nama,
            'jabatan'  => $pamong->jabatan?->nama,
            'nip'      => $pamong->pamong_nip,
            'niap'     => $pamong->pamong_niap,
            'foto_url' => $pamong->foto_staff ? site_url(LOKASI_USER_PICT . $pamong->foto_staff) : null,
        ];
    }

    private function lapakProductPayload(LapakProduk $produk): array
    {
        $photos = $this->decodeJsonArray($produk->foto);
        $photo = $photos[0] ?? null;

        return [
            'id'            => $produk->id,
            'nama'          => $produk->nama,
            'kategori'      => $produk->kategori?->kategori,
            'harga'         => (int) $produk->harga,
            'harga_diskon'  => (int) $produk->harga_diskon,
            'satuan'        => $produk->satuan,
            'potongan'      => $produk->potongan,
            'deskripsi'     => $produk->deskripsi,
            'pelapak'       => $produk->pelapak?->penduduk?->nama ?? 'Admin',
            'telepon'       => $produk->pelapak?->telepon ?? $produk->pelapak?->penduduk?->telepon,
            'foto_url'      => $photo ? site_url(LOKASI_PRODUK . $photo) : null,
        ];
    }

    private function articlePayload(Artikel $artikel, bool $withContent = false): array
    {
        return [
            'id'          => $artikel->id,
            'judul'       => $artikel->judul,
            'slug'        => $artikel->slug,
            'ringkasan'   => $this->plainText($artikel->isi, 180),
            'isi'         => $withContent ? $this->plainText($artikel->isi) : null,
            'gambar_url'  => $this->imageUrl(LOKASI_FOTO_ARTIKEL, $artikel->gambar),
            'tgl_upload'  => $artikel->tgl_upload ? Carbon::parse($artikel->tgl_upload)->toIso8601String() : null,
            'url'         => site_url('artikel/' . ($artikel->slug ?: $artikel->id)),
        ];
    }

    private function galleryPayload(Galery $galeri): array
    {
        return [
            'id'          => $galeri->id,
            'parent_id'   => (int) $galeri->parrent,
            'nama'        => $galeri->nama,
            'gambar_url'  => $this->imageUrl(LOKASI_GALERI, $galeri->gambar),
            'tgl_upload'  => $galeri->tgl_upload ? Carbon::parse($galeri->tgl_upload)->toIso8601String() : null,
            'jenis'       => (int) $galeri->jenis,
            'child_count' => Galery::where('parrent', $galeri->id)->where('enabled', 1)->count(),
        ];
    }

    private function publicDocumentPayload(DokumenHidup $dokumen): array
    {
        return [
            'id'          => $dokumen->id,
            'nama'        => $dokumen->nama,
            'kategori'    => KategoriPublicEnum::valueOf($dokumen->kategori),
            'tahun'       => $dokumen->tahun,
            'file_name'   => $dokumen->satuan,
            'file_url'    => $dokumen->satuan ? site_url(LOKASI_DOKUMEN . $dokumen->satuan) : null,
            'uploaded_at' => $dokumen->tgl_upload ? Carbon::parse($dokumen->tgl_upload)->toIso8601String() : null,
        ];
    }

    private function complaintPayload(Pengaduan $pengaduan): array
    {
        return [
            'id'          => $pengaduan->id,
            'judul'       => $pengaduan->judul,
            'isi'         => $pengaduan->isi,
            'status'      => (int) $pengaduan->status,
            'status_label'=> $this->complaintStatusLabel((int) $pengaduan->status),
            'foto_url'    => $pengaduan->foto ? site_url(LOKASI_PENGADUAN . $pengaduan->foto) : null,
            'replies'     => $pengaduan->child
                ->map(static fn (Pengaduan $reply): array => [
                    'id'         => $reply->id,
                    'nama'       => $reply->nama,
                    'isi'        => $reply->isi,
                    'status'     => (int) $reply->status,
                    'created_at' => $reply->created_at?->toIso8601String(),
                ])
                ->values(),
            'created_at'  => $pengaduan->created_at?->toIso8601String(),
            'updated_at'  => $pengaduan->updated_at?->toIso8601String(),
        ];
    }

    private function complaintStatusLabel(int $status): string
    {
        return match ($status) {
            2 => 'Sedang diproses',
            3 => 'Selesai',
            default => 'Menunggu diproses',
        };
    }

    private function satisfactionOptionPayload(int $value, string $label): array
    {
        return [
            'value' => $value,
            'label' => $label,
        ];
    }

    private function satisfactionPayload(Pendapat $pendapat): array
    {
        return [
            'id'         => $pendapat->id,
            'pilihan'    => (int) $pendapat->pilihan,
            'label'      => JawabanKepuasanEnum::valueOf((int) $pendapat->pilihan),
            'tanggal'    => $pendapat->tanggal ? Carbon::parse($pendapat->tanggal)->toIso8601String() : null,
        ];
    }

    private function imageUrl(string $directory, ?string $filename): ?string
    {
        if (blank($filename)) {
            return null;
        }

        foreach (['sedang_', 'kecil_', ''] as $prefix) {
            if (is_file(FCPATH . $directory . $prefix . $filename)) {
                return $this->assetUrl($directory . $prefix . $filename);
            }
        }

        return $this->assetUrl($directory . $filename);
    }

    private function desaLogoUrl(?string $filename): string
    {
        if (filled($filename) && is_file(FCPATH . LOKASI_LOGO_DESA . $filename)) {
            return $this->assetUrl(LOKASI_LOGO_DESA . $filename);
        }

        return $this->assetUrl('assets/files/logo/opensid_logo.png');
    }

    private function assetUrl(string $path): string
    {
        $host = $this->input->server('HTTP_HOST');

        if ($host) {
            $scheme = $this->input->server('HTTP_X_FORWARDED_PROTO')
                ?: $this->input->server('REQUEST_SCHEME')
                ?: 'http';

            return rtrim($scheme . '://' . $host, '/') . '/' . ltrim($path, '/');
        }

        return site_url($path);
    }

    private function mobileUrl(string $path): string
    {
        $host = $this->input->server('HTTP_HOST');

        if ($host) {
            $scheme = $this->input->server('HTTP_X_FORWARDED_PROTO')
                ?: $this->input->server('REQUEST_SCHEME')
                ?: 'http';

            return rtrim($scheme . '://' . $host, '/') . '/api/mobile/v1/' . ltrim($path, '/');
        }

        return site_url('api/mobile/v1/' . ltrim($path, '/'));
    }

    private function plainText(?string $html, ?int $limit = null): string
    {
        $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string) $html), ENT_QUOTES, 'UTF-8')) ?? '');

        if ($limit && mb_strlen($text) > $limit) {
            return mb_substr($text, 0, $limit - 3) . '...';
        }

        return $text;
    }

    private function decodeJsonArray(mixed $value): array
    {
        if (blank($value)) {
            return [];
        }

        $decoded = json_decode((string) $value, true);

        if (is_string($decoded)) {
            $decoded = json_decode($decoded, true);
        }

        return is_array($decoded) ? $decoded : [];
    }

    private function ok(array $payload = [], int $status = 200): void
    {
        json($payload, $status);
    }

    private function fail(string $message, array $errors = [], int $status = 400): void
    {
        json([
            'message' => $message,
            'errors'  => $errors,
        ], $status);
    }
}

<?php

use App\Models\Penduduk;
use App\Models\PendudukMandiri;
use App\Models\PendudukMandiriToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

defined('BASEPATH') || exit('No direct script access allowed');

class Mandiri extends Api_Controller
{
    private ?PendudukMandiri $mobileUser = null;
    private ?PendudukMandiriToken $mobileToken = null;

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
                'desa'  => $this->desaPayload(),
                'user'  => $this->userPayload($user),
                'menus' => [
                    ['key' => 'surat', 'label' => 'Surat', 'icon' => 'file-text'],
                    ['key' => 'pesan', 'label' => 'Pesan', 'icon' => 'mail'],
                    ['key' => 'lapak', 'label' => 'Lapak', 'icon' => 'shopping-cart'],
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
        $header = $this->input->get_request_header('Authorization', true)
            ?: $this->input->server('HTTP_AUTHORIZATION')
            ?: $this->input->server('REDIRECT_HTTP_AUTHORIZATION');

        if (! $header || ! preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            return null;
        }

        return trim($matches[1]);
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

    private function desaPayload(): array
    {
        $desa = identitas();

        return [
            'nama'      => $desa->nama_desa,
            'kode_desa' => $desa->kode_desa,
            'kecamatan' => $desa->nama_kecamatan,
            'kabupaten' => $desa->nama_kabupaten,
            'logo_url'  => gambar_desa($desa->logo),
        ];
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

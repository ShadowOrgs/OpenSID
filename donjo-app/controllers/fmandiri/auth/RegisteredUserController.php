<?php

/*
 *
 * File ini bagian dari:
 *
 * OpenSID
 *
 * Sistem informasi desa sumber terbuka untuk memajukan desa
 *
 * Aplikasi dan source code ini dirilis berdasarkan lisensi GPL V3
 *
 * Hak Cipta 2009 - 2015 Combine Resource Institution (http://lumbungkomunitas.net/)
 * Hak Cipta 2016 - 2025 Perkumpulan Desa Digital Terbuka (https://opendesa.id)
 *
 * Dengan ini diberikan izin, secara gratis, kepada siapa pun yang mendapatkan salinan
 * dari perangkat lunak ini dan file dokumentasi terkait ("Aplikasi Ini"), untuk diperlakukan
 * tanpa batasan, termasuk hak untuk menggunakan, menyalin, mengubah dan/atau mendistribusikan,
 * asal tunduk pada syarat berikut:
 *
 * Pemberitahuan hak cipta di atas dan pemberitahuan izin ini harus disertakan dalam
 * setiap salinan atau bagian penting Aplikasi Ini. Barang siapa yang menghapus atau menghilangkan
 * pemberitahuan ini melanggar ketentuan lisensi Aplikasi Ini.
 *
 * PERANGKAT LUNAK INI DISEDIAKAN "SEBAGAIMANA ADANYA", TANPA JAMINAN APA PUN, BAIK TERSURAT MAUPUN
 * TERSIRAT. PENULIS ATAU PEMEGANG HAK CIPTA SAMA SEKALI TIDAK BERTANGGUNG JAWAB ATAS KLAIM, KERUSAKAN ATAU
 * KEWAJIBAN APAPUN ATAS PENGGUNAAN ATAU LAINNYA TERKAIT APLIKASI INI.
 *
 * @package   OpenSID
 * @author    Tim Pengembang OpenDesa
 * @copyright Hak Cipta 2009 - 2015 Combine Resource Institution (http://lumbungkomunitas.net/)
 * @copyright Hak Cipta 2016 - 2025 Perkumpulan Desa Digital Terbuka (https://opendesa.id)
 * @license   http://www.gnu.org/licenses/gpl.html GPL V3
 * @link      https://github.com/OpenSID/OpenSID
 *
 */

use App\Models\Penduduk;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class RegisteredUserController extends Web_Controller
{
    public function __construct()
    {
        parent::__construct();

        if (! setting('tampilkan_pendaftaran')) {
            show_404();
        }

        if (auth('penduduk')->check()) {
            redirect('layanan-mandiri/beranda');
        }
    }

    /**
     * Display the registration view.
     */
    public function create()
    {
        return view('layanan_mandiri.auth.register', [
            'header'              => $this->header,
            'latar_login_mandiri' => (new App\Models\Theme())->latarLoginMandiri(),
            'form_action'         => site_url('layanan-mandiri/proses-daftar'),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws Illuminate\Validation\ValidationException
     */
    public function store()
    {
        $request = request();

        $rules = [
            'nama'         => ['required'],
            'tanggallahir' => ['required', 'date_format:Y-m-d'],
            'nik'          => ['required', 'digits:16', 'regex:/^\d{16}$/'],
            'no_kk'        => ['required', 'digits:16', 'regex:/^\d{16}$/'],
            'email'        => ['required', 'email', "unique:penduduk_hidup,email,{$request->email},email"],
            'telegram'     => ['nullable', 'regex:/^[0-9]{1,20}$/', "unique:penduduk_hidup,telegram,{$request->telegram},telegram"],
            'password'     => ['required', 'digits:6', 'regex:/^\d{6}$/', 'confirmed'],
            'scan_1'       => 'required|image|mimes:gif,jpeg,jpg,png|max:1024',
            'scan_2'       => 'required|image|mimes:gif,jpeg,jpg,png|max:1024',
            'scan_3'       => 'required|image|mimes:gif,jpeg,jpg,png|max:1024',
        ];

        $messages = [
            'required'           => ':attribute wajib diisi.',
            'email.email'        => 'Format email tidak valid.',
            'email.unique'       => 'Email sudah digunakan oleh penduduk lain.',
            'telegram.regex'     => 'Telegram hanya boleh berisi angka maksimal 20 digit.',
            'telegram.unique'    => 'Telegram sudah digunakan oleh penduduk lain.',
            'tanggallahir.date_format' => 'Tanggal lahir harus memakai format tahun-bulan-tanggal.',
            'nik.digits'         => 'NIK harus berisi 16 digit.',
            'nik.regex'          => 'NIK hanya boleh berisi angka.',
            'no_kk.digits'       => 'Nomor KK harus berisi 16 digit.',
            'no_kk.regex'        => 'Nomor KK hanya boleh berisi angka.',
            'password.digits'    => 'PIN harus berisi 6 digit.',
            'password.regex'     => 'PIN hanya boleh berisi angka.',
            'password.confirmed' => 'Konfirmasi PIN tidak sama dengan PIN.',
            'scan_1.image'       => 'Scan KTP harus berupa file gambar.',
            'scan_1.mimes'       => 'Scan KTP harus berupa gambar gif, jpeg, jpg, atau png.',
            'scan_1.max'         => 'Ukuran Scan KTP maksimal 1024 KB.',
            'scan_2.image'       => 'Scan KK harus berupa file gambar.',
            'scan_2.mimes'       => 'Scan KK harus berupa gambar gif, jpeg, jpg, atau png.',
            'scan_2.max'         => 'Ukuran Scan KK maksimal 1024 KB.',
            'scan_3.image'       => 'Foto selfie harus berupa file gambar.',
            'scan_3.mimes'       => 'Foto selfie harus berupa gambar gif, jpeg, jpg, atau png.',
            'scan_3.max'         => 'Ukuran Foto selfie maksimal 1024 KB.',
        ];

        $attributes = [
            'nama'                  => 'Nama',
            'tanggallahir'          => 'Tanggal lahir',
            'nik'                   => 'NIK',
            'no_kk'                 => 'Nomor KK',
            'email'                 => 'Email',
            'telegram'              => 'Telegram',
            'password'              => 'PIN',
            'password_confirmation' => 'Konfirmasi PIN',
            'scan_1'                => 'Scan KTP',
            'scan_2'                => 'Scan KK',
            'scan_3'                => 'Foto selfie',
        ];

        // Validate the request data
        $data = $this->validated($request, $rules, $messages, $attributes);

        // Retrieve the 'Penduduk' model based on the provided criteria
        $penduduk = Penduduk::query()
            ->whereRelation('keluarga', 'no_kk', $data['no_kk'])
            ->where($request->only(['nama', 'tanggallahir', 'nik']))
            ->first();

        // Return a error if the Penduduk is not found
        if (! $penduduk) {
            return $this->redirectWithPendudukErrors($data);
        }

        // Insert / update email and telegram if not verified
        if (null === $penduduk->tgl_verifikasi_email) {
            $penduduk->email = $data['email'];
        }
        if ($penduduk->tgl_verifikasi_telegram == null && filled($data['telegram'] ?? null)) {
            $penduduk->telegram = $data['telegram'];
        }
        $penduduk->email_tgl_verifikasi = $penduduk->email_tgl_verifikasi ?? now();
        if (filled($penduduk->telegram)) {
            $penduduk->telegram_tgl_verifikasi = $penduduk->telegram_tgl_verifikasi ?? now();
        }
        $penduduk->save();

        // Check if the 'Penduduk' is already registered for 'Layanan Mandiri'
        if (null !== $mandiri = $penduduk->mandiri()->first()) {
            $mandiri->aktif = 1;
            $mandiri->save();
            Auth::guard('penduduk')->login($mandiri);

            return redirect('layanan-mandiri/beranda');
        }

        // Store files
        $filePaths = [
            'scan_ktp'    => $request->file('scan_1')->store('upload/pendaftaran', 'desa'),
            'scan_kk'     => $request->file('scan_2')->store('upload/pendaftaran', 'desa'),
            'foto_selfie' => $request->file('scan_3')->store('upload/pendaftaran', 'desa'),
        ];

        // Create a new 'mandiri' record for the 'Penduduk'
        $mandiri = $penduduk->mandiri()->create([
            'aktif'       => 1,
            'scan_ktp'    => basename($filePaths['scan_ktp']),
            'scan_kk'     => basename($filePaths['scan_kk']),
            'foto_selfie' => basename($filePaths['foto_selfie']),
            'ganti_pin'   => 0,
            'pin'         => Hash::make($data['password']),
        ]);

        Auth::guard('penduduk')->login($mandiri);

        return redirect('layanan-mandiri/beranda');
    }

    private function redirectWithPendudukErrors(array $data)
    {
        $penduduk = Penduduk::query()
            ->where('nik', $data['nik'])
            ->first();

        if (! $penduduk) {
            return $this->redirectWithRegistrationErrors([
                'nik' => 'NIK tidak ditemukan pada data penduduk aktif. Pastikan NIK sudah diinput atau diimpor oleh admin desa.',
            ]);
        }

        if (empty($penduduk->id_kk) || empty($penduduk->keluarga->no_kk)) {
            return $this->redirectWithRegistrationErrors([
                'no_kk' => 'NIK ditemukan, tetapi penduduk belum terhubung dengan data Kartu Keluarga. Hubungkan penduduk ke KK terlebih dahulu di menu admin.',
            ]);
        }

        if ($penduduk->keluarga->no_kk !== $data['no_kk']) {
            return $this->redirectWithRegistrationErrors([
                'no_kk' => 'Nomor KK tidak sesuai dengan data penduduk untuk NIK tersebut.',
            ]);
        }

        if (strcasecmp(trim($penduduk->nama), trim($data['nama'])) !== 0) {
            return $this->redirectWithRegistrationErrors([
                'nama' => 'Nama tidak sesuai dengan data penduduk untuk NIK dan Nomor KK tersebut.',
            ]);
        }

        if ($penduduk->tanggallahir?->format('Y-m-d') !== $data['tanggallahir']) {
            return $this->redirectWithRegistrationErrors([
                'tanggallahir' => 'Tanggal lahir tidak sesuai dengan data penduduk untuk NIK dan Nomor KK tersebut.',
            ]);
        }

        return $this->redirectWithRegistrationErrors([
            'penduduk' => 'Data penduduk tidak dapat dicocokkan. Periksa kembali NIK, Nomor KK, nama, dan tanggal lahir.',
        ]);
    }

    private function redirectWithRegistrationErrors(array $errors)
    {
        $this->withInput();
        $this->withErrors($errors);

        return redirect('layanan-mandiri/daftar');
    }
}

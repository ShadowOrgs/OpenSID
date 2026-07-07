@extends('theme::template')

@section('layout')
    {{-- HERO --}}
    <section class="mod-hero">
        <div class="mod-hero-inner">
            <div class="mod-hero-text">
                <div class="mod-hero-eyebrow">Selamat Datang</div>
                <h1 class="mod-hero-title">
                    {{ ucwords(setting('sebutan_desa')) }}
                    {{ setting('website_title') ?: '' }}
                </h1>
                <p class="mod-hero-subtitle">
                    Portal informasi resmi dan layanan digital
                    {{ ucwords(setting('sebutan_desa')) }}
                    {{ ucwords(setting('sebutan_kecamatan')) }}
                    {{ ucwords($desa['nama_kecamatan'] ?? '') }}.
                </p>
                <div class="mod-hero-actions">
                    <a href="#artikel" class="mod-hero-cta">Baca Berita Terbaru</a>
                    <a href="{{ site_url('layanan-mandiri') }}" class="mod-hero-cta mod-hero-cta--ghost">Layanan Mandiri</a>
                    <a href="https://is3.cloudhost.id/public-files/desa/layanan-mandiri-warga.apk" class="mod-hero-cta mod-hero-cta--ghost" style="background-color: #e08e0b; border-color: #e08e0b; color: white;" target="_blank"><i class="fa fa-android"></i> Unduh Aplikasi</a>
                </div>
            </div>
            <div class="mod-hero-card">
                <h3 class="mod-hero-card-title">{{ ucwords(setting('sebutan_pemerintah_desa')) }}</h3>
                <div class="mod-hero-card-name">
                    {{ $desa['nama_kepala_desa'] ?? setting('sebutan_kepala_desa') }}
                </div>
                <div class="mod-hero-card-role">
                    {{ ucwords(setting('sebutan_kepala_desa')) }}
                    {{ ucwords($desa['nama_desa'] ?? '') }}
                </div>
                <div class="mod-hero-stats">
                    <div class="mod-hero-stat">
                        <div class="mod-hero-stat-value">{{ number_format($penduduk ?? 0, 0, ',', '.') }}</div>
                        <div class="mod-hero-stat-label">Penduduk</div>
                    </div>
                    <div class="mod-hero-stat">
                        <div class="mod-hero-stat-value">{{ number_format($keluarga ?? 0, 0, ',', '.') }}</div>
                        <div class="mod-hero-stat-label">Keluarga</div>
                    </div>
                    <div class="mod-hero-stat">
                        <div class="mod-hero-stat-value">{{ number_format($rt ?? 0, 0, ',', '.') }}</div>
                        <div class="mod-hero-stat-label">RT</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {{-- RUNNING TEXT --}}
    @if (!empty($teks_berjalan))
        <div class="mod-marquee">
            <span class="mod-marquee-label">Info:</span>
            <div class="mod-marquee-track">
                <marquee onmouseover="this.stop()" onmouseout="this.start()" scrollamount="4">
                    @include('theme::layouts.teks_berjalan')
                </marquee>
            </div>
        </div>
    @endif

    {{-- COVID / STATISTIK BANNER (compact) --}}
    @if (setting('covid_data') || setting('covid_desa'))
        <div class="mod-covid">
            @if (setting('covid_data'))
                <a href="{{ site_url('covid') }}" class="mod-covid-link">Data Covid-19 Nasional</a>
            @endif
            @if (setting('covid_desa'))
                <a href="{{ site_url('covid/wilayah') }}" class="mod-covid-link">Data Covid-19 Wilayah</a>
            @endif
        </div>
    @endif

    {{-- HEADLINE / FEATURED --}}
    @if ($headline)
        @php
            $abstrak_head = potong_teks(strip_tags($headline['isi']), 280);
        @endphp
        <section class="mod-headline">
            <div class="mod-headline-media">
                @if (is_file(LOKASI_FOTO_ARTIKEL . 'kecil_' . $headline['gambar']))
                    <img src="{{ base_url(LOKASI_FOTO_ARTIKEL . 'kecil_' . $headline['gambar']) }}" alt="{{ $headline['judul'] }}" loading="lazy" />
                @else
                    <img src="{{ base_url('assets/files/logo/opensid_logo.png') }}" alt="OpenSID" loading="lazy" />
                @endif
            </div>
            <div class="mod-headline-body">
                <div class="mod-headline-eyebrow">Berita Utama</div>
                <h2 class="mod-headline-title">
                    <a href="{{ site_url('artikel/' . $headline['id'] . '/' . $headline['slug']) }}">
                        {{ $headline['judul'] }}
                    </a>
                </h2>
                <div class="mod-headline-meta">
                    <span><i class="fa fa-calendar"></i> {{ tgl_indo($headline['tgl_upload']) }}</span>
                    <span><i class="fa fa-user"></i> {{ $headline['owner'] }}</span>
                </div>
                <p class="mod-headline-excerpt">{{ $abstrak_head }}</p>
                <a href="{{ site_url('artikel/' . $headline['id'] . '/' . $headline['slug']) }}" class="mod-headline-cta">Baca Selengkapnya</a>
            </div>
        </section>
    @endif

    {{-- ARTIKEL TERKINI --}}
    <section id="artikel" class="mod-section">
        {{-- Section title --}}
        @php $title = (!empty($judul_kategori)) ? $judul_kategori : 'Artikel Terkini' @endphp
        @if (is_array($title))
            @foreach ($title as $item)
                @php $title = $item @endphp
            @endforeach
        @endif
        <div class="mod-section-head">
            <div class="mod-section-eyebrow">Kabar Desa</div>
            <h2 class="mod-section-title">{{ $title }}</h2>
            <p class="mod-section-subtitle">Informasi terbaru dari {{ ucwords(setting('sebutan_desa')) }} {{ ucwords($desa['nama_desa'] ?? '') }}.</p>
        </div>

        @if ($artikel->count() > 0)
            <div class="mod-grid">
                @foreach ($artikel as $post)
                    @php $abstrak = potong_teks(strip_tags($post['isi']), 180) @endphp
                    <article class="mod-card">
                        <a href="{{ site_url('artikel/' . $post['id'] . '/' . $post['slug']) }}" class="mod-card-media">
                            @if (is_file(LOKASI_FOTO_ARTIKEL . 'kecil_' . $post['gambar']))
                                <img src="{{ base_url(LOKASI_FOTO_ARTIKEL . 'kecil_' . $post['gambar']) }}" alt="{{ $post['judul'] }}" loading="lazy" />
                            @else
                                <div class="mod-card-placeholder">
                                    <i class="fa fa-newspaper-o"></i>
                                </div>
                            @endif
                        </a>
                        <div class="mod-card-body">
                            <div class="mod-card-meta">
                                <span><i class="fa fa-calendar"></i> {{ tgl_indo($post['tgl_upload']) }}</span>
                            </div>
                            <h3 class="mod-card-title">
                                <a href="{{ site_url('artikel/' . $post['id'] . '/' . $post['slug']) }}">{{ $post['judul'] }}</a>
                            </h3>
                            <p class="mod-card-excerpt">{{ $abstrak }}</p>
                            <a href="{{ site_url('artikel/' . $post['id'] . '/' . $post['slug']) }}" class="mod-card-link">Baca →</a>
                        </div>
                    </article>
                @endforeach
            </div>
            <div class="mod-pagination">
                @include('theme::commons.page')
            </div>
        @else
            <div class="mod-empty">
                <i class="fa fa-inbox"></i>
                <p>Belum ada artikel pada kategori ini.</p>
            </div>
        @endif
    </section>

    {{-- STATISTIK DESA --}}
    <section class="mod-section mod-section--alt">
        <div class="mod-section-head">
            <div class="mod-section-eyebrow">Data &amp; Statistik</div>
            <h2 class="mod-section-title">Statistik Desa</h2>
            <p class="mod-section-subtitle">Akses cepat ke data statistik {{ ucwords(setting('sebutan_desa')) }} {{ ucwords($desa['nama_desa'] ?? '') }} yang transparan dan dapat diverifikasi.</p>
        </div>
        <div class="mod-stats">
            <a class="mod-stat" href="{{ site_url('data-wilayah') }}">
                <div class="mod-stat-icon"><i class="fa fa-map"></i></div>
                <div class="mod-stat-label">Wilayah</div>
            </a>
            <a class="mod-stat" href="{{ site_url('data-statistik/pendidikan-dalam-kk') }}">
                <div class="mod-stat-icon"><i class="fa fa-graduation-cap"></i></div>
                <div class="mod-stat-label">Pendidikan KK</div>
            </a>
            <a class="mod-stat" href="{{ site_url('data-statistik/pekerjaan') }}">
                <div class="mod-stat-icon"><i class="fa fa-briefcase"></i></div>
                <div class="mod-stat-label">Pekerjaan</div>
            </a>
            <a class="mod-stat" href="{{ site_url('data-statistik/agama') }}">
                <div class="mod-stat-icon"><i class="fa fa-moon-o"></i></div>
                <div class="mod-stat-label">Agama</div>
            </a>
            <a class="mod-stat" href="{{ site_url('data-statistik/jenis-kelamin') }}">
                <div class="mod-stat-icon"><i class="fa fa-venus-mars"></i></div>
                <div class="mod-stat-label">Jenis Kelamin</div>
            </a>
            <a class="mod-stat" href="{{ site_url('data-statistik/rentang-umur') }}">
                <div class="mod-stat-icon"><i class="fa fa-users"></i></div>
                <div class="mod-stat-label">Rentang Umur</div>
            </a>
        </div>
    </section>
@endsection

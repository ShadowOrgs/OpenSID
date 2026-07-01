@php defined('BASEPATH') || exit('No direct script access allowed'); @endphp

@if (!is_null($transparansi))
    @include('theme::partials.apbdesa-tema', $transparansi)
@endif

@if (theme_config('statistik_desa'))
    <section class="mod-section">
        <div class="mod-section-head">
            <div class="mod-section-eyebrow">Data &amp; Statistik</div>
            <h2 class="mod-section-title center">Statistik {{ ucwords(setting('sebutan_desa')) }}</h2>
            <p class="mod-section-subtitle">Akses cepat ke data statistik {{ ucwords(setting('sebutan_desa')) }} {{ ucwords($desa['nama_desa']) }} yang transparan dan dapat diverifikasi.</p>
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
@endif

<div class="footer_top">
    <div class="container">
        <div class="row">
            <div>
                <h2>{{ ucwords(setting('sebutan_desa')) }} {{ ucwords($desa['nama_desa']) }}</h2>
                <p>{{ $desa['alamat_kantor'] }}<br>
                   {{ ucwords(setting('sebutan_kecamatan') . ' ' . $desa['nama_kecamatan']) }}
                   {{ ucwords(setting('sebutan_kabupaten') . ' ' . $desa['nama_kabupaten']) }}
                   Provinsi {{ $desa['nama_propinsi'] }} — Kode Pos {{ $desa['kode_pos'] }}
                </p>
                <p style="margin-top:14px;">
                    @if (!empty($desa['email_desa']))
                        <i class="fa fa-envelope" style="color:#C9A85A;margin-right:6px;"></i> {{ $desa['email_desa'] }}<br>
                    @endif
                    @if (!empty($desa['telepon']))
                        <i class="fa fa-phone" style="color:#C9A85A;margin-right:6px;"></i> {{ $desa['telepon'] }}
                    @endif
                </p>
            </div>
            <div>
                <h2>Kategori</h2>
                <ul class="labels_nav">
                    @foreach ($menu_kiri as $data)
                        <li><a href="{{ site_url('artikel/kategori/' . $data['slug']) }}">{{ $data['kategori'] }}</a></li>
                    @endforeach
                </ul>
            </div>
            <div>
                <h2>Tautan &amp; Sosmed</h2>
                <div class="sosmed-list">
                    @if (setting('tte'))
                        <span title="BSrE"><img class="bsre-img" src="{{ asset('assets/images/bsre.png?v', false) }}" alt="Bsre"></span>
                    @endif
                    @foreach ($sosmed as $data)
                        @if (!empty($data['link']))
                            <a href="{{ $data['link'] }}" rel="noopener noreferrer" target="_blank" title="{{ $data['nama'] }}">
                                <img src="{{ $data['icon'] }}" alt="{{ $data['nama'] }}">
                            </a>
                        @endif
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>

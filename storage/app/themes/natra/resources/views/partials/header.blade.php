<div class="mod-topstrip">
    <div class="mod-topstrip-inner">
        <span>
            <i class="fa fa-map-marker" style="color:#C9A85A;margin-right:6px;"></i>
            {{ ucwords(setting('sebutan_kabupaten') . ' ' . $desa['nama_kabupaten']) }}, {{ ucwords('Prov. ' . $desa['nama_propinsi']) }}
        </span>
        <span>
            @if (theme_config('jam', true)) <span id="jam"></span> @endif
            <a href="{{ site_url('siteman') }}" style="margin-left:14px;"><i class="fa fa-lock"></i> Login Admin</a>
        </span>
    </div>
</div>
<div class="mod-header">
    <div class="mod-header-inner">
        <div class="header_top">
            <div class="header_top_left" style="margin-bottom:0px;">
                <ul class="top_nav">
                    <li>
                        <table>
                            <tr>
                                <td class="hidden-xs"><img class="tlClogo" src="{{ gambar_desa($desa['logo']) }}" valign="top" alt="{{ $desa['nama_desa'] }}" /></td>
                                <td>
                                    <a href="{{ site_url() }}">
                                        <font size="4">{{ setting('website_title') . ' ' . ucwords(setting('sebutan_desa')) . ($desa['nama_desa'] ? ' ' . $desa['nama_desa'] : '') }}</font><br />
                                        <font size="2">
                                            {{ ucwords(setting('sebutan_kecamatan_singkat') . ' ' . $desa['nama_kecamatan']) }}
                                            {{ ucwords(setting('sebutan_kabupaten_singkat') . ' ' . $desa['nama_kabupaten']) }}
                                            {{ ucwords('Prov. ' . $desa['nama_propinsi']) }}
                                        </font>
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </li>
                </ul>
            </div>
            <div class="navbar-right" style="margin-right: 0px; margin-top: 22px; margin-bottom: 3px;">
                <form method="get" action="{{ site_url() }}" class="form-inline mod-search-form">
                    <table align="center">
                        <tr>
                            <td><input type="text" name="cari" maxlength="50" class="form-control" value="{{ html_escape($cari) }}" placeholder="Cari artikel..."></td>
                            <td><button type="submit" class="btn">Cari</button></td>
                        </tr>
                    </table>
                </form>
            </div>
        </div>
    </div>
</div>

@php defined('BASEPATH') || exit('No direct script access allowed'); @endphp

<div class="footer_bottom">
    <div class="container">
        <div class="row">
            <div>
                <div class="footer_bottom_left">
                    @if (file_exists('mitra'))
                        Hosting didukung <a href="https://my.idcloudhost.com/aff.php?aff=3172" rel="noopener noreferrer" target="_blank">
                            <img src="{{ base_url('/assets/images/Logo-IDcloudhost.png') }}" height='15px' alt="Logo-IDCloudHost" title="Logo-IDCloudHost" style="vertical-align:middle;"></a>
                    @endif
                </div>
            </div>
            <div>
                <div class="footer_bottom_right">
                    &copy; {{ date('Y') }}
                    <a href="{{ site_url() }}">{{ setting('website_title') }} {{ ucwords($desa['nama_desa']) }}</a>
                </div>
            </div>
        </div>
    </div>
</div>
<script type="text/javascript">
    function printDiv(divName) {
        var printContents = document.getElementById(divName).innerHTML;
        var originalContents = document.body.innerHTML;
        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
    }
</script>

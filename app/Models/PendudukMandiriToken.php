<?php

namespace App\Models;

use App\Traits\ConfigId;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

defined('BASEPATH') || exit('No direct script access allowed');

class PendudukMandiriToken extends BaseModel
{
    use ConfigId;

    protected $table = 'tweb_penduduk_mandiri_token';

    protected $guarded = [];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at'   => 'datetime',
    ];

    public function mandiri(): BelongsTo
    {
        return $this->belongsTo(PendudukMandiri::class, 'id_pend', 'id_pend');
    }
}

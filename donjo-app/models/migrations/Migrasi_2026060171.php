<?php

defined('BASEPATH') || exit('No direct script access allowed');

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class Migrasi_2026060171 extends MY_Model
{
    public function up()
    {
        if (! Schema::hasTable('tweb_penduduk_mandiri_token')) {
            Schema::create('tweb_penduduk_mandiri_token', static function (Blueprint $table): void {
                $table->id();
                $table->integer('config_id')->index();
                $table->integer('id_pend')->index();
                $table->string('device_name')->nullable();
                $table->char('token_hash', 64)->unique();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();

                $table->foreign('config_id')->references('id')->on('config')->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreign('id_pend')->references('id_pend')->on('tweb_penduduk_mandiri')->cascadeOnDelete()->cascadeOnUpdate();
            });
        }
    }
}

<?php

namespace App\Enums;

enum IncidentStatus: string
{
    case BARU = 'BARU';
    case DITINJAU = 'DITINJAU';
    case DALAM_PENANGANAN = 'DALAM_PENANGANAN';
    case SELESAI = 'SELESAI';

    public function label(): string
    {
        return match ($this) {
            self::BARU => 'Baru',
            self::DITINJAU => 'Ditinjau',
            self::DALAM_PENANGANAN => 'Dalam Penanganan',
            self::SELESAI => 'Selesai',
        };
    }

    public function isResolved(): bool
    {
        return $this === self::SELESAI;
    }
}

<?php

namespace App\Enums;

enum IncidentStatus: string
{
    case Baru = 'BARU';
    case Ditangani = 'DITANGANI';
    case Selesai = 'SELESAI';

    public function label(): string
    {
        return match ($this) {
            self::Baru => 'Baru',
            self::Ditangani => 'Ditangani',
            self::Selesai => 'Selesai',
        };
    }

    public function isResolved(): bool
    {
        return $this === self::Selesai;
    }
}

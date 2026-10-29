<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'ADMIN';
    case AUDITOR = 'AUDITOR';
    case MAINTENANCE = 'MAINTENANCE';
    case PIMPINAN = 'PIMPINAN';

    public function label(): string
    {
        return match ($this) {
            self::ADMIN => 'Dosen Penanggung Jawab / Admin',
            self::AUDITOR => 'Auditor Lapangan',
            self::MAINTENANCE => 'Facility Maintenance',
            self::PIMPINAN => 'Pimpinan Kampus',
        };
    }

    public function homePath(): string
    {
        return match ($this) {
            self::ADMIN => '/dashboard',
            self::AUDITOR => '/audit',
            self::MAINTENANCE => '/panels',
            self::PIMPINAN => '/executive',
        };
    }
}

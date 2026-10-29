<?php

namespace App\Enums;

enum PanelGroup: string
{
    case SOCKET = 'SOCKET';
    case AC = 'AC';

    public function label(): string
    {
        return match ($this) {
            self::SOCKET => 'Grup Stopkontak',
            self::AC => 'Grup AC',
        };
    }
}

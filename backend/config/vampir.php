<?php

return [
    /*
    | Nilai default parameter kalkulasi. Nilai ini dapat ditimpa Admin melalui
    | menu Pengaturan (tabel settings). Semua hasil adalah estimasi, bukan
    | pembacaan meter PLN.
    */
    'defaults' => [
        'standby_hours_per_day' => 8,
        'standby_days_per_month' => 30,
        'tariff_per_kwh' => 1444.70,
        'emission_factor_kg_per_kwh' => 0.78,
        'default_warning_percent' => 80,
        'incident_poll_seconds' => 3,
        'active_pc_watt' => 150,
    ],

    'voltage' => 220,

    'spec_storage_types' => ['SSD', 'HDD', 'NVME'],
];

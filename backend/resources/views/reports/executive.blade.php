<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Eksekutif Vampir</title>
    <style>
        @page { margin: 30px 34px 42px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #202522; font-family: "DejaVu Sans", sans-serif; font-size: 10px; line-height: 1.5; }
        .brand { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .brand td { vertical-align: middle; }
        .brand-mark { width: 34px; height: 34px; border-radius: 9px; background: #3f725c; color: #fff; text-align: center; font-size: 18px; font-weight: bold; line-height: 34px; }
        .brand-name { font-size: 16px; font-weight: bold; letter-spacing: .3px; }
        .brand-sub { color: #77837b; font-size: 9px; }
        .meta { text-align: right; color: #77837b; font-size: 9px; }
        h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -.3px; }
        .lead { color: #66716a; margin: 0 0 16px; font-size: 10px; }
        .section-title { font-size: 12px; font-weight: bold; margin: 20px 0 8px; color: #2c4c3e; }
        table { width: 100%; border-collapse: collapse; }
        .cards { margin-bottom: 6px; }
        .cards td { width: 25%; padding: 0 5px; vertical-align: top; }
        .cards td:first-child { padding-left: 0; }
        .cards td:last-child { padding-right: 0; }
        .card { border: 1px solid #e2e8e2; border-radius: 7px; padding: 10px 11px; background: #f9faf8; }
        .card-label { color: #77837b; font-size: 8px; text-transform: uppercase; letter-spacing: .4px; }
        .card-value { font-size: 14px; font-weight: bold; margin-top: 3px; color: #22392d; }
        .card-note { color: #8a948e; font-size: 8px; margin-top: 2px; }
        .data-table th { background: #edf3ef; color: #3c5a4b; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: .3px; padding: 6px 7px; border-bottom: 1px solid #dbe5de; }
        .data-table td { padding: 6px 7px; border-bottom: 1px solid #edf0ec; vertical-align: middle; }
        .data-table tr:nth-child(even) td { background: #fbfcfb; }
        .right { text-align: right; }
        .muted { color: #7c8580; }
        .bar-track { width: 100%; height: 8px; background: #edf1ee; border-radius: 4px; }
        .bar-fill { height: 8px; background: #5d8b75; border-radius: 4px; }
        .note { background: #fbf6ec; border-left: 3px solid #c79652; padding: 8px 10px; color: #6d5a3d; font-size: 8.5px; margin-top: 8px; }
        .foot { position: fixed; bottom: -24px; left: 0; right: 0; color: #9aa39d; font-size: 8px; border-top: 1px solid #e8ece8; padding-top: 6px; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <table class="brand">
        <tr>
            <td style="width:44px;"><div class="brand-mark">V</div></td>
            <td>
                <div class="brand-name">VAMPIR</div>
                <div class="brand-sub">Sistem Audit Listrik Vampir · Universitas Klabat</div>
            </td>
            <td class="meta">
                Periode laporan: {{ $report['period']['from'] ?? 'Belum ada data' }} — {{ $report['period']['to'] ?? 'Belum ada data' }}<br>
                Dibuat: {{ \Illuminate\Support\Carbon::parse($report['generated_at'])->timezone(config('app.timezone'))->translatedFormat('d F Y H:i') }} WITA
            </td>
        </tr>
    </table>

    <h1>Laporan Ringkasan Eksekutif</h1>
    <p class="lead">Tren tagihan listrik kampus, estimasi energi standby laboratorium, dan indikator emisi.</p>

    <table class="cards">
        <tr>
            <td><div class="card"><div class="card-label">Tagihan terbaru</div><div class="card-value">Rp {{ number_format((float) ($report['bill_summary']['latest_amount'] ?? 0), 0, ',', '.') }}</div><div class="card-note">Periode {{ $report['bill_summary']['latest_period'] ?? '—' }}</div></div></td>
            <td><div class="card"><div class="card-label">Rata-rata tagihan</div><div class="card-value">Rp {{ number_format($report['bill_summary']['average_amount'], 0, ',', '.') }}</div><div class="card-note">{{ $report['bill_summary']['count'] }} periode tercatat</div></div></td>
            <td><div class="card"><div class="card-label">Estimasi energi standby</div><div class="card-value">{{ number_format($report['totals']['kwh_per_month'], 2, ',', '.') }} kWh</div><div class="card-note">Rp {{ number_format($report['totals']['cost_per_month'], 0, ',', '.') }} / bulan</div></div></td>
            <td><div class="card"><div class="card-label">Estimasi emisi</div><div class="card-value">{{ number_format($report['totals']['emission_kg_per_month'], 2, ',', '.') }} kg</div><div class="card-note">CO₂e / bulan</div></div></td>
        </tr>
    </table>

    <div class="section-title">Tren Tagihan Listrik Bulanan</div>
    @if (count($report['bills']) > 0)
        @php($maxBill = max(array_column($report['bills'], 'total_amount')))
        <table class="data-table">
            <thead>
                <tr><th style="width:12%;">Periode</th><th style="width:20%;">Total tagihan</th><th style="width:48%;">Proporsi</th><th style="width:20%;" class="right">Emisi tagihan</th></tr>
            </thead>
            <tbody>
                @foreach ($report['bills'] as $bill)
                    <tr>
                        <td>{{ $bill['period_label'] }}</td>
                        <td>Rp {{ number_format($bill['total_amount'], 0, ',', '.') }}</td>
                        <td>
                            <div class="bar-track">
                                <div class="bar-fill" style="width: {{ $maxBill > 0 ? round(($bill['total_amount'] / $maxBill) * 100, 1) : 0 }}%;"></div>
                            </div>
                        </td>
                        <td class="right">{{ $bill['carbon_emission_kg'] !== null ? number_format($bill['carbon_emission_kg'], 1, ',', '.') . ' kg' : '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p class="muted">Belum ada data tagihan bulanan.</p>
    @endif

    <div class="section-title">Status Audit dan Estimasi Energi per Laboratorium</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Laboratorium</th>
                <th class="right">Audit</th>
                <th class="right">Progres</th>
                <th class="right">kWh / bulan</th>
                <th class="right">Biaya / bulan</th>
                <th class="right">Emisi / bulan</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report['labs'] as $lab)
                <tr>
                    <td>{{ $lab['name'] }}<div class="muted" style="font-size:8px;">{{ $lab['location'] ?? '—' }}</div></td>
                    <td class="right">{{ $lab['audited_count'] }} / {{ $lab['capacity'] }}</td>
                    <td class="right">{{ number_format($lab['progress_percent'], 1, ',', '.') }}%</td>
                    <td class="right">{{ $lab['not_audited'] ? '—' : number_format($lab['energy']['kwh_per_month'], 3, ',', '.') }}</td>
                    <td class="right">{{ $lab['not_audited'] ? '—' : 'Rp ' . number_format($lab['energy']['cost_per_month'], 0, ',', '.') }}</td>
                    <td class="right">{{ $lab['not_audited'] ? '—' : number_format($lab['energy']['emission_kg_per_month'], 2, ',', '.') . ' kg' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">Metode dan Parameter Perhitungan</div>
    <table class="data-table">
        <tr><td style="width:45%;">Tarif listrik</td><td>Rp {{ number_format($report['parameters']['tariff_per_kwh'], 2, ',', '.') }} / kWh</td></tr>
        <tr><td>Faktor emisi</td><td>{{ number_format($report['parameters']['emission_factor_kg_per_kwh'], 2, ',', '.') }} kg CO₂e / kWh</td></tr>
        <tr><td>Jam standby per hari</td><td>{{ number_format($report['parameters']['standby_hours_per_day'], 2, ',', '.') }} jam</td></tr>
        <tr><td>Hari standby per bulan</td><td>{{ number_format($report['parameters']['standby_days_per_month'], 0, ',', '.') }} hari</td></tr>
        <tr><td>Rumus energi</td><td>Σ (unit × watt standby × jam standby × hari) ÷ 1.000</td></tr>
        <tr><td>Progres audit</td><td>{{ $report['totals']['audited'] }} dari {{ $report['totals']['pc_target'] }} PC target ({{ number_format($report['totals']['progress_percent'], 1, ',', '.') }}%)</td></tr>
    </table>

    <div class="note">
        @foreach ($report['notes'] as $note)
            {{ $note }}<br>
        @endforeach
        Angka pada laporan ini bersifat estimasi dan tidak menggantikan tagihan resmi PLN.
    </div>

    <div class="foot">
        Sistem Audit Listrik Vampir · Dokumen dibuat otomatis oleh sistem · {{ \Illuminate\Support\Carbon::parse($report['generated_at'])->format('Y-m-d H:i:s') }} · Tanpa tanda tangan
    </div>
</body>
</html>

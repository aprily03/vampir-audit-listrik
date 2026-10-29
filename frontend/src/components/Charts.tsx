import { useId } from 'react'
import { compactRupiah } from '../lib/format'

export interface ChartPoint {
  label: string
  value: number
}

export function TrendChart({
  points,
  height = 230,
  color = '#3f725c',
  emptyLabel = 'Belum ada data untuk ditampilkan.',
}: {
  points: ChartPoint[]
  height?: number
  color?: string
  emptyLabel?: string
}) {
  const gradientId = useId().replace(/:/g, '')
  const width = 680
  const padding = { top: 18, right: 18, bottom: 36, left: 64 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = 220 - padding.top - padding.bottom

  if (points.length === 0) {
    return <div className="chart-empty">{emptyLabel}</div>
  }

  const max = Math.max(...points.map((point) => point.value), 1)
  const headroom = max * 1.12
  const xFor = (index: number) => {
    if (points.length === 1) return padding.left + plotWidth / 2
    return padding.left + (index / (points.length - 1)) * plotWidth
  }
  const yFor = (value: number) => padding.top + plotHeight - (value / headroom) * plotHeight

  const coords = points.map((point, index) => ({ ...point, x: xFor(index), y: yFor(point.value) }))
  const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} L ${coords[0].x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} Z`
  const gridLevels = [0, 0.25, 0.5, 0.75, 1]
  const labelStep = Math.ceil(points.length / 7)
  const lastPoint = coords[coords.length - 1]

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${width} 220`}
      style={{ height }}
      preserveAspectRatio="none"
      role="img"
      aria-label="Grafik tren tagihan bulanan"
    >
      <defs>
        <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {gridLevels.map((level) => {
        const y = padding.top + plotHeight - level * plotHeight
        return (
          <g key={level}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#e8ece7"
              strokeWidth="1"
              strokeDasharray={level === 0 ? undefined : '3 4'}
            />
            <text x={padding.left - 9} y={y + 3.5} textAnchor="end" fontSize="9" fill="#89938c">
              {compactRupiah(headroom * level)}
            </text>
          </g>
        )
      })}

      <path d={areaPath} fill={`url(#area-${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {coords.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="3.2" fill="#fff" stroke={color} strokeWidth="2">
            <title>{`${point.label}: ${compactRupiah(point.value)}`}</title>
          </circle>
          {(index % labelStep === 0 || index === coords.length - 1) && (
            <text x={point.x} y={205} textAnchor="middle" fontSize="9" fill="#89938c">
              {point.label}
            </text>
          )}
        </g>
      ))}

      <g>
        <rect
          x={Math.min(lastPoint.x - 46, width - padding.right - 92)}
          y={Math.max(lastPoint.y - 31, 2)}
          width="92"
          height="21"
          rx="6"
          fill="#25352d"
          opacity="0.92"
        />
        <text
          x={Math.min(lastPoint.x, width - padding.right - 46)}
          y={Math.max(lastPoint.y - 17, 16)}
          textAnchor="middle"
          fontSize="9"
          fill="#fff"
        >
          {compactRupiah(lastPoint.value)}
        </text>
      </g>
    </svg>
  )
}

export function LoadBar({ percent, tone = 'normal' }: { percent: number; tone?: 'normal' | 'warning' | 'over' | 'empty' }) {
  const width = Math.max(0, Math.min(percent, 100))
  return (
    <div className="load-track">
      <div className={`load-fill load-${tone}`} style={{ width: `${width}%` }} />
      {percent > 100 && <div className="load-overflow" />}
    </div>
  )
}

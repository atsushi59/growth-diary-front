import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// 帯（発育曲線）の1点。band は [下限, 上限]。
export type BandPoint = {
  ageMonths: number
  band: [number, number]
}

// 記録の1点。
export type RecordPoint = {
  ageMonths: number
  value: number
}

type GrowthChartProps = {
  title: string
  unit: string
  band: BandPoint[]
  records: RecordPoint[]
}

// 横軸の目盛り（0〜6歳を年単位で）。
const YEAR_TICKS = [0, 12, 24, 36, 48, 60, 72]

/**
 * @component
 * 発育曲線グラフ。背景に標準の帯（Area）、その上に記録の折れ線（Line）を月齢軸で重ねる。
 * 帯と記録は x 点が異なるため、Recharts の series ごとの data で別々に渡す。
 * @param title グラフ見出し（例: 身長）
 * @param unit 単位（例: cm）
 * @param band 発育曲線の帯データ
 * @param records 記録データ
 */
export default function GrowthChart({ title, unit, band, records }: GrowthChartProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-bold text-foreground">
        {title}（{unit}）
      </h2>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="ageMonths"
            domain={[0, 72]}
            ticks={YEAR_TICKS}
            tickFormatter={(month: number) => `${month / 12}歳`}
            stroke="var(--color-muted-foreground)"
            fontSize={12}
          />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} width={40} />
          <Tooltip
            labelFormatter={(label) => `${label}ヶ月`}
            formatter={(value) =>
              Array.isArray(value) ? `${value[0]}〜${value[1]} ${unit}` : `${value} ${unit}`
            }
          />
          <Area
            data={band}
            dataKey="band"
            stroke="none"
            fill="var(--color-primary-50)"
            isAnimationActive={false}
          />
          <Line
            data={records}
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-primary)' }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

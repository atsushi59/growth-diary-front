# 変更解説: 成長記録のグラフ表示（#24）

Redmine #24 のフロント実装。母子手帳のような発育曲線グラフ（標準の帯＋記録の折れ線）を Recharts で描き、記録の追加・編集・削除を行う。

## 全体像

選択中の子供の成長記録（`GET /children/:id/growth`）と発育曲線マスタ（`growth-standards`）を取得し、身長・体重それぞれのグラフを2カラムで表示。記録は年月ドロップダウンの入力モーダルで CRUD する。横軸は月齢で、誕生日と測定月からフロントで計算する。

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `package.json` | `recharts` を追加 |
| `lib/growth.ts` | 新規。成長 API + 型 + 月齢計算 |
| `lib/children.ts` | `getChild`（1件取得）を追加 |
| `components/GrowthChart.tsx` | 新規。帯（Area）+ 記録（Line）のグラフ |
| `components/GrowthRecordModal.tsx` | 新規。記録の追加/編集/削除モーダル |
| `pages/Growth.tsx` | スタブから本実装（グラフ + 一覧 + モーダル制御） |

## 詳細解説

### 1. lib/growth.ts — API と月齢計算

`apiRequest` をラップして成長 CRUD と発育曲線マスタ取得を関数化。`GrowthStandards` は `{ height:[{ageMonths,min,max}], weight:[...] }` の帯データ。

```ts
export function toAgeMonths(birthday: string, recordedAt: string): number {
  const [birthYear, birthMonth] = birthday.split('-').map(Number)
  const [recordedYear, recordedMonth] = recordedAt.split('-').map(Number)
  return (recordedYear - birthYear) * 12 + (recordedMonth - birthMonth)
}
```

**ポイント（タイムゾーン安全）**: `new Date("YYYY-MM-DD")` は UTC 0時としてパースされ、`getMonth()` はローカル時刻で読むため、UTC より西のタイムゾーンでは月が1つ前にずれる。**文字列から年月を直接取る**ことでこのズレを避けている。この月齢をマスタの `ageMonths` と同じ軸に乗せると帯と折れ線が正しく重なる。

### 2. components/GrowthChart.tsx — 帯 + 折れ線

```tsx
<ComposedChart>
  <XAxis type="number" dataKey="ageMonths" domain={[0, 72]} ticks={YEAR_TICKS}
    tickFormatter={(m) => `${m / 12}歳`} />
  <Area data={band} dataKey="band" fill="var(--color-primary-50)" />
  <Line data={records} dataKey="value" stroke="var(--color-primary)" />
</ComposedChart>
```

**ポイント**:
- **series ごとの data**: 帯（マスタ 0〜72ヶ月の離散点）と記録（任意の月齢）は x 点が異なる。Recharts の `Area`/`Line` に**それぞれ別の `data`** を渡し、共通の数値 X 軸（`ageMonths`）上に重ねる。1つの配列にマージしないので帯に隙間が出ない。
- **帯の範囲塗り**: `band` を `[min, max]` のタプルにすると Recharts の `Area` が上限〜下限の範囲を塗る。
- **色は @theme の CSS 変数**: Recharts は SVG の `fill`/`stroke` に Tailwind クラスを当てられないため、`var(--color-primary)` 等でカラーシステムの役割色を参照する（生の色コードは使わない）。
- 横軸は 0〜72ヶ月固定、目盛りは年単位（0〜6歳）。

### 3. components/GrowthRecordModal.tsx — 入力モーダル

- 測定年月は**年・月のドロップダウン**（年は誕生年〜今年）。保存は `YYYY-MM-01`。
- 身長・体重は**少なくとも一方必須**（バックと同じルールをフロントでも検証）。空欄は null、数値でなければエラー。
- 追加=POST、編集=PUT、削除=DELETE。二重送信は `useRef` でガード。

### 4. pages/Growth.tsx — ページ本体

```tsx
export default function Growth() {
  const { selectedChildId } = useSelectedChild()
  if (!selectedChildId) return <誘導 />
  return <GrowthContent key={selectedChildId} childId={selectedChildId} />
}
```

**ポイント（子供切り替え時の初期化）**: 本体を `GrowthContent` に分け、**`selectedChildId` を key にして再マウント**する。子供を切り替えると state（child / growths / standards / isLoading）が初期化され、前の子のデータが残ったりローディングが出ない問題を防ぐ。effect 内で同期的に setState せずに済む（lint ルール `set-state-in-effect` 回避）。

- 取得は `getChild` / `listGrowths` / `listGrowthStandards` を `Promise.all` で並列。
- 記録の整形（帯・記録の点）は `useMemo`。記録一覧の各行に編集ボタン（方針で「点 or 一覧」とされていた編集導線は**一覧**を採用）。

## スコープ・補足
- 帯は方針どおり **min〜max の1本**（複数パーセンタイル線ではない）。
- 72ヶ月（6歳）超の記録は軸外（本チケットは0〜6歳スコープ）。
- Recharts 追加でバンドルが増えるため、必要なら Growth ページの遅延ロード（`React.lazy`）で分割できる。

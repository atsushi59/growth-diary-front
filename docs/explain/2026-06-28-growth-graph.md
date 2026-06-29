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

---

# 追加変更解説: 入力モーダルの一括化とグラフの年単位表示

初版（上記）からの設計変更。グラフを「0〜6歳まとめて」から**年齢を選んで1年分だけ**表示に、入力モーダルを「1ヶ月ずつ追加/編集」から**年を選んでその年の各月をまとめて入力**に作り替えた。記録一覧の個別編集は廃止し、編集導線はモーダルのグリッドに一本化した。

## 変更ファイル一覧（追加分）

| ファイル | 変更内容 |
|----------|----------|
| `components/GrowthChart.tsx` | `ageYear` で1年分だけ描画。横軸を月単位に変更 |
| `components/GrowthRecordModal.tsx` | 年単位グリッドの一括入力に再設計（`mode`/`record` 廃止、`records` を受け取る） |
| `pages/Growth.tsx` | 年齢プルダウン追加・データを年で絞り込み・記録一覧と個別編集を削除 |

## 詳細解説（追加分）

### 1. GrowthChart.tsx — 1年分だけ描画

before は横軸 `domain={[0, 72]}` 固定・目盛り0〜6歳。after は `ageYear` プロップで表示範囲を1年に絞る。

```tsx
const startMonth = ageYear * MONTHS_PER_YEAR
<XAxis domain={[startMonth, startMonth + MONTHS_PER_YEAR]} ticks={ticks}
  tickFormatter={(m) => `${m - startMonth}ヶ月`} />
```

**ポイント**:
- 目盛りは年内の `0・3・6・9・12ヶ月`、ツールチップは絶対月齢を「N歳Mヶ月」表記に変換。
- **データ自体は親（Growth.tsx）で年に絞って渡す**。これにより Y 軸がその年のデータだけで自動スケールし、全期間の値域に潰されず見やすくなる。

### 2. GrowthRecordModal.tsx — 年単位の一括入力

方針転換: 1ヶ月ずつの追加/編集（`mode`/`record`）をやめ、`records`（その子の全記録）を受け取り、選んだ年の各月の入力欄をグリッドで並べる。入力状態は `Record<"YYYY-MM", {height, weight}>` を**1つ**持ち、年プルダウンをまたいでも保持する。

入力できる月は最初/最後の年が誕生月で変動する:

```ts
function getMonthsInYear(year, birthYear, birthMonth) {
  const startMonth = year === birthYear ? birthMonth : 1            // 最初の年は誕生月以降
  const endMonth = year === birthYear + AGE_LIMIT ? birthMonth : 12 // 最後の年は誕生月まで
  // startMonth..endMonth を配列で返す
}
```

保存は全年・全月を走査し、**差分のある月だけ**操作を組み立てて実行する:
- 入力あり・既存なし → `create`
- 入力あり・既存あり・値が変わった → `update`（変更なしはスキップ＝7年分を毎回 PUT し直さない）
- 空欄・既存あり → `delete`

```ts
await Promise.all(operations.map((op) => {
  if (op.kind === 'create') return createGrowth(childId, op.input)
  if (op.kind === 'update') return updateGrowth(childId, op.id, op.input)
  return deleteGrowth(childId, op.id)
}))
```

**ポイント（部分失敗の重複対策）**: `Promise.all` は1件でも失敗すると reject するが、先に成功した `create` はサーバに残る。失敗時に `onSaved()`（記録の再取得）を呼んで `recordMap` を最新化し、再送時に作成済みの月を**二重作成しない**ようにしている。

```ts
} catch (error) {
  // 一部だけ成功している可能性 → 記録を取り直して二重作成を防ぐ
  onSaved()
  setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました。')
}
```

### 3. pages/Growth.tsx — 年齢プルダウンと絞り込み

- 年齢 `ageYear` の state を追加し、子供取得時に**現在の年齢**で初期化する（`getCurrentAgeYear`、0〜5歳にクランプ。マスタが72ヶ月までのため）。
- 帯・記録を `startMonth <= ageMonths <= endMonth` で `filter` してからグラフへ渡す（Y軸自動スケールのため）。
- 記録一覧と各行の編集ボタンを削除。モーダル props を `mode`/`record` → `records` に変更し、`key` を開閉状態だけにして、**開くたびに最新の記録で再マウント**する。

## 初版からの更新点（要約）
- 横軸: 「0〜72ヶ月固定・年単位目盛り」→ **年齢を選んで1年分表示**。
- 入力: 「年・月ドロップダウンで1件ずつ CRUD ＋一覧編集」→ **年グリッドで一括入力**、一覧・個別編集は廃止。
- 年の範囲: モーダルの年選択は誕生年〜**6歳の誕生年**（最初/最後は誕生月で月が変動）。

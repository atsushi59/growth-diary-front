import { useRef, useState, type FormEvent } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Select, { type SelectOption } from './ui/Select'
import Button from './ui/Button'
import {
  createGrowth,
  updateGrowth,
  deleteGrowth,
  MONTHS_PER_YEAR,
  type Growth,
  type GrowthInput,
} from '../lib/growth'

// 入力できる上限年齢（この歳の誕生月まで）。
const AGE_LIMIT = 6
const EMPTY_VALUE: MonthValue = { height: '', weight: '' }

// 1か月分の入力値（文字列のまま保持し、保存時に数値へ変換する）。
type MonthValue = { height: string; weight: string }

// 月ごとに行う保存操作。
type SaveOperation =
  | { kind: 'create'; input: GrowthInput }
  | { kind: 'update'; id: string; input: GrowthInput }
  | { kind: 'delete'; id: string }

/**
 * 誕生日から年・月を取り出す。タイムゾーンでずれないよう文字列から取る。
 * @param birthday 子供の誕生日（YYYY-MM-DD）
 * @returns 誕生年と誕生月
 */
function parseBirthday(birthday: string): { birthYear: number; birthMonth: number } {
  const [birthYear, birthMonth] = birthday.split('-').map(Number)
  return { birthYear, birthMonth }
}

/**
 * 誕生年から「6歳の誕生年」までの年の選択肢を作る。
 * @param birthYear 誕生年
 * @returns 年の選択肢
 */
function buildYearOptions(birthYear: number): SelectOption[] {
  const options: SelectOption[] = []
  for (let year = birthYear; year <= birthYear + AGE_LIMIT; year++) {
    options.push({ value: String(year), label: `${year}年` })
  }
  return options
}

/**
 * 初期表示する年を決める。現在の年が範囲外なら範囲内に丸める（多くは最新の年になる）。
 * @param birthYear 誕生年
 * @returns 初期表示する年
 */
function resolveInitialYear(birthYear: number): number {
  const currentYear = new Date().getFullYear()
  const minYear = birthYear
  const maxYear = birthYear + AGE_LIMIT
  return Math.min(Math.max(currentYear, minYear), maxYear)
}

/**
 * その年に入力できる月の一覧を返す。最初の年は誕生月以降、最後の年は誕生月まで。
 * @param year 対象の年
 * @param birthYear 誕生年
 * @param birthMonth 誕生月
 * @returns 入力できる月（1〜12）の配列
 */
function getMonthsInYear(year: number, birthYear: number, birthMonth: number): number[] {
  const startMonth = year === birthYear ? birthMonth : 1
  const endMonth = year === birthYear + AGE_LIMIT ? birthMonth : MONTHS_PER_YEAR
  const months: number[] = []
  for (let month = startMonth; month <= endMonth; month++) {
    months.push(month)
  }
  return months
}

/**
 * 年と月から記録のキー（YYYY-MM）を作る。
 * @param year 年
 * @param month 月
 * @returns YYYY-MM 形式のキー
 */
function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * 既存記録を YYYY-MM をキーにした初期入力値へ変換する。
 * @param records 既存の成長記録
 * @returns 月キーごとの入力値
 */
function buildInitialValues(records: Growth[]): Record<string, MonthValue> {
  const values: Record<string, MonthValue> = {}
  for (const record of records) {
    values[record.recordedAt.slice(0, 7)] = {
      height: record.height != null ? String(record.height) : '',
      weight: record.weight != null ? String(record.weight) : '',
    }
  }
  return values
}

/**
 * 入力文字列を測定値に変換する。空欄は null、正の数でなければエラーメッセージを返す。
 * @param value 入力文字列（trim 済み）
 * @param label エラーメッセージ用のラベル
 * @returns 数値・null・エラーメッセージ
 */
function parseMeasurement(value: string, label: string): number | null | string {
  if (value.length === 0) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return `${label}は正しい数値で入力してください。`
  return parsed
}

type GrowthRecordModalProps = {
  isOpen: boolean
  childId: string
  birthday: string
  records: Growth[]
  onClose: () => void
  onSaved: () => void
}

/**
 * @component
 * 成長記録の入力モーダル。年を選び、その年の各月の身長・体重をまとめて登録する。
 * 入力のある月は作成 or 更新し、空欄にした月は既存記録を削除する。測定年月は YYYY-MM-01 で保存する。
 * @param isOpen 表示するか
 * @param childId 対象の子供 id
 * @param birthday 子供の誕生日（年・月の範囲に使う）
 * @param records その子の既存の成長記録（初期値・更新/削除の判定に使う）
 * @param onClose 閉じる要求時
 * @param onSaved 保存成功時
 */
export default function GrowthRecordModal({
  isOpen,
  childId,
  birthday,
  records,
  onClose,
  onSaved,
}: GrowthRecordModalProps) {
  const { birthYear, birthMonth } = parseBirthday(birthday)
  const [year, setYear] = useState(String(resolveInitialYear(birthYear)))
  const [values, setValues] = useState<Record<string, MonthValue>>(() => buildInitialValues(records))
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)

  const yearOptions = buildYearOptions(birthYear)
  const recordMap = new Map<string, Growth>()
  for (const record of records) {
    recordMap.set(record.recordedAt.slice(0, 7), record)
  }

  const selectedYear = Number(year)
  const months = getMonthsInYear(selectedYear, birthYear, birthMonth)

  /**
   * 1か月分の入力値を更新する。
   * @param key 月キー（YYYY-MM）
   * @param field 更新する項目
   * @param value 新しい値
   */
  function handleValueChange(key: string, field: keyof MonthValue, value: string) {
    setValues((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? EMPTY_VALUE), [field]: value },
    }))
  }

  /**
   * 範囲内の全年・全月を走査し、変更があった月の保存操作を組み立てる。検証エラーがあれば該当年とメッセージを返す。
   * 入力ありで既存なし→作成、既存ありで値が変わった→更新、入力なしで既存あり→削除（変更なしはスキップ）。
   * @returns 保存操作の配列、または検証エラー（該当年とメッセージ）
   */
  function buildOperations(): SaveOperation[] | { year: number; error: string } {
    const operations: SaveOperation[] = []
    for (let year = birthYear; year <= birthYear + AGE_LIMIT; year++) {
      for (const month of getMonthsInYear(year, birthYear, birthMonth)) {
        const key = toMonthKey(year, month)
        const value = values[key] ?? EMPTY_VALUE
        const heightStr = value.height.trim()
        const weightStr = value.weight.trim()
        const existing = recordMap.get(key)

        if (heightStr.length === 0 && weightStr.length === 0) {
          if (existing) operations.push({ kind: 'delete', id: existing.id })
          continue
        }

        const height = parseMeasurement(heightStr, `${year}年${month}月の身長`)
        if (typeof height === 'string') return { year, error: height }
        const weight = parseMeasurement(weightStr, `${year}年${month}月の体重`)
        if (typeof weight === 'string') return { year, error: weight }

        if (existing) {
          // 値が変わっていなければ更新しない。
          if (existing.height === height && existing.weight === weight) continue
          operations.push({ kind: 'update', id: existing.id, input: { height, weight, recordedAt: `${key}-01` } })
        } else {
          operations.push({ kind: 'create', input: { height, weight, recordedAt: `${key}-01` } })
        }
      }
    }
    return operations
  }

  /**
   * 選択中の年の入力を保存する。
   * @param event フォームの submit イベント
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmittingRef.current) return

    const result = buildOperations()
    if (!Array.isArray(result)) {
      // エラーのある月の年へ切り替えて、該当の入力欄が見えるようにする。
      setYear(String(result.year))
      setErrorMessage(result.error)
      return
    }
    const operations = result
    if (operations.length === 0) {
      onClose()
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await Promise.all(
        operations.map((operation) => {
          if (operation.kind === 'create') return createGrowth(childId, operation.input)
          if (operation.kind === 'update') return updateGrowth(childId, operation.id, operation.input)
          return deleteGrowth(childId, operation.id)
        }),
      )
      onSaved()
      onClose()
    } catch (error) {
      // 一部だけ成功している可能性があるため記録を取り直す。
      // 再送時に作成済みの月を二重作成しないよう recordMap を最新化する。
      onSaved()
      setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました。')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="mb-4 text-xl font-bold text-foreground">記録を入力</h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex justify-center">
          <div className="w-32">
            <Select options={yearOptions} value={year} onChange={setYear} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {months.map((month) => {
            const key = toMonthKey(selectedYear, month)
            const value = values[key] ?? EMPTY_VALUE
            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">{month}月</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="身長(cm)"
                    value={value.height}
                    onChange={(event) => handleValueChange(key, 'height', event.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="体重(kg)"
                    value={value.weight}
                    onChange={(event) => handleValueChange(key, 'weight', event.target.value)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          年を切り替えても、すべての年・月の入力をまとめて保存します。値を消した月の記録は削除されます。
        </p>

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '登録'}
        </Button>
      </form>
    </Modal>
  )
}

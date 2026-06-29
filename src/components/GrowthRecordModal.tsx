import { useRef, useState, type FormEvent } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Select, { type SelectOption } from './ui/Select'
import Button from './ui/Button'
import { createGrowth, updateGrowth, deleteGrowth, type Growth } from '../lib/growth'

const MONTH_OPTIONS: SelectOption[] = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}月`,
}))

/**
 * 誕生年から今年までの「年」選択肢を作る。
 * @param birthday 子供の誕生日（YYYY-MM-DD）
 * @returns 年の選択肢
 */
function buildYearOptions(birthday: string): SelectOption[] {
  const birthYear = new Date(birthday).getFullYear()
  const currentYear = new Date().getFullYear()
  const startYear = Number.isNaN(birthYear) ? currentYear : birthYear
  const options: SelectOption[] = []
  for (let year = startYear; year <= currentYear; year++) {
    options.push({ value: String(year), label: `${year}年` })
  }
  return options
}

type GrowthRecordModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  childId: string
  birthday: string
  record?: Growth
  onClose: () => void
  onSaved: () => void
}

/**
 * @component
 * 成長記録の追加・編集・削除モーダル。身長・体重（少なくとも一方必須）と測定年月を入力する。
 * 測定年月は YYYY-MM-01 として保存する。
 * @param isOpen 表示するか
 * @param mode "create" または "edit"
 * @param childId 対象の子供 id
 * @param birthday 子供の誕生日（年の選択肢に使う）
 * @param record 編集対象（mode="edit" のとき）
 * @param onClose 閉じる要求時
 * @param onSaved 保存・削除成功時
 */
export default function GrowthRecordModal({
  isOpen,
  mode,
  childId,
  birthday,
  record,
  onClose,
  onSaved,
}: GrowthRecordModalProps) {
  const isEdit = mode === 'edit'
  const [year, setYear] = useState(record ? record.recordedAt.slice(0, 4) : '')
  const [month, setMonth] = useState(record ? String(Number(record.recordedAt.slice(5, 7))) : '')
  const [height, setHeight] = useState(record?.height != null ? String(record.height) : '')
  const [weight, setWeight] = useState(record?.weight != null ? String(record.weight) : '')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)

  const yearOptions = buildYearOptions(birthday)
  const canSubmit =
    year.length > 0 &&
    month.length > 0 &&
    (height.trim().length > 0 || weight.trim().length > 0) &&
    !isSubmitting

  /**
   * 入力値を GrowthInput に変換する。空欄は null、数値でなければエラー。
   * @returns 入力、または検証エラーメッセージ
   */
  function buildInput(): { height: number | null; weight: number | null; recordedAt: string } | string {
    const parseMeasurement = (value: string, label: string): number | null | string => {
      if (value.trim().length === 0) return null
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return `${label}は正しい数値で入力してください。`
      return parsed
    }
    const parsedHeight = parseMeasurement(height, '身長')
    if (typeof parsedHeight === 'string') return parsedHeight
    const parsedWeight = parseMeasurement(weight, '体重')
    if (typeof parsedWeight === 'string') return parsedWeight

    const recordedAt = `${year}-${month.padStart(2, '0')}-01`
    return { height: parsedHeight, weight: parsedWeight, recordedAt }
  }

  /**
   * 成長記録を作成 or 更新する。
   * @param event フォームの submit イベント
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || isSubmittingRef.current) return

    const input = buildInput()
    if (typeof input === 'string') {
      setErrorMessage(input)
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      if (isEdit) {
        await updateGrowth(childId, record!.id, input)
      } else {
        await createGrowth(childId, input)
      }
      onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました。')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  /** 成長記録を削除する（確認ダイアログあり）。 */
  async function handleDelete() {
    if (!record || isSubmittingRef.current) return
    if (!window.confirm('この記録を削除しますか？')) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await deleteGrowth(childId, record.id)
      onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '削除に失敗しました。')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="mb-4 text-xl font-bold text-foreground">
        {isEdit ? '記録を編集' : '記録を追加'}
      </h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">測定年月</span>
          <div className="flex gap-2">
            <Select
              options={yearOptions}
              value={year}
              placeholder="年"
              onChange={setYear}
            />
            <Select options={MONTH_OPTIONS} value={month} placeholder="月" onChange={setMonth} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="growthHeight">
            身長（cm）
          </label>
          <Input
            id="growthHeight"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="growthWeight">
            体重（kg）
          </label>
          <Input
            id="growthWeight"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">身長・体重は少なくとも一方を入力してください。</p>

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? '保存中...' : isEdit ? '更新' : '登録'}
        </Button>
      </form>

      {isEdit && (
        <Button
          variant="danger"
          tone="ghost"
          className="mt-3 w-full"
          disabled={isSubmitting}
          onClick={handleDelete}
        >
          削除
        </Button>
      )}
    </Modal>
  )
}

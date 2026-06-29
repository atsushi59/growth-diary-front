import { cva, type VariantProps } from 'class-variance-authority'

// Rabee UI の Select を React に移植。ネイティブ select にスタイルを当てる。
const selectVariants = cva(
  'h-10 w-full cursor-pointer rounded-md border bg-surface px-3 text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      isError: {
        true: 'border-destructive',
        false: 'border-input',
      },
    },
    defaultVariants: {
      isError: false,
    },
  },
)

export type SelectOption = {
  label: string
  value: string
}

type SelectProps = VariantProps<typeof selectVariants> & {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

/**
 * @component
 * 選択肢から1つ選ぶセレクト。value + onChange の制御コンポーネント。
 * @param options 選択肢（label / value）
 * @param value 選択中の値
 * @param onChange 値が変わったとき呼ばれる
 * @param placeholder 未選択時の表示
 * @param isError エラー時のボーダー色
 */
export default function Select({
  options,
  value,
  onChange,
  placeholder,
  isError,
  disabled,
  id,
}: SelectProps) {
  return (
    <select
      id={id}
      className={selectVariants({ isError })}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

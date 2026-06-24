import { cva, type VariantProps } from 'class-variance-authority'
import type { InputHTMLAttributes } from 'react'

// Rabee UI の Input を React+TS に移植。Svelte の bind:value は value + onChange の制御コンポーネントで置き換える。
const inputVariants = cva(
  'h-10 w-full rounded-md border bg-surface px-3 text-foreground transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
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

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> &
  VariantProps<typeof inputVariants> & {
    value: string
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  }

/**
 * @component
 * 制御コンポーネントの入力欄。isError でエラー時のボーダー色を切り替える。
 */
export default function Input({ isError, className, value, onChange, ...rest }: InputProps) {
  return (
    <input
      className={inputVariants({ isError, class: className })}
      aria-invalid={isError || undefined}
      value={value}
      onChange={onChange}
      {...rest}
    />
  )
}

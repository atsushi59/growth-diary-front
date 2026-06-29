import { cva, type VariantProps } from 'class-variance-authority'
import type { TextareaHTMLAttributes } from 'react'

const textareaVariants = cva(
  'min-h-20 w-full cursor-text rounded-md border bg-surface px-3 py-2 text-sm text-foreground transition-colors outline-offset-2 outline-ring placeholder:text-muted-foreground focus-visible:outline-2 [&:not(:disabled):not([readonly])]:hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 read-only:opacity-50',
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

type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange'
> &
  VariantProps<typeof textareaVariants> & {
    value: string
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  }

/**
 * @component
 * 制御コンポーネントの複数行入力欄。isError でエラー時のボーダー色を切り替える。
 */
export default function Textarea({ isError, className, value, onChange, ...rest }: TextareaProps) {
  return (
    <textarea
      className={textareaVariants({ isError, class: className })}
      aria-invalid={isError || undefined}
      value={value}
      onChange={onChange}
      {...rest}
    />
  )
}

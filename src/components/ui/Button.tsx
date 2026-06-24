import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Rabee UI の Button を React+TS に移植。色は役割名クラスのみ使用。
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: '',
        secondary: '',
        success: '',
        danger: '',
      },
      tone: {
        solid: '',
        ghost: 'bg-surface',
      },
      size: {
        small: 'h-8 px-3 text-sm',
        medium: 'h-10 px-4 text-sm',
        large: 'h-12 px-6 text-base',
      },
      isSquare: {
        true: 'aspect-square p-0',
        false: '',
      },
    },
    compoundVariants: [
      // solid
      { variant: 'primary', tone: 'solid', class: 'bg-primary text-primary-foreground hover:bg-primary-700' },
      { variant: 'secondary', tone: 'solid', class: 'border border-border bg-subtle text-foreground hover:bg-muted' },
      { variant: 'success', tone: 'solid', class: 'bg-success text-success-foreground hover:opacity-90' },
      { variant: 'danger', tone: 'solid', class: 'bg-destructive text-destructive-foreground hover:opacity-90' },
      // ghost
      { variant: 'primary', tone: 'ghost', class: 'border border-primary-700 text-primary-700 hover:bg-primary-50' },
      { variant: 'secondary', tone: 'ghost', class: 'border border-border text-foreground hover:bg-subtle' },
      { variant: 'success', tone: 'ghost', class: 'border border-success text-success hover:bg-subtle' },
      { variant: 'danger', tone: 'ghost', class: 'border border-destructive text-destructive hover:bg-subtle' },
    ],
    defaultVariants: {
      variant: 'primary',
      tone: 'solid',
      size: 'medium',
      isSquare: false,
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode
  }

/**
 * @component
 * 汎用ボタン。variant / tone / size / isSquare を cva で管理する。
 */
export default function Button({
  variant,
  tone,
  size,
  isSquare,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, tone, size, isSquare, class: className })}
      type={type}
      {...rest}
    >
      {children}
    </button>
  )
}

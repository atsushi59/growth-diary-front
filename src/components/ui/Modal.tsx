import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  // 背景クリック・Escape で閉じられるか（デフォルト true）
  dismissible?: boolean
  hideCloseButton?: boolean
  children: ReactNode
}

/**
 * @component
 * Rabee UI の Modal を React に移植したダイアログ。
 * 背景クリック・Escape で閉じ（dismissible 時）、開いている間は背景スクロールを止め、
 * 開いたときにダイアログへフォーカスを移す。
 * @param isOpen 表示するか
 * @param onClose 閉じる要求時に呼ばれる
 * @param dismissible 背景クリック・Escape で閉じられるか
 * @param hideCloseButton 右上の閉じるボタンを隠すか
 * @param children モーダルの中身
 */
export default function Modal({
  isOpen,
  onClose,
  dismissible = true,
  hideCloseButton = false,
  children,
}: ModalProps) {
  const dialogElement = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousActiveElement = document.activeElement as HTMLElement | null
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogElement.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (dismissible && event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      previousActiveElement?.focus()
    }
  }, [isOpen, dismissible, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => dismissible && onClose()}
    >
      <div
        ref={dialogElement}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-surface p-6 shadow-lg focus-visible:outline-none"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {!hideCloseButton && (
          <button
            className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            type="button"
            aria-label="閉じる"
            onClick={onClose}
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

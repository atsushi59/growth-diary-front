import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import Modal from '../components/ui/Modal'

// メニューに並べるページ（アイコン・ラベル・遷移先）。追加・削除はこの配列だけで完結する。
const MENU_ITEMS = [
  { path: '/children', label: 'こども', icon: '👶' },
  { path: '/consultation', label: '相談', icon: '💬' },
  { path: '/foods', label: '離乳食', icon: '🍴' },
  { path: '/allergies', label: 'アレルギー', icon: '🤧' },
  { path: '/vaccinations', label: '予防接種', icon: '💉' },
  { path: '/growth', label: '成長', icon: '📈' },
  { path: '/albums', label: 'アルバム', icon: '📷' },
  { path: '/mypage', label: 'マイページ', icon: '👤' },
]

/**
 * @component
 * ログイン後の全ページで使うレイアウト。背景は認証画面と同じ bg-subtle。
 * 右下のメニューボタンを押すと各ページへのメニューモーダルを開く。
 * <Outlet /> で子ページを表示する。
 */
export default function AppLayout() {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  /**
   * メニューの項目を押したとき。該当ページへ遷移してメニューを閉じる。
   * @param path 遷移先のパス
   */
  const handleNavigate = (path: string) => {
    navigate(path)
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-subtle">
      <Outlet />

      <button
        className="fixed right-6 bottom-6 flex size-14 cursor-pointer items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg"
        type="button"
        aria-label="メニューを開く"
        onClick={() => setIsMenuOpen(true)}
      >
        ☰
      </button>

      <Modal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)}>
        <h2 className="mb-4 text-center text-lg font-bold text-foreground">メニュー</h2>
        <div className="grid grid-cols-3 gap-4">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.path}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-md p-2 hover:bg-accent"
              type="button"
              onClick={() => handleNavigate(item.path)}
            >
              <span className="flex size-16 items-center justify-center rounded-full border border-border bg-primary-50 text-2xl">
                {item.icon}
              </span>
              <span className="text-xs text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

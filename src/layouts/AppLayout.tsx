import { Outlet } from 'react-router'

/**
 * @component
 * ログイン後の全ページで使うレイアウト。右下にメニューボタンを置き、
 * <Outlet /> で子ページを表示する。
 * TODO(#22以降): メニューボタンのモーダル化と各ページへの遷移リンクを実装する。
 */
export default function AppLayout() {
  return (
    <div>
      <Outlet />
      <button
        className="fixed right-6 bottom-6 flex size-14 cursor-pointer items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg"
        type="button"
        aria-label="メニューを開く"
      >
        ☰
      </button>
    </div>
  )
}

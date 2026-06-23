import { Link } from 'react-router'

// 検証用: 各ページへのリンク一覧（ページの追加・削除はこの配列だけで完結する）
const PAGE_LINKS = [
  { path: '/login', label: 'ログイン' },
  { path: '/signup', label: 'サインイン' },
  { path: '/children', label: 'こどもページ（ハブ）' },
  { path: '/consultation', label: '相談ページ（AIボット）' },
  { path: '/albums', label: 'アルバムページ' },
  { path: '/allergies', label: 'アレルギーページ' },
  { path: '/foods', label: '離乳食投稿一覧ページ' },
  { path: '/foods/1', label: '離乳食詳細ページ（例: id=1）' },
  { path: '/vaccinations', label: '予防接種ページ' },
  { path: '/growth', label: '成長ページ' },
  { path: '/mypage', label: 'マイページ' },
  { path: '/debug', label: 'デバッグページ' },
]

/**
 * @component
 * 検証用のリンク一覧ページ。各ページへ素早く遷移するためのボタンを並べる。
 * メニューボタンは不要なのでどのレイアウトにも属さない。
 */
export default function PageList() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold">ページ一覧（検証用）</h1>
      {PAGE_LINKS.map((link) => (
        <Link
          key={link.path}
          className="rounded-lg bg-blue-600 px-4 py-3 text-center text-white hover:bg-blue-700"
          to={link.path}
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}

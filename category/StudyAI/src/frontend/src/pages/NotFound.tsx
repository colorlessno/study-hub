import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div>
      <h2>404 — ページが見つかりません</h2>
      <Link to="/">トップへ戻る</Link>
    </div>
  )
}

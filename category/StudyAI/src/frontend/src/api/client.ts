import axios from 'axios'

// デフォルトユーザー（開発用）
const DEFAULT_USER_ID = 'user01'
const DEFAULT_USER_ROLES = 'admin'

// System01 向けのデフォルトクライアント
export const apiClient = axios.create({
  baseURL: '/api/system01',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': DEFAULT_USER_ID,
    'X-User-Roles': DEFAULT_USER_ROLES,
  },
})

/**
 * システム別クライアントファクトリ
 *
 * 使い方:
 *   const client = createSystemClient('system08')
 *   client.get('/analyze')  // → /api/system08/analyze → localhost:8008/api/analyze
 *
 * システムID と転送先ポートの対応:
 *   system01 → 8000
 *   system02 → 8002
 *   system03 → 8003
 *   system04 → 8004
 *   system05 → 8005
 *   system06 → 8006
 *   system07 → 8007
 *   system08 → 8008
 *   system09 → 8009
 *   system10 → 8010
 *   system11 → 8011
 *   system12 → 8012
 *   system13 → 8013
 *   system14 → 8014
 *   system16 → 8016
 */
export function createSystemClient(systemId: string) {
  return axios.create({
    baseURL: `/api/${systemId}`,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': DEFAULT_USER_ID,
      'X-User-Roles': DEFAULT_USER_ROLES,
    },
  })
}

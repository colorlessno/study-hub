import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:18000'

// Docker(compose)内で動く場合は VITE_API_PROXY_TARGET が設定される。
// その場合、system01〜16 への転送先も localhost ではなく compose のサービス名にする。
const inDocker = process.env.VITE_API_PROXY_TARGET !== undefined
const systemTarget = (no: number) =>
  no === 1
    ? backendProxyTarget
    : inDocker
      ? `http://system${String(no).padStart(2, '0')}:80${String(no).padStart(2, '0')}`
      : `http://localhost:180${String(no).padStart(2, '0')}`

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/system01': {
        target: systemTarget(1),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system01/, '/api'),
      },
      '/api/system02': {
        target: systemTarget(2),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system02/, '/api'),
      },
      '/api/system03': {
        target: systemTarget(3),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system03/, '/api'),
      },
      '/api/system04': {
        target: systemTarget(4),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system04/, '/api'),
      },
      '/api/system05': {
        target: systemTarget(5),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system05/, '/api'),
      },
      '/api/system06': {
        target: systemTarget(6),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system06/, '/api'),
      },
      '/api/system07': {
        target: systemTarget(7),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system07/, '/api'),
      },
      '/api/system08': {
        target: systemTarget(8),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system08/, '/api'),
      },
      '/api/system09': {
        target: systemTarget(9),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system09/, '/api'),
      },
      '/api/system10': {
        target: systemTarget(10),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system10/, '/api'),
      },
      '/api/system11': {
        target: systemTarget(11),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system11/, '/api'),
      },
      '/api/system12': {
        target: systemTarget(12),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system12/, '/api'),
      },
      '/api/system13': {
        target: systemTarget(13),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system13/, '/api'),
      },
      '/api/system14': {
        target: systemTarget(14),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system14/, '/api'),
      },
      '/api/system16': {
        target: systemTarget(16),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/system16/, '/api'),
      },
      ...Object.fromEntries(
        Array.from({ length: 28 }, (_, index) => {
          const no = index + 17
          const systemId = `system${no.toString().padStart(2, '0')}`
          return [
            `/api/${systemId}`,
            {
              target: backendProxyTarget,
              changeOrigin: true,
            },
          ]
        }),
      ),
    },
  },
})

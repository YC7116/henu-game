/**
 * 资源路径统一走 Vite 的 BASE_URL。
 * 部署到 GitHub Pages 这类子路径（/仓库名/）时，写死 `/assets/...` 会 404。
 */
const base = import.meta.env.BASE_URL

export function asset(path: string): string {
  return `${base}${path.replace(/^\/+/, '')}`
}

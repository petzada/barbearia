/**
 * Registra o service worker só em produção (em desenvolvimento ele atrapalharia o HMR). O worker faz
 * cache apenas de arquivos estáticos e da página offline; nunca de HTML de rota nem de dados (public/sw.js).
 */
export function registerServiceWorker(): void {
  // MODE e não PROD: PROD herda o NODE_ENV do .env.local (ver ui-session.ts).
  if (import.meta.env.MODE !== 'production') return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  // Falha de registro não impede o app de funcionar; o navegador já a mostra no console do DevTools.
  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
}

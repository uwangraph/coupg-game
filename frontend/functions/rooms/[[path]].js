/**
 * Cloudflare Pages Function
 * Proxies all /rooms/* requests (HTTP + WebSocket) to the bound Worker.
 * 
 * Setup in Pages dashboard:
 *   Settings → Functions → Service Bindings → Add:
 *   Variable name: WORKER
 *   Service: coup-game-worker
 */
export async function onRequest(context) {
  return context.env.WORKER.fetch(context.request);
}

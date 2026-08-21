/**
 * Deployment version detection.
 *
 * Users can keep an old HTML shell alive for days (long-lived tabs, CDN edge
 * copies, restored sessions). This polls the deployed index.html with
 * cache-busting and compares the hashed asset names against the ones the
 * current page booted with. When they differ, a new deployment exists and we
 * reload once so every user converges on the latest build.
 */

const POLL_MS = 5 * 60 * 1000;
const RELOAD_FLAG = 'arip_version_reloaded_at';

const currentAssets = (): string =>
  Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))
    .map((s) => s.getAttribute('src') || '')
    .filter((s) => s.includes('/assets/'))
    .sort()
    .join('|');

const deployedAssets = async (): Promise<string> => {
  const res = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return '';
  const html = await res.text();
  return (html.match(/\/assets\/[A-Za-z0-9._-]+\.js/g) || []).sort().join('|');
};

export const startVersionCheck = () => {
  if (import.meta.env.DEV) return;
  const booted = currentAssets();
  if (!booted) return;

  const check = async () => {
    try {
      const deployed = await deployedAssets();
      if (!deployed || deployed === booted) return;
      // Guard against reload loops if a CDN serves inconsistent copies.
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      if (Date.now() - last < POLL_MS) return;
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      window.location.reload();
    } catch {
      /* offline or blocked - retry on next tick */
    }
  };

  window.setInterval(check, POLL_MS);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
};

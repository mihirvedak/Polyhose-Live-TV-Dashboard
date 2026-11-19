import { useSyncExternalStore } from 'react';

// Minimal history router: the app only has /tv and /tv/settings, so a
// routing library would be dead weight on the TV.

const listeners = new Set<() => void>();

function subscribe(l: () => void): () => void {
  listeners.add(l);
  window.addEventListener('popstate', l);
  return () => {
    listeners.delete(l);
    window.removeEventListener('popstate', l);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

/** Navigate, keeping the query string (e.g. ?profile=braider-hall). */
export function navigate(path: string, { replace = false } = {}): void {
  const url = path.includes('?') ? path : `${path}${window.location.search}`;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  listeners.forEach((l) => l());
}

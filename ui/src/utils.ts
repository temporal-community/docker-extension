import { TEMPORAL_WEB_URL } from './constants';
import type { DiagnosticItem } from './types';

declare global {
  interface Window {
    __temporalApiBaseUrl?: string;
  }
}

export function getTemporalWebUrl(path = ''): string {
  const baseUrl = window.__temporalApiBaseUrl ?? (import.meta.env.DEV ? '/temporal-api' : TEMPORAL_WEB_URL);
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'stderr' in err) {
    const stderr = (err as { stderr?: unknown }).stderr;
    if (typeof stderr === 'string' && stderr.trim()) return stderr.trim();
  }
  return 'Unknown error';
}

export function startupDiagnostics(message: string): DiagnosticItem[] {
  const normalized = message.toLowerCase();
  const diagnostics: DiagnosticItem[] = [];

  if (normalized.includes('port is already allocated') || normalized.includes('bind')) {
    diagnostics.push({
      title: 'Port conflict',
      detail: 'Another process is using localhost:7233 or localhost:8233. Stop that process, then start Temporal again.',
      severity: 'error',
    });
  }

  if (normalized.includes('no such image') || normalized.includes('pull access denied') || normalized.includes('not found')) {
    diagnostics.push({
      title: 'Temporal image unavailable',
      detail: 'Docker could not find temporalio/temporal:latest locally or pull it from the registry.',
      severity: 'error',
    });
  }

  if (normalized.includes('cannot connect') || normalized.includes('daemon') || normalized.includes('permission denied')) {
    diagnostics.push({
      title: 'Docker unavailable',
      detail: 'Docker Desktop is not reachable from the extension. Confirm Docker is running and retry.',
      severity: 'error',
    });
  }

  if (normalized.includes('permission') || normalized.includes('/data')) {
    diagnostics.push({
      title: 'Data volume permissions',
      detail: 'The SQLite data volume may need its permissions refreshed before Temporal can write to it.',
      severity: 'warning',
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      title: 'Startup failed',
      detail: message,
      severity: 'error',
    });
  }

  return diagnostics;
}

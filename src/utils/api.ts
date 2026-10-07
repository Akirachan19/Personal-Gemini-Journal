/**
 * Utility for resolving backend API endpoints and providing descriptive error messages
 * when running on static hosts like GitHub Pages.
 */

export function getApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem('mindreflect_custom_api_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // LocalStorage may be restricted in some iframes
  }

  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return '';
}

export function setCustomApiBaseUrl(url: string): void {
  try {
    if (!url.trim()) {
      localStorage.removeItem('mindreflect_custom_api_url');
    } else {
      localStorage.setItem('mindreflect_custom_api_url', url.trim().replace(/\/+$/, ''));
    }
  } catch {
    // Ignore storage errors
  }
}

export function getApiEndpoint(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base) {
    return `${base}${cleanPath}`;
  }
  return cleanPath;
}

export async function fetchApiJson<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiEndpoint(path);
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (isGitHubPagesHost()) {
      throw new Error(
        `Network error reaching "${url}". GitHub Pages is a static host and cannot run the Node.js backend. Deploy your backend to Google Cloud Run and set your Backend API URL.`
      );
    }
    throw new Error(err?.message || 'Network error reaching backend server.');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 404 && (isGitHubPagesHost() || !isJson)) {
      throw new Error(
        `Backend API endpoint "${path}" returned 404 Not Found. GitHub Pages does not run the server.ts Node backend. Deploy your backend to Google Cloud Run and configure your Backend API URL.`
      );
    }

    let errorDetail = `Request failed with status ${response.status}`;
    if (isJson) {
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.error || errorDetail;
      } catch {
        // Fallback to generic message
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text.length > 0 && text.length < 200) {
        errorDetail = text;
      }
    }
    throw new Error(errorDetail);
  }

  if (!isJson) {
    const text = await response.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      throw new Error(
        `Received HTML instead of JSON from "${path}". This occurs when running on a static host like GitHub Pages without a backend server.`
      );
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Unexpected non-JSON response from server for ${path}`);
    }
  }

  return response.json() as Promise<T>;
}

export function isGitHubPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io');
}

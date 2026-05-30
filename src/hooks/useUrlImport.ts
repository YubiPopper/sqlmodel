/**
 * Hook to import schema files from URL parameters.
 *
 * Supports two URL patterns:
 *   1. Query param:  ?url=https://raw.githubusercontent.com/...
 *   2. Path-based:   /p/raw.githubusercontent.com/...  (à la liam ERD)
 *
 * The file extension determines which parser to use:
 *   .sql        → tries Postgres first, falls back to Snowflake/MySQL/Oracle
 *   .rb         → Rails schema.rb
 *   .prisma     → Prisma schema
 *
 * The URL stays in the address bar so the link remains shareable.
 * A sessionStorage guard prevents re-importing on page refresh.
 * Loading a new model (template, example, etc.) clears both the URL and
 * the session guard via `clearSchemaUrl()`.
 */
import { useEffect, useState } from 'react';
import { parse } from '../services/parsers';
import { importParsedSchema } from '../services/parsers/importSchema';
import { SESSION_KEY } from './schemaUrlState';
import type { SupportedFormat } from '../services/parsers/types';

export { clearSchemaUrl } from './schemaUrlState';

/**
 * Convert GitHub/GitLab blob URLs to raw content URLs.
 * 
 * Examples:
 *   github.com/user/repo/blob/main/file.sql → raw.githubusercontent.com/user/repo/main/file.sql
 *   github.com/user/repo/blob/e2f085e2b2c/db/schema.rb → raw.githubusercontent.com/user/repo/e2f085e2b2c/db/schema.rb
 *   gitlab.com/user/repo/-/blob/main/file.sql → gitlab.com/user/repo/-/raw/main/file.sql
 */
export function convertGitHubUrlToRaw(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // GitHub: convert blob URLs to raw.githubusercontent.com
    if (urlObj.hostname === 'github.com') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      // Path format: /owner/repo/blob/branch-or-commit/path/to/file
      if (pathParts.length >= 4 && pathParts[2] === 'blob') {
        const owner = pathParts[0];
        const repo = pathParts[1];
        const refAndPath = pathParts.slice(3).join('/');
        return `https://raw.githubusercontent.com/${owner}/${repo}/${refAndPath}`;
      }
    }
    
    // GitLab: convert /-/blob/ to /-/raw/
    if (urlObj.hostname.includes('gitlab')) {
      return url.replace('/-/blob/', '/-/raw/');
    }
    
    // Return unchanged if not a recognized pattern
    return url;
  } catch {
    return url;
  }
}

export type UrlImportStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UrlImportState {
  status: UrlImportStatus;
  message: string;
  url: string | null;
}

/** Map common file extensions to a parser format (or list to try). */
const EXT_FORMAT_MAP: Record<string, SupportedFormat[]> = {
  '.sql':    ['postgres', 'snowflake'],
  '.rb':     ['rails'],
  '.prisma': ['prisma'],
  '.schema': ['prisma'],
  '.ddl':    ['postgres', 'snowflake'],
};

/**
 * Extract the schema URL from the current browser location.
 * Returns `null` if no URL import was requested.
 */
function getSchemaUrlFromLocation(): string | null {
  // 1. Query-param approach: ?url=https://...
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');
  if (urlParam) return urlParam;

  // 2. Path-based approach: /p/https://... or /p/raw.githubusercontent.com/...
  const pathMatch = window.location.pathname.match(/^\/p\/(.+)/);
  if (pathMatch) {
    const captured = decodeURIComponent(pathMatch[1]);
    // If the captured part already starts with a scheme, use it as-is
    if (captured.startsWith('http://') || captured.startsWith('https://')) {
      return captured;
    }
    // Otherwise prepend https://
    return `https://${captured}${window.location.search}`;
  }

  return null;
}

/** Guess parser format(s) from the URL / file name. */
function guessFormats(url: string): SupportedFormat[] {
  try {
    // Strip query string for extension detection
    const pathname = new URL(url).pathname;
    const ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
    if (EXT_FORMAT_MAP[ext]) return EXT_FORMAT_MAP[ext];
  } catch {
    // URL might not parse — try raw string matching
    for (const [ext, formats] of Object.entries(EXT_FORMAT_MAP)) {
      if (url.includes(ext)) return formats;
    }
  }
  // Default: try postgres then snowflake
  return ['postgres', 'snowflake'];
}

export function useUrlImport(): UrlImportState {
  const [state, setState] = useState<UrlImportState>({
    status: 'idle',
    message: '',
    url: null,
  });

  useEffect(() => {
    const schemaUrl = getSchemaUrlFromLocation();
    if (!schemaUrl) return;

    // Skip re-import if we already imported this exact URL in this browser session.
    // This prevents re-fetching on every refresh while the URL stays in the address bar.
    const alreadyImported = sessionStorage.getItem(SESSION_KEY);
    if (alreadyImported === schemaUrl) {
      // Signal success so AppLayout skips loading the default example
      setState({ status: 'success', message: '', url: schemaUrl });
      return;
    }

    // Prevent double-import (React StrictMode in dev fires effects twice)
    let cancelled = false;

    const doImport = async () => {
      // Convert GitHub blob URLs to raw URLs
      const fetchUrl = convertGitHubUrlToRaw(schemaUrl);
      setState({ status: 'loading', message: `Fetching ${schemaUrl}…`, url: schemaUrl });

      try {
        // Fetch the remote file
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const content = await response.text();

        if (cancelled) return;

        if (!content.trim()) {
          throw new Error('The fetched file is empty');
        }

        // Try each candidate format until one produces tables
        const formats = guessFormats(schemaUrl);
        let lastError: Error | null = null;

        for (const format of formats) {
          try {
            const result = await parse(content, format);
            if (result.tables.length > 0) {
              const { tableCount, fkCount } = importParsedSchema(result, { clearFirst: true });
              if (!cancelled) {
                // Mark as imported so refreshes don't re-import
                sessionStorage.setItem(SESSION_KEY, schemaUrl);
                setState({
                  status: 'success',
                  message: `Imported ${tableCount} table${tableCount !== 1 ? 's' : ''} and ${fkCount} foreign key${fkCount !== 1 ? 's' : ''} (${format})`,
                  url: schemaUrl,
                });
              }
              return;
            }
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            // Continue to next format
          }
        }

        throw lastError || new Error('No tables found in the fetched file');
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setState({ status: 'error', message, url: schemaUrl });
        }
      }
    };

    doImport();

    return () => {
      cancelled = true;
    };
  }, []); // Run once on mount

  return state;
}

/**
 * Build a shareable URL that will auto-import a schema from a raw file URL.
 * @param rawFileUrl  Full URL to the raw schema file (e.g. GitHub raw link)
 * @returns           The app URL with `?url=` query parameter
 */
export function buildShareableUrl(rawFileUrl: string): string {
  const base = window.location.origin;
  const encoded = encodeURIComponent(rawFileUrl);
  return `${base}?url=${encoded}`;
}

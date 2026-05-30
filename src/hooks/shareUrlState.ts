export type ShareViewMode = 'data-model' | 'conceptual' | 'physical';

export interface ShareState {
  schemaUrl: string | null;
  diagramId: string | null;
  view: ShareViewMode | null;
  focus: string | null;
  inspector: boolean;
}

const SHARE_PARAM_KEYS = ['diagram', 'view', 'focus', 'inspector', 'url'];

function isShareViewMode(value: string | null): value is ShareViewMode {
  return value === 'data-model' || value === 'conceptual' || value === 'physical';
}

function parseInspectorParam(value: string | null): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function getPathBasedSchemaUrlFromLocation(): string | null {
  const pathMatch = window.location.pathname.match(/^\/p\/(.+)/);
  if (!pathMatch) return null;

  const captured = decodeURIComponent(pathMatch[1]);
  const baseUrl = captured.startsWith('http://') || captured.startsWith('https://')
    ? captured
    : `https://${captured}`;

  const passthroughParams = new URLSearchParams(window.location.search);
  SHARE_PARAM_KEYS.forEach((param) => passthroughParams.delete(param));

  const passthroughQuery = passthroughParams.toString();
  if (!passthroughQuery) return baseUrl;
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${passthroughQuery}`;
}

export function getSchemaUrlFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');
  if (urlParam) return urlParam;
  return getPathBasedSchemaUrlFromLocation();
}

export function getShareStateFromLocation(): ShareState {
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');

  return {
    schemaUrl: getSchemaUrlFromLocation(),
    diagramId: params.get('diagram'),
    view: isShareViewMode(viewParam) ? viewParam : null,
    focus: params.get('focus'),
    inspector: parseInspectorParam(params.get('inspector')),
  };
}

interface ShareLinkOptions {
  diagramId?: string | null;
  schemaUrl?: string | null;
  view?: ShareViewMode | null;
  focus?: string | null;
  inspector?: boolean;
}

export function buildShareLink(options: ShareLinkOptions): string {
  const url = new URL(window.location.origin + window.location.pathname);

  if (options.diagramId) url.searchParams.set('diagram', options.diagramId);
  if (options.schemaUrl) url.searchParams.set('url', options.schemaUrl);
  if (options.view) url.searchParams.set('view', options.view);
  if (options.focus) url.searchParams.set('focus', options.focus);
  if (options.inspector) url.searchParams.set('inspector', '1');

  return url.toString();
}

// Oeste Marketing — Cloudflare Pages Function
// Only lists public Drive folders confirmed as descendants of ROOT.
// Verifies a full folder path by listing the *parent* folder at each level,
// avoiding files.get on link-shared children (which can require resource keys).
const ROOT = '1u0SJZZfxn0zDfbUHx6vaAqeQKTmHHHl1';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const ID_PATTERN = /^[A-Za-z0-9_-]{10,160}$/;
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  },
});

class GoogleDriveError extends Error {
  constructor(httpStatus, message) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

async function listDriveFolder(apiKey, folderId) {
  const entries = [];
  let token;
  // Bound paging to avoid unlimited API usage.
  for (let page = 0; page < 10; page++) {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
    url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,size)');
    url.searchParams.set('pageSize', '1000');
    url.searchParams.set('orderBy', 'folder,name_natural');
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    url.searchParams.set('key', apiKey);
    if (token) url.searchParams.set('pageToken', token);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(payload?.error?.message || 'Consulte as permissões e restrições da chave no Google Cloud.').slice(0, 240);
      throw new GoogleDriveError(response.status, message);
    }
    if (!Array.isArray(payload.files)) throw new GoogleDriveError(502, 'Resposta inesperada da API do Google Drive.');
    entries.push(...payload.files);
    token = payload.nextPageToken;
    if (!token) return entries;
  }
  throw new GoogleDriveError(502, 'Esta pasta possui mais arquivos que o limite de paginação configurado.');
}

export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_DRIVE_API_KEY) {
    return reply({ error: 'Configure GOOGLE_DRIVE_API_KEY como Secret em Production no Cloudflare Pages e publique novamente.' }, 503);
  }
  const params = new URL(request.url).searchParams;
  const target = params.get('folder') || ROOT;
  if (!ID_PATTERN.test(target)) return reply({ error: 'ID de pasta inválido.' }, 400);

  // "path" contains the chain of folders from the root down to "folder".
  // For existing links to first-level folders, "path" is optional.
  const rawPath = params.get('path');
  const path = target === ROOT ? [] : (rawPath ? rawPath.split(',') : [target]);
  if (target === ROOT && rawPath) return reply({ error: 'O caminho da pasta principal deve estar vazio.' }, 400);
  if (path.length > 24 || path.length === 0 && target !== ROOT ||
      path.some(id => !ID_PATTERN.test(id)) || new Set(path).size !== path.length ||
      (target !== ROOT && path[path.length - 1] !== target) || path.includes(ROOT)) {
    return reply({ error: 'Caminho de pasta inválido.' }, 400);
  }

  try {
    let ancestor = ROOT;
    // Every step is verified against a real listing of a previously verified parent.
    for (const id of path) {
      const siblings = await listDriveFolder(env.GOOGLE_DRIVE_API_KEY, ancestor);
      if (!siblings.some(item => item.id === id && item.mimeType === FOLDER_MIME)) {
        return reply({ error: 'Pasta fora do repositório ou sem acesso público.' }, 403);
      }
      ancestor = id;
    }
    const files = await listDriveFolder(env.GOOGLE_DRIVE_API_KEY, target);
    return reply({ files });
  } catch (err) {
    if (err instanceof GoogleDriveError) {
      return reply({
        error: 'O Google Drive recusou a consulta.',
        googleStatus: err.httpStatus,
        details: err.message,
      }, 502);
    }
    return reply({ error: 'Falha de comunicação com Google Drive.' }, 502);
  }
}

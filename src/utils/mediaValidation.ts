/**
 * Media File Validation & Cache-Busting Utilities
 * Velasquez Builders CMS & CRM
 */

export type MediaFolder = 'gallery' | 'logo' | 'video';

export const ALLOWED_EXTENSIONS: Record<MediaFolder, string[]> = {
  gallery: ['.webp', '.jpeg', '.jpg', '.png'],
  logo: ['.png', '.ico'],
  video: ['.mp4'],
};

export const ALLOWED_MIME_TYPES: Record<MediaFolder, string[]> = {
  gallery: ['image/webp', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'application/octet-stream'],
  logo: ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'application/octet-stream'],
  video: ['video/mp4', 'application/octet-stream'],
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  folder: MediaFolder;
  filename: string;
  cleanRelativePath: string;
}

/**
 * Validates a file against folder constraints without false positives
 */
export function validateMediaFile(file: File, folder: MediaFolder, customFilename?: string): ValidationResult {
  const filename = customFilename || file.name;
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  const allowedExts = ALLOWED_EXTENSIONS[folder] || [];

  // 1. Extension validation
  // For gallery, accept .webp, .jpg, .jpeg, .png seamlessly
  const isGalleryImage = folder === 'gallery' && ['.webp', '.jpeg', '.jpg', '.png'].includes(ext);
  const isLogoImage = folder === 'logo' && ['.png', '.ico'].includes(ext);
  const isVideo = folder === 'video' && ext === '.mp4';

  if (!isGalleryImage && !isLogoImage && !isVideo && !allowedExts.includes(ext)) {
    let msg = '';
    if (folder === 'gallery') {
      msg = `Formato (${ext}) no permitido. La galería permite formatos de imagen '.webp', '.jpg', '.jpeg' o '.png'.`;
    } else if (folder === 'logo') {
      msg = `Formato (${ext}) no permitido. El logo permite formatos '.png' o '.ico' para mantener transparencias.`;
    } else if (folder === 'video') {
      msg = `Formato (${ext}) no permitido. El video permite formato '.mp4'.`;
    }
    return {
      valid: false,
      error: msg,
      folder,
      filename,
      cleanRelativePath: `/images/${folder}/${filename}`,
    };
  }

  // 2. Permissive MIME check - don't reject converted/renamed files
  if (mimeType) {
    if (folder === 'gallery' && !mimeType.startsWith('image/') && mimeType !== 'application/octet-stream') {
      return {
        valid: false,
        error: `Tipo MIME incompatible (${mimeType}). Se requiere un archivo de imagen.`,
        folder,
        filename,
        cleanRelativePath: `/images/${folder}/${filename}`,
      };
    }
    if (folder === 'video' && !mimeType.startsWith('video/') && mimeType !== 'application/octet-stream') {
      return {
        valid: false,
        error: `Tipo MIME incompatible (${mimeType}). Se requiere un archivo de video.`,
        folder,
        filename,
        cleanRelativePath: `/images/${folder}/${filename}`,
      };
    }
  }

  // 3. File size constraints (100MB video, 25MB images)
  const maxBytes = folder === 'video' ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido (${folder === 'video' ? '100MB' : '25MB'}).`,
      folder,
      filename,
      cleanRelativePath: `/images/${folder}/${filename}`,
    };
  }

  return {
    valid: true,
    folder,
    filename,
    cleanRelativePath: `/images/${folder}/${filename}`,
  };
}

/**
 * Appends dynamic timestamp version parameter to defeat browser, proxy & CDN cache
 * Example: "/images/gallery/01.webp?v=1728456789012"
 */
export function getCacheBustedUrl(url: string, timestamp?: number): string {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('public/')) {
    cleanUrl = '/' + cleanUrl.slice('public/'.length);
  }
  if (!cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
    cleanUrl = '/' + cleanUrl;
  }

  const v = timestamp || Date.now();
  // Strip any old ?v= param before appending new one
  const baseUrl = cleanUrl.replace(/([?&])v=\d+/, '');
  const finalSep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${finalSep}v=${v}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

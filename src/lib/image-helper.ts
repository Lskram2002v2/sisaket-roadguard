/**
 * Helper utility to process image URLs including Google Drive direct links,
 * standard web URLs, and fallback assets.
 */

export function normalizeImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  // Handle Google Drive Links
  // Case 1: https://drive.google.com/file/d/{FILE_ID}/view...
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // Case 2: https://drive.google.com/open?id={FILE_ID} or ?id={FILE_ID}
  const driveIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1] && trimmed.includes('drive.google.com')) {
    const fileId = driveIdMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // Case 3: Google Drive uc direct link
  if (trimmed.includes('drive.google.com/uc?')) {
    const fileId = driveIdMatch ? driveIdMatch[1] : '';
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // Standard web URL (HTTP / HTTPS / Data URI)
  return trimmed;
}

export const FALLBACK_BANNER_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80';

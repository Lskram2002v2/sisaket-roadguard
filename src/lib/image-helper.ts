/**
 * Helper utility to process image URLs including Google Drive direct links,
 * Google Images search links, Base64 data URLs, standard web URLs, and fallback assets.
 */

export function normalizeImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim();

  // If already Base64 data URL, return as-is
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Handle Google Search result links (e.g., https://www.google.com/imgres?imgurl=https%3A%2F%2F... or google.co.th/imgres)
  if (trimmed.includes('google.') && trimmed.includes('imgres')) {
    try {
      const parsed = new URL(trimmed);
      const directImgUrl = parsed.searchParams.get('imgurl');
      if (directImgUrl) {
        return decodeURIComponent(directImgUrl);
      }
    } catch {
      const match = trimmed.match(/[?&]imgurl=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
  }

  // Handle Google Drive Links
  // Pattern 1: https://drive.google.com/file/d/{FILE_ID}/view...
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // Pattern 2: https://drive.google.com/open?id={FILE_ID} or ?id={FILE_ID}
  const driveIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1] && trimmed.includes('drive.google.com')) {
    const fileId = driveIdMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // Pattern 3: Google Drive uc direct link
  if (trimmed.includes('drive.google.com/uc?')) {
    const fileId = driveIdMatch ? driveIdMatch[1] : '';
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // Pattern 4: Google Docs drawing / image link
  if (trimmed.includes('docs.google.com/drawings/d/')) {
    const drawMatch = trimmed.match(/\/drawings\/d\/([a-zA-Z0-9_-]+)/);
    if (drawMatch && drawMatch[1]) {
      return `https://docs.google.com/drawings/d/${drawMatch[1]}/image`;
    }
  }

  // Standard web URL (HTTP / HTTPS)
  return trimmed;
}

export function isGoogleDriveUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  return rawUrl.includes('drive.google.com') || rawUrl.includes('lh3.googleusercontent.com/d/');
}

export function getGoogleDriveThumbnailUrl(fileIdOrUrl: string): string {
  const normalized = normalizeImageUrl(fileIdOrUrl);
  const match = normalized.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  }
  return normalized;
}

export const FALLBACK_BANNER_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80';

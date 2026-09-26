export interface AvatarOption {
  id: number;
  src: string;
  alt: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 1, src: '/avatars/avatar_1.png', alt: 'Avatar 1' },
  { id: 2, src: '/avatars/avatar_2.png', alt: 'Avatar 2' },
  { id: 3, src: '/avatars/avatar_3.png', alt: 'Avatar 3' },
  { id: 4, src: '/avatars/avatar_4.png', alt: 'Avatar 4' },
  { id: 5, src: '/avatars/avatar_5.png', alt: 'Avatar 5' },
  { id: 6, src: '/avatars/avatar_6.png', alt: 'Avatar 6' },
  { id: 7, src: '/avatars/avatar_7.png', alt: 'Avatar 7' },
  { id: 8, src: '/avatars/avatar_8.png', alt: 'Avatar 8' },
  { id: 9, src: '/avatars/avatar_9.png', alt: 'Avatar 9' },
  { id: 10, src: '/avatars/avatar_10.png', alt: 'Avatar 10' },
];

export const DEFAULT_AVATAR = '/avatars/avatar_1.png';

/**
 * Returns the proper URL for an avatar, taking Vite & Vercel base URL into account.
 */
export function getAvatarUrl(src?: string): string {
  if (!src) return '/avatars/avatar_1.png';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanSrc = src.startsWith('/') ? src : `/${src}`;
  return `${cleanBase}${cleanSrc}`;
}

/**
 * Checks if the avatar string is an image path or a legacy emoji
 */
export function isImageAvatar(avatar?: string): boolean {
  if (!avatar) return false;
  return (
    avatar.includes('/avatars/') ||
    avatar.endsWith('.png') ||
    avatar.endsWith('.jpg') ||
    avatar.endsWith('.jpeg') ||
    avatar.endsWith('.svg') ||
    avatar.endsWith('.webp') ||
    avatar.startsWith('http')
  );
}

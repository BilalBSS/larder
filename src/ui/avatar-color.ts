// / member palette tokens
export const AVATAR_COLORS = [
  '#B5532D',
  '#6F8654',
  '#8B5E3C',
  '#6B6395',
  '#A06B86',
  '#4A6B7A',
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

// / stable per-user color
export function deriveAvatarColor(userId: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? AVATAR_COLORS[0];
}

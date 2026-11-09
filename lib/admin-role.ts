export type AdminRole = 'superadmin' | 'moderator' | null;
export function getAdminRole(user: { email: string } | null, config: { ADMIN_EMAILS?: string; MODERATOR_EMAILS?: string }): AdminRole {
  if (!user) return null;
  const email = user.email.trim().toLowerCase();
  const list = (value?: string) => (value || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (list(config.ADMIN_EMAILS).includes(email)) return 'superadmin';
  if (list(config.MODERATOR_EMAILS).includes(email)) return 'moderator';
  return null;
}
export function canAdminAction(role: AdminRole, action: string): boolean {
  const moderation = ['approve', 'hide', 'resolve', 'deleteReview', 'banUser', 'unbanUser', 'blockIp', 'unblockIp'];
  const technical = ['restaurant', 'type', 'mergeType', 'mergeRestaurant'];
  return role === 'superadmin' ? [...moderation, ...technical].includes(action) : role === 'moderator' && moderation.includes(action);
}

// / map invite error
export function inviteMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code.includes('invite_expired')) return 'This invite has expired. Ask for a new one.';
  if (code.includes('invite_already_accepted')) return 'This invite has already been used.';
  if (code.includes('invite_not_found')) return 'We could not find that invite.';
  return 'Could not join. Check the link and try again.';
}

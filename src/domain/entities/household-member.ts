// / household member entity
export type MemberRole = 'owner' | 'member' | 'child';

export interface HouseholdMember {
  readonly userId: string;
  readonly role: MemberRole;
}

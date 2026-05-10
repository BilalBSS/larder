// / rls fixture helpers
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const ANON = process.env['SUPABASE_ANON_KEY'] ?? '';
const SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

export function rlsConfigured(): boolean {
  return ANON !== '' && SERVICE !== '';
}

function adminClient(): SupabaseClient {
  if (!rlsConfigured()) throw new Error('rls env unset');
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

export function anonClient(jwt?: string): SupabaseClient {
  if (!rlsConfigured()) throw new Error('rls env unset');
  return createClient(URL, ANON, {
    auth: { persistSession: false },
    global: jwt === undefined ? {} : { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

export interface RlsActor {
  readonly email: string;
  readonly user_id: string;
  readonly jwt: string;
  readonly household_id: string;
}

export interface RlsFixture {
  readonly a: RlsActor;
  readonly b: RlsActor;
  teardown(): Promise<void>;
}

let counter = 0;

async function makeUser(
  admin: SupabaseClient,
): Promise<{ email: string; password: string; user_id: string; jwt: string }> {
  counter += 1;
  const email = `rls-${Date.now()}-${counter}@example.test`;
  const password = `Pw-${Math.random().toString(36).slice(2, 14)}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null || created.data.user === null) {
    throw new Error(`createUser failed: ${created.error?.message ?? 'no user'}`);
  }
  const session = await anonClient().auth.signInWithPassword({ email, password });
  if (session.error !== null || session.data.session === null) {
    throw new Error(`signIn failed: ${session.error?.message ?? 'no session'}`);
  }
  return {
    email,
    password,
    user_id: created.data.user.id,
    jwt: session.data.session.access_token,
  };
}

async function seedHousehold(
  admin: SupabaseClient,
  user_id: string,
  name: string,
): Promise<string> {
  const household = await admin
    .from('households')
    .insert({ name, household_type: 'family', created_by_user_id: user_id })
    .select('id')
    .single();
  if (household.error !== null || household.data === null) {
    throw new Error(`household insert failed: ${household.error?.message ?? 'no row'}`);
  }
  const member = await admin.from('household_members').insert({
    household_id: household.data.id,
    user_id,
    role: 'owner',
  });
  if (member.error !== null) {
    throw new Error(`member insert failed: ${member.error.message}`);
  }
  await admin.from('pantry_items').insert({
    household_id: household.data.id,
    canonical_name: 'banana',
    display_name: 'Bananas',
    category: 'produce',
    quantity: 6,
    unit: 'each',
    created_by_user_id: user_id,
    updated_by_user_id: user_id,
  });
  return household.data.id;
}

export async function setupFixture(): Promise<RlsFixture> {
  const admin = adminClient();
  const userA = await makeUser(admin);
  const userB = await makeUser(admin);
  const householdA = await seedHousehold(admin, userA.user_id, `A-${userA.email}`);
  const householdB = await seedHousehold(admin, userB.user_id, `B-${userB.email}`);
  return {
    a: { email: userA.email, user_id: userA.user_id, jwt: userA.jwt, household_id: householdA },
    b: { email: userB.email, user_id: userB.user_id, jwt: userB.jwt, household_id: householdB },
    async teardown() {
      await admin.auth.admin.deleteUser(userA.user_id);
      await admin.auth.admin.deleteUser(userB.user_id);
    },
  };
}

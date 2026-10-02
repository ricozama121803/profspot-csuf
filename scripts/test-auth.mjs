// Backend smoke test for Supabase email/password auth (no frontend involved).
//   node --env-file=.env.local scripts/test-auth.mjs
// Requires TEST_EMAIL=you@gmail.com (an inbox you control; a +timestamp alias is added per run so each run is a fresh user).
// Creates one real user per run, and may send a confirmation email to that inbox. Delete test users in Supabase Dashboard > Authentication > Users.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const base = process.env.TEST_EMAIL;
if (!base?.includes('@')) {
  console.error('Set TEST_EMAIL to an inbox you control, e.g. TEST_EMAIL=you@gmail.com');
  process.exit(1);
}
const [local, domain] = base.split('@');
const email = `${local}+profspot${Date.now()}@${domain}`;
const password = 'Test-Passw0rd!' + Math.random().toString(36).slice(2, 8);
const newClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let failed = 0;
let skipped = 0;
const results = [];
const test = async (name, fn) => {
  try {
    const note = await fn();
    if (note === 'skip') { skipped++; results.push(`- SKIP ${name}`); } else results.push(`✓ PASS ${name}`);
  } catch (e) {
    failed++;
    results.push(`✗ FAIL ${name}: ${e.message}`);
  }
};
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

console.log(`Testing against ${url}\nUser: ${email}\n`);

const client = newClient();
let confirmationRequired = false;

await test('sign up with email + password', async () => {
  const { data, error } = await client.auth.signUp({ email, password });
  expect(!error, error?.message);
  expect(data.user?.email === email, 'no user returned');
  confirmationRequired = !data.session;
});

await test('sign up with a weak password is rejected', async () => {
  const { error } = await newClient().auth.signUp({ email: `${local}+weak${Date.now()}@${domain}`, password: '123' });
  expect(error, 'expected an error for a 3-char password');
});

await test('sign up with an invalid email is rejected', async () => {
  const { error } = await newClient().auth.signUp({ email: 'not-an-email', password });
  expect(error, 'expected an error for an invalid email');
});

await test('sign in with wrong password is rejected', async () => {
  const { data, error } = await newClient().auth.signInWithPassword({ email, password: password + 'x' });
  expect(error && !data.session, 'wrong password should not create a session');
});

let session;
await test('sign in with correct credentials', async () => {
  if (confirmationRequired) {
    // With "Confirm email" on, sign-in must fail until the user clicks the emailed link
    const { error } = await newClient().auth.signInWithPassword({ email, password });
    expect(error, 'unconfirmed user should not be able to sign in');
    console.log(`  (email confirmation is ON: confirm ${email} via the emailed link, or turn off\n   Auth > Providers > Email > "Confirm email" in Supabase to test the full flow)`);
    return 'skip';
  }
  const { data, error } = await newClient().auth.signInWithPassword({ email, password });
  expect(!error, error?.message);
  expect(data.session?.access_token, 'no access token');
  session = data.session;
});

await test('access token resolves to the user', async () => {
  if (!session) return 'skip';
  const { data, error } = await newClient().auth.getUser(session.access_token);
  expect(!error, error?.message);
  expect(data.user.email === email, 'token returned wrong user');
});

await test('garbage access token is rejected', async () => {
  const { data, error } = await newClient().auth.getUser('not.a.token');
  expect(error && !data.user, 'garbage token should be rejected');
});

await test('refresh token returns a new session', async () => {
  if (!session) return 'skip';
  const { data, error } = await newClient().auth.refreshSession({ refresh_token: session.refresh_token });
  expect(!error, error?.message);
  expect(data.session?.access_token, 'no new access token');
  session = data.session;
});

await test('duplicate sign up does not create a second account or leak existence', async () => {
  const { data, error } = await newClient().auth.signUp({ email, password });
  // Supabase returns an obfuscated user (no identities) rather than an error when confirmation is on
  expect(error || !data.session || data.user?.identities?.length === 0, 'duplicate sign up returned a live session');
});

await test('sign out invalidates the session', async () => {
  if (!session) return 'skip';
  const c = newClient();
  await c.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  const { error } = await c.auth.signOut();
  expect(!error, error?.message);
  const { data } = await newClient().auth.refreshSession({ refresh_token: session.refresh_token });
  expect(!data.session, 'refresh token still works after sign out');
});

console.log(results.join('\n'));
console.log(`\n${results.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);

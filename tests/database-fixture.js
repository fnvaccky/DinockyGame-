import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
export const USER_A = '10000000-0000-4000-8000-000000000001';
export const USER_B = '10000000-0000-4000-8000-000000000002';
export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261025061429_dinocky_accounts_shop.sql', import.meta.url), 'utf8'));
  await db.query(`insert into auth.users(id) values ($1), ($2)`, [USER_A, USER_B]);
  return db;
}
export async function asUser(db, id) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  await db.exec('set role authenticated');
}
export async function rpc(db, name, args = []) {
  const params = args.map((_, i) => `$${i + 1}`).join(',');
  return (await db.query(`select public.${name}(${params}) as value`, args)).rows[0].value;
}
export async function ageRun(db, runId, userId = USER_A) {
  await db.exec('reset role');
  await db.query(`update public.game_runs set started_at = now() - interval '120 seconds' where id=$1`, [runId]);
  await asUser(db, userId);
}

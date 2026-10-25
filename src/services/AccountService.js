import { createClient } from '@supabase/supabase-js';

export function createAccountClient() {
  const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
}

export class AccountService {
  constructor(client = createAccountClient()) { this.client = client; this.user = null; }
  requireClient() { if (!this.client) throw new Error('Accounts are being set up. Please try again soon.'); return this.client; }
  async session() { const { data, error } = await this.requireClient().auth.getSession(); if (error) throw error; this.user = data.session?.user || null; return data.session; }
  async login(email, password) { const { data, error } = await this.requireClient().auth.signInWithPassword({ email, password }); if (error) throw error; this.user = data.user; return data; }
  async signup(email, password, name) {
    const { data, error } = await this.requireClient().auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: location.origin + '/' } });
    if (error) throw error; return data;
  }
  async recover(email) { const { error } = await this.requireClient().auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/?recovery=1' }); if (error) throw error; }
  async changePassword(password) { const { error } = await this.requireClient().auth.updateUser({ password }); if (error) throw error; }
  async logout() { const { error } = await this.requireClient().auth.signOut(); if (error) throw error; this.user = null; }
  async rpc(name, args = {}) { const { data, error } = await this.requireClient().rpc(name, args); if (error) throw error; return data; }
  snapshot() { return this.rpc('game_snapshot'); }
  startRun() { return this.rpc('start_run'); }
  purchase(id) { return this.rpc('purchase_cosmetic', { p_item_id: id }); }
  equip(id) { return this.rpc('equip_cosmetic', { p_item_id: id }); }
  finishRun(result) { return this.rpc('finish_run', { p_run_id: result.runId, p_score: result.score, p_elapsed: result.elapsed, p_completed: result.completed }); }
}

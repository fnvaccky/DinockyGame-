/** Account-scoped durable retries. Never invent rewards while offline. */
export class RewardQueue {
  constructor(storage = globalThis.localStorage) { this.storage = storage; this.memory = new Map(); }
  key(userId) { return `dinocky:pending:${userId}`; }
  read(userId) {
    try {
      const raw = this.storage.getItem(this.key(userId));
      const parsed = raw ? JSON.parse(raw) : this.memory.get(userId) || [];
      return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.runId === 'string') : [];
    } catch { return this.memory.get(userId) || []; }
  }
  write(userId, items) { this.memory.set(userId, items); try { this.storage.setItem(this.key(userId), JSON.stringify(items)); } catch { /* Keep a session fallback when storage is full. */ } }
  add(userId, result) { const items = this.read(userId).filter(item => item.runId !== result.runId); items.push(result); this.write(userId, items); }
  async flush(userId, submit) {
    const saved = [];
    for (const result of this.read(userId)) {
      try {
        const receipt = await submit(result);
        this.write(userId, this.read(userId).filter(item => item.runId !== result.runId));
        saved.push({ ...receipt, runId: result.runId });
      } catch (error) {
        if (error.code === 'P0001') {
          this.write(userId, this.read(userId).filter(item => item.runId !== result.runId));
          saved.push({ runId: result.runId, rejected: error.message });
        } else break;
      }
    }
    return saved;
  }
}

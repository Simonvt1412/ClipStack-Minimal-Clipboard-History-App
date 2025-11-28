import DatabaseConstructor from 'better-sqlite3';

export type Entry = {
  id: number;
  content: string | null;
  timestamp: string;
  pinned: number;
  type: 'text' | 'image';
  imagePath: string | null;
};

const DEFAULT_MAX_HISTORY = 200;

export class Database {
  private db: any;
  private maxHistory: number | null = DEFAULT_MAX_HISTORY;

  constructor(filePath: string) {
    this.db = new DatabaseConstructor(filePath);
    this.setup();
  }

  private setup() {
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT,
          timestamp TEXT NOT NULL,
          pinned INTEGER NOT NULL DEFAULT 0,
          type TEXT NOT NULL DEFAULT 'text',
          imagePath TEXT
        )`
      )
      .run();

    // Settings table to persist simple key/value options like maxHistory
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )`
      )
      .run();

    // Load persisted maxHistory if available
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('maxHistory') as { value: string } | undefined;

    if (row) {
      const parsed = row.value === 'null' ? null : Number(row.value);
      if (parsed === null || Number.isFinite(parsed)) {
        this.setMaxHistory(parsed as number | null);
      }
    }
  }

  insertTextEntry(content: string) {
    const timestamp = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO entries (content, timestamp, pinned, type, imagePath) VALUES (?, ?, 0, ?, NULL)'
      )
      .run(content, timestamp, 'text');
    this.enforceHistoryLimit();
  }

  insertImageEntry(imagePath: string) {
    const timestamp = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO entries (content, timestamp, pinned, type, imagePath) VALUES (NULL, ?, 0, ?, ?)'
      )
      .run(timestamp, 'image', imagePath);
    this.enforceHistoryLimit();
  }

  private enforceHistoryLimit() {
    if (this.maxHistory === null) {
      return; // uncapped
    }
    // Count non-pinned entries
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM entries WHERE pinned = 0')
      .get() as { count: number };

    if (row.count <= this.maxHistory) {
      return;
    }

    const toDelete = row.count - this.maxHistory;

    // Delete the oldest non-pinned entries, keeping pinned entries intact
    this.db
      .prepare(
        'DELETE FROM entries WHERE id IN (SELECT id FROM entries WHERE pinned = 0 ORDER BY id ASC LIMIT ?)' 
      )
      .run(toDelete);
  }

  setMaxHistory(limit: number | null) {
    if (limit === null) {
      this.maxHistory = null;
      return;
    }
    if (!Number.isFinite(limit) || limit <= 0) {
      this.maxHistory = DEFAULT_MAX_HISTORY;
    } else {
      this.maxHistory = Math.floor(limit);
    }

    // Apply the new limit immediately to existing data.
    this.enforceHistoryLimit();

    // Persist the value in the settings table
    const value = this.maxHistory === null ? 'null' : String(this.maxHistory);
    this.db
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      .run('maxHistory', value);
  }

  getMaxHistory(): number | null {
    return this.maxHistory;
  }

  getEntries(query: string): Entry[] {
    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      return this.db
        .prepare(
          'SELECT * FROM entries WHERE (type = "image" OR content LIKE ?) ORDER BY pinned DESC, id DESC'
        )
        .all(q) as Entry[];
    }
    return this.db
      .prepare('SELECT * FROM entries ORDER BY pinned DESC, id DESC')
      .all() as Entry[];
  }

  deleteEntry(id: number) {
    this.db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  }

  togglePin(id: number) {
    this.db
      .prepare(
        'UPDATE entries SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END WHERE id = ?'
      )
      .run(id);
  }

  clearAll() {
    this.db.prepare('DELETE FROM entries').run();
  }
}

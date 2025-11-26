import DatabaseConstructor from 'better-sqlite3';

export type Entry = {
  id: number;
  content: string;
  timestamp: string;
  pinned: number;
};

export class Database {
  private db: any;

  constructor(filePath: string) {
    this.db = new DatabaseConstructor(filePath);
    this.setup();
  }

  private setup() {
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          pinned INTEGER NOT NULL DEFAULT 0
        )`
      )
      .run();
  }

  insertEntry(content: string) {
    const timestamp = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO entries (content, timestamp, pinned) VALUES (?, ?, 0)'
      )
      .run(content, timestamp);
  }

  getEntries(query: string): Entry[] {
    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      return this.db
        .prepare(
          'SELECT * FROM entries WHERE content LIKE ? ORDER BY pinned DESC, id DESC'
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

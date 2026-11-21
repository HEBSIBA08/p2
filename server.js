const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

const db = new sqlite3.Database('./internships.db');

// Helper functions for async/await
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

// Create table & seed initial data
async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      stipend INTEGER DEFAULT 0,
      mode TEXT DEFAULT 'remote',
      status TEXT DEFAULT 'open',
      description TEXT DEFAULT ''
    )
  `);

  const count = await get('SELECT COUNT(*) AS total FROM internships');
  if (count.total === 0) {
    await run(`
      INSERT INTO internships (title, company, location, stipend, mode, status, description)
      VALUES
        ('Backend Intern', 'Acme Labs', 'Remote', 20000, 'remote', 'open', 'Node.js API work'),
        ('Frontend Intern', 'BetaCorp', 'Bengaluru', 15000, 'hybrid', 'open', 'UI components'),
        ('QA Intern', 'GammaSoft', 'Remote', 12000, 'remote', 'closed', 'API testing')
    `);
  }
}

function validateBody(body) {
  const { title, company, location } = body;
  if (!title || !company || !location) {
    return 'title, company, and location are required';
  }
  return null;
}

// 1. List with pagination (?page=1&limit=10)
app.get('/api/internships', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const { total } = await get('SELECT COUNT(*) AS total FROM internships');
    const data = await all('SELECT * FROM internships LIMIT ? OFFSET ?', [limit, offset]);

    res.json({
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get single internship
app.get('/api/internships/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM internships WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create internship
app.post('/api/internships', async (req, res) => {
  try {
    const error = validateBody(req.body);
    if (error) return res.status(400).json({ success: false, error });

    const { title, company, location, stipend = 0, mode = 'remote', status = 'open', description = '' } = req.body;
    const result = await run(
      `INSERT INTO internships (title, company, location, stipend, mode, status, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, company, location, stipend, mode, status, description]
    );
    const created = await get('SELECT * FROM internships WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update internship
app.put('/api/internships/:id', async (req, res) => {
  try {
    const error = validateBody(req.body);
    if (error) return res.status(400).json({ success: false, error });

    const existing = await get('SELECT * FROM internships WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

    const {
      title,
      company,
      location,
      stipend = existing.stipend,
      mode = existing.mode,
      status = existing.status,
      description = existing.description
    } = req.body;

    await run(
      `UPDATE internships
       SET title = ?, company = ?, location = ?, stipend = ?, mode = ?, status = ?, description = ?
       WHERE id = ?`,
      [title, company, location, stipend, mode, status, description, req.params.id]
    );
    const updated = await get('SELECT * FROM internships WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete internship
app.delete('/api/internships/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM internships WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: { deletedId: Number(req.params.id) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
});
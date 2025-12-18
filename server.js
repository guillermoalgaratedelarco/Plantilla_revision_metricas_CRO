import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ============================================
// USUARIOS API
// ============================================

// Obtener todos los usuarios
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un usuario por ID
app.get('/api/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un usuario
app.post('/api/users', (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un usuario
app.put('/api/users/:id', (req, res) => {
  try {
    const { name, email } = req.body;
    const result = db.prepare('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?')
      .run(name, email, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un usuario
app.delete('/api/users/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TESTS API
// ============================================

// Obtener todos los tests
app.get('/api/tests', (req, res) => {
  try {
    const { user_id } = req.query;
    let query = `
      SELECT tests.*, users.name as user_name, users.email as user_email
      FROM tests
      LEFT JOIN users ON tests.user_id = users.id
    `;
    const params = [];
    
    if (user_id) {
      query += ' WHERE tests.user_id = ?';
      params.push(user_id);
    }
    
    query += ' ORDER BY tests.created_at DESC';
    
    const tests = db.prepare(query).all(...params);
    // Parsear JSON de metrics y checkbox_data
    const parsedTests = tests.map(test => ({
      ...test,
      metrics: JSON.parse(test.metrics || '[]'),
      checkbox_data: JSON.parse(test.checkbox_data || '{}')
    }));
    res.json(parsedTests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un test por ID
app.get('/api/tests/:id', (req, res) => {
  try {
    const test = db.prepare(`
      SELECT tests.*, users.name as user_name, users.email as user_email
      FROM tests
      LEFT JOIN users ON tests.user_id = users.id
      WHERE tests.id = ?
    `).get(req.params.id);
    
    if (!test) {
      return res.status(404).json({ error: 'Test no encontrado' });
    }
    
    res.json({
      ...test,
      metrics: JSON.parse(test.metrics || '[]'),
      checkbox_data: JSON.parse(test.checkbox_data || '{}')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un test
app.post('/api/tests', (req, res) => {
  try {
    const { user_id, experiment_name, variant_count, device_mode, metrics, checkbox_data } = req.body;
    
    if (!experiment_name) {
      return res.status(400).json({ error: 'El nombre del experimento es requerido' });
    }
    
    const result = db.prepare(`
      INSERT INTO tests (user_id, experiment_name, variant_count, device_mode, metrics, checkbox_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      user_id || null,
      experiment_name,
      variant_count || 1,
      device_mode || 'Desktop + Mobile',
      JSON.stringify(metrics || []),
      JSON.stringify(checkbox_data || {})
    );
    
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...test,
      metrics: JSON.parse(test.metrics || '[]'),
      checkbox_data: JSON.parse(test.checkbox_data || '{}')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un test
app.put('/api/tests/:id', (req, res) => {
  try {
    const { experiment_name, variant_count, device_mode, metrics, checkbox_data } = req.body;
    
    const existing = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Test no encontrado' });
    }
    
    const result = db.prepare(`
      UPDATE tests SET
        experiment_name = COALESCE(?, experiment_name),
        variant_count = COALESCE(?, variant_count),
        device_mode = COALESCE(?, device_mode),
        metrics = COALESCE(?, metrics),
        checkbox_data = COALESCE(?, checkbox_data)
      WHERE id = ?
    `).run(
      experiment_name,
      variant_count,
      device_mode,
      metrics ? JSON.stringify(metrics) : null,
      checkbox_data ? JSON.stringify(checkbox_data) : null,
      req.params.id
    );
    
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
    res.json({
      ...test,
      metrics: JSON.parse(test.metrics || '[]'),
      checkbox_data: JSON.parse(test.checkbox_data || '{}')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un test
app.delete('/api/tests/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM tests WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Test no encontrado' });
    }
    res.json({ message: 'Test eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
});


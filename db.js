import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'cro_metricas.db');
const db = new Database(dbPath);

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

// Crear tabla de usuarios
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crear tabla de tests/experimentos
db.exec(`
  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    experiment_name TEXT NOT NULL,
    variant_count INTEGER NOT NULL DEFAULT 1,
    device_mode TEXT NOT NULL DEFAULT 'Desktop + Mobile',
    metrics TEXT NOT NULL,
    checkbox_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Crear trigger para actualizar updated_at
db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_tests_timestamp
  AFTER UPDATE ON tests
  FOR EACH ROW
  BEGIN
    UPDATE tests SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
  END
`);

export default db;


// Script para crear usuarios de prueba
import db from './db.js';

const users = [
  { name: 'Guillermo Algárate', email: 'guillermo.algarate@flat101.es' },
];

const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)');

users.forEach(({ name, email }) => {
  try {
    insertUser.run(name, email);
    console.log(`✅ Usuario creado: ${name}`);
  } catch (error) {
    console.log(`⚠️ Usuario ya existe: ${name}`);
  }
});

console.log('\n📊 Usuarios en la base de datos:');
const allUsers = db.prepare('SELECT * FROM users').all();
console.table(allUsers);

process.exit(0);


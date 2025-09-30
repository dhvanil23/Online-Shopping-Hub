const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, name, role = 'customer' }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO "Users" (id, email, password, name, role, "isActive", "createdAt", "updatedAt") 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW()) 
      RETURNING id, email, name, role, "createdAt"
    `;
    
    const result = await db.query(query, [email, hashedPassword, name, role]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM "Users" WHERE email = $1 AND "isActive" = true';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, email, name, role, "createdAt" FROM "Users" WHERE id = $1 AND "isActive" = true';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async emailExists(email) {
    const query = 'SELECT id FROM "Users" WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows.length > 0;
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(id) {
    const query = 'UPDATE "Users" SET "lastLogin" = NOW() WHERE id = $1';
    await db.query(query, [id]);
  }
}

module.exports = User;
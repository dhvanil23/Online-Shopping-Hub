const db = require('../config/database');

class Product {
  static async findAll({ page = 1, limit = 20, search = '', category = '', sortBy = 'name', sortOrder = 'asc' }) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM "Products" WHERE "isActive" = true';
    let countQuery = 'SELECT COUNT(*) FROM "Products" WHERE "isActive" = true';
    let params = [];
    let paramCount = 0;
    
    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      countQuery += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Category filter
    if (category) {
      paramCount++;
      query += ` AND category ILIKE $${paramCount}`;
      countQuery += ` AND category ILIKE $${paramCount}`;
      params.push(`%${category}%`);
    }
    
    // Sorting
    const validSortFields = ['name', 'price', 'createdAt', 'category'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY "${sortField}" ${order} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), offset);

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, paramCount))
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    return {
      products: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        itemsPerPage: parseInt(limit)
      }
    };
  }

  static async findById(id) {
    const query = 'SELECT * FROM "Products" WHERE id = $1 AND "isActive" = true';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async create({ name, description, price, category, inventory, image }) {
    const query = `
      INSERT INTO "Products" (id, name, description, price, category, inventory, image, "isActive", "createdAt", "updatedAt") 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW()) 
      RETURNING *
    `;
    
    const result = await db.query(query, [name, description, parseFloat(price), category, parseInt(inventory) || 0, image]);
    return result.rows[0];
  }

  static async update(id, { name, description, price, category, inventory, image }) {
    const query = `
      UPDATE "Products" 
      SET name = $2, description = $3, price = $4, category = $5, inventory = $6, image = $7, "updatedAt" = NOW()
      WHERE id = $1 AND "isActive" = true
      RETURNING *
    `;
    
    const result = await db.query(query, [id, name, description, parseFloat(price), category, parseInt(inventory), image]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'UPDATE "Products" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1';
    await db.query(query, [id]);
  }

  static async updateInventory(id, quantity) {
    const query = 'UPDATE "Products" SET inventory = inventory - $2, "updatedAt" = NOW() WHERE id = $1 AND inventory >= $2';
    const result = await db.query(query, [id, quantity]);
    return result.rowCount > 0;
  }
}

module.exports = Product;
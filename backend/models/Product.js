const db = require('../config/database');

class Product {
  static async findAll({ cursor = null, limit = 20, search = '', category = '', minPrice = '', maxPrice = '', sortBy = 'createdAt', sortOrder = 'desc' }) {
    let query = 'SELECT * FROM "Products" WHERE "isActive" = true';
    let params = [];
    let paramCount = 0;
    
    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Category filter
    if (category) {
      paramCount++;
      query += ` AND category ILIKE $${paramCount}`;
      params.push(`%${category}%`);
    }
    
    // Price range filters
    if (minPrice) {
      paramCount++;
      query += ` AND price >= $${paramCount}`;
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice) {
      paramCount++;
      query += ` AND price <= $${paramCount}`;
      params.push(parseFloat(maxPrice));
    }
    
    // Cursor-based pagination
    const validSortFields = ['name', 'price', 'createdAt', 'category'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const operator = order === 'DESC' ? '<' : '>';
    
    if (cursor) {
      paramCount++;
      query += ` AND "${sortField}" ${operator} $${paramCount}`;
      params.push(cursor);
    }
    
    // Get one extra item to check if there are more
    query += ` ORDER BY "${sortField}" ${order} LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit) + 1);

    const result = await db.query(query, params);
    const products = result.rows;
    
    // Check if there are more items
    const hasMore = products.length > parseInt(limit);
    if (hasMore) {
      products.pop(); // Remove the extra item
    }
    
    // Get next cursor
    const nextCursor = products.length > 0 ? products[products.length - 1][sortField] : null;

    return {
      products,
      hasMore,
      nextCursor,
      count: products.length
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

  static async getTotalCount() {
    const query = 'SELECT COUNT(*) as total FROM "Products" WHERE "isActive" = true';
    const result = await db.query(query);
    return parseInt(result.rows[0].total);
  }
}

module.exports = Product;
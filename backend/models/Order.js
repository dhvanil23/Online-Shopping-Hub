const db = require('../config/database');

class Order {
  static async create({ userId, items, totalAmount, shippingAddress }) {
    const query = `
      INSERT INTO "Orders" (id, "userId", items, "totalAmount", status, "shippingAddress", "createdAt", "updatedAt") 
      VALUES (gen_random_uuid(), $1, $2, $3, 'pending', $4, NOW(), NOW()) 
      RETURNING *
    `;
    
    const result = await db.query(query, [userId, JSON.stringify(items), parseFloat(totalAmount), JSON.stringify(shippingAddress)]);
    return result.rows[0];
  }

  static async findByUserId(userId, { page = 1, limit = 10 } = {}) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const query = `
      SELECT * FROM "Orders" 
      WHERE "userId" = $1 
      ORDER BY "createdAt" DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = 'SELECT COUNT(*) FROM "Orders" WHERE "userId" = $1';
    
    const [result, countResult] = await Promise.all([
      db.query(query, [userId, parseInt(limit), offset]),
      db.query(countQuery, [userId])
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    return {
      orders: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        itemsPerPage: parseInt(limit)
      }
    };
  }

  static async findAll({ page = 1, limit = 10, status = null } = {}) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM "Orders"';
    let countQuery = 'SELECT COUNT(*) FROM "Orders"';
    let params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      countQuery += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY "createdAt" DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), offset);
    
    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2))
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    return {
      orders: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        itemsPerPage: parseInt(limit)
      }
    };
  }

  static async findById(id, userId = null) {
    let query = 'SELECT * FROM "Orders" WHERE id = $1';
    let params = [id];
    
    if (userId) {
      query += ' AND "userId" = $2';
      params.push(userId);
    }
    
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid order status');
    }
    
    const query = 'UPDATE "Orders" SET status = $2, "updatedAt" = NOW() WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id, status]);
    return result.rows[0];
  }

  static async getOrderStats() {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        SUM("totalAmount") as total_revenue
      FROM "Orders"
    `;
    
    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = Order;
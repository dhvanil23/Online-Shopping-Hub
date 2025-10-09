const db = require('../config/database');

class Review {
  static async create({ userId, productId, rating, comment }) {
    const query = `
      INSERT INTO "Reviews" (id, "userId", "productId", rating, comment, "createdAt", "updatedAt") 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()) 
      RETURNING *
    `;
    
    const result = await db.query(query, [userId, productId, rating, comment]);
    return result.rows[0];
  }

  static async findByProduct(productId) {
    const query = `
      SELECT r.*, u.name as "userName" 
      FROM "Reviews" r 
      JOIN "Users" u ON r."userId" = u.id 
      WHERE r."productId" = $1 
      ORDER BY r."createdAt" DESC
    `;
    
    const result = await db.query(query, [productId]);
    return result.rows;
  }

  static async getProductStats(productId) {
    const query = `
      SELECT 
        COUNT(*) as "totalReviews",
        COALESCE(AVG(rating), 0) as "averageRating",
        COUNT(CASE WHEN rating = 5 THEN 1 END) as "fiveStars",
        COUNT(CASE WHEN rating = 4 THEN 1 END) as "fourStars",
        COUNT(CASE WHEN rating = 3 THEN 1 END) as "threeStars",
        COUNT(CASE WHEN rating = 2 THEN 1 END) as "twoStars",
        COUNT(CASE WHEN rating = 1 THEN 1 END) as "oneStar"
      FROM "Reviews" 
      WHERE "productId" = $1
    `;
    
    const result = await db.query(query, [productId]);
    return result.rows[0] || {
      totalReviews: 0,
      averageRating: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0
    };
  }

  static async hasUserReviewed(userId, productId) {
    const query = 'SELECT id FROM "Reviews" WHERE "userId" = $1 AND "productId" = $2';
    const result = await db.query(query, [userId, productId]);
    return result.rows.length > 0;
  }

  static async update(id, userId, { rating, comment }) {
    const query = `
      UPDATE "Reviews" 
      SET rating = $3, comment = $4, "updatedAt" = NOW()
      WHERE id = $1 AND "userId" = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [id, userId, rating, comment]);
    return result.rows[0];
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM "Reviews" WHERE id = $1 AND "userId" = $2';
    const result = await db.query(query, [id, userId]);
    return result.rowCount > 0;
  }
}

module.exports = Review;
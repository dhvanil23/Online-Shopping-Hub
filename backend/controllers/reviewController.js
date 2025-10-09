const Review = require('../models/Review');
const redis = require('../config/redis');

class ReviewController {
  static async createReview(req, res) {
    try {
      const { productId, rating, comment } = req.body;
      const userId = req.user.id;

      // Check if user already reviewed this product
      const hasReviewed = await Review.hasUserReviewed(userId, productId);
      if (hasReviewed) {
        return res.status(400).json({
          success: false,
          error: 'You have already reviewed this product'
        });
      }

      const review = await Review.create({
        userId,
        productId,
        rating,
        comment: comment || null
      });

      // Clear product cache
      if (redis.isConnected()) {
        const keys = await redis.getClient().keys(`cache:/api/v1/products/${productId}*`);
        if (keys.length > 0) {
          await redis.getClient().del(keys);
        }
      }

      // Emit real-time notification
      if (req.io) {
        req.io.to(`product_${productId}`).emit('newReview', {
          productId,
          review: {
            ...review,
            userName: req.user.name
          }
        });
      }

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review added successfully'
      });
    } catch (error) {
      console.error('Create review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create review'
      });
    }
  }

  static async getProductReviews(req, res) {
    try {
      const { productId } = req.params;

      const [reviews, stats] = await Promise.all([
        Review.findByProduct(productId),
        Review.getProductStats(productId)
      ]);

      res.json({
        success: true,
        data: {
          reviews,
          stats: {
            totalReviews: parseInt(stats.totalReviews),
            averageRating: parseFloat(stats.averageRating) || 0,
            distribution: {
              5: parseInt(stats.fiveStars),
              4: parseInt(stats.fourStars),
              3: parseInt(stats.threeStars),
              2: parseInt(stats.twoStars),
              1: parseInt(stats.oneStar)
            }
          }
        },
        message: 'Reviews retrieved successfully'
      });
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews'
      });
    }
  }

  static async updateReview(req, res) {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.id;

      const review = await Review.update(id, userId, { rating, comment });
      
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found or unauthorized'
        });
      }

      res.json({
        success: true,
        data: review,
        message: 'Review updated successfully'
      });
    } catch (error) {
      console.error('Update review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update review'
      });
    }
  }

  static async deleteReview(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const deleted = await Review.delete(id, userId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Review not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      console.error('Delete review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete review'
      });
    }
  }
}

module.exports = ReviewController;
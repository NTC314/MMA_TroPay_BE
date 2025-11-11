const { Review, Room, User, Contract } = require('../models');
const logger = require('../utils/logger');

// @desc    Get feedback overview for owner
// @route   GET /api/feedback/overview
// @access  Private (Owner)
const getFeedbackOverview = async (req, res) => {
  try {
    const ownerId = req.user.id;
    
    // Get owner's rooms
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id);
    
    // Get all reviews for owner's properties
    const reviews = await Review.find({
      owner_id: ownerId
    })
    .populate('tenant_id', 'full_name avatar')
    .populate('room_id', 'code')
    .sort({ created_at: -1 });
    
    // Calculate statistics
    const totalReviews = reviews.length;
    let totalRating = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    const issueCounts = {};
    
    reviews.forEach(review => {
      totalRating += review.rating;
      
      if (review.sentiment === 'positive') {
        positiveCount++;
      } else if (review.sentiment === 'negative') {
        negativeCount++;
      }
      
      if (review.issues && review.issues.length > 0) {
        review.issues.forEach(issue => {
          issueCounts[issue] = (issueCounts[issue] || 0) + 1;
        });
      }
    });
    
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    const positivePercentage = totalReviews > 0 ? (positiveCount / totalReviews * 100).toFixed(1) : 0;
    const negativePercentage = totalReviews > 0 ? (negativeCount / totalReviews * 100).toFixed(1) : 0;
    
    // Get top common issues
    const commonIssues = Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue, count]) => ({
        name: issue,
        count,
        description: getIssueDescription(issue)
      }));
    
    // Get recent reviews (last 10)
    const recentReviews = reviews.slice(0, 10).map(review => ({
      id: review._id,
      tenant: {
        name: review.tenant_id.full_name,
        avatar: review.tenant_id.avatar
      },
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at
    }));
    
    const overviewData = {
      averageRating: averageRating.toFixed(1),
      totalReviews,
      positivePercentage: parseFloat(positivePercentage),
      negativePercentage: parseFloat(negativePercentage),
      commonIssues,
      recentReviews: recentReviews.slice(0, 3)
    };
    
    logger.info(`Owner ${ownerId} retrieved feedback overview`);
    
    res.json({
      success: true,
      message: 'Tổng quan phản hồi được lấy thành công',
      data: overviewData
    });
  } catch (error) {
    logger.error('Get feedback overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tổng quan phản hồi'
    });
  }
};

// @desc    Get all reviews for owner
// @route   GET /api/feedback/reviews
// @access  Private (Owner)
const getReviews = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created_at: -1 },
      populate: [
        {
          path: 'tenant_id',
          select: 'full_name avatar phone'
        },
        {
          path: 'room_id',
          select: 'code title'
        }
      ]
    };
    
    const reviews = await Review.paginate({ owner_id: ownerId }, options);
    
    // Format reviews for response
    const formattedReviews = reviews.docs.map(review => ({
      id: review._id,
      tenant: {
        name: review.tenant_id.full_name,
        avatar: review.tenant_id.avatar,
        phone: review.tenant_id.phone
      },
      room: {
        code: review.room_id.code,
        title: review.room_id.title
      },
      rating: review.rating,
      comment: review.comment,
      sentiment: review.sentiment,
      issues: review.issues,
      created_at: review.created_at
    }));
    
    logger.info(`Owner ${ownerId} retrieved reviews`);
    
    res.json({
      success: true,
      message: 'Danh sách đánh giá được lấy thành công',
      data: {
        reviews: formattedReviews,
        pagination: {
          currentPage: reviews.page,
          totalPages: reviews.totalPages,
          totalDocs: reviews.totalDocs,
          limit: reviews.limit
        }
      }
    });
  } catch (error) {
    logger.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá'
    });
  }
};

// Helper function to get issue description
function getIssueDescription(issue) {
  const descriptions = {
    'noise': 'Khách thuê phàn nàn về tiếng ồn từ hàng xóm hoặc đường phố',
    'hygiene': 'Phòng tắm và khu vực chung cần được làm sạch thường xuyên hơn',
    'wifi': 'Tốc độ internet chậm, kết nối không ổn định',
    'water': 'Nước máy không đủ áp lực hoặc chất lượng nước kém',
    'electricity': 'Điện yếu hoặc mất điện thường xuyên',
    'security': 'Vấn đề về an ninh, khóa cửa không an toàn',
    'furniture': 'Đồ đạc cũ hoặc hỏng cần thay mới'
  };
  
  return descriptions[issue.toLowerCase()] || 'Vấn đề khác';
}

module.exports = {
  getFeedbackOverview,
  getReviews
};






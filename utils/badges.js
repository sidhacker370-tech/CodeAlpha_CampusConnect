const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

/**
 * Checks and awards achievement badges to a user.
 * @param {string} userId - The ID of the user to check.
 * @returns {Promise<Array>} List of badges newly awarded in this check.
 */
const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const existingBadges = new Set(user.badges || []);
    const newBadges = [];

    // Fetch user posts
    const posts = await Post.find({ userId });
    
    // 1. First Post Badge
    if (posts.length >= 1 && !existingBadges.has('first-post')) {
      newBadges.push('first-post');
    }

    // 2. Resource Guru Badge (3 or more resource posts)
    const resourcePostsCount = posts.filter(p => {
      return p.resources && (
        (p.resources.pdfLink && p.resources.pdfLink.trim() !== '') ||
        (p.resources.githubRepo && p.resources.githubRepo.trim() !== '') ||
        (p.resources.codingResource && p.resources.codingResource.trim() !== '')
      );
    }).length;

    if (resourcePostsCount >= 3 && !existingBadges.has('resource-guru')) {
      newBadges.push('resource-guru');
    }

    // 3. 10 Likes Received Badge (sum of likes across all user's posts)
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes ? p.likes.length : 0), 0);
    if (totalLikes >= 10 && !existingBadges.has('ten-likes')) {
      newBadges.push('ten-likes');
    }

    // 4. Top Contributor Badge (at least 5 posts AND at least 10 comments written by the user)
    const commentsCount = await Comment.countDocuments({ userId });
    if (posts.length >= 5 && commentsCount >= 10 && !existingBadges.has('top-contributor')) {
      newBadges.push('top-contributor');
    }

    // If there are new badges, update the user
    if (newBadges.length > 0) {
      user.badges = [...user.badges, ...newBadges];
      await user.save();
    }

    return newBadges;
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
};

module.exports = { checkAndAwardBadges };

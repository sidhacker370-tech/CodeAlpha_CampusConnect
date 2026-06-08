const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../utils/badges');

// @route   POST /api/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/', protect, async (req, res) => {
  const { postId, commentText } = req.body;

  try {
    if (!postId || !commentText) {
      return res.status(400).json({ success: false, message: 'Post ID and comment text are required' });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await Comment.create({
      userId: req.user.id,
      postId,
      commentText
    });

    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name profilePicture college');

    // Trigger badge verification for the commenter (e.g. check top contributor badge)
    const newBadges = await checkAndAwardBadges(req.user.id);

    res.status(201).json({
      success: true,
      comment: populatedComment,
      newBadges // Returns newly earned badges to prompt user
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete own comment
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check ownership
    if (comment.userId.toString() !== req.user.id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

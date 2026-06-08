const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../utils/badges');

// @route   GET /api/posts
// @desc    Get all posts (Home Feed)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name profilePicture college')
      .populate({
        path: 'comments',
        options: { sort: { createdAt: 1 } },
        populate: {
          path: 'userId',
          select: 'name profilePicture college'
        }
      });

    res.json({ success: true, posts });
  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/posts
// @desc    Create a post
// @access  Private
router.post('/', protect, async (req, res) => {
  const { content, image, resources } = req.body;

  try {
    if (!content) {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    // Format resources object
    const postResources = {
      pdfLink: resources?.pdfLink || '',
      githubRepo: resources?.githubRepo || '',
      codingResource: resources?.codingResource || ''
    };

    const post = await Post.create({
      userId: req.user.id,
      content,
      image: image || '',
      resources: postResources
    });

    const populatedPost = await Post.findById(post._id).populate('userId', 'name profilePicture college');

    // Trigger badge verification for the poster
    const newBadges = await checkAndAwardBadges(req.user.id);

    res.status(201).json({
      success: true,
      post: populatedPost,
      newBadges // Returns newly earned badges to prompt user
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', 'name profilePicture college')
      .populate({
        path: 'comments',
        options: { sort: { createdAt: 1 } },
        populate: {
          path: 'userId',
          select: 'name profilePicture college'
        }
      });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (error) {
    console.error('Fetch single post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { content, image, resources } = req.body;

  try {
    let post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check post ownership
    if (post.userId.toString() !== req.user.id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to edit this post' });
    }

    // Update fields
    if (content) post.content = content;
    if (image !== undefined) post.image = image;
    
    if (resources) {
      post.resources = {
        pdfLink: resources.pdfLink !== undefined ? resources.pdfLink : post.resources.pdfLink,
        githubRepo: resources.githubRepo !== undefined ? resources.githubRepo : post.resources.githubRepo,
        codingResource: resources.codingResource !== undefined ? resources.codingResource : post.resources.codingResource
      };
    }

    await post.save();
    
    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'name profilePicture college')
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'name profilePicture college' }
      });

    // Check resource guru badges just in case resource links were added/removed
    const newBadges = await checkAndAwardBadges(req.user.id);

    res.json({ success: true, post: populatedPost, newBadges });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check ownership
    if (post.userId.toString() !== req.user.id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this post' });
    }

    // Delete post comments
    await Comment.deleteMany({ postId: post._id });

    // Delete post itself
    await Post.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Post and its comments deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like / unlike a post
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isLiked = post.likes.includes(req.user.id);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter((userId) => userId.toString() !== req.user.id.toString());
    } else {
      // Like
      post.likes.push(req.user.id);
    }

    await post.save();

    // Trigger badge verification for the post owner (e.g. 10 likes check)
    const postOwnerId = post.userId.toString();
    const newBadges = await checkAndAwardBadges(postOwnerId);

    res.json({
      success: true,
      likesCount: post.likes.length,
      likes: post.likes,
      isLiked: !isLiked,
      newBadges, // Contains new badges if earned by post owner
      postOwnerId
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

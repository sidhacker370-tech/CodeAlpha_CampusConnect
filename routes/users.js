const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../utils/badges');

// @route   GET /api/users
// @desc    Get all registered users for exploration
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Exclude current user from the list
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('-email -createdAt')
      .sort({ name: 1 });
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile details by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'name profilePicture college')
      .populate('following', 'name profilePicture college');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the current user is following this user
    const isFollowing = user.followers.some(
      (follower) => follower._id.toString() === req.user.id.toString()
    );

    // Fetch user's posts
    const posts = await Post.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate('userId', 'name profilePicture college');

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        profilePicture: user.profilePicture,
        bio: user.bio,
        skills: user.skills,
        followers: user.followers,
        following: user.following,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        badges: user.badges,
        isFollowing
      },
      posts
    });
  } catch (error) {
    console.error('Fetch single user profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile details
// @access  Private
router.put('/profile', protect, async (req, res) => {
  const { name, bio, skills, college, profilePicture } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (college) user.college = college;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    
    if (skills) {
      // Expecting array of strings or comma-separated string
      if (Array.isArray(skills)) {
        user.skills = skills.map(skill => skill.trim()).filter(Boolean);
      } else if (typeof skills === 'string') {
        user.skills = skills.split(',').map(skill => skill.trim()).filter(Boolean);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        profilePicture: user.profilePicture,
        bio: user.bio,
        skills: user.skills,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow/unfollow a user
// @access  Private
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.user.id.toString() === req.params.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already following
    const isFollowing = targetUser.followers.includes(currentUser._id);

    if (isFollowing) {
      // Unfollow
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUser._id.toString()
      );
    } else {
      // Follow
      targetUser.followers.push(currentUser._id);
      currentUser.following.push(targetUser._id);
    }

    await targetUser.save();
    await currentUser.save();

    res.json({
      success: true,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

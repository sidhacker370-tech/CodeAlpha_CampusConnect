const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Please add post content'],
    trim: true,
    maxlength: [1000, 'Content cannot be more than 1000 characters']
  },
  image: {
    type: String,
    default: ''
  },
  resources: {
    pdfLink: {
      type: String,
      trim: true,
      default: ''
    },
    githubRepo: {
      type: String,
      trim: true,
      default: ''
    },
    codingResource: {
      type: String,
      trim: true,
      default: ''
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual populate comments for a post
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
  justOne: false
});

// Ensure virtuals are included in JSON representation
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);

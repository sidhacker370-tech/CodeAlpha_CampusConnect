const { Document } = require('../config/db');

class Comment extends Document {
  static collection = 'comments';
  static schema = [
    'userId',
    'postId',
    'commentText'
  ];
}

module.exports = Comment;

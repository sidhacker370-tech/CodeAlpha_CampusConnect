const { Document } = require('../config/db');

class Post extends Document {
  static collection = 'posts';
  static schema = [
    'userId',
    'content',
    'image',
    'resources',
    'likes'
  ];
}

module.exports = Post;

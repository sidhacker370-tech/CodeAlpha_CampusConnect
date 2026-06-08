const { Document } = require('../config/db');

class User extends Document {
  static collection = 'users';
  static schema = [
    'name',
    'email',
    'password',
    'profilePicture',
    'bio',
    'skills',
    'college',
    'followers',
    'following',
    'badges'
  ];

  async matchPassword(enteredPassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(enteredPassword, this.password);
  }
}

module.exports = User;

/**
 * CampusConnect API client
 * Handles communication with the Node.js/Express REST backend.
 */
const API = (() => {
  const BASE_URL = ''; // Same host as frontend

  // Helper to construct headers with optional authorization token
  const getHeaders = (isJson = true) => {
    const headers = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Generic request handler
  const request = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...getHeaders(options.method !== 'GET'),
          ...(options.headers || {})
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error.message);
      return { success: false, message: error.message };
    }
  };

  return {
    // Auth Endpoints
    login: async (email, password) => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.success && res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    },

    register: async (name, email, password, college) => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, college })
      });
      if (res.success && res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    },

    getMe: async () => {
      const res = await request('/api/auth/me', { method: 'GET' });
      if (res.success && res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    // Posts Endpoints
    getPosts: async () => {
      return await request('/api/posts', { method: 'GET' });
    },

    createPost: async (content, image = '', resources = {}) => {
      return await request('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content, image, resources })
      });
    },

    getPostDetails: async (id) => {
      return await request(`/api/posts/${id}`, { method: 'GET' });
    },

    editPost: async (id, content, image = '', resources = {}) => {
      return await request(`/api/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content, image, resources })
      });
    },

    deletePost: async (id) => {
      return await request(`/api/posts/${id}`, { method: 'DELETE' });
    },

    likePost: async (id) => {
      return await request(`/api/posts/${id}/like`, { method: 'POST' });
    },

    // Comments Endpoints
    addComment: async (postId, commentText) => {
      return await request('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ postId, commentText })
      });
    },

    deleteComment: async (commentId) => {
      return await request(`/api/comments/${commentId}`, { method: 'DELETE' });
    },

    // Users & Profile Endpoints
    getAllUsers: async () => {
      return await request('/api/users', { method: 'GET' });
    },

    getUserProfile: async (id) => {
      return await request(`/api/users/${id}`, { method: 'GET' });
    },

    updateUserProfile: async (profileData) => {
      const res = await request('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
      if (res.success && res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    },

    followUser: async (id) => {
      return await request(`/api/users/${id}/follow`, { method: 'POST' });
    }
  };
})();

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout')
};

// User API
export const userAPI = {
  searchUsers: (query) => api.get(`/users/search?query=${query}`),
  sendFriendRequest: (friendId) => api.post('/users/friends/request', { friendId }),
  acceptFriendRequest: (friendshipId) => api.put(`/users/friends/accept/${friendshipId}`),
  getFriendRequests: () => api.get('/users/friends/requests'),
  getFriends: () => api.get('/users/friends'),
  removeFriend: (friendId) => api.delete(`/users/friends/${friendId}`)
};

// Message API
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getConversation: (userId, limit, before) => {
    let url = `/messages/conversation/${userId}?limit=${limit || 50}`;
    if (before) url += `&before=${before}`;
    return api.get(url);
  },
  sendMessage: (receiverId, content) => api.post('/messages/send', { receiverId, content }),
  markAsRead: (senderId) => api.put('/messages/read', { senderId }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`)
};

// Group API
export const groupAPI = {
  createGroup: (data) => api.post('/groups/create', data),
  getUserGroups: () => api.get('/groups'),
  getGroupDetails: (groupId) => api.get(`/groups/${groupId}`),
  getGroupMessages: (groupId, limit, before) => {
    let url = `/groups/${groupId}/messages?limit=${limit || 50}`;
    if (before) url += `&before=${before}`;
    return api.get(url);
  },
  sendGroupMessage: (groupId, content) => api.post('/groups/message', { groupId, content }),
  addGroupMember: (groupId, userId) => api.post('/groups/members/add', { groupId, userId }),
  removeGroupMember: (groupId, userId) => api.post('/groups/members/remove', { groupId, userId }),
  leaveGroup: (groupId) => api.delete(`/groups/${groupId}/leave`)
};

export default api;

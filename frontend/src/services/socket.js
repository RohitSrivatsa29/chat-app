import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on(event, callback) {
    if (!this.socket) return;
    
    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    this.socket.off(event, callback);
    
    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  // Message events
  sendMessage(receiverId, content) {
    this.emit('message:send', { receiverId, content });
  }

  onMessageReceive(callback) {
    this.on('message:receive', callback);
  }

  onMessageSent(callback) {
    this.on('message:sent', callback);
  }

  markAsRead(senderId) {
    this.emit('message:read', { senderId });
  }

  // Group message events
  sendGroupMessage(groupId, content) {
    this.emit('group:message:send', { groupId, content });
  }

  onGroupMessageReceive(callback) {
    this.on('group:message:receive', callback);
  }

  // Typing indicators
  startTyping(receiverId) {
    this.emit('typing:start', { receiverId });
  }

  stopTyping(receiverId) {
    this.emit('typing:stop', { receiverId });
  }

  onTypingStatus(callback) {
    this.on('typing:status', callback);
  }

  startGroupTyping(groupId) {
    this.emit('group:typing:start', { groupId });
  }

  stopGroupTyping(groupId) {
    this.emit('group:typing:stop', { groupId });
  }

  onGroupTypingStatus(callback) {
    this.on('group:typing:status', callback);
  }

  // Online status
  onUserOnline(callback) {
    this.on('user:online', callback);
  }

  // Friend requests
  sendFriendRequest(friendId) {
    this.emit('friend:request:send', { friendId });
  }

  acceptFriendRequest(friendshipId) {
    this.emit('friend:request:accept', { friendshipId });
  }

  onFriendRequestReceive(callback) {
    this.on('friend:request:receive', callback);
  }

  onFriendRequestAccepted(callback) {
    this.on('friend:request:accepted', callback);
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;

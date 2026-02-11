const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/firebase');

// Store online users and their socket IDs
const onlineUsers = new Map(); // userId -> socketId

/**
 * Initialize Socket.io with authentication and event handlers
 */
const initializeSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user in Firebase
      const db = getDatabase();
      const userSnapshot = await db.ref(`users/${decoded.userId}`).once('value');
      const user = userSnapshot.val();

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = {
        id: decoded.userId,
        ...user
      };
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);

    const db = getDatabase();

    // Store user's socket ID
    onlineUsers.set(socket.user.id, socket.id);

    // Update user's online status in Firebase
    await db.ref(`users/${socket.user.id}`).update({
      isOnline: true,
      lastSeen: Date.now()
    });

    // Broadcast user's online status to all connected clients
    io.emit('user:online', {
      userId: socket.user.id,
      isOnline: true
    });

    // Join user to their personal room (for direct messages)
    socket.join(socket.user.id);

    // Join user to all their group rooms
    const groupMembersSnapshot = await db.ref('groupMembers').orderByChild('userId').equalTo(socket.user.id).once('value');
    
    groupMembersSnapshot.forEach((childSnapshot) => {
      const membership = childSnapshot.val();
      socket.join(`group:${membership.groupId}`);
    });

    // Handle direct message
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content } = data;

        // Create message in Firebase
        const messageRef = db.ref('messages').push();
        const messageData = {
          senderId: socket.user.id,
          receiverId,
          content: content.trim(),
          isRead: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await messageRef.set(messageData);

        // Get sender data
        const senderSnapshot = await db.ref(`users/${socket.user.id}`).once('value');
        const sender = senderSnapshot.val();

        const message = {
          id: messageRef.key,
          ...messageData,
          sender: {
            id: socket.user.id,
            userId: sender.userId,
            username: sender.username,
            profilePicture: sender.profilePicture
          }
        };

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:receive', message);
        }

        // Send confirmation back to sender
        socket.emit('message:sent', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    // Handle group message
    socket.on('group:message:send', async (data) => {
      try {
        const { groupId, content } = data;

        // Verify membership
        const membershipsSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');
        
        let isMember = false;
        membershipsSnapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().userId === socket.user.id) {
            isMember = true;
          }
        });

        if (!isMember) {
          socket.emit('message:error', { error: 'Not a member of this group' });
          return;
        }

        // Create message in Firebase
        const messageRef = db.ref('messages').push();
        const messageData = {
          senderId: socket.user.id,
          groupId,
          content: content.trim(),
          isRead: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await messageRef.set(messageData);

        // Update group timestamp
        await db.ref(`groups/${groupId}`).update({
          updatedAt: Date.now()
        });

        // Get sender data
        const senderSnapshot = await db.ref(`users/${socket.user.id}`).once('value');
        const sender = senderSnapshot.val();

        const message = {
          id: messageRef.key,
          ...messageData,
          sender: {
            id: socket.user.id,
            userId: sender.userId,
            username: sender.username,
            profilePicture: sender.profilePicture
          }
        };

        // Broadcast to all group members
        io.to(`group:${groupId}`).emit('group:message:receive', message);
      } catch (error) {
        console.error('Error sending group message:', error);
        socket.emit('message:error', { error: 'Failed to send group message' });
      }
    });

    // Handle typing indicator for direct messages
    socket.on('typing:start', (data) => {
      const { receiverId } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing:status', {
          userId: socket.user.id,
          isTyping: true
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { receiverId } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing:status', {
          userId: socket.user.id,
          isTyping: false
        });
      }
    });

    // Handle typing indicator for groups
    socket.on('group:typing:start', (data) => {
      const { groupId } = data;
      socket.to(`group:${groupId}`).emit('group:typing:status', {
        groupId,
        userId: socket.user.id,
        username: socket.user.username,
        isTyping: true
      });
    });

    socket.on('group:typing:stop', (data) => {
      const { groupId } = data;
      socket.to(`group:${groupId}`).emit('group:typing:status', {
        groupId,
        userId: socket.user.id,
        username: socket.user.username,
        isTyping: false
      });
    });

    // Handle mark as read
    socket.on('message:read', async (data) => {
      try {
        const { senderId } = data;

        const messagesSnapshot = await db.ref('messages').once('value');
        const updates = {};

        messagesSnapshot.forEach((childSnapshot) => {
          const message = childSnapshot.val();
          
          if (message.senderId === senderId &&
              message.receiverId === socket.user.id &&
              !message.isRead) {
            updates[`messages/${childSnapshot.key}/isRead`] = true;
          }
        });

        if (Object.keys(updates).length > 0) {
          await db.ref().update(updates);
        }

        // Notify sender
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read:confirm', {
            readerId: socket.user.id
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle friend request
    socket.on('friend:request:send', async (data) => {
      try {
        const { friendId } = data;
        
        const friendshipRef = db.ref('friendships').push();
        const friendshipData = {
          userId: socket.user.id,
          friendId,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await friendshipRef.set(friendshipData);

        // Get user data
        const userSnapshot = await db.ref(`users/${socket.user.id}`).once('value');
        const user = userSnapshot.val();

        const friendship = {
          id: friendshipRef.key,
          ...friendshipData,
          user: {
            id: socket.user.id,
            userId: user.userId,
            username: user.username,
            profilePicture: user.profilePicture
          }
        };

        // Notify friend if online
        const friendSocketId = onlineUsers.get(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend:request:receive', friendship);
        }

        socket.emit('friend:request:sent', friendship);
      } catch (error) {
        console.error('Error sending friend request:', error);
        socket.emit('friend:request:error', { error: 'Failed to send friend request' });
      }
    });

    // Handle friend request acceptance
    socket.on('friend:request:accept', async (data) => {
      try {
        const { friendshipId } = data;

        await db.ref(`friendships/${friendshipId}`).update({
          status: 'ACCEPTED',
          updatedAt: Date.now()
        });

        const friendshipSnapshot = await db.ref(`friendships/${friendshipId}`).once('value');
        const friendship = friendshipSnapshot.val();

        // Get both users' data
        const userSnapshot = await db.ref(`users/${friendship.userId}`).once('value');
        const friendSnapshot = await db.ref(`users/${friendship.friendId}`).once('value');
        
        const user = userSnapshot.val();
        const friend = friendSnapshot.val();

        const friendshipData = {
          id: friendshipId,
          ...friendship,
          user: {
            id: friendship.userId,
            userId: user.userId,
            username: user.username,
            profilePicture: user.profilePicture,
            isOnline: user.isOnline
          },
          friend: {
            id: friendship.friendId,
            userId: friend.userId,
            username: friend.username,
            profilePicture: friend.profilePicture,
            isOnline: friend.isOnline
          }
        };

        // Notify the requester
        const requesterSocketId = onlineUsers.get(friendship.userId);
        if (requesterSocketId) {
          io.to(requesterSocketId).emit('friend:request:accepted', friendshipData);
        }

        socket.emit('friend:request:accepted', friendshipData);
      } catch (error) {
        console.error('Error accepting friend request:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username}`);

      // Remove from online users
      onlineUsers.delete(socket.user.id);

      // Update user's online status in Firebase
      await db.ref(`users/${socket.user.id}`).update({
        isOnline: false,
        lastSeen: Date.now()
      });

      // Broadcast user's offline status
      io.emit('user:online', {
        userId: socket.user.id,
        isOnline: false
      });
    });
  });

  console.log('✅ Socket.io initialized');
};

module.exports = { initializeSocket };

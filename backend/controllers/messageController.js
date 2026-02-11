const { getDatabase } = require('../config/firebase');

/**
 * Get conversation history with a specific user
 */
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const db = getDatabase();
    const messagesSnapshot = await db.ref('messages').once('value');

    const messages = [];

    messagesSnapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      
      // Get messages between current user and target user (direct messages only)
      if (!message.groupId &&
          ((message.senderId === req.user.id && message.receiverId === userId) ||
           (message.senderId === userId && message.receiverId === req.user.id))) {
        messages.push({
          id: childSnapshot.key,
          ...message
        });
      }
    });

    // Sort by creation date
    messages.sort((a, b) => a.createdAt - b.createdAt);

    // Limit results
    const limitedMessages = messages.slice(-parseInt(limit));

    // Get sender info for each message
    const messagesWithSender = await Promise.all(
      limitedMessages.map(async (message) => {
        const senderSnapshot = await db.ref(`users/${message.senderId}`).once('value');
        const sender = senderSnapshot.val();

        return {
          ...message,
          sender: {
            id: message.senderId,
            userId: sender?.userId,
            username: sender?.username,
            profilePicture: sender?.profilePicture
          }
        };
      })
    );

    res.json({ messages: messagesWithSender });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Server error fetching conversation' });
  }
};

/**
 * Send a direct message
 */
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const db = getDatabase();

    // Check if receiver exists
    const receiverSnapshot = await db.ref(`users/${receiverId}`).once('value');
    if (!receiverSnapshot.exists()) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create message
    const messageRef = db.ref('messages').push();
    const messageData = {
      senderId: req.user.id,
      receiverId,
      content: content.trim(),
      isRead: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await messageRef.set(messageData);

    // Get sender data
    const senderSnapshot = await db.ref(`users/${req.user.id}`).once('value');
    const sender = senderSnapshot.val();

    res.status(201).json({
      message: {
        id: messageRef.key,
        ...messageData,
        sender: {
          id: req.user.id,
          userId: sender.userId,
          username: sender.username,
          profilePicture: sender.profilePicture
        }
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error sending message' });
  }
};

/**
 * Mark messages as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({ error: 'Sender ID is required' });
    }

    const db = getDatabase();
    const messagesSnapshot = await db.ref('messages').once('value');

    const updates = {};

    messagesSnapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      
      if (message.senderId === senderId &&
          message.receiverId === req.user.id &&
          !message.isRead) {
        updates[`messages/${childSnapshot.key}/isRead`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Server error marking messages as read' });
  }
};

/**
 * Get all conversations (list of users with last message)
 */
exports.getConversations = async (req, res) => {
  try {
    const db = getDatabase();
    const messagesSnapshot = await db.ref('messages').once('value');

    const conversationsMap = new Map();

    messagesSnapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      
      // Only direct messages
      if (!message.groupId &&
          (message.senderId === req.user.id || message.receiverId === req.user.id)) {
        
        const partnerId = message.senderId === req.user.id ? message.receiverId : message.senderId;
        
        // Keep only the latest message for each partner
        if (!conversationsMap.has(partnerId) ||
            message.createdAt > conversationsMap.get(partnerId).lastMessage.createdAt) {
          conversationsMap.set(partnerId, {
            partnerId,
            lastMessage: {
              id: childSnapshot.key,
              ...message
            }
          });
        }
      }
    });

    // Get user data and unread count for each conversation
    const conversations = await Promise.all(
      Array.from(conversationsMap.values()).map(async (conv) => {
        const userSnapshot = await db.ref(`users/${conv.partnerId}`).once('value');
        const user = userSnapshot.val();

        // Count unread messages
        let unreadCount = 0;
        messagesSnapshot.forEach((childSnapshot) => {
          const msg = childSnapshot.val();
          if (msg.senderId === conv.partnerId &&
              msg.receiverId === req.user.id &&
              !msg.isRead) {
            unreadCount++;
          }
        });

        return {
          user: {
            id: conv.partnerId,
            userId: user.userId,
            username: user.username,
            profilePicture: user.profilePicture,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          },
          lastMessage: conv.lastMessage,
          unreadCount
        };
      })
    );

    // Sort by last message timestamp
    conversations.sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error fetching conversations' });
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const db = getDatabase();

    // Find message
    const messageSnapshot = await db.ref(`messages/${messageId}`).once('value');

    if (!messageSnapshot.exists()) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageSnapshot.val();

    // Only sender can delete
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    await db.ref(`messages/${messageId}`).remove();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error deleting message' });
  }
};

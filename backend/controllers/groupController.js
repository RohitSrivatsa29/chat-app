const { getDatabase } = require('../config/firebase');

/**
 * Create a new group
 */
exports.createGroup = async (req, res) => {
  try {
    const { name, description, memberIds = [] } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const db = getDatabase();

    // Create group
    const groupRef = db.ref('groups').push();
    const groupData = {
      name: name.trim(),
      description: description?.trim() || null,
      creatorId: req.user.id,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=random&size=200`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await groupRef.set(groupData);

    // Add creator as admin
    const creatorMemberRef = db.ref('groupMembers').push();
    await creatorMemberRef.set({
      groupId: groupRef.key,
      userId: req.user.id,
      role: 'ADMIN',
      joinedAt: Date.now()
    });

    // Add additional members
    const uniqueMemberIds = [...new Set(memberIds)].filter(id => id !== req.user.id);
    
    for (const memberId of uniqueMemberIds) {
      const memberRef = db.ref('groupMembers').push();
      await memberRef.set({
        groupId: groupRef.key,
        userId: memberId,
        role: 'MEMBER',
        joinedAt: Date.now()
      });
    }

    // Get complete group data with members
    const groupWithMembers = await getGroupWithMembers(groupRef.key);

    res.status(201).json({
      message: 'Group created successfully',
      group: groupWithMembers
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error creating group' });
  }
};

/**
 * Helper function to get group with members
 */
const getGroupWithMembers = async (groupId) => {
  const db = getDatabase();
  
  const groupSnapshot = await db.ref(`groups/${groupId}`).once('value');
  const group = groupSnapshot.val();

  const membersSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');
  
  const members = [];
  for (const [memberId, memberData] of Object.entries(membersSnapshot.val() || {})) {
    const userSnapshot = await db.ref(`users/${memberData.userId}`).once('value');
    const user = userSnapshot.val();

    members.push({
      id: memberId,
      ...memberData,
      user: {
        id: memberData.userId,
        userId: user.userId,
        username: user.username,
        profilePicture: user.profilePicture,
        isOnline: user.isOnline
      }
    });
  }

  const creatorSnapshot = await db.ref(`users/${group.creatorId}`).once('value');
  const creator = creatorSnapshot.val();

  return {
    id: groupId,
    ...group,
    members,
    creator: {
      id: group.creatorId,
      userId: creator.userId,
      username: creator.username
    }
  };
};

/**
 * Get user's groups
 */
exports.getUserGroups = async (req, res) => {
  try {
    const db = getDatabase();
    
    // Get all group memberships for the user
    const membershipsSnapshot = await db.ref('groupMembers').orderByChild('userId').equalTo(req.user.id).once('value');

    const groups = [];

    for (const [membershipId, membership] of Object.entries(membershipsSnapshot.val() || {})) {
      const groupData = await getGroupWithMembers(membership.groupId);
      
      // Get last message
      const messagesSnapshot = await db.ref('messages').orderByChild('groupId').equalTo(membership.groupId).once('value');
      const messages = [];
      
      messagesSnapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        messages.push({
          id: childSnapshot.key,
          ...message
        });
      });

      messages.sort((a, b) => b.createdAt - a.createdAt);

      // Get sender info for last message
      let lastMessageWithSender = null;
      if (messages.length > 0) {
        const lastMessage = messages[0];
        const senderSnapshot = await db.ref(`users/${lastMessage.senderId}`).once('value');
        const sender = senderSnapshot.val();
        
        lastMessageWithSender = {
          ...lastMessage,
          sender: {
            username: sender?.username
          }
        };
      }

      // Count unread messages
      let unreadCount = 0;
      messages.forEach(msg => {
        if (msg.senderId !== req.user.id && !msg.isRead) {
          unreadCount++;
        }
      });

      groups.push({
        ...groupData,
        messages: lastMessageWithSender ? [lastMessageWithSender] : [],
        unreadCount
      });
    }

    // Sort by updated time
    groups.sort((a, b) => b.updatedAt - a.updatedAt);

    res.json({ groups });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Server error fetching groups' });
  }
};

/**
 * Get group details
 */
exports.getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify user is a member
    const db = getDatabase();
    const membershipsSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');

    let isMember = false;
    membershipsSnapshot.forEach((childSnapshot) => {
      if (childSnapshot.val().userId === req.user.id) {
        isMember = true;
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const group = await getGroupWithMembers(groupId);

    res.json({ group });
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ error: 'Server error fetching group details' });
  }
};

/**
 * Get group messages
 */
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50 } = req.query;

    const db = getDatabase();

    // Verify user is a member
    const membershipsSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');
    
    let isMember = false;
    membershipsSnapshot.forEach((childSnapshot) => {
      if (childSnapshot.val().userId === req.user.id) {
        isMember = true;
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get messages
    const messagesSnapshot = await db.ref('messages').orderByChild('groupId').equalTo(groupId).once('value');

    const messages = [];
    messagesSnapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Sort by creation time
    messages.sort((a, b) => a.createdAt - b.createdAt);

    // Limit results
    const limitedMessages = messages.slice(-parseInt(limit));

    // Get sender info
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
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Server error fetching group messages' });
  }
};

/**
 * Send group message
 */
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId, content } = req.body;

    if (!groupId || !content) {
      return res.status(400).json({ error: 'Group ID and content are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const db = getDatabase();

    // Verify user is a member
    const membershipsSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');
    
    let isMember = false;
    membershipsSnapshot.forEach((childSnapshot) => {
      if (childSnapshot.val().userId === req.user.id) {
        isMember = true;
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Create message
    const messageRef = db.ref('messages').push();
    const messageData = {
      senderId: req.user.id,
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
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Server error sending group message' });
  }
};

/**
 * Add member to group
 */
exports.addGroupMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({ error: 'Group ID and user ID are required' });
    }

    const db = getDatabase();

    // Verify current user is admin
    const membershipsSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');
    
    let isAdmin = false;
    let userAlreadyMember = false;

    membershipsSnapshot.forEach((childSnapshot) => {
      const membership = childSnapshot.val();
      if (membership.userId === req.user.id && membership.role === 'ADMIN') {
        isAdmin = true;
      }
      if (membership.userId === userId) {
        userAlreadyMember = true;
      }
    });

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    if (userAlreadyMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member
    const memberRef = db.ref('groupMembers').push();
    const memberData = {
      groupId,
      userId,
      role: 'MEMBER',
      joinedAt: Date.now()
    };

    await memberRef.set(memberData);

    // Get user data
    const userSnapshot = await db.ref(`users/${userId}`).once('value');
    const user = userSnapshot.val();

    res.status(201).json({
      message: 'Member added successfully',
      member: {
        id: memberRef.key,
        ...memberData,
        user: {
          id: userId,
          userId: user.userId,
          username: user.username,
          profilePicture: user.profilePicture,
          isOnline: user.isOnline
        }
      }
    });
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json({ error: 'Server error adding member' });
  }
};

/**
 * Remove member from group
 */
exports.removeGroupMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({ error: 'Group ID and user ID are required' });
    }

    const db = getDatabase();

    // Verify current user is admin or removing themselves
    const membershipsSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');
    
    let isAdmin = false;
    let membershipIdToRemove = null;

    membershipsSnapshot.forEach((childSnapshot) => {
      const membership = childSnapshot.val();
      if (membership.userId === req.user.id && membership.role === 'ADMIN') {
        isAdmin = true;
      }
      if (membership.userId === userId) {
        membershipIdToRemove = childSnapshot.key;
      }
    });

    if (!isAdmin && req.user.id !== userId) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    if (!membershipIdToRemove) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await db.ref(`groupMembers/${membershipIdToRemove}`).remove();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({ error: 'Server error removing member' });
  }
};

/**
 * Leave group
 */
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const db = getDatabase();

    const membershipsSnapshot = await db.ref('groupMembers').orderByChild('groupId').equalTo(groupId).once('value');
    
    let membershipIdToRemove = null;

    membershipsSnapshot.forEach((childSnapshot) => {
      const membership = childSnapshot.val();
      if (membership.userId === req.user.id) {
        membershipIdToRemove = childSnapshot.key;
      }
    });

    if (!membershipIdToRemove) {
      return res.status(404).json({ error: 'Not a member of this group' });
    }

    await db.ref(`groupMembers/${membershipIdToRemove}`).remove();

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Server error leaving group' });
  }
};

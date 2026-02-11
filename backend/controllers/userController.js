const { getDatabase } = require('../config/firebase');

/**
 * Search users by user ID or username
 */
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const db = getDatabase();
    const usersSnapshot = await db.ref('users').once('value');
    
    const users = [];
    const queryLower = query.toLowerCase();

    usersSnapshot.forEach((childSnapshot) => {
      const userId = childSnapshot.key;
      const user = childSnapshot.val();

      // Exclude current user and match query
      if (userId !== req.user.id &&
          (user.userId?.toLowerCase().includes(queryLower) ||
           user.username?.toLowerCase().includes(queryLower))) {
        users.push({
          id: userId,
          userId: user.userId,
          username: user.username,
          profilePicture: user.profilePicture,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen
        });
      }
    });

    // Limit to 20 results
    res.json({ users: users.slice(0, 20) });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Server error searching users' });
  }
};

/**
 * Send friend request
 */
exports.sendFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    if (friendId === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const db = getDatabase();

    // Check if friend exists
    const friendSnapshot = await db.ref(`users/${friendId}`).once('value');
    if (!friendSnapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const friendshipsSnapshot = await db.ref('friendships').once('value');
    let existingFriendship = null;

    friendshipsSnapshot.forEach((childSnapshot) => {
      const friendship = childSnapshot.val();
      if ((friendship.userId === req.user.id && friendship.friendId === friendId) ||
          (friendship.userId === friendId && friendship.friendId === req.user.id)) {
        existingFriendship = friendship;
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Friendship request already exists' });
    }

    // Create friendship request
    const friendshipRef = db.ref('friendships').push();
    const friendshipData = {
      userId: req.user.id,
      friendId,
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await friendshipRef.set(friendshipData);

    // Get friend data
    const friend = friendSnapshot.val();

    res.status(201).json({
      message: 'Friend request sent successfully',
      friendship: {
        id: friendshipRef.key,
        ...friendshipData,
        friend: {
          id: friendId,
          userId: friend.userId,
          username: friend.username,
          profilePicture: friend.profilePicture,
          isOnline: friend.isOnline
        }
      }
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Server error sending friend request' });
  }
};

/**
 * Accept friend request
 */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;

    const db = getDatabase();

    // Find friendship request
    const friendshipSnapshot = await db.ref(`friendships/${friendshipId}`).once('value');

    if (!friendshipSnapshot.exists()) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const friendship = friendshipSnapshot.val();

    // Verify the request is for the current user
    if (friendship.friendId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to accept this request' });
    }

    // Update friendship status
    await db.ref(`friendships/${friendshipId}`).update({
      status: 'ACCEPTED',
      updatedAt: Date.now()
    });

    // Get requester data
    const userSnapshot = await db.ref(`users/${friendship.userId}`).once('value');
    const user = userSnapshot.val();

    res.json({
      message: 'Friend request accepted',
      friendship: {
        id: friendshipId,
        ...friendship,
        status: 'ACCEPTED',
        user: {
          id: friendship.userId,
          userId: user.userId,
          username: user.username,
          profilePicture: user.profilePicture,
          isOnline: user.isOnline
        }
      }
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Server error accepting friend request' });
  }
};

/**
 * Get friend requests (pending)
 */
exports.getFriendRequests = async (req, res) => {
  try {
    const db = getDatabase();
    const friendshipsSnapshot = await db.ref('friendships').once('value');

    const requests = [];

    for (const [id, friendship] of Object.entries(friendshipsSnapshot.val() || {})) {
      if (friendship.friendId === req.user.id && friendship.status === 'PENDING') {
        // Get requester user data
        const userSnapshot = await db.ref(`users/${friendship.userId}`).once('value');
        const user = userSnapshot.val();

        requests.push({
          id,
          ...friendship,
          user: {
            id: friendship.userId,
            userId: user.userId,
            username: user.username,
            profilePicture: user.profilePicture,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          }
        });
      }
    }

    // Sort by creation date
    requests.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Server error fetching friend requests' });
  }
};

/**
 * Get friends list
 */
exports.getFriends = async (req, res) => {
  try {
    const db = getDatabase();
    const friendshipsSnapshot = await db.ref('friendships').once('value');

    const friends = [];

    for (const [id, friendship] of Object.entries(friendshipsSnapshot.val() || {})) {
      if (friendship.status === 'ACCEPTED' &&
          (friendship.userId === req.user.id || friendship.friendId === req.user.id)) {
        
        // Get friend ID (the other user in the friendship)
        const friendId = friendship.userId === req.user.id ? friendship.friendId : friendship.userId;
        
        // Get friend data
        const friendSnapshot = await db.ref(`users/${friendId}`).once('value');
        const friend = friendSnapshot.val();

        if (friend) {
          friends.push({
            id: friendId,
            userId: friend.userId,
            username: friend.username,
            profilePicture: friend.profilePicture,
            isOnline: friend.isOnline,
            lastSeen: friend.lastSeen
          });
        }
      }
    }

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Server error fetching friends' });
  }
};

/**
 * Remove friend
 */
exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    const db = getDatabase();
    const friendshipsSnapshot = await db.ref('friendships').once('value');

    let friendshipIdToRemove = null;

    friendshipsSnapshot.forEach((childSnapshot) => {
      const friendship = childSnapshot.val();
      if ((friendship.userId === req.user.id && friendship.friendId === friendId) ||
          (friendship.userId === friendId && friendship.friendId === req.user.id)) {
        friendshipIdToRemove = childSnapshot.key;
      }
    });

    if (!friendshipIdToRemove) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    await db.ref(`friendships/${friendshipIdToRemove}`).remove();

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Server error removing friend' });
  }
};

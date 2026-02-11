const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// User search and friend management
router.get('/search', userController.searchUsers);
router.post('/friends/request', userController.sendFriendRequest);
router.put('/friends/accept/:friendshipId', userController.acceptFriendRequest);
router.get('/friends/requests', userController.getFriendRequests);
router.get('/friends', userController.getFriends);
router.delete('/friends/:friendId', userController.removeFriend);

module.exports = router;

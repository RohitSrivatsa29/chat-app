const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Direct messaging
router.get('/conversations', messageController.getConversations);
router.get('/conversation/:userId', messageController.getConversation);
router.post('/send', messageController.sendMessage);
router.put('/read', messageController.markAsRead);
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;

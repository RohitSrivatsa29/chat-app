const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Group management
router.post('/create', groupController.createGroup);
router.get('/', groupController.getUserGroups);
router.get('/:groupId', groupController.getGroupDetails);
router.get('/:groupId/messages', groupController.getGroupMessages);
router.post('/message', groupController.sendGroupMessage);
router.post('/members/add', groupController.addGroupMember);
router.post('/members/remove', groupController.removeGroupMember);
router.delete('/:groupId/leave', groupController.leaveGroup);

module.exports = router;

# Chat App Backend - Firebase Edition

Real-time chat application backend using **Firebase Realtime Database**, Express.js, and Socket.io.

## 🔥 Features

- Firebase Realtime Database for data storage
- JWT authentication
- Real-time messaging via Socket.io
- RESTful API endpoints
- Friend system
- Group chats
- Online status tracking

## 📋 Prerequisites

- Node.js (v14+)
- Firebase project with Realtime Database enabled
- Firebase service account credentials

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Firebase

Follow the [Firebase Setup Guide](../FIREBASE_SETUP.md) to:
- Create Firebase project
- Enable Realtime Database
- Get service account credentials

### 3. Set Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials (see Firebase Setup Guide).

### 4. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── config/
│   └── firebase.js          # Firebase initialization
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   ├── messageController.js # Messaging logic
│   └── groupController.js   # Group chat logic
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── userRoutes.js        # User endpoints
│   ├── messageRoutes.js     # Message endpoints
│   └── groupRoutes.js       # Group endpoints
├── middleware/
│   ├── authMiddleware.js    # JWT verification
│   └── errorHandler.js      # Error handling
├── socket/
│   └── socketHandler.js     # Socket.io events
├── server.js                # Entry point
├── package.json
└── .env                     # Environment variables (not in git)
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `POST /api/auth/logout` - Logout user (protected)

### Users & Friends
- `GET /api/users/search` - Search users
- `POST /api/users/friends/request` - Send friend request
- `PUT /api/users/friends/accept/:friendshipId` - Accept friend request
- `GET /api/users/friends/requests` - Get friend requests
- `GET /api/users/friends` - Get friends list
- `DELETE /api/users/friends/:friendId` - Remove friend

### Messages
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversation/:userId` - Get conversation with user
- `POST /api/messages/send` - Send message
- `PUT /api/messages/read` - Mark messages as read
- `DELETE /api/messages/:messageId` - Delete message

### Groups
- `POST /api/groups/create` - Create group
- `GET /api/groups` - Get user's groups
- `GET /api/groups/:groupId` - Get group details
- `GET /api/groups/:groupId/messages` - Get group messages
- `POST /api/groups/message` - Send group message
- `POST /api/groups/members/add` - Add member to group
- `POST /api/groups/members/remove` - Remove member from group
- `DELETE /api/groups/:groupId/leave` - Leave group

## 🔄 Socket.io Events

### Client → Server
- `message:send` - Send direct message
- `group:message:send` - Send group message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `message:read` - Mark messages as read

### Server → Client
- `message:receive` - Receive message
- `message:sent` - Message sent confirmation
- `group:message:receive` - Receive group message
- `typing:status` - Typing status update
- `user:online` - User online status change
- `friend:request:receive` - Receive friend request
- `friend:request:accepted` - Friend request accepted

## 🗄️ Firebase Data Structure

```
firebase-realtime-database/
├── users/
│   └── {userId}/
│       ├── userId: "ABC123"
│       ├── username: "john"
│       ├── email: "john@example.com"
│       ├── password: "hashed"
│       ├── profilePicture: "url"
│       ├── isOnline: true
│       ├── lastSeen: timestamp
│       └── createdAt: timestamp
├── messages/
│   └── {messageId}/
│       ├── senderId: "userId1"
│       ├── receiverId: "userId2"
│       ├── content: "Hello!"
│       ├── isRead: false
│       └── createdAt: timestamp
├── friendships/
│   └── {friendshipId}/
│       ├── requesterId: "userId1"
│       ├── receiverId: "userId2"
│       ├── status: "ACCEPTED"
│       └── createdAt: timestamp
└── groups/
    └── {groupId}/
        ├── name: "Group Name"
        ├── creatorId: "userId1"
        ├── members: {...}
        └── messages: {...}
```

## 🔒 Environment Variables

Required variables in `.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

See `.env.example` for full list.

## 🚀 Deployment

### Option 1: Traditional Hosting (Render, Railway, Heroku)

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy!

See [Deployment Guide](../deployment_guide.md) for detailed instructions.

### Option 2: Firebase Cloud Functions (Serverless)

Convert Express app to Cloud Functions:

```bash
npm install -g firebase-tools
firebase init functions
```

See Firebase deployment guide for details.

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"test123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## 🐛 Troubleshooting

### "Firebase initialization error"
- Check `.env` file has all required variables
- Verify `FIREBASE_PRIVATE_KEY` has proper `\n` characters
- Ensure Firebase project exists and Realtime Database is enabled

### "Port already in use"
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Change PORT in .env
PORT=5001
```

### "Cannot connect to Firebase"
- Verify `FIREBASE_DATABASE_URL` is correct
- Check Firebase Console > Realtime Database > Rules
- Ensure service account has proper permissions

## 📚 Dependencies

- `express` - Web framework
- `firebase-admin` - Firebase Admin SDK
- `socket.io` - Real-time communication
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `validator` - Input validation

## 📄 License

MIT

## 🙏 Support

For issues or questions, check:
- [Firebase Documentation](https://firebase.google.com/docs/database)
- [Socket.io Documentation](https://socket.io/docs/)
- [Express Documentation](https://expressjs.com/)

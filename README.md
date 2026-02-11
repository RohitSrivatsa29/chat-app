# 💬 Real-Time Chat Application with Firebase

A full-stack real-time messaging application built with **React**, **Node.js**, **Express**, **Firebase Realtime Database**, and **Socket.io**.

## ✨ Features

- 🔥 **Firebase Realtime Database** - Free forever cloud storage
- 🔐 **JWT Authentication** - Secure user authentication
- 💬 **Direct Messaging** - One-on-one real-time conversations
- 👥 **Group Chats** - Create and manage group conversations
- 🔍 **Friend System** - Search users, send/accept friend requests
- ✍️ **Typing Indicators** - See when others are typing
- 🟢 **Online Status** - Real-time online/offline status
- 📱 **Real-time Updates** - Instant message delivery via WebSockets
- 🎨 **Modern UI** - Clean, professional design

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- Firebase account (free)

### 1. Create Firebase Project

Follow the detailed guide: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

Quick steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable Realtime Database
4. Download service account credentials

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Firebase credentials
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Configure Frontend

```bash
cd frontend
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
echo "REACT_APP_SOCKET_URL=http://localhost:5000" >> .env

npm start
```

Frontend runs on `http://localhost:3000`

### 4. Start Chatting!

1. Register an account
2. Note your unique User ID
3. Share your ID with friends
4. Add friends and start chatting!

## 📁 Project Structure

```
Chat-app/
├── backend/              # Node.js + Express + Firebase
│   ├── config/          # Firebase configuration
│   ├── controllers/     # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & error handling
│   ├── socket/          # Socket.io handlers
│   ├── server.js        # Entry point
│   └── README.md        # Backend documentation
│
├── frontend/            # React application
│   ├── src/
│   ├── public/
│   └── package.json
│
└── Documentation/
    ├── FIREBASE_SETUP.md       # Firebase configuration guide
    ├── FIREBASE_DEPLOYMENT.md  # Deployment guide
    └── walkthrough.md          # What was accomplished
```

## 🌐 Deployment

### Option 1: Cloud Hosting (Recommended)
Deploy backend to **Render** and frontend to **Vercel** (both free tier).

See: [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md)

### Option 2: Firebase Hosting
Fully serverless deployment with Firebase Hosting + Cloud Functions.

See: [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md)

## 💰 Cost

**100% FREE** with Firebase free tier:
- ✅ 1 GB storage
- ✅ 10 GB/month bandwidth
- ✅ 100 simultaneous connections
- ✅ No time limit!

Perfect for chatting with friends! 🎉

## 📚 Documentation

- [Firebase Setup Guide](./FIREBASE_SETUP.md) - Configure Firebase project
- [Deployment Guide](./FIREBASE_DEPLOYMENT.md) - Deploy to production
- [Backend README](./backend/README.md) - API documentation
- [Walkthrough](./walkthrough.md) - What was accomplished

## 🔒 Security

- Password hashing with bcrypt
- JWT token authentication
- Firebase security rules
- Input validation
- CORS protection

## 🛠️ Technology Stack

**Frontend:**
- React.js
- Socket.io Client
- Axios
- React Router

**Backend:**
- Node.js + Express
- Firebase Realtime Database
- Socket.io
- JWT Authentication
- bcryptjs

## 📝 License

MIT

## 🙏 Acknowledgments

Built with ❤️ using React, Node.js, and Firebase

---

**Ready to chat with friends unlimited, for free, forever!** 💬✨

**Next Steps:**
1. Follow [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) to configure Firebase
2. Test locally with the Quick Start guide above
3. Deploy using [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md)

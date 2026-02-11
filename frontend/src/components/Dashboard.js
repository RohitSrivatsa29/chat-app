import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import './Dashboard.css';

const Dashboard = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState(null); // 'direct' or 'group'
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    // Listen for online status updates
    const handleUserOnline = (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    socketService.onUserOnline(handleUserOnline);

    return () => {
      socketService.off('user:online', handleUserOnline);
    };
  }, []);

  const handleSelectChat = (chat, type) => {
    setSelectedChat(chat);
    setChatType(type);
  };

  return (
    <div className="dashboard">
      <Sidebar
        onSelectChat={handleSelectChat}
        selectedChat={selectedChat}
        chatType={chatType}
        onlineUsers={onlineUsers}
      />
      <ChatWindow
        chat={selectedChat}
        chatType={chatType}
        onlineUsers={onlineUsers}
      />
    </div>
  );
};

export default Dashboard;

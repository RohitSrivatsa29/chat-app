import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { messageAPI, groupAPI } from '../services/api';
import socketService from '../services/socket';
import { Send, MoreVertical, Users, MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import './ChatWindow.css';

const ChatWindow = ({ chat, chatType, onlineUsers }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!chat) return;

    loadMessages();

    // Listen for new messages
    if (chatType === 'direct') {
      socketService.onMessageReceive(handleNewMessage);
      socketService.onMessageSent(handleNewMessage);
      socketService.onTypingStatus(handleTypingStatus);
    } else {
      socketService.onGroupMessageReceive(handleNewMessage);
      socketService.onGroupTypingStatus(handleGroupTypingStatus);
    }

    return () => {
      if (chatType === 'direct') {
        socketService.off('message:receive', handleNewMessage);
        socketService.off('message:sent', handleNewMessage);
        socketService.off('typing:status', handleTypingStatus);
      } else {
        socketService.off('group:message:receive', handleNewMessage);
        socketService.off('group:typing:status', handleGroupTypingStatus);
      }
    };
  }, [chat, chatType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      let response;
      if (chatType === 'direct') {
        response = await messageAPI.getConversation(chat.id);
        // Mark messages as read
        await messageAPI.markAsRead(chat.id);
        socketService.markAsRead(chat.id);
      } else {
        response = await groupAPI.getGroupMessages(chat.id);
      }
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleNewMessage = (message) => {
    if (chatType === 'direct') {
      if (message.senderId === chat.id || message.receiverId === chat.id) {
        setMessages(prev => [...prev, message]);
        if (message.senderId === chat.id) {
          socketService.markAsRead(chat.id);
        }
      }
    } else {
      if (message.groupId === chat.id) {
        setMessages(prev => [...prev, message]);
      }
    }
  };

  const handleTypingStatus = ({ userId, isTyping: typing }) => {
    if (userId === chat.id) {
      setIsTyping(typing);
    }
  };

  const handleGroupTypingStatus = ({ groupId, userId, username, isTyping: typing }) => {
    if (groupId === chat.id && userId !== user.id) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (typing) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    // Send typing indicator
    if (chatType === 'direct') {
      socketService.startTyping(chat.id);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(chat.id);
      }, 2000);
    } else {
      socketService.startGroupTyping(chat.id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopGroupTyping(chat.id);
      }, 2000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    if (chatType === 'direct') {
      socketService.sendMessage(chat.id, inputMessage.trim());
      socketService.stopTyping(chat.id);
    } else {
      socketService.sendGroupMessage(chat.id, inputMessage.trim());
      socketService.stopGroupTyping(chat.id);
    }

    setInputMessage('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageDate = (date) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return 'Yesterday ' + format(messageDate, 'h:mm a');
    } else {
      return format(messageDate, 'MMM d, h:mm a');
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = format(new Date(message.createdAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  if (!chat) {
    return (
      <div className="chat-window-empty">
        <MessageCircle size={64} />
        <h2>Select a chat to start messaging</h2>
        <p>Choose a conversation from the sidebar or start a new one</p>
      </div>
    );
  }

  const isOnline = chatType === 'direct' && onlineUsers.has(chat.id);
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-info">
          <div className="avatar-wrapper">
            <img
              src={chatType === 'direct' ? chat.profilePicture : chat.avatar}
              alt=""
              className="avatar"
            />
            {chatType === 'direct' && (
              <span className={`status-indicator ${isOnline ? 'status-online' : 'status-offline'}`} />
            )}
          </div>
          <div>
            <h3>{chatType === 'direct' ? chat.username : chat.name}</h3>
            {chatType === 'direct' ? (
              <span className="status-text">
                {isOnline ? 'Online' : `Last seen ${format(new Date(chat.lastSeen), 'MMM d, h:mm a')}`}
              </span>
            ) : (
              <span className="status-text">
                {chat.members?.length || 0} members
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-ghost">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="chat-messages">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="date-divider">
              <span>{format(new Date(date), 'MMMM d, yyyy')}</span>
            </div>
            {msgs.map((message) => {
              const isOwnMessage = message.senderId === user.id;
              return (
                <div
                  key={message.id}
                  className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}
                >
                  {!isOwnMessage && chatType === 'group' && (
                    <img
                      src={message.sender.profilePicture}
                      alt=""
                      className="avatar avatar-sm message-avatar"
                    />
                  )}
                  <div className="message-content">
                    {!isOwnMessage && chatType === 'group' && (
                      <span className="message-sender">{message.sender.username}</span>
                    )}
                    <div className="message-bubble">
                      <p>{message.content}</p>
                    </div>
                    <span className="message-time">
                      {formatMessageDate(message.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {(isTyping || typingUsers.size > 0) && (
        <div className="typing-indicator">
          {chatType === 'direct' ? (
            <span>{chat.username} is typing...</span>
          ) : (
            <span>{Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...</span>
          )}
        </div>
      )}

      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="input"
          placeholder="Type a message..."
          value={inputMessage}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!inputMessage.trim()}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;

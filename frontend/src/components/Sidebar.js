import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, groupAPI, messageAPI } from '../services/api';
import socketService from '../services/socket';
import {
  MessageCircle,
  Users,
  UserPlus,
  LogOut,
  Search,
  Plus,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './Sidebar.css';

const Sidebar = ({ onSelectChat, selectedChat, chatType, onlineUsers }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    loadFriends();
    loadGroups();
    loadConversations();
    loadFriendRequests();

    // Listen for new friend requests
    socketService.onFriendRequestReceive((friendship) => {
      setFriendRequests(prev => [friendship, ...prev]);
    });

    // Listen for accepted friend requests
    socketService.onFriendRequestAccepted((friendship) => {
      loadFriends();
      setFriendRequests(prev => prev.filter(req => req.id !== friendship.id));
    });

    // Listen for new messages
    socketService.onMessageReceive((message) => {
      loadConversations();
    });

    socketService.onGroupMessageReceive((message) => {
      loadGroups();
    });
  }, []);

  const loadFriends = async () => {
    try {
      const response = await userAPI.getFriends();
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await groupAPI.getUserGroups();
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await messageAPI.getConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await userAPI.getFriendRequests();
      setFriendRequests(response.data.requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    try {
      const response = await userAPI.searchUsers(searchQuery);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await userAPI.sendFriendRequest(friendId);
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
      alert('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert(error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await userAPI.acceptFriendRequest(friendshipId);
      loadFriends();
      setFriendRequests(prev => prev.filter(req => req.id !== friendshipId));
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const renderChats = () => {
    if (conversations.length === 0) {
      return (
        <div className="empty-state">
          <MessageCircle size={48} />
          <p>No conversations yet</p>
          <span>Start chatting with your friends!</span>
        </div>
      );
    }

    return conversations.map((conv) => {
      const isOnline = onlineUsers.has(conv.user.id);
      const isSelected = selectedChat?.id === conv.user.id && chatType === 'direct';

      return (
        <div
          key={conv.user.id}
          className={`chat-item ${isSelected ? 'selected' : ''}`}
          onClick={() => onSelectChat(conv.user, 'direct')}
        >
          <div className="avatar-wrapper">
            <img src={conv.user.profilePicture} alt="" className="avatar" />
            <span className={`status-indicator ${isOnline ? 'status-online' : 'status-offline'}`} />
          </div>
          <div className="chat-info">
            <div className="chat-header">
              <h4>{conv.user.username}</h4>
              <span className="chat-time">
                {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="chat-preview">
              <p>{conv.lastMessage.content}</p>
              {conv.unreadCount > 0 && (
                <span className="badge badge-primary">{conv.unreadCount}</span>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  const renderFriends = () => {
    if (friendRequests.length === 0 && friends.length === 0) {
      return (
        <div className="empty-state">
          <Users size={48} />
          <p>No friends yet</p>
          <span>Add friends using their User ID</span>
        </div>
      );
    }

    return (
      <>
        {friendRequests.length > 0 && (
          <div className="section">
            <h3>Friend Requests</h3>
            {friendRequests.map((request) => (
              <div key={request.id} className="friend-request">
                <img src={request.user.profilePicture} alt="" className="avatar avatar-sm" />
                <div className="request-info">
                  <h4>{request.user.username}</h4>
                  <span>@{request.user.userId}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAcceptRequest(request.id)}
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}

        {friends.length > 0 && (
          <div className="section">
            <h3>All Friends</h3>
            {friends.map((friend) => {
              const isOnline = onlineUsers.has(friend.id);
              return (
                <div
                  key={friend.id}
                  className="friend-item"
                  onClick={() => onSelectChat(friend, 'direct')}
                >
                  <div className="avatar-wrapper">
                    <img src={friend.profilePicture} alt="" className="avatar avatar-sm" />
                    <span className={`status-indicator ${isOnline ? 'status-online' : 'status-offline'}`} />
                  </div>
                  <div className="friend-info">
                    <h4>{friend.username}</h4>
                    <span>@{friend.userId}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const renderGroups = () => {
    if (groups.length === 0) {
      return (
        <div className="empty-state">
          <Users size={48} />
          <p>No groups yet</p>
          <span>Create a group to get started</span>
        </div>
      );
    }

    return groups.map((group) => {
      const isSelected = selectedChat?.id === group.id && chatType === 'group';

      return (
        <div
          key={group.id}
          className={`chat-item ${isSelected ? 'selected' : ''}`}
          onClick={() => onSelectChat(group, 'group')}
        >
          <img src={group.avatar} alt="" className="avatar" />
          <div className="chat-info">
            <div className="chat-header">
              <h4>{group.name}</h4>
              {group.messages[0] && (
                <span className="chat-time">
                  {formatDistanceToNow(new Date(group.messages[0].createdAt), { addSuffix: true })}
                </span>
              )}
            </div>
            <div className="chat-preview">
              <p>
                {group.messages[0]
                  ? `${group.messages[0].sender.username}: ${group.messages[0].content}`
                  : 'No messages yet'}
              </p>
              {group.unreadCount > 0 && (
                <span className="badge badge-primary">{group.unreadCount}</span>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-profile">
          <img src={user.profilePicture} alt="" className="avatar" />
          <div className="user-info">
            <h3>{user.username}</h3>
            <span>@{user.userId}</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={logout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <MessageCircle size={20} />
          Chats
        </button>
        <button
          className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <Users size={20} />
          Friends
        </button>
        <button
          className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <Users size={20} />
          Groups
        </button>
      </div>

      <div className="sidebar-actions">
        {activeTab === 'friends' && (
          <button
            className="btn btn-primary btn-full"
            onClick={() => setShowSearchModal(true)}
          >
            <UserPlus size={18} />
            Add Friend
          </button>
        )}
        {activeTab === 'groups' && (
          <button
            className="btn btn-primary btn-full"
            onClick={() => setShowGroupModal(true)}
          >
            <Plus size={18} />
            Create Group
          </button>
        )}
      </div>

      <div className="sidebar-content">
        {activeTab === 'chats' && renderChats()}
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'groups' && renderGroups()}
      </div>

      {showSearchModal && (
        <SearchModal
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearch={handleSearch}
          onAddFriend={handleAddFriend}
          onClose={() => {
            setShowSearchModal(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
        />
      )}

      {showGroupModal && (
        <CreateGroupModal
          friends={friends}
          onClose={() => setShowGroupModal(false)}
          onCreated={() => {
            setShowGroupModal(false);
            loadGroups();
          }}
        />
      )}
    </div>
  );
};

const SearchModal = ({ searchQuery, setSearchQuery, searchResults, onSearch, onAddFriend, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Friend</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              className="input"
              placeholder="Search by User ID or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            />
            <button className="btn btn-primary btn-sm" onClick={onSearch}>
              Search
            </button>
          </div>
          <div className="search-results">
            {searchResults.map((user) => (
              <div key={user.id} className="search-result-item">
                <img src={user.profilePicture} alt="" className="avatar avatar-sm" />
                <div className="user-info">
                  <h4>{user.username}</h4>
                  <span>@{user.userId}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onAddFriend(user.id)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateGroupModal = ({ friends, onClose, onCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);

  const handleCreate = async () => {
    if (!groupName.trim()) return;

    try {
      await groupAPI.createGroup({
        name: groupName,
        memberIds: selectedFriends
      });
      onCreated();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const toggleFriend = (friendId) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Group</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              className="input"
              placeholder="My Awesome Group"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Select Friends</label>
            <div className="friend-list">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className={`friend-item selectable ${selectedFriends.includes(friend.id) ? 'selected' : ''}`}
                  onClick={() => toggleFriend(friend.id)}
                >
                  <img src={friend.profilePicture} alt="" className="avatar avatar-sm" />
                  <span>{friend.username}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={handleCreate}
            disabled={!groupName.trim()}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

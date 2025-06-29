
"use client";
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const App = () => {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', username: '', password: '', confirmPassword: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('chatToken');
    const userData = localStorage.getItem('chatUser');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setCurrentView('chat');
      initializeSocket(token, JSON.parse(userData));
    }
  }, []);

  const initializeSocket = (token, userData) => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.emit('join', userData);

    newSocket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('activeUsers', (users) => {
      setActiveUsers(users);
    });

    newSocket.on('userJoined', (userData) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${userData.username} joined the chat`,
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('userLeft', (userData) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${userData.username} left the chat`,
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('userTyping', (data) => {
      setTypingUsers(prev => [...prev.filter(u => u.id !== data.id), data]);
    });

    newSocket.on('userStoppedTyping', (data) => {
      setTypingUsers(prev => prev.filter(u => u.id !== data.id));
    });

    // Load message history
    fetch('http://localhost:3001/api/messages', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => setMessages(data))
    .catch(err => console.error('Failed to load messages:', err));

    return newSocket;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerForm.email,
          username: registerForm.username,
          password: registerForm.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setRegisterForm({ email: '', username: '', password: '', confirmPassword: '' });
        setTimeout(() => setCurrentView('login'), 3000);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    }

    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('chatToken', data.token);
        localStorage.setItem('chatUser', JSON.stringify(data.user));
        setUser(data.user);
        setCurrentView('chat');
        initializeSocket(data.token, data.user);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    }

    setLoading(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      content: newMessage,
      username: user.username,
      userId: user.id
    };

    socket.emit('sendMessage', messageData);
    setNewMessage('');
    handleStopTyping();
  };

  const handleTyping = () => {
    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit('typing', { id: user.id, username: user.username });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping && socket) {
      setIsTyping(false);
      socket.emit('stopTyping', { id: user.id, username: user.username });
    }
    clearTimeout(typingTimeoutRef.current);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatToken');
    localStorage.removeItem('chatUser');
    if (socket) {
      socket.disconnect();
    }
    setUser(null);
    setSocket(null);
    setMessages([]);
    setActiveUsers([]);
    setCurrentView('login');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Register View
  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create Account</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={registerForm.email}
                onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                required
                value={registerForm.username}
                onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                required
                value={registerForm.password}
                onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                required
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentView('login')}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Login View
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Welcome Back</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => setCurrentView('register')}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Chatroom</h2>
          <p className="text-sm text-gray-600">Welcome, {user?.username}!</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Online Users ({activeUsers.length})
            </h3>
            <div className="space-y-2">
              {activeUsers.map((activeUser) => (
                <div key={activeUser.id} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-700">{activeUser.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-xl font-semibold text-gray-800">General Chat</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'system' ? (
                <div className="text-center text-sm text-gray-500 italic">
                  {message.content}
                </div>
              ) : (
                <div className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.userId === user?.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}>
                    {message.userId !== user?.id && (
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {message.username}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.userId === user?.id ? 'text-indigo-200' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="text-sm text-gray-500 italic">
              {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
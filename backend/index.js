const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage (use a database in production)
const users = new Map();
const verificationTokens = new Map();
const messages = [];
const activeUsers = new Map();

// JWT Secret
const JWT_SECRET = 'your-jwt-secret-key';

// Email configuration (configure with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  const verificationLink = `http://localhost:3001/verify-email?token=${token}`;
  
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Verify Your Email - Chatroom',
    html: `
      <h2>Welcome to Chatroom!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>If you didn't create an account, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      user => user.email === email || user.username === username
    );

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Store user (not verified yet)
    const userId = Date.now().toString();
    users.set(userId, {
      id: userId,
      email,
      username,
      password: hashedPassword,
      isVerified: false,
      createdAt: new Date()
    });

    // Store verification token
    verificationTokens.set(verificationToken, userId);

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Failed to send verification email' 
      });
    }

    res.json({ 
      message: 'Registration successful! Please check your email to verify your account.' 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/verify-email', (req, res) => {
  try {
    const { token } = req.query;

    if (!token || !verificationTokens.has(token)) {
      return res.status(400).send('Invalid or expired verification token');
    }

    const userId = verificationTokens.get(token);
    const user = users.get(userId);

    if (!user) {
      return res.status(400).send('User not found');
    }

    // Mark user as verified
    user.isVerified = true;
    users.set(userId, user);

    // Remove verification token
    verificationTokens.delete(token);

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">Email Verified Successfully!</h2>
          <p>Your account has been verified. You can now login to the chatroom.</p>
          <a href="http://localhost:3000" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Chatroom</a>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).send('Verification failed');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = Array.from(users.values()).find(u => u.email === email);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ 
        error: 'Please verify your email before logging in' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

app.get('/api/messages', verifyToken, (req, res) => {
  res.json(messages);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userData) => {
    activeUsers.set(socket.id, userData);
    socket.broadcast.emit('userJoined', userData);
    
    // Send active users list
    const activeUsersList = Array.from(activeUsers.values());
    io.emit('activeUsers', activeUsersList);
  });

  socket.on('sendMessage', (messageData) => {
    const message = {
      id: Date.now(),
      ...messageData,
      timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    io.emit('newMessage', message);
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('userTyping', data);
  });

  socket.on('stopTyping', (data) => {
    socket.broadcast.emit('userStoppedTyping', data);
  });

  socket.on('disconnect', () => {
    const userData = activeUsers.get(socket.id);
    if (userData) {
      activeUsers.delete(socket.id);
      socket.broadcast.emit('userLeft', userData);
      
      // Send updated active users list
      const activeUsersList = Array.from(activeUsers.values());
      io.emit('activeUsers', activeUsersList);
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
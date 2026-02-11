const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { getDatabase } = require('../config/firebase');

/**
 * Generate unique user ID
 */
const generateUserId = async () => {
  const db = getDatabase();
  let userId;
  let isUnique = false;

  while (!isUnique) {
    // Generate random 8-character alphanumeric ID
    userId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Check if ID already exists
    const snapshot = await db.ref('users').orderByChild('userId').equalTo(userId).once('value');
    
    if (!snapshot.exists()) {
      isUnique = true;
    }
  }

  return userId;
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Register new user
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const db = getDatabase();

    // Check if email already exists
    const emailSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (emailSnapshot.exists()) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if username already exists
    const usernameSnapshot = await db.ref('users').orderByChild('username').equalTo(username).once('value');
    if (usernameSnapshot.exists()) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique user ID
    const userId = await generateUserId();

    // Create user ID (Firebase auto-generated key)
    const userRef = db.ref('users').push();
    const firebaseUserId = userRef.key;

    // User data
    const userData = {
      userId,
      username,
      email,
      password: hashedPassword,
      profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=200`,
      isOnline: false,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };

    // Save to Firebase
    await userRef.set(userData);

    // Generate token
    const token = generateToken(firebaseUserId);

    // Return user without password
    const { password: _, ...userWithoutPassword } = userData;

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: firebaseUserId,
        ...userWithoutPassword
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const db = getDatabase();

    // Find user by email
    const snapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');

    if (!snapshot.exists()) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user data
    let userId;
    let user;
    snapshot.forEach((childSnapshot) => {
      userId = childSnapshot.key;
      user = childSnapshot.val();
    });

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update online status
    await db.ref(`users/${userId}`).update({
      isOnline: true,
      lastSeen: Date.now()
    });

    // Generate token
    const token = generateToken(userId);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: {
        id: userId,
        ...userWithoutPassword,
        isOnline: true
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const { password, ...userWithoutPassword } = req.user;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    const db = getDatabase();
    
    await db.ref(`users/${req.user.id}`).update({
      isOnline: false,
      lastSeen: Date.now()
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
};

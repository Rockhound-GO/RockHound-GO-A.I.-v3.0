

/**
 * RockHound GO - Backend Server
 * 
 * To run this server:
 * 1. Install dependencies: npm install express mongoose cors jsonwebtoken bcryptjs dotenv
 * 2. Set environment variables in .env: PORT, MONGODB_URI, JWT_SECRET
 * 3. Run: node server/index.js
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Rock } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-prod';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rockhound', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Middleware: Verify Token ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        next();
    } catch (e) {
        res.status(500).json({ message: "Error verifying admin status" });
    }
};

// --- Routes: Authentication ---

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      xp: 0,
      level: 1,
      // For demo purposes, the first user is admin
      isAdmin: (await User.countDocuments()) === 0
    });

    await user.save();

    // Generate Token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, xp: user.xp, level: user.level, avatarUrl: user.avatarUrl, createdAt: user.createdAt, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate Token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, username: user.username, email: user.email, xp: user.xp || 0, level: user.level || 1, avatarUrl: user.avatarUrl, createdAt: user.createdAt, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// Update Profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, avatarUrl } = req.body;
    const userId = req.user.id;

    // Check uniqueness if changing
    if (username || email) {
      const existing = await User.findOne({
        $and: [
          { _id: { $ne: userId } },
          { $or: [{ username }, { email }] }
        ]
      });
      if (existing) {
        return res.status(400).json({ message: 'Username or email already taken' });
      }
    }

    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    
    // Return sanitized user
    res.json({ 
      id: updatedUser._id, 
      username: updatedUser.username, 
      email: updatedUser.email, 
      xp: updatedUser.xp, 
      level: updatedUser.level,
      avatarUrl: updatedUser.avatarUrl,
      createdAt: updatedUser.createdAt,
      isAdmin: updatedUser.isAdmin
    });

  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// --- Routes: Admin Dashboard ---

app.get('/api/admin/stats', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        
        // Active in last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsers = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });

        const totalRocks = await Rock.countDocuments();

        // Get activity graph data (Last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 60 * 60 * 1000 * 24);
        const activityData = await Rock.aggregate([
            { $match: { dateFound: { $gte: sevenDaysAgo.getTime() } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$dateFound" } } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get location data for heatmap (limit to 1000 recent points for performance)
        const locations = await Rock.find(
            { 'location.lat': { $exists: true } }, 
            { 'location.lat': 1, 'location.lng': 1 }
        ).sort({ dateFound: -1 }).limit(1000);

        res.json({
            totalUsers,
            activeUsers,
            totalRocks,
            activityData,
            locations: locations.map(l => ({ lat: l.location.lat, lng: l.location.lng }))
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin stats', error: error.message });
    }
});


// --- Routes: Rock Collection ---

// Get User's Collection
app.get('/api/rocks', authenticateToken, async (req, res) => {
  try {
    const rocks = await Rock.find({ userId: req.user.id }).sort({ dateFound: -1 });
    res.json(rocks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collection' });
  }
});

// Add Rock to Collection
app.post('/api/rocks', authenticateToken, async (req, res) => {
  try {
    const rockData = req.body;
    
    // 1. Save the Rock
    const newRock = new Rock({
      ...rockData,
      userId: req.user.id,
      dateFound: rockData.dateFound || Date.now()
    });
    await newRock.save();

    // 2. Calculate XP & Level
    // Base XP = 50. Bonus = Rarity Score (0-100).
    const xpGained = 50 + (rockData.rarityScore || 0);
    
    const user = await User.findById(req.user.id);
    if (user) {
      user.xp = (user.xp || 0) + xpGained;
      // Simple Level Formula: Level = Floor(XP / 1000) + 1
      const oldLevel = user.level || 1;
      const newLevel = Math.floor(user.xp / 1000) + 1;
      user.level = newLevel;
      await user.save();

      // Return rock AND updated stats
      res.status(201).json({ 
        rock: newRock, 
        userStats: { 
          xp: user.xp, 
          level: user.level, 
          xpGained, 
          leveledUp: newLevel > oldLevel 
        } 
      });
    } else {
       res.status(201).json({ rock: newRock, userStats: null });
    }

  } catch (error) {
    res.status(500).json({ message: 'Error saving rock', error: error.message });
  }
});

// Delete Rock
app.delete('/api/rocks/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Rock.findOneAndDelete({ id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: 'Rock not found' });
    res.json({ message: 'Rock deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rock' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
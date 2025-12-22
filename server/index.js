/**
 * RockHound GO // NEURAL NET CORE
 * Version: 4.5.0-STABLE
 * Status: ONLINE
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const compression = require('compression');
const NodeCache = require('node-cache');
const { User, Rock, SystemLog } = require('./db');

const app = express();
const cache = new NodeCache({ stdTTL: 60 }); // 60s cache for stats
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rockhound-neural-key-v4';

// --- MIDDLEWARE STACK ---
app.use(compression()); // Optimize bandwidth
// Explicitly configure CORS for robust cross-origin requests
const corsOptions = {
    origin: true, // Reflects the request origin, or '*' for no origin check
    credentials: true, // Allows cookies and Authorization headers to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allowed methods
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Explicitly allowed headers
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); 

// --- RATE LIMITING (Security) ---
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "UPLINK SATURATION DETECTED. COOLDOWN ACTIVE." }
});
app.use('/api/', apiLimiter);

// --- DB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rockhound', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ NEURAL DATABASE LINKED'))
.catch(err => console.error('❌ DB CONNECTION FAILURE:', err));

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "SIGNAL LOST: AUTH REQUIRED" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "ACCESS DENIED: INVALID TOKEN" });
    req.user = user;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "CLEARANCE LEVEL INSUFFICIENT" });
        }
        next();
    } catch (e) {
        res.status(500).json({ message: "ADMIN VERIFICATION FAILED" });
    }
};

// --- REAL-TIME EVENT STREAM (SSE) ---
// Simulates live terminal feeds for the Admin Dashboard
app.get('/api/stream', authenticateToken, verifyAdmin, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial heartbeat
    sendEvent({ type: 'HEARTBEAT', status: 'ONLINE', timestamp: Date.now() });

    // Simulate random system events
    const interval = setInterval(() => {
        const events = [
            { type: 'LOGIN', user: `Agent_${Math.floor(Math.random()*999)}`, region: 'NA_EAST' },
            { type: 'SCAN', result: 'IGNEOUS', confidence: 0.98 },
            { type: 'SYNC', status: 'COMPLETE', bytes: 4096 },
            { type: 'SECURITY', status: 'OK', load: Math.floor(Math.random()*100) }
        ];
        sendEvent(events[Math.floor(Math.random() * events.length)]);
    }, 3000);

    req.on('close', () => clearInterval(interval));
});

// --- AUTH ROUTES ---

app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body; 
    
    if (await User.findOne({ $or: [{ email }, { username }] })) {
      return res.status(400).json({ message: 'IDENTITY ALREADY REGISTERED' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isAdmin: (await User.countDocuments()) === 0, // First user is Admin
      settings: { theme: 'cyber_dark' } // Default config
    });

    await user.save();
    
    // Log creation
    await new SystemLog({ action: 'USER_REGISTER', userId: user._id, details: { email } }).save();

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'REGISTRATION PROTOCOL FAILED', error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'INVALID CREDENTIALS' });
    }

    user.lastLogin = Date.now();
    await user.save();
    
    await new SystemLog({ action: 'USER_LOGIN', userId: user._id, ip: req.ip }).save();

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'LOGIN SEQUENCE ABORTED', error: error.message });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, avatarUrl } = req.body;
    const userId = req.user.id;

    // Check conflicts
    if (username || email) {
      const existing = await User.findOne({
        $and: [{ _id: { $ne: userId } }, { $or: [{ username }, { email }] }]
      });
      if (existing) return res.status(400).json({ message: 'IDENTITY CONFLICT DETECTED' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { 
        username, email, avatarUrl 
    }, { new: true });
    
    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ message: 'PROFILE UPDATE HALTED', error: error.message });
  }
});

// --- ADMIN ROUTES ---

app.get('/api/admin/stats', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        // Check Cache first
        const cachedStats = cache.get("admin_stats");
        if (cachedStats) return res.json(cachedStats);

        const [totalUsers, activeUsers, totalRocks] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 86400000) } }),
            Rock.countDocuments()
        ]);

        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const activityData = await Rock.aggregate([
            { $match: { dateFound: { $gte: sevenDaysAgo.getTime() } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$dateFound" } } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const locations = await Rock.find(
            { 'location.type': 'Point' }, 
            { 'location': 1 }
        ).sort({ dateFound: -1 }).limit(500)
         .then(docs => docs.map(d => ({ lat: d.location.coordinates[1], lng: d.location.coordinates[0] })));

        const stats = { totalUsers, activeUsers, totalRocks, activityData, locations };
        
        // Save to cache
        cache.set("admin_stats", stats);
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'STATS AGGREGATION FAILED', error: error.message });
    }
});

// --- ROCK DATA ROUTES ---

app.get('/api/rocks', authenticateToken, async (req, res) => {
  try {
    const rocks = await Rock.find({ userId: req.user.id }).sort({ dateFound: -1 });
    
    // Transform GeoJSON back to simple lat/lng for frontend compatibility if needed
    // or frontend adapts to GeoJSON. Keeping simple for compatibility:
    const formattedRocks = rocks.map(r => ({
        ...r.toObject(),
        location: r.location ? { lat: r.location.coordinates[1], lng: r.location.coordinates[0] } : null
    }));

    res.json(formattedRocks);
  } catch (error) {
    res.status(500).json({ message: 'VAULT ACCESS DENIED' });
  }
});

app.post('/api/rocks', authenticateToken, async (req, res) => {
  try {
    const rockData = req.body;
    
    // Convert to GeoJSON
    let location = undefined;
    if (rockData.location) {
        location = {
            type: 'Point',
            coordinates: [rockData.location.lng, rockData.location.lat]
        };
    }

    const newRock = new Rock({
      ...rockData,
      userId: req.user.id,
      location,
      dateFound: rockData.dateFound || Date.now()
    });
    
    await newRock.save();
    
    // Gamification Logic
    const xpGained = 50 + (rockData.rarityScore || 0);
    const user = await User.findById(req.user.id);
    let userStats = null;

    if (user) {
      user.xp += xpGained;
      const oldLevel = user.level;
      user.level = Math.floor(user.xp / 100) + 1;
      
      // Update stats
      if (!user.operatorStats) user.operatorStats = {};
      user.operatorStats.totalScans = (user.operatorStats.totalScans || 0) + 1;
      if (rockData.rarityScore > 90) user.operatorStats.legendaryFinds = (user.operatorStats.legendaryFinds || 0) + 1;

      await user.save();

      userStats = { 
          xp: user.xp, 
          level: user.level, 
          xpGained, 
          leveledUp: user.level > oldLevel 
      };
    }

    // Invalidate admin cache so global map updates
    cache.del("admin_stats");

    res.status(201).json({ rock: newRock, userStats });
  } catch (error) {
    res.status(500).json({ message: 'DATA UPLOAD FAILED', error: error.message });
  }
});

app.delete('/api/rocks/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Rock.findOneAndDelete({ id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: 'ASSET NOT FOUND' });
    
    // Invalidate cache
    cache.del("admin_stats");
    
    res.json({ message: 'ASSET PURGED' });
  } catch (error) {
    res.status(500).json({ message: 'PURGE PROTOCOL FAILED' });
  }
});

// Helper
const sanitizeUser = (user) => {
    const u = user.toObject();
    delete u.password;
    return u;
};

// --- BOOT SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 SYSTEM ONLINE :: PORT ${PORT} :: SECURE`);
});
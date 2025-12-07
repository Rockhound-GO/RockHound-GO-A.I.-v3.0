const mongoose = require('mongoose');

// --- CONFIGURATION ---
const SYSTEM_VERSION = '4.5.0-NEURAL';

// --- Shared Sub-Schemas ---

// GeoJSON Point for military-grade spatial queries
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
}, { _id: false });

// --- User Schema: The Operator ---
// Stores profile, credentials, and progressive career stats
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    minlength: 3,
    index: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  avatarUrl: {
    type: String,
    default: null // Base64 or CDN URL
  },
  
  // -- Career Progression --
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  rankTitle: { type: String, default: 'Novice Scout' },
  credits: { type: Number, default: 0 }, // In-app currency for future marketplace
  
  // -- Tactical Stats --
  operatorStats: {
    totalScans: { type: Number, default: 0 },
    distanceTraveled: { type: Number, default: 0 }, // in km
    uniqueSpeciesFound: { type: Number, default: 0 },
    legendaryFinds: { type: Number, default: 0 }
  },

  // -- Unlocks --
  badges: [{
    id: String,
    dateUnlocked: { type: Date, default: Date.now }
  }],

  // -- System Preferences --
  settings: {
    theme: { type: String, default: 'cyber_dark' },
    hapticsEnabled: { type: Boolean, default: true },
    audioEnabled: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true }
  },

  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// --- Rock Schema: The Specimen ---
// Geological asset data with AI analysis metadata
const rockSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  id: { type: String, required: true, unique: true }, // Frontend UUID (Sync ID)
  
  // -- Classification --
  name: { type: String, required: true, index: true },
  scientificName: String,
  type: { 
    type: String, 
    required: true,
    enum: ['Igneous', 'Sedimentary', 'Metamorphic', 'Mineral', 'Fossil', 'Unknown'] 
  },
  description: String,
  funFact: String,
  
  // -- Analysis Data --
  rarityScore: { type: Number, default: 0, min: 0, max: 100 },
  hardness: { type: Number, default: 0, min: 0, max: 10 },
  color: [String],
  composition: [String],
  
  // -- AI Metadata (The "Science" Layer) --
  aiConfidence: { type: Number, default: 0.95 },
  modelVersion: { type: String, default: 'gemini-2.5-flash' },
  spectralHash: { type: String }, // Placeholder for future spectral analysis features
  
  // -- Assets --
  imageUrl: String, // Source Image
  comparisonImageUrl: String, // Ideal Reference Image
  
  // -- Geospatial Data --
  location: {
    type: pointSchema,
    index: '2dsphere' // Critical for "Find rocks near me" queries
  },
  
  dateFound: { type: Number, default: Date.now, index: -1 },
  
  // -- Verification --
  status: {
    type: String,
    enum: ['approved', 'pending', 'flagged'],
    default: 'approved'
  },
  manualCorrection: String
});

// --- System Log Schema ---
// Powers the "Live Terminal" in the Admin Dashboard
const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, expires: '7d' }, // Auto-delete after 7 days
  action: { type: String, required: true }, // e.g., 'USER_LOGIN', 'ROCK_SYNC'
  details: mongoose.Schema.Types.Mixed,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: String
});

// --- Indexes & Optimization ---
// Ensure rapid query performance for the dashboard and map
rockSchema.index({ 'location.coordinates': '2dsphere' });
rockSchema.index({ type: 1, rarityScore: -1 }); // Fast filtering by type/rarity

const User = mongoose.model('User', userSchema);
const Rock = mongoose.model('Rock', rockSchema);
const SystemLog = mongoose.model('SystemLog', logSchema);

module.exports = { User, Rock, SystemLog };
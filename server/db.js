

const mongoose = require('mongoose');

// --- User Schema ---
// Stores login info and profile data for thousands of players
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    minlength: 3
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
    default: null
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

// --- Rock Schema ---
// Stores the geological data for each finding
const rockSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  id: { type: String, required: true }, // Frontend UUID
  name: { type: String, required: true },
  type: { type: String, required: true },
  scientificName: String,
  description: String,
  rarityScore: Number,
  hardness: Number,
  color: [String],
  composition: [String],
  funFact: String,
  imageUrl: String, // Base64 or URL
  dateFound: { type: Number, default: Date.now },
  location: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ['approved', 'pending'],
    default: 'approved'
  },
  manualCorrection: String
});

// Create indexes for faster queries when scaling to thousands of users
rockSchema.index({ userId: 1, dateFound: -1 });
rockSchema.index({ 'location.lat': 1, 'location.lng': 1 }); // Geospatial index support

const User = mongoose.model('User', userSchema);
const Rock = mongoose.model('Rock', rockSchema);

module.exports = { User, Rock };
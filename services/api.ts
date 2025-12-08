import { Rock, User, Badge, OperatorStats } from '../types';

// Re-export types to maintain compatibility
export type { User, Badge, OperatorStats };

// --- NEURAL NETWORK CONFIGURATION ---
// Set FALSE for production deployment to real server
const USE_MOCK_SERVER = true; 
const API_URL = 'http://localhost:3000'; 

// --- TYPES ---

export interface AddRockResponse {
  rock: Rock;
  userStats: {
    xp: number;
    level: number;
    xpGained: number;
    leveledUp: boolean;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRocks: number;
  activityData: { _id: string; count: number }[];
  locations: { lat: number; lng: number }[];
}

// --- API CLIENT (NEURAL LINK) ---
export const api = {
  onSyncStatusChange: ((isSyncing: boolean) => {}) as (isSyncing: boolean) => void,

  async _withSyncStatus<T>(promise: Promise<T>): Promise<T> {
    this.onSyncStatusChange(true);
    try {
      return await promise;
    } finally {
      // Add slight decay for visual effect
      setTimeout(() => this.onSyncStatusChange(false), 300);
    }
  },

  // --- AUTHENTICATION PROTOCOLS ---
  
  register(username: string, email: string, password: string): Promise<User> {
    return this._withSyncStatus(this._register(username, email, password));
  },
  async _register(username: string, email: string, password: string): Promise<User> {
    if (USE_MOCK_SERVER) {
      await simulateSignalLatency();
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      if (users.find((u: any) => u.email === email)) throw new Error('IDENTITY ALREADY REGISTERED');
      if (users.find((u: any) => u.username === username)) throw new Error('CODENAME TAKEN');
      
      const newUser: User = { 
        id: crypto.randomUUID(), 
        username, 
        email, 
        xp: 0, 
        level: 1,
        rankTitle: 'Novice Scout',
        isAdmin: users.length === 0,
        createdAt: new Date().toISOString(),
        operatorStats: { totalScans: 0, distanceTraveled: 0, uniqueSpeciesFound: 0, legendaryFinds: 0, highestRarityFound: 0, scanStreak: 0 },
        badges: []
      }; 
      
      // Store password separately in a real app, but here we just mock it
      const storageUser = { ...newUser, password }; 
      users.push(storageUser);
      localStorage.setItem('mock_users', JSON.stringify(users));
      
      const sessionUser = { ...newUser, token: 'mock-neural-token-' + Date.now() };
      localStorage.setItem('current_user', JSON.stringify(sessionUser));
      return sessionUser;
    } else {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      localStorage.setItem('token', data.token);
      return data.user;
    }
  },

  login(email: string, password: string): Promise<User> {
    return this._withSyncStatus(this._login(email, password));
  },
  async _login(email: string, password: string): Promise<User> {
    if (USE_MOCK_SERVER) {
      await simulateSignalLatency();
      let users = JSON.parse(localStorage.getItem('mock_users') || '[]');

      // --- AUTO-SEED ADMIN PROTOCOL ---
      if (!users.find((u: any) => u.email === 'admin@rockhound.com')) {
          const adminUser = {
              id: 'admin-prime',
              username: 'System_Admin',
              email: 'admin@rockhound.com',
              password: 'admin',
              xp: 99999,
              level: 99,
              rankTitle: 'System Architect',
              isAdmin: true,
              avatarUrl: null,
              createdAt: new Date().toISOString(),
              operatorStats: { totalScans: 9000, distanceTraveled: 40000, uniqueSpeciesFound: 500, legendaryFinds: 100, highestRarityFound: 99, scanStreak: 45 },
              badges: []
          };
          users.push(adminUser);
          localStorage.setItem('mock_users', JSON.stringify(users));
      }

      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) throw new Error('ACCESS DENIED: INVALID CREDENTIALS');
      
      const userObj = { ...user, token: 'mock-neural-token-' + Date.now() };
      delete (userObj as any).password;
      
      localStorage.setItem('current_user', JSON.stringify(userObj));
      return userObj;
    } else {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      localStorage.setItem('token', data.token);
      return data.user;
    }
  },

  updateProfile(userData: Partial<User>): Promise<User> {
    return this._withSyncStatus(this._updateProfile(userData));
  },
  async _updateProfile(userData: Partial<User>): Promise<User> {
    if (USE_MOCK_SERVER) {
      await simulateSignalLatency();
      const currentUser = this.getCurrentUser();
      if (!currentUser) throw new Error("SIGNAL LOST: AUTH REQUIRED");

      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const userIndex = users.findIndex((u: any) => u.id === currentUser.id);
      
      if (userIndex === -1) throw new Error("USER RECORD NOT FOUND");

      if (userData.username || userData.email) {
        const existing = users.find((u: any) => 
          u.id !== currentUser.id && 
          ((userData.username && u.username === userData.username) || (userData.email && u.email === userData.email))
        );
        if (existing) throw new Error("IDENTITY CONFLICT DETECTED");
      }

      const updatedUser = { ...users[userIndex], ...userData };
      users[userIndex] = updatedUser;
      localStorage.setItem('mock_users', JSON.stringify(users));
      
      const safeUser = { ...updatedUser, token: currentUser.token };
      delete (safeUser as any).password;
      localStorage.setItem('current_user', JSON.stringify(safeUser));
      
      return safeUser;
    } else {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    }
  },

  logout: () => {
    if (USE_MOCK_SERVER) {
      localStorage.removeItem('current_user');
    } else {
      localStorage.removeItem('token');
    }
  },

  getCurrentUser: (): User | null => {
    if (USE_MOCK_SERVER) {
      const stored = localStorage.getItem('current_user');
      return stored ? JSON.parse(stored) : null;
    } else {
      const stored = localStorage.getItem('user_data');
      return stored ? JSON.parse(stored) : null;
    }
  },

  // --- COMMAND CENTER TELEMETRY ---

  getAdminStats(): Promise<AdminStats> {
    return this._withSyncStatus(this._getAdminStats());
  },
  async _getAdminStats(): Promise<AdminStats> {
      if (USE_MOCK_SERVER) {
          await simulateSignalLatency();
          const currentUser = this.getCurrentUser();
          if (!currentUser?.isAdmin) throw new Error("SECURITY CLEARANCE INSUFFICIENT");

          // Generate realistic sine-wave traffic pattern
          const activityData = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              // Sine wave peak at day 4
              const baseLoad = 300;
              const wave = Math.sin(i * 0.8) * 150;
              const noise = Math.random() * 50;
              
              return {
                  _id: d.toISOString().split('T')[0],
                  count: Math.floor(baseLoad + wave + noise)
              };
          });

          // Generate clustered geolocation data
          const locations = Array.from({ length: 150 }, () => {
              // Cluster around a few "hubs"
              const hubs = [{lat: 40.7, lng: -74.0}, {lat: 51.5, lng: -0.1}, {lat: 35.6, lng: 139.7}];
              const hub = hubs[Math.floor(Math.random() * hubs.length)];
              return {
                  lat: hub.lat + (Math.random() - 0.5) * 10, 
                  lng: hub.lng + (Math.random() - 0.5) * 10
              };
          });

          return {
              totalUsers: 14502,
              activeUsers: 3421,
              totalRocks: 89201,
              activityData,
              locations
          };
      } else {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('UPLINK FAILURE');
          return res.json();
      }
  },

  // --- ARCHIVE DATA OPERATIONS ---

  getRocks(): Promise<Rock[]> {
    return this._withSyncStatus(this._getRocks());
  },
  async _getRocks(): Promise<Rock[]> {
    if (USE_MOCK_SERVER) {
      await simulateSignalLatency();
      const user = this.getCurrentUser();
      if (!user) return [];
      const allRocks = JSON.parse(localStorage.getItem('mock_rocks') || '[]');
      return allRocks.filter((r: any) => r.userId === user.id);
    } else {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/rocks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('ARCHIVE RETRIEVAL FAILED');
      return res.json();
    }
  },

  addRock(rock: Rock): Promise<AddRockResponse> {
    return this._withSyncStatus(this._addRock(rock));
  },
  async _addRock(rock: Rock): Promise<AddRockResponse> {
    if (USE_MOCK_SERVER) {
      await simulateSignalLatency();
      const user = this.getCurrentUser();
      if (!user) throw new Error('UPLINK DISCONNECTED');
      
      const allRocks = JSON.parse(localStorage.getItem('mock_rocks') || '[]');
      const newRock = { ...rock, userId: user.id };
      allRocks.unshift(newRock);
      localStorage.setItem('mock_rocks', JSON.stringify(allRocks));

      // Gamification Logic
      const xpGained = 50 + (rock.rarityScore || 0);
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const userIndex = users.findIndex((u: any) => u.id === user.id);
      
      let newXp = (user.xp || 0) + xpGained;
      let newLevel = Math.floor(newXp / 1000) + 1;
      let leveledUp = newLevel > (user.level || 1);

      if (userIndex !== -1) {
        const u = users[userIndex];
        u.xp = newXp;
        u.level = newLevel;
        
        // Update Operator Stats
        if (!u.operatorStats) u.operatorStats = { totalScans: 0, distanceTraveled: 0, uniqueSpeciesFound: 0, legendaryFinds: 0, highestRarityFound: 0, scanStreak: 0 };
        u.operatorStats.totalScans += 1;
        if (rock.rarityScore > 90) u.operatorStats.legendaryFinds += 1;
        if (rock.rarityScore > (u.operatorStats.highestRarityFound || 0)) u.operatorStats.highestRarityFound = rock.rarityScore;
        u.operatorStats.scanStreak = (u.operatorStats.scanStreak || 0) + 1;
        
        localStorage.setItem('mock_users', JSON.stringify(users));
        
        // Update session
        const updatedUser = { ...user, xp: newXp, level: newLevel, operatorStats: u.operatorStats };
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }

      return {
        rock: newRock,
        userStats: {
          xp: newXp,
          level: newLevel,
          xpGained,
          leveledUp
        }
      };
    } else {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/rocks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rock)
      });
      if (!res.ok) throw new Error('UPLOAD FAILED');
      return res.json();
    }
  },
  
  deleteRock(rockId: string): Promise<void> {
    return this._withSyncStatus(this._deleteRock(rockId));
  },
  async _deleteRock(rockId: string): Promise<void> {
    if (USE_MOCK_SERVER) {
      await simulateSignalLatency();
      const user = this.getCurrentUser();
      if (!user) throw new Error('UPLINK DISCONNECTED');

      let allRocks = JSON.parse(localStorage.getItem('mock_rocks') || '[]');
      allRocks = allRocks.filter((r: any) => !(r.id === rockId && r.userId === user.id));
      localStorage.setItem('mock_rocks', JSON.stringify(allRocks));
    } else {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/rocks/${rockId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('PURGE FAILED');
    }
  }
};

// Simulate variable network latency for realism
const simulateSignalLatency = () => new Promise(resolve => {
    const latency = Math.floor(Math.random() * 600) + 200; // 200ms - 800ms
    setTimeout(resolve, latency);
});
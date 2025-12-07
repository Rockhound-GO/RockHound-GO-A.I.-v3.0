import { Rock } from '../types';

// --- CONFIGURATION ---
// Set this to FALSE when you deploy the server/index.js code to a real server.
// Set this to TRUE to test the UI in the browser preview.
const USE_MOCK_SERVER = true; 
const API_URL = 'http://localhost:3000'; // Replace with your deployed server URL

// --- TYPES ---
export interface User {
  id: string;
  username: string;
  email: string;
  token?: string;
  xp: number;
  level: number;
  avatarUrl?: string;
  createdAt?: string;
  isAdmin?: boolean;
}

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

// --- API CLIENT ---
export const api = {
  onSyncStatusChange: ((isSyncing: boolean) => {}) as (isSyncing: boolean) => void,

  async _withSyncStatus<T>(promise: Promise<T>): Promise<T> {
    this.onSyncStatusChange(true);
    try {
      return await promise;
    } finally {
      this.onSyncStatusChange(false);
    }
  },

  // --- AUTHENTICATION ---
  
  register(username: string, email: string, password: string): Promise<User> {
    return this._withSyncStatus(this._register(username, email, password));
  },
  async _register(username: string, email: string, password: string): Promise<User> {
    if (USE_MOCK_SERVER) {
      await simulateDelay(800);
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      if (users.find((u: any) => u.email === email)) throw new Error('Email already exists');
      if (users.find((u: any) => u.username === username)) throw new Error('Username already exists');
      
      const newUser = { 
        id: crypto.randomUUID(), 
        username, 
        email, 
        password, 
        xp: 0, 
        level: 1,
        // Make first user admin for demo
        isAdmin: users.length === 0,
        createdAt: new Date().toISOString() 
      }; 
      users.push(newUser);
      localStorage.setItem('mock_users', JSON.stringify(users));
      
      const user = { ...newUser, token: 'mock-jwt-token' };
      delete (user as any).password;
      
      localStorage.setItem('current_user', JSON.stringify(user));
      return user;
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
      await simulateDelay(600);
      let users = JSON.parse(localStorage.getItem('mock_users') || '[]');

      // --- AUTO-SEED ADMIN FIX ---
      if (!users.find((u: any) => u.email === 'admin@rockhound.com')) {
          const adminUser = {
              id: 'admin-user-id',
              username: 'Admin',
              email: 'admin@rockhound.com',
              password: 'admin',
              xp: 5000,
              level: 5,
              isAdmin: true,
              avatarUrl: null,
              createdAt: new Date().toISOString()
          };
          users.push(adminUser);
          localStorage.setItem('mock_users', JSON.stringify(users));
      }
      // ---------------------------

      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) throw new Error('Invalid credentials');
      
      const userObj = { ...user, token: 'mock-jwt-token' };
      delete userObj.password;
      
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
      await simulateDelay(600);
      const currentUser = this.getCurrentUser();
      if (!currentUser) throw new Error("Not logged in");

      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const userIndex = users.findIndex((u: any) => u.id === currentUser.id);
      
      if (userIndex === -1) throw new Error("User not found");

      if (userData.username || userData.email) {
        const existing = users.find((u: any) => 
          u.id !== currentUser.id && 
          ((userData.username && u.username === userData.username) || (userData.email && u.email === userData.email))
        );
        if (existing) throw new Error("Username or Email already taken");
      }

      const updatedUser = { ...users[userIndex], ...userData };
      users[userIndex] = updatedUser;
      localStorage.setItem('mock_users', JSON.stringify(users));
      
      const safeUser = { ...updatedUser, token: 'mock-jwt-token' };
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

  getAdminStats(): Promise<AdminStats> {
    return this._withSyncStatus(this._getAdminStats());
  },
  async _getAdminStats(): Promise<AdminStats> {
      if (USE_MOCK_SERVER) {
          await simulateDelay(800);
          const currentUser = this.getCurrentUser();
          if (!currentUser?.isAdmin) throw new Error("Unauthorized");

          const activityData = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              return {
                  _id: d.toISOString().split('T')[0],
                  count: Math.floor(Math.random() * 500) + 100
              };
          });

          const locations = Array.from({ length: 50 }, () => ({
              lat: (Math.random() * 110) - 40, 
              lng: (Math.random() * 360) - 180
          }));

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
          if (!res.ok) throw new Error('Failed to fetch admin stats');
          return res.json();
      }
  },

  // --- DATA ---

  getRocks(): Promise<Rock[]> {
    return this._withSyncStatus(this._getRocks());
  },
  async _getRocks(): Promise<Rock[]> {
    if (USE_MOCK_SERVER) {
      await simulateDelay(400);
      const user = this.getCurrentUser();
      if (!user) return [];
      const allRocks = JSON.parse(localStorage.getItem('mock_rocks') || '[]');
      return allRocks.filter((r: any) => r.userId === user.id);
    } else {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/rocks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch collection');
      return res.json();
    }
  },

  addRock(rock: Rock): Promise<AddRockResponse> {
    return this._withSyncStatus(this._addRock(rock));
  },
  async _addRock(rock: Rock): Promise<AddRockResponse> {
    if (USE_MOCK_SERVER) {
      await simulateDelay(500);
      const user = this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');
      
      const allRocks = JSON.parse(localStorage.getItem('mock_rocks') || '[]');
      const newRock = { ...rock, userId: user.id };
      allRocks.unshift(newRock);
      localStorage.setItem('mock_rocks', JSON.stringify(allRocks));

      const xpGained = 50 + (rock.rarityScore || 0);
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const userIndex = users.findIndex((u: any) => u.id === user.id);
      
      let newXp = (user.xp || 0) + xpGained;
      let newLevel = Math.floor(newXp / 1000) + 1;
      let leveledUp = newLevel > (user.level || 1);

      if (userIndex !== -1) {
        users[userIndex].xp = newXp;
        users[userIndex].level = newLevel;
        localStorage.setItem('mock_users', JSON.stringify(users));
      }
      
      const updatedUser = { ...user, xp: newXp, level: newLevel };
      localStorage.setItem('current_user', JSON.stringify(updatedUser));

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
      if (!res.ok) throw new Error('Failed to save rock');
      return res.json();
    }
  },
  
  deleteRock(rockId: string): Promise<void> {
    return this._withSyncStatus(this._deleteRock(rockId));
  },
  async _deleteRock(rockId: string): Promise<void> {
    if (USE_MOCK_SERVER) {
      await simulateDelay(300);
      const user = this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      let allRocks = JSON.parse(localStorage.getItem('mock_rocks') || '[]');
      allRocks = allRocks.filter((r: any) => !(r.id === rockId && r.userId === user.id));
      localStorage.setItem('mock_rocks', JSON.stringify(allRocks));
    } else {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/rocks/${rockId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete rock');
    }
  }
};

const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
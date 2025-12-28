
import { Rock, User, Badge, OperatorStats } from '../types';

// Re-export types to maintain compatibility
export type { User, Badge, OperatorStats };

// --- NEURAL NETWORK CONFIGURATION ---
// SYSTEM OVERRIDE: Set to TRUE to bypass "Failed to fetch" errors. 
// This enables a full local simulation of the backend.
const USE_MOCK_SERVER = true; 

// SAFE ACCESS to process.env for frontend
const getEnvVar = (key: string) => {
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    return (window as any).process.env[key];
  }
  return undefined;
};

const API_URL: string = getEnvVar('BACKEND_API_URL') || 'http://localhost:3000'; 

if (!USE_MOCK_SERVER) {
    console.log('NEURAL LINK TARGET:', API_URL);
} else {
    console.log('NEURAL LINK TARGET: OFFLINE SIMULATION (MOCK_MODE)');
}

// A helper function to create the full API endpoint path
const createUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
};

// --- MOCK DATABASE ENGINE ---
// Simulates a full backend when the node server isn't running.
// Data is persisted to localStorage so it survives refreshes.

const mockDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

const mockGet = <T>(key: string, defaultVal: T): T => {
    try {
        const item = localStorage.getItem(`mock_db_${key}`);
        return item ? JSON.parse(item) : defaultVal;
    } catch { return defaultVal; }
};

const mockSet = (key: string, val: any) => {
    localStorage.setItem(`mock_db_${key}`, JSON.stringify(val));
};

const MockDB = {
    // Mock Methods
    async register(username: string, email: string, password: string): Promise<User> {
        await mockDelay(800);
        const users = mockGet<User[]>('users', []);
        if (users.find((u: any) => u.email === email)) throw new Error('IDENTITY CONFLICT: Email already registered');
        
        const newUser: User = {
            id: crypto.randomUUID(),
            username,
            email,
            // In a real app, password would be hashed. In mock, we store as is (insecure but functional for demo)
            xp: 0,
            level: 1,
            rankTitle: 'Novice Scout',
            createdAt: new Date().toISOString(),
            isAdmin: users.length === 0, // First user is admin
            operatorStats: { 
                totalScans: 0, 
                distanceTraveled: 0, 
                uniqueSpeciesFound: 0, 
                legendaryFinds: 0, 
                scanStreak: 0,
                highestRarityFound: 0 
            }
        } as any;
        // Store password separately for login check
        (newUser as any).password = password; 
        
        users.push(newUser);
        mockSet('users', users);
        return newUser;
    },

    async login(email: string, password: string): Promise<User> {
        await mockDelay(600);
        const users = mockGet<any[]>('users', []);
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) throw new Error('ACCESS DENIED: Invalid credentials');
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        const userIndex = users.findIndex(u => u.id === user.id);
        users[userIndex] = user;
        mockSet('users', users);

        return user;
    },

    async updateProfile(id: string, updates: Partial<User>): Promise<User> {
        await mockDelay(500);
        const users = mockGet<User[]>('users', []);
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('USER NOT FOUND');
        
        const updatedUser = { ...users[index], ...updates };
        users[index] = updatedUser;
        mockSet('users', users);
        return updatedUser;
    },

    async getRocks(userId: string): Promise<Rock[]> {
        await mockDelay(400);
        const rocks = mockGet<Rock[]>('rocks', []);
        return rocks.filter(r => r.userId === userId).sort((a, b) => b.dateFound - a.dateFound);
    },

    async addRock(rock: Rock): Promise<{ rock: Rock, userStats: any }> {
        await mockDelay(800);
        const rocks = mockGet<Rock[]>('rocks', []);
        rocks.push(rock);
        mockSet('rocks', rocks);

        // Gamification Logic
        const users = mockGet<User[]>('users', []);
        const userIndex = users.findIndex(u => u.id === rock.userId);
        let userStats = { xp: 0, level: 1, xpGained: 0, leveledUp: false };
        
        if (userIndex !== -1) {
            const user = users[userIndex];
            const xpGained = 50 + (rock.rarityScore || 0);
            const newXp = (user.xp || 0) + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;
            const leveledUp = newLevel > (user.level || 1);
            
            user.xp = newXp;
            user.level = newLevel;
            
            // Update stats
            if (!user.operatorStats) {
                user.operatorStats = { 
                    totalScans: 0, 
                    distanceTraveled: 0, 
                    uniqueSpeciesFound: 0, 
                    legendaryFinds: 0, 
                    scanStreak: 0,
                    highestRarityFound: 0
                };
            }
            user.operatorStats.totalScans++;
            if (rock.rarityScore > 90) user.operatorStats.legendaryFinds++;
            if (rock.rarityScore > (user.operatorStats.highestRarityFound || 0)) {
                user.operatorStats.highestRarityFound = rock.rarityScore;
            }
            
            users[userIndex] = user;
            mockSet('users', users);
            
            userStats = { xp: newXp, level: newLevel, xpGained, leveledUp };
        }
        
        return { rock, userStats };
    },

    async deleteRock(rockId: string): Promise<void> {
        await mockDelay(300);
        let rocks = mockGet<Rock[]>('rocks', []);
        rocks = rocks.filter(r => r.id !== rockId);
        mockSet('rocks', rocks);
    },

    async getAdminStats(): Promise<AdminStats> {
        await mockDelay(500);
        const users = mockGet<User[]>('users', []);
        const rocks = mockGet<Rock[]>('rocks', []);
        
        // Activity data
        const activityData = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return { _id: d.toISOString().split('T')[0], count: Math.floor(Math.random() * 10) };
        }).reverse();

        return {
            totalUsers: users.length,
            activeUsers: users.length, 
            totalRocks: rocks.length,
            activityData,
            locations: rocks.filter(r => r.location).map(r => r.location!).slice(0, 100)
        };
    }
};

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
      setTimeout(() => this.onSyncStatusChange(false), 300);
    }
  },

  _getToken: (): string | null => {
    const token = localStorage.getItem('token');
    // Bypassing Auth check if mock mode is on and we have a current user
    if (!token && USE_MOCK_SERVER && localStorage.getItem('current_user_data')) {
        return 'mock_token_bypass';
    }
    return token;
  },

  async _handleResponse(res: Response): Promise<any> {
    if (!res.ok) {
      let errorMessage = `API Error: HTTP ${res.status}`;
      let errorDetails: any = null;
      try {
        errorDetails = await res.json();
        errorMessage = errorDetails.message || errorMessage;
      } catch (jsonError) {
        const textError = await res.text();
        errorMessage = `HTTP ${res.status}: ${res.statusText || 'Unknown Error'}.`;
        console.error('Non-JSON error response from server:', textError);
        errorDetails = { raw: textError };
      }
      const error = new Error(errorMessage);
      (error as any).status = res.status;
      (error as any).details = errorDetails;
      throw error;
    }
    return res.json();
  },

  register(username: string, email: string, password: string): Promise<User> {
    return this._withSyncStatus(this._register(username, email, password));
  },
  async _register(username: string, email: string, password: string): Promise<User> {
    if (USE_MOCK_SERVER) {
        const user = await MockDB.register(username, email, password);
        localStorage.setItem('token', 'mock_token_' + user.id);
        localStorage.setItem('current_user_data', JSON.stringify(user));
        return user;
    }

    try {
      const res = await fetch(createUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await this._handleResponse(res);
      localStorage.setItem('token', data.token);
      localStorage.setItem('current_user_data', JSON.stringify(data.user));
      return data.user;
    } catch (error: any) {
      console.error("Register Network Error:", error);
      if (
          error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError'
      ) {
        throw new Error(`SERVER OFFLINE: Unable to connect to ${API_URL}. Is the backend running?`);
      }
      throw error;
    }
  },

  login(email: string, password: string): Promise<User> {
    return this._withSyncStatus(this._login(email, password));
  },
  async _login(email: string, password: string): Promise<User> {
    if (USE_MOCK_SERVER) {
        const user = await MockDB.login(email, password);
        localStorage.setItem('token', 'mock_token_' + user.id);
        localStorage.setItem('current_user_data', JSON.stringify(user));
        return user;
    }

    try {
      const res = await fetch(createUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await this._handleResponse(res);
      localStorage.setItem('token', data.token);
      localStorage.setItem('current_user_data', JSON.stringify(data.user));
      return data.user;
    } catch (error: any) {
      console.error("Login Network Error:", error);
      if (
          error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError'
      ) {
        throw new Error(`SERVER OFFLINE: Unable to connect to ${API_URL}. Is the backend running?`);
      }
      throw error;
    }
  },

  updateProfile(userData: Partial<User>): Promise<User> {
    return this._withSyncStatus(this._updateProfile(userData));
  },
  async _updateProfile(userData: Partial<User>): Promise<User> {
    const token = this._getToken();
    if (!token) throw new Error("Authentication required.");
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error("User session lost");

    if (USE_MOCK_SERVER) {
        const updated = await MockDB.updateProfile(currentUser.id, userData);
        localStorage.setItem('current_user_data', JSON.stringify(updated));
        return updated;
    }

    const res = await fetch(createUrl('/api/user/profile'), {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });
    const updatedUser = await this._handleResponse(res);
    localStorage.setItem('current_user_data', JSON.stringify(updatedUser));
    return updatedUser;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('current_user_data');
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('current_user_data');
    return stored ? JSON.parse(stored) : null;
  },

  getAdminStats(): Promise<AdminStats> {
    return this._withSyncStatus(this._getAdminStats());
  },
  async _getAdminStats(): Promise<AdminStats> {
    const token = this._getToken();
    if (!token) throw new Error("Authentication required.");

    if (USE_MOCK_SERVER) {
        return MockDB.getAdminStats();
    }

    const res = await fetch(createUrl('/api/admin/stats'), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return this._handleResponse(res);
  },

  getRocks(): Promise<Rock[]> {
    return this._withSyncStatus(this._getRocks());
  },
  async _getRocks(): Promise<Rock[]> {
    const token = this._getToken();
    if (!token) throw new Error("Authentication required.");
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error("User session lost");

    if (USE_MOCK_SERVER) {
        return MockDB.getRocks(currentUser.id);
    }

    const res = await fetch(createUrl('/api/rocks'), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return this._handleResponse(res);
  },

  addRock(rock: Rock): Promise<AddRockResponse> {
    return this._withSyncStatus(this._addRock(rock));
  },
  async _addRock(rock: Rock): Promise<AddRockResponse> {
    const token = this._getToken();
    if (!token) throw new Error("Authentication required.");

    if (USE_MOCK_SERVER) {
        const response = await MockDB.addRock(rock);
        const currentUserData = this.getCurrentUser();
        if (currentUserData) {
            const updatedUser = { 
                ...currentUserData, 
                xp: response.userStats.xp, 
                level: response.userStats.level,
                operatorStats: (response.rock.userId === currentUserData.id) ? {
                    ...currentUserData.operatorStats!,
                    totalScans: (currentUserData.operatorStats?.totalScans || 0) + 1,
                    legendaryFinds: (response.rock.rarityScore > 90) ? (currentUserData.operatorStats?.legendaryFinds || 0) + 1 : (currentUserData.operatorStats?.legendaryFinds || 0),
                    highestRarityFound: Math.max(currentUserData.operatorStats?.highestRarityFound || 0, response.rock.rarityScore)
                } : currentUserData.operatorStats
            };
            localStorage.setItem('current_user_data', JSON.stringify(updatedUser));
        }
        return response;
    }

    const res = await fetch(createUrl('/api/rocks'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(rock)
    });
    const data = await this._handleResponse(res);
    const currentUserData = this.getCurrentUser();
    if (currentUserData) {
        const updatedUser = { ...currentUserData, xp: data.userStats.xp, level: data.userStats.level };
        localStorage.setItem('current_user_data', JSON.stringify(updatedUser));
    }
    return data;
  },
  
  deleteRock(rockId: string): Promise<void> {
    return this._withSyncStatus(this._deleteRock(rockId));
  },
  async _deleteRock(rockId: string): Promise<void> {
    const token = this._getToken();
    if (!token) throw new Error("Authentication required.");

    if (USE_MOCK_SERVER) {
        return MockDB.deleteRock(rockId);
    }

    const res = await fetch(createUrl(`/api/rocks/${rockId}`), {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await this._handleResponse(res);
  }
};

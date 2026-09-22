const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = {
  users: [],
  history: [],
  bets: []
};

// Seed default users if empty
function initDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(content);
    } catch (err) {
      console.error('Error reading db.json, recreating defaults...', err);
      seedDefaults();
    }
  } else {
    seedDefaults();
  }

  // Ensure default admin exists
  if (!db.users.find(u => u.username === 'admin')) {
    const salt = bcrypt.genSaltSync(10);
    db.users.push({
      id: 'admin-01',
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin888', salt),
      role: 'admin',
      balance: 999999999,
      createdAt: new Date().toISOString()
    });
    saveDb();
  }

  // Ensure default player accounts exist
  const defaultPlayers = [
    { username: 'player1', balance: 50000000 },
    { username: 'player2', balance: 30000000 },
    { username: 'player3', balance: 25000000 },
    { username: 'player4', balance: 20000000 },
    { username: 'player5', balance: 15000000 },
    { username: 'player6', balance: 10000000 }
  ];

  defaultPlayers.forEach((p, idx) => {
    if (!db.users.find(u => u.username === p.username)) {
      const salt = bcrypt.genSaltSync(10);
      db.users.push({
        id: `player-0${idx + 1}`,
        username: p.username,
        passwordHash: bcrypt.hashSync('123456', salt),
        role: 'user',
        balance: p.balance,
        createdAt: new Date().toISOString()
      });
      saveDb();
    }
  });
}

function seedDefaults() {
  const salt = bcrypt.genSaltSync(10);
  db = {
    users: [
      {
        id: 'admin-01',
        username: 'admin',
        passwordHash: bcrypt.hashSync('admin888', salt),
        role: 'admin',
        balance: 999999999,
        createdAt: new Date().toISOString()
      },
      {
        id: 'player-01',
        username: 'player1',
        passwordHash: bcrypt.hashSync('123456', salt),
        role: 'user',
        balance: 50000000,
        createdAt: new Date().toISOString()
      },
      {
        id: 'player-02',
        username: 'player2',
        passwordHash: bcrypt.hashSync('123456', salt),
        role: 'user',
        balance: 20000000,
        createdAt: new Date().toISOString()
      }
    ],
    history: generateInitialHistory(),
    bets: []
  };
  saveDb();
}

function generateInitialHistory() {
  const initial = [];
  const now = Date.now();
  for (let i = 30; i >= 1; i--) {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2 + d3;
    const isTriple = (d1 === d2 && d2 === d3);
    let result = total >= 11 ? 'tai' : 'xiu';
    if (isTriple) result = 'bao';

    initial.push({
      roundId: 1000 + (30 - i),
      dice: [d1, d2, d3],
      total,
      result,
      timestamp: new Date(now - i * 45000).toISOString()
    });
  }
  return initial;
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

initDb();

module.exports = {
  getUserById(id) {
    return db.users.find(u => u.id === id);
  },

  getUserByUsername(username) {
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  createUser(username, password, role = 'user', initialBalance = 10000000) {
    const salt = bcrypt.genSaltSync(10);
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      username: username.trim(),
      passwordHash: bcrypt.hashSync(password, salt),
      role,
      balance: initialBalance,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDb();
    return newUser;
  },

  updateUserBalance(userId, delta) {
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.balance = Math.max(0, user.balance + delta);
    saveDb();
    return user.balance;
  },

  setUserBalance(userId, newBalance) {
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.balance = Math.max(0, Math.floor(newBalance));
    saveDb();
    return user.balance;
  },

  getAllUsers() {
    return db.users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      balance: u.balance,
      createdAt: u.createdAt
    }));
  },

  addGameHistory(roundRecord) {
    db.history.push(roundRecord);
    if (db.history.length > 200) {
      db.history.shift();
    }
    saveDb();
  },

  getGameHistory(limit = 50) {
    return db.history.slice(-limit);
  },

  addBetRecord(bet) {
    db.bets.push(bet);
    if (db.bets.length > 1000) {
      db.bets.shift();
    }
    saveDb();
  },

  getUserBets(userId, limit = 20) {
    return db.bets.filter(b => b.userId === userId).slice(-limit);
  }
};

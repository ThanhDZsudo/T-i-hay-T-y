const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');

const db = require('./db');
const GameEngine = require('./gameEngine');

const JWT_SECRET = 'taixiu_secret_vip_key_999888';
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize Game Engine
const gameEngine = new GameEngine(io);
gameEngine.start();

// JWT Helper
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware: Authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Chưa cung cấp token đăng nhập!' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
    const user = db.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại!' });
    }
    req.user = user;
    next();
  });
}

// Middleware: Require Admin Role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối! Chỉ dành cho Admin.' });
  }
  next();
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên tài khoản và mật khẩu!' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ success: false, message: 'Tên tài khoản phải từ 3 đến 20 ký tự!' });
  }

  if (password.length < 5) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 5 ký tự!' });
  }

  const existing = db.getUserByUsername(username);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Tên tài khoản đã tồn tại, vui lòng chọn tên khác!' });
  }

  // Initial balance: 10,000,000 Xu
  const newUser = db.createUser(username, password, 'user', 10000000);
  const token = generateToken(newUser);

  res.json({
    success: true,
    message: 'Đăng ký thành công! Tặng bạn 10,000,000 Xu khởi nghiệp.',
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      balance: newUser.balance
    }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên tài khoản và mật khẩu!' });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(400).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác!' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác!' });
  }

  const token = generateToken(user);
  res.json({
    success: true,
    message: 'Đăng nhập thành công!',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      balance: user.balance
    }
  });
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      balance: req.user.balance
    }
  });
});

// Mock Deposit (Nạp tiền demo chơi thả ga)
app.post('/api/user/deposit', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const depositAmount = parseInt(amount, 10);

  if (!depositAmount || depositAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Số tiền nạp không hợp lệ!' });
  }

  const newBalance = db.updateUserBalance(req.user.id, depositAmount);
  io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance });

  // Update admin view as well
  gameEngine.broadcastAdminUpdate();

  res.json({
    success: true,
    message: `Nạp thành công ${depositAmount.toLocaleString('vi-VN')} Xu!`,
    balance: newBalance
  });
});

// Get Game History (Soi cầu)
app.get('/api/game/history', (req, res) => {
  const history = db.getGameHistory(50);
  res.json({ success: true, history });
});

// Get User Bets
app.get('/api/game/my-bets', authenticateToken, (req, res) => {
  const bets = db.getUserBets(req.user.id, 30);
  res.json({ success: true, bets });
});

// ==================== ADMIN ROUTES ====================

// Get All Users for Admin
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const users = db.getAllUsers();
  res.json({ success: true, users });
});

// Admin Adjust User Balance
app.post('/api/admin/adjust-balance', authenticateToken, requireAdmin, (req, res) => {
  const { userId, amount, action } = req.body;
  const numAmount = parseInt(amount, 10);

  if (isNaN(numAmount)) {
    return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ!' });
  }

  let newBalance;
  if (action === 'set') {
    newBalance = db.setUserBalance(userId, numAmount);
  } else {
    newBalance = db.updateUserBalance(userId, numAmount);
  }

  if (newBalance === null) {
    return res.status(404).json({ success: false, message: 'Người dùng không tồn tại!' });
  }

  io.to(`user_${userId}`).emit('balance_update', { balance: newBalance });
  gameEngine.broadcastAdminUpdate();

  res.json({
    success: true,
    message: `Đã cập nhật số dư người dùng thành ${newBalance.toLocaleString('vi-VN')} Xu!`,
    balance: newBalance
  });
});

// Admin Set Next Outcome (Force Tai / Xiu / Dice)
app.post('/api/admin/set-outcome', authenticateToken, requireAdmin, (req, res) => {
  const { outcome } = req.body; // 'auto' | 'tai' | 'xiu' | 'bao' | [d1, d2, d3]
  const val = outcome === 'auto' ? null : outcome;
  const result = gameEngine.setAdminOutcome(val);
  res.json({ success: true, message: 'Đã cập nhật chỉ định kết quả phiên tiếp theo!', outcome: result.outcome });
});

// Admin Set Player Win Rate (0% - 100%)
app.post('/api/admin/set-win-rate', authenticateToken, requireAdmin, (req, res) => {
  const { winRate } = req.body;
  const rate = parseInt(winRate, 10);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return res.status(400).json({ success: false, message: 'Tỉ lệ thắng không hợp lệ (phải từ 0% đến 100%)!' });
  }
  const updatedRate = gameEngine.setPlayerWinRate(rate);
  res.json({
    success: true,
    message: `Đã cập nhật tỉ lệ người chơi thắng thành ${updatedRate}%!`,
    winRate: updatedRate
  });
});

// Admin Toggle Bot System
app.post('/api/admin/set-bot-status', authenticateToken, requireAdmin, (req, res) => {
  const { enabled } = req.body;
  const newState = gameEngine.setBotEnabled(enabled);
  res.json({
    success: true,
    message: newState ? 'Đã BẬT hệ thống Bot cược tự động!' : 'Đã TẮT hệ thống Bot cược tự động!',
    botEnabled: newState
  });
});

// Admin Set Bot Crowd / Bet Range
app.post('/api/admin/set-bot-config', authenticateToken, requireAdmin, (req, res) => {
  const { crowdLevel } = req.body; // 'low' (5-10) | 'medium' (10-25) | 'high' (25-45)
  let config = {};
  if (crowdLevel === 'low') {
    config = { minBotsPerRound: 5, maxBotsPerRound: 10 };
  } else if (crowdLevel === 'high') {
    config = { minBotsPerRound: 25, maxBotsPerRound: 45 };
  } else {
    config = { minBotsPerRound: 12, maxBotsPerRound: 25 };
  }

  const updated = gameEngine.setBotConfig(config);
  res.json({
    success: true,
    message: `Đã chuyển mật độ Bot sang chế độ: ${crowdLevel.toUpperCase()}`,
    config: updated
  });
});

// Admin Dashboard Summary Stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const allUsers = db.getAllUsers();
  const history = db.getGameHistory(100);
  const totalUsers = allUsers.length;
  const totalBalance = allUsers.reduce((sum, u) => sum + u.balance, 0);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalBalance,
      recentRounds: history.length,
      currentRound: gameEngine.roundId
    }
  });
});

// ==================== SOCKET.IO REALTIME ====================

io.on('connection', (socket) => {
  let authenticatedUser = null;

  // Send initial game state
  socket.emit('init_state', gameEngine.getPublicState());

  // Authenticate socket
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.getUserById(decoded.id);
      if (user) {
        authenticatedUser = user;
        socket.join(`user_${user.id}`);

        if (user.role === 'admin') {
          socket.join('admin_room');
          console.log(`[Socket] Admin joined: ${user.username}`);
          gameEngine.broadcastAdminUpdate();
        }

        socket.emit('authenticated', {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            balance: user.balance
          }
        });
      }
    } catch (err) {
      socket.emit('auth_error', { message: 'Xác thực socket không thành công' });
    }
  });

  // User Place Bet
  socket.on('place_bet', (data, callback) => {
    if (!authenticatedUser) {
      const resp = { success: false, message: 'Vui lòng đăng nhập để đặt cược!' };
      if (typeof callback === 'function') callback(resp);
      return socket.emit('bet_response', resp);
    }

    const betType = data.betType || data.type;
    const amount = parseInt(data.amount, 10);
    const result = gameEngine.placeBet(authenticatedUser.id, betType, amount);

    if (result.success) {
      // Update local user reference balance
      authenticatedUser.balance = result.balance;
    }

    if (typeof callback === 'function') {
      callback(result);
    }
    socket.emit('bet_response', result);
  });

  // Admin Force Outcome directly via socket
  socket.on('admin_force_outcome', (data) => {
    if (!authenticatedUser || authenticatedUser.role !== 'admin') {
      return socket.emit('error_message', { message: 'Chỉ Admin mới có quyền can thiệp!' });
    }
    const val = data.outcome === 'auto' ? null : data.outcome;
    gameEngine.setAdminOutcome(val);
  });

  socket.on('disconnect', () => {
    // Notify admin on connection change
    gameEngine.broadcastAdminUpdate();
  });
});

// ==================== START SERVER ====================
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎰 TÀI XỈU VIP REALTIME SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`👑 Admin Account: admin / admin888`);
  console.log(`🎮 Player 1: player1 / 123456`);
  console.log(`🎮 Player 2: player2 / 123456`);
  console.log(`====================================================`);
});

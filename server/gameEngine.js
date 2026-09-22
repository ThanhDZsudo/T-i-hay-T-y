const db = require('./db');
const BotEngine = require('./botEngine');

class GameEngine {
  constructor(io) {
    this.io = io;
    this.roundId = 1031;
    this.phase = 'betting'; // 'betting' | 'shaking' | 'revealing'
    this.timeLeft = 30; // seconds

    this.BETTING_TIME = 60; // 60s thời gian đặt cược
    this.SHAKING_TIME = 5;  // 5s thời gian lắc xúc xắc
    this.REVEALING_TIME = 15; // 15s thời gian cho người chơi nặn/mở bát

    // Current round active bets: map of userId -> { userId, username, isBot, tai: 0, xiu: 0, timestamp }
    this.currentBets = new Map();

    // Aggregates
    this.totalTai = 0;
    this.totalXiu = 0;
    this.countTai = 0;
    this.countXiu = 0;

    // Current round dice result
    this.currentDice = [1, 2, 3];
    this.currentTotal = 6;
    this.currentResult = 'xiu';

    // Admin intervention override
    this.adminOutcome = null; // null (auto) | 'tai' | 'xiu' | 'bao' | [d1, d2, d3]

    // Admin Win Rate configuration (0 - 100%)
    // 50 = 50/50 fair RNG, < 50 = House edge (player wins less), > 50 = Player advantage
    this.playerWinRate = 50;

    // Initialize Bot Engine
    this.botEngine = new BotEngine(this);

    // Initialize roundId based on existing history
    const history = db.getGameHistory(1);
    if (history.length > 0) {
      this.roundId = history[history.length - 1].roundId + 1;
    }

    this.timer = null;
  }

  start() {
    this.startBettingPhase();
    this.timer = setInterval(() => this.tick(), 1000);
    console.log(`[GameEngine] Started. Current Round: #${this.roundId}`);
  }

  tick() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
    }

    // Broadcast tick updates
    this.broadcastTick();

    // Check phase transition
    if (this.timeLeft <= 0) {
      if (this.phase === 'betting') {
        this.startShakingPhase();
      } else if (this.phase === 'shaking') {
        this.startRevealingPhase();
      } else if (this.phase === 'revealing') {
        this.startNextRound();
      }
    }
  }

  startBettingPhase() {
    this.phase = 'betting';
    this.timeLeft = this.BETTING_TIME;
    this.currentBets.clear();
    this.totalTai = 0;
    this.totalXiu = 0;
    this.countTai = 0;
    this.countXiu = 0;

    // Trigger Bot Players for new round
    if (this.botEngine) {
      this.botEngine.onNewRound(this.roundId);
    }

    this.io.emit('new_round', {
      roundId: this.roundId,
      phase: this.phase,
      timeLeft: this.timeLeft,
      totalTai: 0,
      totalXiu: 0,
      countTai: 0,
      countXiu: 0,
      history: db.getGameHistory(30)
    });

    this.broadcastAdminUpdate();
  }

  startShakingPhase() {
    this.phase = 'shaking';
    this.timeLeft = this.SHAKING_TIME;

    // Hủy bỏ lịch cược của bot khi hết giờ cược
    if (this.botEngine) {
      this.botEngine.clearSchedule();
    }

    // Determine dice outcome based on RNG or Admin override
    this.determineDiceOutcome();

    this.io.emit('round_shaking', {
      roundId: this.roundId,
      phase: this.phase,
      timeLeft: this.timeLeft
    });

    this.broadcastAdminUpdate();
  }

  determineDiceOutcome() {
    if (this.adminOutcome) {
      console.log(`[GameEngine] Admin intervention active:`, this.adminOutcome);
      if (Array.isArray(this.adminOutcome) && this.adminOutcome.length === 3) {
        this.currentDice = [...this.adminOutcome];
      } else if (this.adminOutcome === 'tai') {
        this.currentDice = this.generateDiceForOutcome('tai');
      } else if (this.adminOutcome === 'xiu') {
        this.currentDice = this.generateDiceForOutcome('xiu');
      } else if (this.adminOutcome === 'bao') {
        const val = Math.floor(Math.random() * 6) + 1;
        this.currentDice = [val, val, val];
      }
      // Reset one-time override
      this.adminOutcome = null;
    } else {
      // Check if any REAL HUMAN PLAYERS bet in this round
      const realBets = Array.from(this.currentBets.values()).filter(b => !b.isBot);
      const realTai = realBets.reduce((sum, b) => sum + (b.tai || 0), 0);
      const realXiu = realBets.reduce((sum, b) => sum + (b.xiu || 0), 0);

      if (realBets.length > 0 && realTai !== realXiu && this.playerWinRate !== 50) {
        // Smart algorithm targeting real players according to admin win rate
        const shouldPlayerWin = (Math.random() * 100) < this.playerWinRate;
        console.log(`[GameEngine] Real player bet detected (Tai: ${realTai}, Xiu: ${realXiu}). WinRate=${this.playerWinRate}%, shouldWin=${shouldPlayerWin}`);

        let winningDoor;
        if (realTai > realXiu) {
          winningDoor = shouldPlayerWin ? 'tai' : 'xiu';
        } else {
          winningDoor = shouldPlayerWin ? 'xiu' : 'tai';
        }
        this.currentDice = this.generateDiceForOutcome(winningDoor);
      } else if (this.totalTai !== this.totalXiu && this.playerWinRate !== 50) {
        // Only bot bets present, balance overall pool
        const shouldPlayerWin = (Math.random() * 100) < this.playerWinRate;
        const winningDoor = this.totalTai > this.totalXiu 
          ? (shouldPlayerWin ? 'tai' : 'xiu')
          : (shouldPlayerWin ? 'xiu' : 'tai');
        this.currentDice = this.generateDiceForOutcome(winningDoor);
      } else {
        // Fair natural RNG
        this.currentDice = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ];
      }
    }

    this.currentTotal = this.currentDice[0] + this.currentDice[1] + this.currentDice[2];
    const isTriple = (this.currentDice[0] === this.currentDice[1] && this.currentDice[1] === this.currentDice[2]);
    if (isTriple) {
      this.currentResult = 'bao';
    } else if (this.currentTotal >= 11) {
      this.currentResult = 'tai';
    } else {
      this.currentResult = 'xiu';
    }
  }

  generateDiceForOutcome(outcome) {
    let d1, d2, d3, total, isTriple;
    if (outcome === 'tai') {
      do {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
        d3 = Math.floor(Math.random() * 6) + 1;
        total = d1 + d2 + d3;
        isTriple = (d1 === d2 && d2 === d3);
      } while (total < 11 || isTriple);
    } else {
      do {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
        d3 = Math.floor(Math.random() * 6) + 1;
        total = d1 + d2 + d3;
        isTriple = (d1 === d2 && d2 === d3);
      } while (total > 10 || isTriple);
    }
    return [d1, d2, d3];
  }

  setPlayerWinRate(rate) {
    this.playerWinRate = Math.max(0, Math.min(100, parseInt(rate, 10)));
    console.log(`[GameEngine] Player win rate updated: ${this.playerWinRate}%`);
    this.broadcastAdminUpdate();
    return this.playerWinRate;
  }

  startRevealingPhase() {
    this.phase = 'revealing';
    this.timeLeft = this.REVEALING_TIME;

    // Calculate payouts
    let totalPayout = 0;
    const roundWinners = [];
    const roundLosers = [];

    for (const [userId, bet] of this.currentBets.entries()) {
      let winAmount = 0;
      let isWin = false;

      if (this.currentResult === 'tai' && bet.tai > 0) {
        winAmount = Math.round(bet.tai * 1.7); // Tỷ lệ 1 ăn 0.7: hoàn vốn 1 + thưởng 0.7
        isWin = true;
      } else if (this.currentResult === 'xiu' && bet.xiu > 0) {
        winAmount = Math.round(bet.xiu * 1.7); // Tỷ lệ 1 ăn 0.7: hoàn vốn 1 + thưởng 0.7
        isWin = true;
      }

      // Xử lý riêng cho Bot (không ghi vào SQLite/file DB)
      if (bet.isBot) {
        if (isWin) {
          bet.balance = (bet.balance || 0) + winAmount;
          totalPayout += winAmount;
          roundWinners.push({
            userId,
            username: bet.username,
            isBot: true,
            winAmount,
            betChoice: this.currentResult,
            newBalance: bet.balance
          });
        } else {
          roundLosers.push({
            userId,
            username: bet.username,
            isBot: true,
            lostAmount: bet.tai + bet.xiu,
            balance: bet.balance
          });
        }
        continue;
      }

      // Xử lý cho người chơi thật (Real Human Player)
      if (winAmount > 0) {
        const newBalance = db.updateUserBalance(userId, winAmount);
        totalPayout += winAmount;
        roundWinners.push({
          userId,
          username: bet.username,
          isBot: false,
          winAmount,
          betChoice: this.currentResult,
          newBalance
        });

        // Send individual win notification to player
        this.io.to(`user_${userId}`).emit('round_payout', {
          roundId: this.roundId,
          win: true,
          winAmount,
          balance: newBalance,
          dice: this.currentDice,
          total: this.currentTotal,
          result: this.currentResult
        });
      } else {
        const user = db.getUserById(userId);
        roundLosers.push({
          userId,
          username: bet.username,
          isBot: false,
          lostAmount: bet.tai + bet.xiu,
          balance: user ? user.balance : 0
        });

        // Send individual lose notification
        this.io.to(`user_${userId}`).emit('round_payout', {
          roundId: this.roundId,
          win: false,
          winAmount: 0,
          balance: user ? user.balance : 0,
          dice: this.currentDice,
          total: this.currentTotal,
          result: this.currentResult
        });
      }

      // Record bet into DB history
      if (bet.tai > 0) {
        db.addBetRecord({
          roundId: this.roundId,
          userId,
          username: bet.username,
          type: 'tai',
          amount: bet.tai,
          winAmount: this.currentResult === 'tai' ? Math.round(bet.tai * 1.7) : 0,
          result: this.currentResult,
          createdAt: new Date().toISOString()
        });
      }
      if (bet.xiu > 0) {
        db.addBetRecord({
          roundId: this.roundId,
          userId,
          username: bet.username,
          type: 'xiu',
          amount: bet.xiu,
          winAmount: this.currentResult === 'xiu' ? Math.round(bet.xiu * 1.7) : 0,
          result: this.currentResult,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Save round record to history
    const roundRecord = {
      roundId: this.roundId,
      dice: this.currentDice,
      total: this.currentTotal,
      result: this.currentResult,
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      totalPayout,
      timestamp: new Date().toISOString()
    };
    db.addGameHistory(roundRecord);

    // Emit result to all players
    this.io.emit('round_result', {
      roundId: this.roundId,
      phase: this.phase,
      timeLeft: this.timeLeft,
      dice: this.currentDice,
      total: this.currentTotal,
      result: this.currentResult,
      winners: roundWinners.slice(0, 5) // top winners for ticker
    });

    // Notify Admin with detailed financial summary
    this.io.to('admin_room').emit('admin_round_settled', {
      roundRecord,
      roundWinners,
      roundLosers,
      houseProfit: (this.totalTai + this.totalXiu) - totalPayout
    });

    this.broadcastAdminUpdate();
  }

  startNextRound() {
    this.roundId++;
    this.startBettingPhase();
  }

  placeBet(userId, betType, amount) {
    if (this.phase !== 'betting') {
      return { success: false, message: 'Đã hết thời gian đặt cược phiên này!' };
    }

    if (amount <= 0 || !Number.isInteger(amount)) {
      return { success: false, message: 'Số tiền cược không hợp lệ!' };
    }

    if (betType !== 'tai' && betType !== 'xiu') {
      return { success: false, message: 'Cửa cược không hợp lệ (chỉ chọn Tài hoặc Xỉu)!' };
    }

    const user = db.getUserById(userId);
    if (!user) {
      return { success: false, message: 'Người dùng không tồn tại!' };
    }

    if (user.balance < amount) {
      return { success: false, message: 'Số dư không đủ để đặt cược!' };
    }

    // Deduct balance
    const newBalance = db.updateUserBalance(userId, -amount);

    let userBet = this.currentBets.get(userId);
    if (!userBet) {
      userBet = {
        userId,
        username: user.username,
        tai: 0,
        xiu: 0,
        balance: newBalance,
        lastUpdated: new Date().toISOString()
      };
      this.currentBets.set(userId, userBet);
    }

    if (betType === 'tai') {
      if (userBet.tai === 0) this.countTai++;
      userBet.tai += amount;
      this.totalTai += amount;
    } else {
      if (userBet.xiu === 0) this.countXiu++;
      userBet.xiu += amount;
      this.totalXiu += amount;
    }
    userBet.balance = newBalance;
    userBet.lastUpdated = new Date().toISOString();

    // Broadcast updated bet pool to all players
    this.io.emit('pool_update', {
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      countTai: this.countTai,
      countXiu: this.countXiu
    });

    // Phát sự kiện cược trực tiếp để tạo hiệu ứng sôi động trên màn hình
    this.io.emit('live_bet_stream', {
      username: user.username,
      betType,
      amount,
      isBot: false,
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      countTai: this.countTai,
      countXiu: this.countXiu
    });

    // Notify user of updated balance
    this.io.to(`user_${userId}`).emit('balance_update', {
      balance: newBalance,
      currentBet: userBet
    });

    // Notify Admin of live bet action
    this.broadcastAdminUpdate();

    return {
      success: true,
      balance: newBalance,
      currentBet: userBet,
      message: `Đặt cược thành công ${amount.toLocaleString('vi-VN')} Xu vào cửa ${betType.toUpperCase()}!`
    };
  }

  // Bot đặt cược tự động
  placeBotBet(botName, betType, amount) {
    if (this.phase !== 'betting') return;

    const botId = 'bot_' + botName;
    let userBet = this.currentBets.get(botId);
    if (!userBet) {
      userBet = {
        userId: botId,
        username: botName,
        isBot: true,
        tai: 0,
        xiu: 0,
        balance: Math.floor(Math.random() * 50000000) + 15000000,
        lastUpdated: new Date().toISOString()
      };
      this.currentBets.set(botId, userBet);
    }

    if (betType === 'tai') {
      if (userBet.tai === 0) this.countTai++;
      userBet.tai += amount;
      this.totalTai += amount;
    } else {
      if (userBet.xiu === 0) this.countXiu++;
      userBet.xiu += amount;
      this.totalXiu += amount;
    }
    userBet.balance = Math.max(0, userBet.balance - amount);
    userBet.lastUpdated = new Date().toISOString();

    // Broadcast updated bet pool to all players
    this.io.emit('pool_update', {
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      countTai: this.countTai,
      countXiu: this.countXiu
    });

    // Phát sự kiện cược trực tiếp từ bot
    this.io.emit('live_bet_stream', {
      username: botName,
      betType,
      amount,
      isBot: true,
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      countTai: this.countTai,
      countXiu: this.countXiu
    });

    // Notify Admin of live bet action
    this.broadcastAdminUpdate();
  }

  setBotEnabled(enabled) {
    if (this.botEngine) {
      const state = this.botEngine.setEnabled(enabled);
      this.broadcastAdminUpdate();
      return state;
    }
    return false;
  }

  setBotConfig(config) {
    if (this.botEngine) {
      this.botEngine.setConfig(config);
      this.broadcastAdminUpdate();
      return this.botEngine.config;
    }
    return null;
  }

  setAdminOutcome(override) {
    this.adminOutcome = override;
    console.log(`[GameEngine] Admin set outcome override:`, override);
    this.broadcastAdminUpdate();
    return { success: true, outcome: this.adminOutcome };
  }

  broadcastTick() {
    const tickData = {
      roundId: this.roundId,
      phase: this.phase,
      timeLeft: this.timeLeft,
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      countTai: this.countTai,
      countXiu: this.countXiu
    };
    this.io.emit('round_tick', tickData);
    this.io.emit('timer_tick', tickData);
  }

  broadcastAdminUpdate() {
    const betsList = Array.from(this.currentBets.values());
    this.io.to('admin_room').emit('admin_live_data', {
      roundId: this.roundId,
      phase: this.phase,
      timeLeft: this.timeLeft,
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      countTai: this.countTai,
      countXiu: this.countXiu,
      adminOutcome: this.adminOutcome,
      playerWinRate: this.playerWinRate,
      botEnabled: this.botEngine ? this.botEngine.enabled : false,
      botCountConfig: this.botEngine ? this.botEngine.config.maxBotsPerRound : 20,
      bets: betsList,
      connectedPlayersCount: this.getConnectedPlayerCount()
    });
  }

  getConnectedPlayerCount() {
    return this.io.sockets.sockets.size;
  }

  getPublicState() {
    return {
      roundId: this.roundId,
      phase: this.phase,
      timeLeft: this.timeLeft,
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      countTai: this.countTai,
      countXiu: this.countXiu,
      history: db.getGameHistory(30)
    };
  }
}

module.exports = GameEngine;

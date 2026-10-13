// PLAYER VIEW GAME CONTROLLER FOR VIP TÀI XỈU HOÀNG GIA (SUNWIN / GO88 STYLE)

document.addEventListener('DOMContentLoaded', () => {
  // Check Authentication
  const token = localStorage.getItem('taixiu_token');
  const userStr = localStorage.getItem('taixiu_user');

  if (!token || !userStr) {
    window.location.href = '/index.html';
    return;
  }

  let currentUser = JSON.parse(userStr);

  // Initialize UI Elements
  const usernameDisplay = document.getElementById('user-name');
  const balanceDisplay = document.getElementById('user-balance');
  const userAvatar = document.getElementById('user-avatar');
  const roundIdDisplay = document.getElementById('round-id');
  const phaseStatusBadge = document.getElementById('phase-status');

  const poolTaiEl = document.getElementById('pool-tai');
  const poolXiuEl = document.getElementById('pool-xiu');
  const countTaiEl = document.getElementById('count-tai');
  const countXiuEl = document.getElementById('count-xiu');

  const myBetTaiEl = document.getElementById('my-bet-tai');
  const myBetXiuEl = document.getElementById('my-bet-xiu');

  const boxTai = document.getElementById('box-tai');
  const boxXiu = document.getElementById('box-xiu');
  const btnDoorTai = document.getElementById('btn-door-tai');
  const btnDoorXiu = document.getElementById('btn-door-xiu');

  const centerTimerText = document.getElementById('center-timer-text');
  const discScoreBadge = document.getElementById('disc-score-badge');

  const winOverlay = document.getElementById('win-fanfare');
  const winAmountText = document.getElementById('win-amount-text');

  // Live Ticker & Online Players
  const liveTickerContent = document.getElementById('live-ticker-content');
  const onlinePlayersCount = document.getElementById('online-players-count');

  // Cached history for Roadmap and Soi Cầu Canvas
  let cachedHistory = [];
  let showD1 = true;
  let showD2 = true;
  let showD3 = true;

  // Selected chip & door
  let selectedChip = 100000; // default 100k
  let currentMyBets = { tai: 0, xiu: 0 };
  let selectedDoor = null; // 'tai' | 'xiu'

  // Online count fluctuating for live feeling
  let baseOnline = 3096;
  setInterval(() => {
    baseOnline += Math.floor(Math.random() * 11) - 5;
    if (baseOnline < 2950) baseOnline = 3020;
    if (baseOnline > 3280) baseOnline = 3150;
    if (onlinePlayersCount) {
      onlinePlayersCount.textContent = `${baseOnline.toLocaleString('vi-VN')} người đang online`;
    }
  }, 4000);

  // Audio Toggle
  const audioBtn = document.getElementById('btn-toggle-audio');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isMuted = !window.soundEngine.toggle();
      audioBtn.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  // Update User Header
  function updateUserUI() {
    if (usernameDisplay) usernameDisplay.textContent = currentUser.username;
    if (balanceDisplay) balanceDisplay.textContent = currentUser.balance.toLocaleString('vi-VN') + ' Xu';
    if (userAvatar) userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
  }
  updateUserUI();

  // Initialize Dice & Plate Controller
  const dicePlate = new DicePlateController();

  // Nặn Bát Toggle Button
  const btnToggleNan = document.getElementById('btn-toggle-nan');
  if (btnToggleNan) {
    btnToggleNan.addEventListener('click', () => {
      dicePlate.enableNanBat = !dicePlate.enableNanBat;
      btnToggleNan.classList.toggle('active', dicePlate.enableNanBat);
      btnToggleNan.title = `Bật/Tắt chế độ kéo Nặn Bát (Hiện: ${dicePlate.enableNanBat ? 'BẬT' : 'TẮT'})`;
      showToast(dicePlate.enableNanBat ? 'Đã BẬT chế độ Nặn Bát 🖐️' : 'Đã TẮT Nặn Bát (Bát sẽ tự động mở)', 'info');
    });
  }

  // ==================== FLYING CHIP ANIMATION & HELPERS ====================
  function formatChipShort(val) {
    if (val >= 1000000000) return (val / 1000000000) + 'B';
    if (val >= 1000000) return (val / 1000000) + 'M';
    if (val >= 1000) return (val / 1000) + 'K';
    return val.toString();
  }

  function triggerFlyingChip(targetDoor, amount) {
    const targetEl = targetDoor === 'tai' ? boxTai : boxXiu;
    if (!targetEl) return;

    const activeChip = document.querySelector('.poker-chip.selected') || document.querySelector('.poker-chip');
    const startRect = activeChip ? activeChip.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 80, width: 40, height: 40 };
    const endRect = targetEl.getBoundingClientRect();

    const chipClone = document.createElement('div');
    chipClone.className = 'flying-chip';
    chipClone.textContent = formatChipShort(amount);
    chipClone.style.left = `${startRect.left + (startRect.width / 2) - 22}px`;
    chipClone.style.top = `${startRect.top + (startRect.height / 2) - 22}px`;
    document.body.appendChild(chipClone);

    requestAnimationFrame(() => {
      chipClone.style.left = `${endRect.left + endRect.width / 2 - 22}px`;
      chipClone.style.top = `${endRect.top + endRect.height / 2 - 22}px`;
      chipClone.style.transform = 'scale(1.15) rotate(360deg)';
    });

    setTimeout(() => {
      if (chipClone.parentElement) chipClone.remove();

      // Floating Bet Amount Badge
      const badge = document.createElement('div');
      badge.className = 'floating-bet-badge';
      badge.textContent = `+${amount.toLocaleString('vi-VN')} Xu`;
      badge.style.left = `${endRect.left + endRect.width / 2}px`;
      badge.style.top = `${endRect.top + endRect.height / 2 - 15}px`;
      document.body.appendChild(badge);
      setTimeout(() => {
        if (badge.parentElement) badge.remove();
      }, 1200);
    }, 650);
  }

  // ==================== DOOR SELECTION & BETTING ====================
  function selectDoor(door) {
    selectedDoor = door;
    if (door === 'tai') {
      if (boxTai) boxTai.classList.add('active-selection');
      if (boxXiu) boxXiu.classList.remove('active-selection');
    } else if (door === 'xiu') {
      if (boxXiu) boxXiu.classList.add('active-selection');
      if (boxTai) boxTai.classList.remove('active-selection');
    }
    const indicator = document.getElementById('selected-door-text');
    if (indicator) {
      indicator.textContent = door === 'tai' ? 'TÀI' : 'XỈU';
      indicator.style.color = door === 'tai' ? '#ffeb3b' : '#80e5ff';
    }
  }

  function executePlaceBet(door) {
    if (!door) {
      showToast('⚠️ Vui lòng chọn cửa TÀI hoặc XỈU trước!', 'warning');
      return;
    }
    if (selectedChip <= 0) {
      showToast('Vui lòng chọn số tiền cược hợp lệ!', 'error');
      return;
    }
    if (currentUser.balance < selectedChip) {
      showToast('Số dư của bạn không đủ để đặt cược!', 'error');
      return;
    }

    // Trigger visual flying chip into door
    triggerFlyingChip(door, selectedChip);

    socket.emit('place_bet', {
      betType: door,
      type: door,
      amount: selectedChip
    });
  }

  // Click on "ĐẶT CƯỢC" button on either door
  if (btnDoorTai) {
    btnDoorTai.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDoor('tai');
      executePlaceBet('tai');
    });
  }

  if (btnDoorXiu) {
    btnDoorXiu.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDoor('xiu');
      executePlaceBet('xiu');
    });
  }

  // Direct clicking anywhere on the door card selects & bets!
  if (boxTai) {
    boxTai.addEventListener('click', (e) => {
      if (e.target.closest('.tx-btn-bet-door')) return;
      selectDoor('tai');
      executePlaceBet('tai');
    });
  }

  if (boxXiu) {
    boxXiu.addEventListener('click', (e) => {
      if (e.target.closest('.tx-btn-bet-door')) return;
      selectDoor('xiu');
      executePlaceBet('xiu');
    });
  }

  // ==================== CHIP SELECTION & QUICK MULTIPLIERS ====================
  const chipEls = document.querySelectorAll('.poker-chip');
  chipEls.forEach(chip => {
    chip.addEventListener('click', () => {
      chipEls.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedChip = parseInt(chip.getAttribute('data-value'), 10);
      if (window.soundEngine) window.soundEngine.playChipSound();
    });
  });

  // Quick Multipliers (+100K, +500K, +1M, +5M, +10M)
  const quickMultBtns = document.querySelectorAll('.quick-mult-btn');
  quickMultBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const addVal = parseInt(btn.getAttribute('data-add'), 10);
      selectedChip = Math.min(currentUser.balance || 100000000, selectedChip + addVal);
      showToast(`Đã tăng cược: ${selectedChip.toLocaleString('vi-VN')} Xu`, 'info');
      if (window.soundEngine) window.soundEngine.playChipSound();
    });
  });

  // Action: Clear selection
  const btnClear = document.getElementById('btn-action-clear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      selectedDoor = null;
      if (boxTai) boxTai.classList.remove('active-selection');
      if (boxXiu) boxXiu.classList.remove('active-selection');
      const indicator = document.getElementById('selected-door-text');
      if (indicator) {
        indicator.textContent = 'Chưa chọn';
        indicator.style.color = 'var(--gold-primary)';
      }
    });
  }

  // Action: Double Bet
  const btnDouble = document.getElementById('btn-action-double');
  if (btnDouble) {
    btnDouble.addEventListener('click', () => {
      selectedChip = Math.min(currentUser.balance, selectedChip * 2);
      showToast(`Đã nhân đôi mức cược: ${selectedChip.toLocaleString('vi-VN')} Xu`, 'info');
      if (window.soundEngine) window.soundEngine.playChipSound();
    });
  }

  // Action: All-in (Tất tay)
  const btnAllIn = document.getElementById('btn-action-allin');
  if (btnAllIn) {
    btnAllIn.addEventListener('click', () => {
      if (currentUser.balance <= 0) {
        showToast('Bạn không đủ số dư để tất tay!', 'error');
        return;
      }
      selectedChip = currentUser.balance;
      showToast(`🔥 TẤT TAY TOÀN BỘ: ${selectedChip.toLocaleString('vi-VN')} Xu!`, 'warning');
      if (window.soundEngine) window.soundEngine.playChipSound();
    });
  }

  // ==================== SOCKET & GAME REALTIME ====================
  const socket = io();

  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
    socket.emit('authenticate', token);
  });

  socket.on('authenticated', (data) => {
    currentUser = data.user;
    updateUserUI();
  });

  socket.on('auth_error', (data) => {
    showToast(data.message, 'error');
    localStorage.removeItem('taixiu_token');
    window.location.href = '/index.html';
  });

  // Action: Confirm Bet Button at bottom
  const btnConfirmBet = document.getElementById('btn-confirm-bet');
  if (btnConfirmBet) {
    btnConfirmBet.addEventListener('click', () => {
      executePlaceBet(selectedDoor);
    });
  }

  socket.on('bet_response', (res) => {
    if (res.success) {
      currentUser.balance = res.balance;
      updateUserUI();
      if (res.currentBet) {
        currentMyBets = { tai: res.currentBet.tai, xiu: res.currentBet.xiu };
      }
      updateMyBetUI();
      if (window.soundEngine) window.soundEngine.playChipSound();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  });

  // Socket: Timer / Round Tick Handler (supports both round_tick and timer_tick)
  function handleTimerTick(data) {
    updateRoundInfo(data.roundId, data.phase, data.timeLeft);

    // Update center timer text
    if (centerTimerText) {
      centerTimerText.textContent = data.timeLeft;
    }

    // Update pool amounts
    if (data.totalTai !== undefined) {
      updatePools(data.totalTai, data.totalXiu, data.countTai, data.countXiu);
    }

    // Urgent tick sound for last 5s of betting
    if (data.phase === 'betting' && data.timeLeft <= 5 && data.timeLeft > 0) {
      if (window.soundEngine) window.soundEngine.playTick(true);
    }

    // Auto open bowl at the very last second of revealing phase if player hasn't finished peeking
    if (data.phase === 'revealing' && data.timeLeft <= 1 && !dicePlate.isBowlOpened) {
      dicePlate.openBowlFull();
    }
  }

  socket.on('timer_tick', handleTimerTick);
  socket.on('round_tick', handleTimerTick);

  // State to hold outcome and payout until bowl is opened
  let pendingRoundResult = null;
  let pendingRoundPayout = null;

  function revealOutcome() {
    if (pendingRoundResult) {
      const data = pendingRoundResult;

      // 1. Highlight winner door box
      if (data.result === 'tai' && boxTai) {
        boxTai.classList.add('winner');
      } else if (data.result === 'xiu' && boxXiu) {
        boxXiu.classList.add('winner');
      }

      // 2. Update center score badge to show total points (e.g. 13)
      if (centerTimerText) {
        centerTimerText.textContent = data.total;
      }

      // 3. Add latest to roadmap and re-render
      appendRoadmapItem({
        roundId: data.roundId,
        dice: data.dice,
        total: data.total,
        result: data.result
      });

      pendingRoundResult = null;
    }

    // 4. Process personal payout
    if (pendingRoundPayout) {
      const payout = pendingRoundPayout;
      currentUser.balance = payout.balance;
      updateUserUI();

      if (payout.win) {
        if (winAmountText) {
          winAmountText.textContent = `+${payout.winAmount.toLocaleString('vi-VN')} Xu`;
        }
        if (winOverlay) {
          winOverlay.classList.add('active');
          setTimeout(() => winOverlay.classList.remove('active'), 4000);
        }
        if (window.soundEngine) window.soundEngine.playWinSound();
        showToast(`🎉 CHÚC MỪNG! Bạn đã thắng +${payout.winAmount.toLocaleString('vi-VN')} Xu (Tỷ lệ 1 ăn 0.7)!`, 'success');
      } else if (currentMyBets.tai > 0 || currentMyBets.xiu > 0) {
        showToast(`😢 Rất tiếc phiên này! Chúc bạn may mắn ở phiên sau!`, 'warning');
      }

      pendingRoundPayout = null;
    }
  }

  // Hook dicePlate open callback to reveal outcome
  dicePlate.onBowlOpened = revealOutcome;

  // Socket: New Round (60s)
  socket.on('new_round', (data) => {
    if (pendingRoundResult || pendingRoundPayout) {
      revealOutcome();
    }
    updateRoundInfo(data.roundId, 'betting', data.timeLeft);
    updatePools(0, 0, 0, 0);
    resetRoundUI();
    dicePlate.closeBowl();

    if (centerTimerText) centerTimerText.textContent = data.timeLeft || 60;

    if (liveTickerContent) {
      liveTickerContent.innerHTML = '<span class="ticker-default-msg">🎲 Bắt đầu phiên mới! Đang mở cược sôi động khắp bàn...</span>';
    }
    if (data.history) {
      cachedHistory = data.history;
      renderBottomBeadRoad(data.history);
      renderSoiCauCanvas();
    }
    if (window.soundEngine) window.soundEngine.playBellSound();
    showToast(`Bắt đầu phiên #${data.roundId}! Mời bạn đặt cược (60s).`, 'info');
  });

  // Socket: Shaking Phase (5s)
  socket.on('round_shaking', (data) => {
    updateRoundInfo(data.roundId, 'shaking', data.timeLeft);
    dicePlate.startShaking();
    if (centerTimerText) centerTimerText.textContent = data.timeLeft;
    if (liveTickerContent) {
      liveTickerContent.innerHTML = '<span class="ticker-default-msg">⏳ Đã chốt cược! Đang lắc xúc xắc...</span>';
    }
    if (window.soundEngine) window.soundEngine.playShakeSound(4.5);
    showToast('Hết thời gian cược! Đang lắc xúc xắc...', 'info');
  });

  // Socket: Round Result (Revealing Phase & Nặn Bát - 15s)
  socket.on('round_result', (data) => {
    updateRoundInfo(data.roundId, 'revealing', data.timeLeft);
    pendingRoundResult = data;
    dicePlate.showReadyToOpen(data.dice, data.total, data.result);

    // If Nan Bat is disabled by user, auto open after 2s
    if (!dicePlate.enableNanBat) {
      setTimeout(() => {
        if (!dicePlate.isBowlOpened) {
          dicePlate.openBowlFull();
        }
      }, 2000);
    } else {
      showToast('🖐️ Hãy giữ và kéo chiếc bát để NẶN KẾT QUẢ (15s)!', 'info');
    }
  });

  // Socket: Round Payout (Personal Result)
  socket.on('round_payout', (payout) => {
    pendingRoundPayout = payout;
    // If bowl is already opened, reveal immediately
    if (dicePlate.isBowlOpened) {
      revealOutcome();
    }
  });

  // Socket: Balance Update
  socket.on('balance_update', (data) => {
    currentUser.balance = data.balance;
    updateUserUI();
    if (data.currentBet) {
      currentMyBets = { tai: data.currentBet.tai, xiu: data.currentBet.xiu };
      updateMyBetUI();
    }
  });

  // Socket: Pool Update
  socket.on('pool_update', (data) => {
    updatePools(data.totalTai, data.totalXiu, data.countTai, data.countXiu);
  });

  // Socket: Live Bet Stream
  socket.on('live_bet_stream', (bet) => {
    updatePools(bet.totalTai, bet.totalXiu, bet.countTai, bet.countXiu);
    if (liveTickerContent) {
      const doorName = bet.betType === 'tai' ? 'TÀI' : 'XỈU';
      const doorColor = bet.betType === 'tai' ? '#ffe57f' : '#80e5ff';
      liveTickerContent.innerHTML = `
        <span class="live-bet-user">${bet.username}</span> vừa cược 
        <strong style="color: ${doorColor}">+${bet.amount.toLocaleString('vi-VN')} Xu</strong> vào cửa 
        <strong style="color: ${doorColor}">${doorName}</strong>
      `;
    }
  });

  let currentRoundPhase = 'betting';

  function updateRoundInfo(roundId, phase, timeLeft) {
    currentRoundPhase = phase || 'betting';
    if (roundIdDisplay) roundIdDisplay.textContent = `#${roundId}`;
    if (phaseStatusBadge) {
      phaseStatusBadge.className = `tx-phase-pill ${phase}`;
      const labels = {
        betting: 'Đang Đặt Cược',
        shaking: 'Đang Lắc Xúc Xắc',
        revealing: 'Nặn / Mở Bát (15s)'
      };
      phaseStatusBadge.textContent = labels[phase] || phase;
    }
  }

  function updatePools(taiAmount, xiuAmount, taiCount, xiuCount) {
    if (poolTaiEl) poolTaiEl.textContent = (taiAmount || 0).toLocaleString('vi-VN');
    if (poolXiuEl) poolXiuEl.textContent = (xiuAmount || 0).toLocaleString('vi-VN');
    if (countTaiEl) countTaiEl.textContent = `${taiCount || 0}`;
    if (countXiuEl) countXiuEl.textContent = `${xiuCount || 0}`;
  }

  function updateMyBetUI() {
    if (myBetTaiEl) myBetTaiEl.textContent = (currentMyBets.tai || 0).toLocaleString('vi-VN') + ' Xu';
    if (myBetXiuEl) myBetXiuEl.textContent = (currentMyBets.xiu || 0).toLocaleString('vi-VN') + ' Xu';
  }

  function resetRoundUI() {
    currentMyBets = { tai: 0, xiu: 0 };
    updateMyBetUI();
    if (boxTai) boxTai.classList.remove('winner', 'active-selection');
    if (boxXiu) boxXiu.classList.remove('winner', 'active-selection');
    selectedDoor = null;
    const indicator = document.getElementById('selected-door-text');
    if (indicator) {
      indicator.textContent = 'Chưa chọn';
      indicator.style.color = 'var(--gold-primary)';
    }
  }

  // ==================== BOTTOM BEAD ROAD ====================
  function renderBottomBeadRoad(history) {
    const beadContainer = document.getElementById('bottom-bead-road');
    if (!beadContainer) return;
    beadContainer.innerHTML = '';

    const displayRounds = history.slice(-18);
    displayRounds.forEach((round, index) => {
      const isLatest = index === displayRounds.length - 1;
      const bead = document.createElement('div');
      bead.className = `bottom-bead ${round.result} ${isLatest ? 'latest' : ''}`;
      if (isLatest) {
        bead.textContent = round.total;
      }
      bead.title = `Phiên #${round.roundId}: ${round.dice.join('-')} = ${round.total} (${round.result.toUpperCase()})`;
      beadContainer.appendChild(bead);
    });
  }

  function appendRoadmapItem(round) {
    cachedHistory.push(round);
    renderBottomBeadRoad(cachedHistory);
    renderSoiCauCanvas();
  }

  // ==================== BẢNG SOI CẦU 3 XÍ NGẦU CANVAS (ẢNH 1) ====================
  function renderSoiCauCanvas() {
    const canvas = document.getElementById('soicau-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    let rounds = [...cachedHistory];
    if (rounds.length > 20) {
      rounds = rounds.slice(-20);
    }

    // Update Sub-header
    const latestRoundEl = document.getElementById('sc-latest-round');
    const latestDescEl = document.getElementById('sc-latest-desc');
    if (rounds.length > 0) {
      const lastR = rounds[rounds.length - 1];
      if (latestRoundEl) latestRoundEl.textContent = `#${lastR.roundId}`;
      if (latestDescEl) {
        const doorName = lastR.result === 'tai' ? 'Tài' : (lastR.result === 'xiu' ? 'Xỉu' : 'Bão');
        latestDescEl.textContent = `${doorName} (${lastR.dice.join('-')})`;
        latestDescEl.style.color = lastR.result === 'tai' ? '#ffe57f' : '#80e5ff';
      }
    }

    const paddingLeft = 45;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 25;
    const chartW = width - paddingLeft - paddingRight;

    // Top section: Total Score (3 to 18)
    // Bottom section: Individual Dice (1 to 6)
    const splitY = paddingTop + (height - paddingTop - paddingBottom) * 0.58;
    const topH = splitY - paddingTop;
    const bottomTop = splitY + 15;
    const bottomH = (height - paddingBottom) - bottomTop;

    const numPoints = Math.max(16, rounds.length);
    const stepX = chartW / (numPoints - 1);

    // 1. Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.font = 'bold 11px Montserrat, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Top grid: Scores 18, 15, 12, 9, 6, 3
    const topScores = [18, 15, 12, 9, 6, 3];
    topScores.forEach(score => {
      const ratio = (score - 3) / 15;
      const y = splitY - ratio * topH;

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.18)';
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      ctx.fillStyle = score >= 11 ? '#ffe57f' : '#80e5ff';
      ctx.fillText(score.toString(), paddingLeft - 8, y);
    });

    // Middle separator line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.beginPath();
    ctx.moveTo(paddingLeft, splitY);
    ctx.lineTo(width - paddingRight, splitY);
    ctx.stroke();

    // Bottom grid: Dice values 6, 5, 4, 3, 2, 1
    const diceValues = [6, 5, 4, 3, 2, 1];
    diceValues.forEach(val => {
      const ratio = (val - 1) / 5;
      const y = (height - paddingBottom) - ratio * bottomH;

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.14)';
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      ctx.fillStyle = '#a0aec0';
      ctx.fillText(val.toString(), paddingLeft - 8, y);
    });

    // Vertical grid lines
    for (let i = 0; i < numPoints; i++) {
      const x = paddingLeft + i * stepX;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, height - paddingBottom);
      ctx.stroke();
    }

    if (rounds.length === 0) return;

    // 2. Plot Top Line Chart: Total Points Line
    const totalPoints = [];
    rounds.forEach((r, i) => {
      const x = paddingLeft + i * stepX;
      const ratio = Math.max(0, Math.min(1, (r.total - 3) / 15));
      const y = splitY - ratio * topH;
      totalPoints.push({ x, y, total: r.total, result: r.result });
    });

    // Connect line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    totalPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Draw Score Dots
    totalPoints.forEach(pt => {
      const isTai = pt.result === 'tai';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = isTai ? '#b8001f' : '#1e293b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isTai ? '#ffe57f' : '#80e5ff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pt.total.toString(), pt.x, pt.y);
    });

    // 3. Plot Bottom 3 Dice Lines
    function drawDiceLine(diceIdx, color, show) {
      if (!show) return;
      const pts = [];
      rounds.forEach((r, i) => {
        const val = (r.dice && r.dice[diceIdx]) ? r.dice[diceIdx] : 1;
        const x = paddingLeft + i * stepX;
        const ratio = (val - 1) / 5;
        const y = (height - paddingBottom) - ratio * bottomH;
        pts.push({ x, y, val });
      });

      // Line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Circles
      pts.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    drawDiceLine(0, '#ff4d6d', showD1); // Xí Ngầu 1 (Red)
    drawDiceLine(1, '#00d2ff', showD2); // Xí Ngầu 2 (Cyan)
    drawDiceLine(2, '#ffd166', showD3); // Xí Ngầu 3 (Yellow/Gold)
  }

  // Filter Toggles
  const filterXN1 = document.getElementById('filter-xn1');
  const filterXN2 = document.getElementById('filter-xn2');
  const filterXN3 = document.getElementById('filter-xn3');

  if (filterXN1) {
    filterXN1.addEventListener('click', () => {
      showD1 = !showD1;
      filterXN1.classList.toggle('active', showD1);
      renderSoiCauCanvas();
    });
  }
  if (filterXN2) {
    filterXN2.addEventListener('click', () => {
      showD2 = !showD2;
      filterXN2.classList.toggle('active', showD2);
      renderSoiCauCanvas();
    });
  }
  if (filterXN3) {
    filterXN3.addEventListener('click', () => {
      showD3 = !showD3;
      filterXN3.classList.toggle('active', showD3);
      renderSoiCauCanvas();
    });
  }

  // ==================== MODALS MANAGEMENT ====================
  function setupModal(triggerId, modalId, closeId, onOpen) {
    const trigger = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    const close = document.getElementById(closeId);

    if (trigger && modal) {
      trigger.addEventListener('click', () => {
        modal.classList.add('active');
        if (typeof onOpen === 'function') onOpen();
      });
    }
    if (close && modal) {
      close.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  }

  setupModal('btn-open-soicau', 'modal-soicau', 'btn-close-soicau', () => renderSoiCauCanvas());
  setupModal('btn-open-rules', 'modal-rules', 'btn-close-rules');
  setupModal('btn-open-guide', 'modal-guide', 'btn-close-guide');
  setupModal('btn-open-leaderboard', 'modal-leaderboard', 'btn-close-leaderboard', loadLeaderboard);
  setupModal('btn-open-history', 'modal-history', 'btn-close-history', loadUserBetHistory);

  // Close table exit
  const btnTableClose = document.getElementById('btn-table-close');
  if (btnTableClose) {
    btnTableClose.addEventListener('click', () => {
      if (confirm('Bạn có muốn đăng xuất và quay lại trang đăng nhập?')) {
        localStorage.removeItem('taixiu_token');
        localStorage.removeItem('taixiu_user');
        window.location.href = '/index.html';
      }
    });
  }

  // ==================== INTERACTIVE LIVE CHAT SYSTEM ====================
  const chatDrawer = document.getElementById('tx-chat-drawer');
  const btnToggleChat = document.getElementById('btn-toggle-chat');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatUnreadDot = document.getElementById('chat-unread-dot');

  if (btnToggleChat && chatDrawer) {
    btnToggleChat.addEventListener('click', () => {
      chatDrawer.classList.toggle('open');
      if (chatDrawer.classList.contains('open')) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        if (chatUnreadDot) chatUnreadDot.style.display = 'none';
      }
    });
  }

  if (btnCloseChat && chatDrawer) {
    btnCloseChat.addEventListener('click', () => {
      chatDrawer.classList.remove('open');
    });
  }

  function addChatMessage(author, text, type = 'normal', isMe = false) {
    if (!chatMessagesContainer) return;
    const item = document.createElement('div');
    item.className = `chat-msg-item ${type} ${isMe ? 'me' : ''}`;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    let vipBadge = '';
    if (isMe) {
      vipBadge = '<span class="chat-vip-tag vip-gold">⭐ VIP</span>';
    } else if (type === 'system') {
      vipBadge = '<span class="chat-vip-tag vip-sys">👑 ĐẠI GIA</span>';
    } else {
      const vLvl = Math.floor(Math.random() * 6) + 3;
      vipBadge = `<span class="chat-vip-tag">V${vLvl}</span>`;
    }

    item.innerHTML = `
      <div class="chat-msg-header">
        <span class="chat-author ${isMe ? 'me' : ''}">${vipBadge} ${isMe ? 'BẠN' : author}</span>
        <span class="chat-time">${timeStr}</span>
      </div>
      <div class="chat-text">${escapeHtml(text)}</div>
    `;

    chatMessagesContainer.appendChild(item);

    // Show unread dot if drawer is closed and message is not from me
    if (chatDrawer && !chatDrawer.classList.contains('open') && !isMe) {
      if (chatUnreadDot) chatUnreadDot.style.display = 'block';
    }

    // Auto scroll down if near bottom or if me
    const isScrolledNearBottom = chatMessagesContainer.scrollHeight - chatMessagesContainer.clientHeight <= chatMessagesContainer.scrollTop + 100;
    if (isScrolledNearBottom || isMe) {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    // Keep max 100 messages in DOM
    if (chatMessagesContainer.children.length > 100) {
      chatMessagesContainer.removeChild(chatMessagesContainer.firstChild);
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Prepopulate initial active chat messages
  const initialChatMessages = [
    { author: 'than_bai_888', text: 'Chào cả bàn! Hôm nay cầu Tài đang chạy mượt lắm!', type: 'tai-fan' },
    { author: 'dai_gia_sai_thanh', text: 'Tay vừa rồi húp trọn 35 củ thơm phức 🔥', type: 'system' },
    { author: 'trum_soi_cau_99', text: 'Nhìn cầu tọa độ xí ngầu 2 đang dốc lên, phiên này bắt Tài chắc ăn', type: 'tai-fan' },
    { author: 'tieu_long_nu', text: 'Bẻ sang Xỉu đi anh em ơi, bệt 4 cây rồi!', type: 'xiu-fan' },
    { author: 'son_tinh_vip', text: 'Lụm lúa 20M, ấm bụng rồi! 💰', type: 'system' }
  ];
  initialChatMessages.forEach(m => addChatMessage(m.author, m.text, m.type));

  // User chat form submit
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = chatInput.value.trim();
      if (!val) return;
      addChatMessage(currentUser.username, val, 'me', true);
      socket.emit('send_chat_message', { text: val });
      chatInput.value = '';
    });
  }

  // Quick chat chips
  const quickChatChips = document.querySelectorAll('.quick-chat-chip');
  quickChatChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const msg = chip.getAttribute('data-msg');
      if (msg) {
        addChatMessage(currentUser.username, msg, 'me', true);
        socket.emit('send_chat_message', { text: msg });
      }
    });
  });

  // Floating Emoji Burst Reaction
  function shootFloatingEmoji(emoji) {
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'floating-emoji';
        el.textContent = emoji;
        el.style.left = `${Math.random() * 50 + 25}vw`;
        el.style.bottom = `${Math.random() * 70 + 40}px`;
        document.body.appendChild(el);
        setTimeout(() => {
          if (el.parentElement) el.remove();
        }, 2200);
      }, i * 110);
    }
  }

  const emojiButtons = document.querySelectorAll('.chat-emoji-btn');
  emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emoji');
      if (em) {
        shootFloatingEmoji(em);
        addChatMessage(currentUser.username, `${em} ${em} ${em}`, 'me', true);
        socket.emit('send_chat_message', { text: `${em} ${em} ${em}` });
      }
    });
  });

  // Realtime Socket Broadcast from other real players
  socket.on('broadcast_chat_message', (data) => {
    if (data.username !== currentUser.username) {
      addChatMessage(data.username, data.text, data.type || 'normal', false);
    }
  });

  // ==================== DYNAMIC HIGH-FREQUENCY COMMUNITY CHATTER ====================
  const botChatAuthors = [
    'thanh_long_99', 'bac_thay_soi_cau', 'trum_tai_xiu_hn', 'dai_gia_phu_quoc', 'cong_tu_bac_lieu',
    'tien_ve_nhu_lu', 'thao_vip_pro', 'viet_jackpot_88', 'hoang_kim_68', 'bach_phat_bach_trung',
    'ong_hoang_tai_xiu', 'than_bai_cho_lon', 'sat_thu_dong_tien', 'tay_choi_sai_gon', 'hacker_xoc_dia',
    'nam_son_la_88', 'tuan_hung_yen', 'hieu_hai_phong', 'duc_nam_dinh', 'quang_ninh_vip',
    'anh_ba_sa_dec', 'bong_dem_9x', 'hoa_vo_khuyet', 'kiem_tien_cuoi_vo', 'so_tai_tai_den',
    'danh_la_thang', 'chua_he_thua', 'than_dieu_dai_hiep', 'nu_hoang_do_den', 'tieu_long_nu_88',
    'trai_tim_vang', 'chi_hai_ban_ron', 'cau_hai_gia_dinh', 'hotgirl_tai_xiu', 'baby_shark_vip',
    'chuot_tui_88', 'ca_kiem_vang', 'phuong_hoang_lua', 'rong_vang_99', 'thien_long_bat_bo',
    've_bo_thoi_ae', 'tat_tay_ho_nay', 'het_tien_roi_ba_con', 'xin_via_thang_lon', 'cay_cau_bet',
    'nuoi_xiu_3_ngay', 'so_tai_den_sang', 'di_chua_cau_may', 'than_tai_go_cua', 'cay_tien_mua_mec',
    'hom_nay_phai_an', 'tay_trang_lam_lai', 'song_chet_voi_nha_cai', 'nha_cai_chay_dau', 'vay_tien_di_choi',
    'vo_keu_ve_nau_com', 'cay_cu_that_su', 'dap_hop_iphone_16', 'hung_king_88', 'minh_beo_vip',
    'ngoc_trinh_vip', 'son_tung_68', 'jack_97_vip', 'do_mixi_vip', 'thay_giao_ba',
    'huyen_baby_tx', 'quang_hai_19', 'tien_linh_vip', 'hoang_duc_28', 'dang_van_lam',
    'van_toan_vip', 'duy_manh_hn', 'quang_huy_vip', 'phuoc_loc_tho', 'phat_tai_phat_loc',
    'dai_gia_dat_cang', 'trum_soi_cau_99', 'thanh_nien_chuan', 'chuyen_gia_bat_tai', 'ong_trum_xiu'
  ];

  function getRandomBotAuthor() {
    const base = botChatAuthors[Math.floor(Math.random() * botChatAuthors.length)];
    if (Math.random() < 0.45 && !base.match(/_\d+$/)) {
      const suffixes = ['88', '99', '68', '79', 'vip', 'pro', 'hn', 'sg'];
      return `${base}_${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }
    return base;
  }

  const taiMsgs = [
    'Tài 100% rồi anh em ơi, cầu 1-1 đẹp như tranh! 🔥',
    'Bơm căng cửa Tài phiên này đi, tôi vừa vào 10 củ!',
    'Theo Tài là về bờ, cãi nhà cái làm gì!',
    'Tài đi anh em, tiếng kết tiếng kết!',
    'Cầu bệt Tài 4 tay rồi, cứ bệt mà bám thôi!',
    'Ai theo Tài giơ tay nào ✋',
    'Tài nổ hũ nào các bác ơi!',
    'Tay này kết Tài quá, không đánh thì tiếc cả đời!',
    'Tài chắc luôn, nhìn xí ngầu đi đẹp vãi',
    'Chốt 5M cửa Tài, anh em theo nào!',
    'Phiên này Tài không ra thì tôi nghỉ game luôn!',
    'Cả làng vào Tài đi, cầu đang thơm phức!',
    'Tài nổ to nào, tiếng này tiền về!',
    'Lót nhẹ thêm 2 củ Tài cho chắc cú',
    'Bàn này đang thiên Tài, anh em đừng bẻ vội',
    'Theo Tài từ đầu phiên đến giờ chưa gãy tay nào 🚀',
    'Vào Tài nhanh tay kẻo hết giờ anh em ơi!',
    'Tài 14 điểm chuẩn chỉ!'
  ];

  const xiuMsgs = [
    'Bẻ Xỉu thôi anh em, bệt sâu quá rồi gãy chắc! 🧊',
    'Xỉu êm đẹp, theo tôi làm giàu nào!',
    'Xỉu 10 điểm nhẹ nhàng lấy tiền nhà cái!',
    'Tất tay cửa Xỉu, không nói nhiều 🚀',
    'Bắt Xỉu tay này là chuẩn bài soi cầu luôn!',
    'Cầu chuyền sang Xỉu rồi, anh em tỉnh táo lên',
    'Xỉu đi, linh tính mách bảo Xỉu rực rỡ!',
    'Xỉu uy tín không lằng nhằng!',
    'Ai ôm Xỉu như tôi không, chung mâm phát nào!',
    'Bẻ Xỉu thôi ae, không bẻ giờ là tiếc đấy 🧊',
    'Tay này Xỉu chạy không trượt phát nào',
    'Vào Xỉu là ấm no, tin tôi một lần đi',
    'Xỉu 6 điểm đập vào mặt nhà cái nào!',
    'Xỉu êm ru, lượm lúa nhẹ nhàng',
    'Đang thông 3 tay Xỉu, đánh tiếp thôi!',
    'Cửa Xỉu nay vào tiền ác thế, theo số đông thôi anh em',
    'Xỉu 8 điểm lộc phát, tiếng này ăn chặt!',
    'Bên Xỉu tiền đang tăng chóng mặt kìa'
  ];

  const winCelebrationMsgs = [
    'Húp trọn 15 củ, ấm quá các bác ơi! 💰🎉',
    'Lụm lúa! 3 tay thông rồi phê chữ ê kéo dài!',
    'Tiền về tài khoản ting ting, sướng rơn người!',
    'Ăn đậm rồi, hôm nay mời cả làng bia hơi 🍻',
    'Bú ngập mồm! Cảm ơn anh em đã kéo!',
    'Húp! Đánh đúng theo cầu là có cơm ăn áo mặc ngay',
    'Tuyệt vời, làm nhẹ 20M nghỉ ăn trưa!',
    'Ngon chim! Cầu đang son đánh đâu trúng đó',
    'Lụm lúa 20M, ấm bụng rồi! 💰',
    'Tay vừa rồi húp trọn 35 củ thơm phức 🔥',
    'Haha vừa gỡ lại vốn còn dôi ra 8 củ, quá đã!',
    'Cảm ơn bác nào vừa hô nhé, ăn theo ngon ơ!',
    'Ting ting 50M về tài khoản, thơm như múi mít!',
    'Lại xanh chín rồi, nay lộc lá quá anh em ơi!',
    'Ăn thông 4 tay rồi, nay trời độ tôi rồi các bác!',
    'Vừa nãy run tay tí nữa thì bỏ, may quá vẫn theo!'
  ];

  const loseOrTrollMsgs = [
    'Ối dồi ôi, lệch có 1 nút đau đớn quá trời!',
    'Bẻ cầu hụt rồi, cay mắt thật chứ 😭',
    'Vừa buông tay thì nó lại về, cay thế không biết!',
    'Má ơi, nặn ra 2 con lục mà con cuối ra nhất!',
    'Không sao, còn thở là còn gỡ, tay sau làm lại!',
    'Tiếc đứt ruột, định lót thêm mà hết giờ bấm cược',
    'Đánh Xỉu nó ra 11 Tài, đúng cay đắng cuộc đời',
    'Bị nhà cái vặt mất 5 củ rồi, tay sau tất tay phục thù!',
    'Đắng lòng thanh niên bẻ cầu đúng lúc nó bệt tiếp',
    'Ai cứu tôi với, bay mất con Wave rồi 🥲',
    'Nặn thót cả tim, con cuối xịt đau ghê',
    'Tay sau tăng tiền gấp đôi, không tin không gỡ được!'
  ];

  const actionMsgs = [
    'Lắc đều tay lên nào dealer ơi! 🎲',
    'Nặn đê nặn đê anh em ơi, nặn từ từ thôi!',
    'Hóng bão 3 con 6 nổ hũ to đùng! 🔥',
    'Bát này nặn chắc tay vào nha anh em, hồi hộp quá!',
    'Nặn ra 2 con ngũ rồi, con cuối ra ngũ nữa nổ hũ đi!!',
    'Hồi hộp vãi chưởng, tim đập thình thịch!',
    'Mở bát đi chờ lâu sốt ruột quá bác ơi!',
    'Tay run không dám nặn luôn nè anh em',
    'Cầu xin thần linh cho ra Tài tay này 🙏',
    '3 con xí ngầu lắc nghe giòn tai thế nhỉ!',
    'Nặn mở mép ra xem chấm nào anh em!',
    'Ối giời ơi nặn hồi hộp muốn rớt tim ngoài lồng ngực'
  ];

  const generalChatMsgs = [
    'Vợ đang đứng sau lưng canh mà vẫn phải lén làm tay Tài 😅',
    'Hôm nay ai đỏ kéo em với, xa bờ 5 chục rồi 🥹',
    'Có bác nào ở Hà Nội không, tối làm bữa nhậu ăn mừng nào',
    'Cầu đẹp thế này không vào tiền có lỗi với bản thân',
    'Xin vía bác top 1 với, tay nào cũng thấy xanh lét',
    'Nặn từ từ thôi bác ơi, đau tim quá haha 🤣',
    'Anh em nào vừa ăn to giơ tay phát lấy may',
    'Cầu bàn này mượt hơn bên các cổng khác nhiều',
    'Đang rình tay bão kiếm quả jackpot trăm củ',
    'Anh em hôm nay lời lãi thế nào rồi, điểm danh cái',
    'Cao thủ soi cầu đâu hết rồi, cho xin nhận định phiên này với',
    'Chơi vui vẻ giữ cái đầu lạnh nha các bác!',
    'Vừa nạp thêm 20 củ chiến khô máu phiên này!',
    'Bàn này xôm tụ vui vẻ quá, vào đánh giải trí phê luôn'
  ];

  // Fast & lively automated chatter loop
  function sendAutomatedChatter() {
    let pool;
    let type = 'normal';

    if (currentRoundPhase === 'shaking' || currentRoundPhase === 'revealing') {
      const r = Math.random();
      if (r < 0.4) {
        pool = actionMsgs;
        type = 'system';
      } else if (r < 0.7) {
        pool = winCelebrationMsgs;
        type = 'system';
      } else {
        pool = loseOrTrollMsgs;
        type = 'normal';
      }
    } else {
      // Betting phase
      const r = Math.random();
      if (r < 0.38) {
        pool = taiMsgs;
        type = 'tai-fan';
      } else if (r < 0.76) {
        pool = xiuMsgs;
        type = 'xiu-fan';
      } else {
        pool = generalChatMsgs;
        type = 'normal';
      }
    }

    const text = pool[Math.floor(Math.random() * pool.length)];
    const author = getRandomBotAuthor();
    addChatMessage(author, text, type, false);

    // Fast pace: 900ms - 2200ms (average ~1.3s), with 25% chance of rapid burst (300ms - 550ms)
    const isBurst = Math.random() < 0.25;
    const nextInterval = isBurst 
      ? Math.floor(Math.random() * 250) + 300 
      : Math.floor(Math.random() * 1300) + 900;

    setTimeout(sendAutomatedChatter, nextInterval);
  }

  // Kick off after 600ms
  setTimeout(sendAutomatedChatter, 600);

  // ==================== MEGA JACKPOT COUNTER TICKER ====================
  let currentJackpotVal = 2854912400;
  const jackpotCounterEl = document.getElementById('jackpot-counter');
  setInterval(() => {
    currentJackpotVal += Math.floor(Math.random() * 40000) + 12000;
    if (jackpotCounterEl) {
      jackpotCounterEl.textContent = `${currentJackpotVal.toLocaleString('vi-VN')} Xu`;
    }
  }, 1600);

  // ==================== SOI CẦU TABS & BEAD MATRIX ====================
  const tabBtnGraph = document.getElementById('tab-btn-graph');
  const tabBtnMatrix = document.getElementById('tab-btn-matrix');
  const viewGraph = document.getElementById('soicau-view-graph');
  const viewMatrix = document.getElementById('soicau-view-matrix');
  const filterGroup = document.getElementById('soicau-filters-group');

  function switchSoiCauTab(tab) {
    if (tab === 'graph') {
      if (tabBtnGraph) tabBtnGraph.classList.add('active');
      if (tabBtnMatrix) tabBtnMatrix.classList.remove('active');
      if (viewGraph) viewGraph.style.display = 'block';
      if (viewMatrix) viewMatrix.style.display = 'none';
      if (filterGroup) filterGroup.style.display = 'flex';
      renderSoiCauCanvas();
    } else {
      if (tabBtnMatrix) tabBtnMatrix.classList.add('active');
      if (tabBtnGraph) tabBtnGraph.classList.remove('active');
      if (viewGraph) viewGraph.style.display = 'none';
      if (viewMatrix) viewMatrix.style.display = 'grid';
      if (filterGroup) filterGroup.style.display = 'none';
      renderSoiCauMatrix();
    }
  }

  if (tabBtnGraph) tabBtnGraph.addEventListener('click', () => switchSoiCauTab('graph'));
  if (tabBtnMatrix) tabBtnMatrix.addEventListener('click', () => switchSoiCauTab('matrix'));

  function renderSoiCauMatrix() {
    if (!viewMatrix) return;
    viewMatrix.innerHTML = '';

    // Take up to 120 past rounds to fill 6 rows x 20 columns
    const rounds = cachedHistory.slice(-120);
    const totalSlots = 120;

    for (let i = 0; i < totalSlots; i++) {
      const beadEl = document.createElement('div');
      if (i < rounds.length) {
        const r = rounds[i];
        beadEl.className = `matrix-bead ${r.result}`;
        beadEl.textContent = r.total;
        beadEl.title = `Phiên #${r.roundId}: ${r.dice.join('-')} = ${r.total} (${r.result.toUpperCase()})`;
      } else {
        beadEl.style.width = '20px';
        beadEl.style.height = '20px';
        beadEl.style.borderRadius = '50%';
        beadEl.style.background = 'rgba(255, 255, 255, 0.03)';
        beadEl.style.border = '1px dashed rgba(255, 255, 255, 0.08)';
      }
      viewMatrix.appendChild(beadEl);
    }
  }

  // ==================== AMBIENT GOLD DUST CANVAS PARTICLES ====================
  function initAmbientDust() {
    const canvas = document.getElementById('ambient-dust-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.5 + 0.2,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.45 - 0.15
    }));

    function renderParticles() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 183, 33, ${p.alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#f5b721';
        ctx.fill();
      });
      requestAnimationFrame(renderParticles);
    }
    renderParticles();
  }
  initAmbientDust();

  // Load Leaderboard
  async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 20px;">Đang tải bảng vinh danh...</div>';

    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.success && data.leaderboard && data.leaderboard.length > 0) {
        listEl.innerHTML = data.leaderboard.map((u, i) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 900; color: ${i === 0 ? '#ffe57f' : (i === 1 ? '#e2e8f0' : '#d97706')}">#${i + 1}</span>
              <strong>${u.username}</strong>
            </div>
            <span style="color: #00f090; font-weight: 800;">${u.balance.toLocaleString('vi-VN')} Xu</span>
          </div>
        `).join('');
      } else {
        listEl.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 20px;">Chưa có dữ liệu xếp hạng</div>';
      }
    } catch (err) {
      listEl.innerHTML = '<div style="text-align: center; color: #f87171; padding: 20px;">Không thể tải bảng vinh danh</div>';
    }
  }

  // Load User Bet History
  async function loadUserBetHistory() {
    const listEl = document.getElementById('user-bet-history-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 20px;">Đang tải lịch sử cược...</div>';

    try {
      const res = await fetch('/api/user/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.history && data.history.length > 0) {
        listEl.innerHTML = data.history.map(b => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <div>
              <span style="color: #ffe57f; font-weight: 800;">Phiên #${b.roundId}</span> • 
              <span>Cửa ${b.type.toUpperCase()}</span>
              <div style="font-size: 0.75rem; color: #718096;">${new Date(b.createdAt).toLocaleTimeString('vi-VN')}</div>
            </div>
            <div style="text-align: right;">
              <div>Cược: <strong>${b.amount.toLocaleString('vi-VN')} Xu</strong></div>
              <div style="color: ${b.winAmount > 0 ? '#00f090' : '#f87171'}; font-weight: 800;">
                ${b.winAmount > 0 ? '+' + b.winAmount.toLocaleString('vi-VN') + ' Xu (Thắng)' : 'Thua'}
              </div>
            </div>
          </div>
        `).join('');
      } else {
        listEl.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 20px;">Bạn chưa đặt cược phiên nào</div>';
      }
    } catch (err) {
      listEl.innerHTML = '<div style="text-align: center; color: #f87171; padding: 20px;">Không thể tải lịch sử</div>';
    }
  }

  // ==================== MODAL: DEPOSIT ====================
  const depositBtn = document.getElementById('btn-open-deposit');
  const depositModal = document.getElementById('modal-deposit');
  const depositCloseBtn = document.getElementById('btn-close-deposit');
  const depositAmountBtns = document.querySelectorAll('.deposit-quick-btn');

  if (depositBtn && depositModal) {
    depositBtn.addEventListener('click', () => {
      depositModal.classList.add('active');
    });
  }

  if (depositCloseBtn && depositModal) {
    depositCloseBtn.addEventListener('click', () => {
      depositModal.classList.remove('active');
    });
  }

  depositAmountBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const amount = parseInt(btn.getAttribute('data-amount'), 10);
      try {
        const res = await fetch('/api/user/deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (data.success) {
          currentUser.balance = data.balance;
          updateUserUI();
          showToast(data.message, 'success');
          if (depositModal) depositModal.classList.remove('active');
        } else {
          showToast(data.message, 'error');
        }
      } catch (err) {
        showToast('Lỗi khi nạp tiền, vui lòng thử lại', 'error');
      }
    });
  });

  // Logout Action
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('taixiu_token');
      localStorage.removeItem('taixiu_user');
      window.location.href = '/index.html';
    });
  }
});

// Toast notification utility
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

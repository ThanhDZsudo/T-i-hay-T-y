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

    socket.emit('place_bet', {
      betType: door,
      type: door,
      amount: selectedChip
    });
  }

  // Click on "ĐẶT CƯỢC" button on either door: selects door AND places bet immediately!
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

  // Clicking the box itself selects the door
  if (boxTai) boxTai.addEventListener('click', () => selectDoor('tai'));
  if (boxXiu) boxXiu.addEventListener('click', () => selectDoor('xiu'));

  // ==================== CHIP SELECTION ====================
  const chipEls = document.querySelectorAll('.poker-chip');
  chipEls.forEach(chip => {
    chip.addEventListener('click', () => {
      chipEls.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedChip = parseInt(chip.getAttribute('data-value'), 10);
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

  function updateRoundInfo(roundId, phase, timeLeft) {
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

  // Chat button
  const btnToggleChat = document.getElementById('btn-toggle-chat');
  if (btnToggleChat) {
    btnToggleChat.addEventListener('click', () => {
      showToast('💬 Kênh chat sòng bài trực tuyến đang kết nối hơn 3,000 người chơi!', 'info');
    });
  }

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

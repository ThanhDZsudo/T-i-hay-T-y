// ADMIN DASHBOARD CONTROLLER FOR VIP TÀI XỈU

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('taixiu_token');
  const userStr = localStorage.getItem('taixiu_user');

  if (!token || !userStr) {
    window.location.href = '/index.html';
    return;
  }

  const currentUser = JSON.parse(userStr);
  if (currentUser.role !== 'admin') {
    alert('Truy cập bị từ chối! Trang này chỉ dành cho Admin.');
    window.location.href = '/game.html';
    return;
  }

  // Admin Header
  const adminName = document.getElementById('admin-name');
  if (adminName) adminName.textContent = currentUser.username;

  // Realtime Metric Elements
  const statRoundId = document.getElementById('stat-round-id');
  const statTimeLeft = document.getElementById('stat-time-left');
  const statTotalTai = document.getElementById('stat-total-tai');
  const statTotalXiu = document.getElementById('stat-total-xiu');
  const statHouseProfit = document.getElementById('stat-house-profit');
  const statOnlinePlayers = document.getElementById('stat-online-players');
  const outcomeBadge = document.getElementById('outcome-status-badge');

  // Live Bets Table Body
  const liveBetsTbody = document.getElementById('live-bets-tbody');
  const emptyBetsMsg = document.getElementById('empty-bets-msg');

  // Users Table Body
  const usersTbody = document.getElementById('users-tbody');

  // Socket Connection
  const socket = io();

  socket.on('connect', () => {
    console.log('[Admin Socket] Connected');
    socket.emit('authenticate', token);
  });

  // Receive Live Admin Data Broadcast
  socket.on('admin_live_data', (data) => {
    updateAdminStats(data);
    renderLiveBets(data.bets || []);
  });

  // Receive Round Settled Event
  socket.on('admin_round_settled', (summary) => {
    showToast(`Phiên #${summary.roundRecord.roundId} kết thúc: ${summary.roundRecord.result.toUpperCase()} (${summary.roundRecord.total} điểm). Lợi nhuận nhà cái: ${summary.houseProfit.toLocaleString('vi-VN')} Xu`, 'info');
    loadUsersList(); // Refresh users balances
  });

  function updateAdminStats(data) {
    if (statRoundId) statRoundId.textContent = `#${data.roundId}`;
    if (statTimeLeft) statTimeLeft.textContent = `${data.timeLeft}s (${data.phase.toUpperCase()})`;
    if (statTotalTai) statTotalTai.textContent = (data.totalTai || 0).toLocaleString('vi-VN') + ' Xu';
    if (statTotalXiu) statTotalXiu.textContent = (data.totalXiu || 0).toLocaleString('vi-VN') + ' Xu';
    if (statOnlinePlayers) statOnlinePlayers.textContent = `${data.connectedPlayersCount || 1} thiết bị`;

    // House balance estimation: if Tai wins vs if Xiu wins
    const diff = Math.abs(data.totalTai - data.totalXiu);
    if (statHouseProfit) {
      statHouseProfit.textContent = `Chênh lệch cược: ${diff.toLocaleString('vi-VN')} Xu`;
    }

    // Outcome badge
    if (outcomeBadge) {
      if (!data.adminOutcome) {
        outcomeBadge.className = 'outcome-status-badge auto';
        outcomeBadge.textContent = '🎲 Tự Động (Theo Tỉ Lệ)';
      } else if (Array.isArray(data.adminOutcome)) {
        outcomeBadge.className = 'outcome-status-badge';
        outcomeBadge.textContent = `🎯 Chỉ định xúc xắc: [${data.adminOutcome.join(', ')}]`;
      } else {
        outcomeBadge.className = `outcome-status-badge ${data.adminOutcome}`;
        outcomeBadge.textContent = `⚠️ Đang ép kết quả: ${data.adminOutcome.toUpperCase()}`;
      }
    }

    // Player Win Rate Sync from server
    if (data.playerWinRate !== undefined) {
      if (displayActiveWinRate) {
        displayActiveWinRate.textContent = `${data.playerWinRate}% THẮNG`;
      }
      if (sliderWinRate && document.activeElement !== sliderWinRate) {
        sliderWinRate.value = data.playerWinRate;
        updateWinRateVisual(data.playerWinRate);
      }
    }

    // Bot status sync from server
    if (data.botEnabled !== undefined) {
      currentBotEnabled = data.botEnabled;
      const botBadge = document.getElementById('bot-status-badge');
      if (botBadge) {
        botBadge.className = data.botEnabled ? 'outcome-status-badge auto' : 'outcome-status-badge';
        botBadge.textContent = data.botEnabled ? '🤖 BOT: ĐANG BẬT' : '🚫 BOT: ĐÃ TẮT';
      }
    }
  }

  // Bot Management Controls
  let currentBotEnabled = true;
  const btnToggleBot = document.getElementById('btn-toggle-bot');
  if (btnToggleBot) {
    btnToggleBot.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/set-bot-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ enabled: !currentBotEnabled })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          currentBotEnabled = data.botEnabled;
        }
      } catch (e) {
        showToast('Lỗi khi chuyển trạng thái Bot', 'error');
      }
    });
  }

  window.setBotCrowd = async function(crowdLevel) {
    try {
      const res = await fetch('/api/admin/set-bot-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ crowdLevel })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        ['low', 'medium', 'high'].forEach(l => {
          const btn = document.getElementById(`btn-crowd-${l}`);
          if (btn) {
            btn.style.background = (l === crowdLevel) ? 'var(--gold-primary)' : 'rgba(255,255,255,0.08)';
            btn.style.color = (l === crowdLevel) ? '#000' : '#fff';
          }
        });
      }
    } catch (e) {
      showToast('Lỗi khi cấu hình số lượng Bot', 'error');
    }
  };

  // Bet Filter Management ('all' | 'real' | 'bot')
  let currentBetFilter = 'all';
  let cachedBets = [];

  window.setBetFilter = function(filter) {
    currentBetFilter = filter;
    ['all', 'real', 'bot'].forEach(f => {
      const btn = document.getElementById(`filter-bet-${f}`);
      if (btn) {
        if (f === filter) {
          btn.style.background = 'var(--gold-primary)';
          btn.style.color = '#000';
        } else {
          btn.style.background = 'rgba(255, 255, 255, 0.08)';
          btn.style.color = '#fff';
        }
      }
    });
    renderLiveBets(cachedBets);
  };

  // Render Live Bets Table (Detailed Player & Bot Bet Inspection)
  function renderLiveBets(bets) {
    cachedBets = bets;
    if (!liveBetsTbody) return;

    const poolSummaryText = document.getElementById('bet-pool-summary-text');
    let totalTai = 0;
    let totalXiu = 0;
    let realPlayerCount = 0;
    let botCount = 0;

    bets.forEach(b => {
      totalTai += b.tai || 0;
      totalXiu += b.xiu || 0;
      if (b.isBot) botCount++;
      else realPlayerCount++;
    });

    if (poolSummaryText) {
      poolSummaryText.textContent = `Đang có: ${bets.length} vé cược (👤 ${realPlayerCount} Người thật - 🤖 ${botCount} Bot) | Tổng Tài: ${totalTai.toLocaleString('vi-VN')} Xu | Tổng Xỉu: ${totalXiu.toLocaleString('vi-VN')} Xu`;
    }

    // Apply Filter
    let filteredBets = bets;
    if (currentBetFilter === 'real') {
      filteredBets = bets.filter(b => !b.isBot);
    } else if (currentBetFilter === 'bot') {
      filteredBets = bets.filter(b => b.isBot);
    }

    if (filteredBets.length === 0) {
      liveBetsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #8e9bb0; padding: 24px;">Không có vé cược nào phù hợp với bộ lọc</td></tr>';
      return;
    }

    liveBetsTbody.innerHTML = '';
    filteredBets.forEach(b => {
      const tr = document.createElement('tr');
      const timeStr = new Date(b.lastUpdated || Date.now()).toLocaleTimeString('vi-VN');

      let choicesHtml = '';
      if (b.tai > 0) {
        choicesHtml += `<span class="bet-badge tai" style="font-size: 0.82rem; padding: 4px 10px;">🔴 TÀI: ${b.tai.toLocaleString('vi-VN')}</span> `;
      }
      if (b.xiu > 0) {
        choicesHtml += `<span class="bet-badge xiu" style="font-size: 0.82rem; padding: 4px 10px;">🔵 XỈU: ${b.xiu.toLocaleString('vi-VN')}</span>`;
      }

      const totalBetAmount = (b.tai || 0) + (b.xiu || 0);

      const typeBadge = b.isBot 
        ? `<span style="background: rgba(0, 210, 255, 0.15); color: #67e8f9; border: 1px solid rgba(0, 210, 255, 0.4); padding: 2px 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 800;">🤖 BOT</span>`
        : `<span style="background: rgba(0, 240, 144, 0.2); color: #00f090; border: 1px solid #00f090; padding: 2px 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 800;">👤 THẬT</span>`;

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.75rem; background: ${b.isBot ? 'linear-gradient(135deg, #00d2ff, #006699)' : 'var(--gold-gradient)'}; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900;">
              ${b.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong style="${b.isBot ? 'color: #93c5fd;' : 'color: #fff; font-size: 0.95rem;'}">${b.username}</strong>
            </div>
          </div>
        </td>
        <td>${typeBadge}</td>
        <td>${choicesHtml}</td>
        <td style="font-size: 1.05rem; font-weight: 900; color: #ffe57f;">
          ${totalBetAmount.toLocaleString('vi-VN')} Xu
        </td>
        <td style="color: #67e8f9; font-weight: 700;">
          ${(b.balance || 0).toLocaleString('vi-VN')} Xu
        </td>
        <td><small style="color: #8e9bb0; font-weight: 600;">${timeStr}</small></td>
      `;
      liveBetsTbody.appendChild(tr);
    });
  }

  // Admin Outcome Control Buttons
  const btnAuto = document.getElementById('btn-force-auto');
  const btnTai = document.getElementById('btn-force-tai');
  const btnXiu = document.getElementById('btn-force-xiu');
  const btnBao = document.getElementById('btn-force-bao');

  if (btnAuto) {
    btnAuto.addEventListener('click', () => setOutcome('auto'));
  }
  if (btnTai) {
    btnTai.addEventListener('click', () => setOutcome('tai'));
  }
  if (btnXiu) {
    btnXiu.addEventListener('click', () => setOutcome('xiu'));
  }
  if (btnBao) {
    btnBao.addEventListener('click', () => setOutcome('bao'));
  }

  const btnCustomDice = document.getElementById('btn-apply-custom-dice');
  if (btnCustomDice) {
    btnCustomDice.addEventListener('click', () => {
      const d1 = parseInt(document.getElementById('select-d1').value, 10);
      const d2 = parseInt(document.getElementById('select-d2').value, 10);
      const d3 = parseInt(document.getElementById('select-d3').value, 10);
      setOutcome([d1, d2, d3]);
    });
  }

  async function setOutcome(outcome) {
    try {
      const res = await fetch('/api/admin/set-outcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ outcome })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Lỗi khi cài đặt kết quả', 'error');
    }
  }

  // Load and Manage Users List
  async function loadUsersList() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && usersTbody) {
        renderUsersTable(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  function renderUsersTable(users) {
    usersTbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      const isSelf = u.id === currentUser.id;
      tr.innerHTML = `
        <td><strong>${u.username}</strong></td>
        <td><span class="role-tag ${u.role}">${u.role.toUpperCase()}</span></td>
        <td style="color: #ffe57f; font-weight: 800;">${u.balance.toLocaleString('vi-VN')} Xu</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn-table-action" onclick="adjustBalance('${u.id}', 10000000, 'add')">+10M</button>
            <button class="btn-table-action" onclick="adjustBalance('${u.id}', -10000000, 'add')">-10M</button>
            <button class="btn-table-action" onclick="promptCustomBalance('${u.id}', ${u.balance})">Sửa Số Dư</button>
          </div>
        </td>
      `;
      usersTbody.appendChild(tr);
    });
  }

  window.adjustBalance = async function(userId, amount, action = 'add') {
    try {
      const res = await fetch('/api/admin/adjust-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, amount, action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadUsersList();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Lỗi khi điều chỉnh số dư', 'error');
    }
  };

  window.promptCustomBalance = function(userId, currentBalance) {
    const val = prompt('Nhập số dư mới (Xu):', currentBalance);
    if (val !== null && !isNaN(parseInt(val, 10))) {
      window.adjustBalance(userId, parseInt(val, 10), 'set');
    }
  };

  // Initial load
  loadUsersList();

  // Logout
  const logoutBtn = document.getElementById('btn-admin-logout');
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

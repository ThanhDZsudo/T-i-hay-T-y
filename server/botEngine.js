// BOT ENGINE CHO TÀI XỈU VIP - GIẢ LẬP DÒNG TIỀN CƯỢC TĂNG LIÊN TỤC VÀ ĐỀU ĐẶN
// Giúp bàn chơi luôn sôi động, người chơi nhìn vào là thấy dòng tiền nhảy múa kích thích

class BotEngine {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.enabled = true; // Bật / Tắt Bot

    // Cấu hình tần suất & mật độ Bot
    this.config = {
      crowdLevel: 'medium', // 'low' | 'medium' | 'high'
      minIntervalMs: 350,   // Khoảng cách tối thiểu giữa 2 vé cược
      maxIntervalMs: 800,   // Khoảng cách tối đa
      rushIntervalMs: 220,  // Tăng tốc trong 7 giây chốt cược cuối
      minBet: 50000,        // 50K
      maxBet: 50000000      // 50M
    };

    // Danh sách 80+ tên người chơi ảo thuần Việt cực kỳ chân thực & phong phú
    this.botNames = [
      'dai_gia_dat_cang', 'hoang_long_vip', 'thanh_cong_88', 'kiem_tien_ty',
      'bac_thu_ha_thanh', 'trum_tai_xiu', 'ngoc_trinh_99', 'van_menh_vang',
      'tien_ve_nhu_lu', 'sat_thu_dong_xu', 'anh_ba_sai_gon', 'than_bai_cho_lon',
      'tuan_pro_9x', 'long_chim_se', 'hung_dai_ca', 'linh_tay_ho',
      'thao_beo_888', 'phong_ba_bao', 'quy_cong_tu', 'huynh_de_tot',
      'son_hai_phong', 'viet_anh_vip', 'minh_beo_cas', 'hai_banh_hn',
      'quang_le_danang', 'dung_toc_dai', 'khang_hy_de', 'bach_thu_lo',
      'thanh_nien_chuan', 'chip_mun_99', 'gia_cat_luong', 'ton_ngo_khong',
      'ty_phu_do_la', 'cau_ba_dong_thap', 'bac_chin_sai_thanh', 'hoang_tu_gio',
      'hoa_vinh_88', 'an_chay_niem_phat', 'phuc_loc_tho', 'tien_vo_nhu_nuoc',
      'dai_ca_hai_phong', 'minh_beo_bac_ninh', 'nam_chac_keo', 'danh_la_thang',
      'tay_choi_mien_tay', 'cong_tu_bac_lieu', 'phu_ong_ha_dong', 'thanh_soi_cau',
      'trum_cuoi_99', 'kiem_tien_mua_xe', 'vo_dich_tai_xiu', 'bac_thay_soi_keo',
      'tam_than_bat_bien', 'duyen_phan_tai_tro', 'thich_du_tien', 'vuong_gia_vip',
      'hoang_thao_88', 'nguyen_anh_99', 'bach_ho_quan', 'phuong_hoang_lua',
      'thien_ha_de_nhat', 'danh_sap_nha_cai', 'keo_ngon_hom_nay', 'soi_cau_bat_bai',
      'loc_phat_888', 'tai_loc_vo_bien', 'than_tai_go_cua', 'bac_nho_kinh_dien',
      'quyet_chien_toi_cung', 'thang_lon_88', 'dai_su_phu', 'bach_phat_bach_trung',
      'kiem_chut_chao', 'choi_dep_nhat_hoi', 'ong_trum_cas', 'nguoi_hung_bong_dem',
      'cao_thu_an_danh', 'than_may_man', 'van_su_nhu_y', 'phat_tai_phat_loc'
    ];

    this.activeLoopTimeout = null;
    this.roundBotIndex = 0;
  }

  // Bắt đầu chuỗi cược liên tục cho phiên mới
  onNewRound(roundId) {
    this.clearSchedule();
    if (!this.enabled) return;

    // Trộn ngẫu nhiên danh sách tên cho phiên mới
    this.shuffledNames = [...this.botNames].sort(() => 0.5 - Math.random());
    this.roundBotIndex = 0;

    // Bắt đầu cược sau 600ms khi mở phiên
    this.scheduleNextBet(700);
  }

  // Lên lịch cược kế tiếp
  scheduleNextBet(customDelay = null) {
    if (!this.enabled) return;
    if (this.gameEngine.phase !== 'betting') return;

    let delay = customDelay;
    if (delay === null) {
      const timeLeft = this.gameEngine.timeLeft;

      // Tính toán khoảng thời gian giữa 2 lần cược dựa trên mật độ và thời gian còn lại
      let minInt = this.config.minIntervalMs;
      let maxInt = this.config.maxIntervalMs;

      if (this.config.crowdLevel === 'low') {
        minInt = 600;
        maxInt = 1200;
      } else if (this.config.crowdLevel === 'high') {
        minInt = 180;
        maxInt = 450;
      }

      // Trong 7 giây cuối: Tăng tốc cược dồn dập (hiệu ứng chốt cược phút chót)
      if (timeLeft <= 7 && timeLeft > 1) {
        minInt = Math.max(120, Math.floor(minInt * 0.55));
        maxInt = Math.max(250, Math.floor(maxInt * 0.6));
      }

      delay = Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    }

    this.activeLoopTimeout = setTimeout(() => {
      this.executeBotBet();
      // Tiếp tục vòng lặp nếu vẫn đang trong thời gian đặt cược
      if (this.gameEngine.phase === 'betting' && this.gameEngine.timeLeft > 1) {
        this.scheduleNextBet();
      }
    }, delay);
  }

  // Thực hiện một vé cược tự động
  executeBotBet() {
    if (!this.enabled || this.gameEngine.phase !== 'betting') return;

    // Chọn tên người chơi
    if (!this.shuffledNames || this.shuffledNames.length === 0) {
      this.shuffledNames = [...this.botNames].sort(() => 0.5 - Math.random());
      this.roundBotIndex = 0;
    }
    const botName = this.shuffledNames[this.roundBotIndex % this.shuffledNames.length];
    this.roundBotIndex++;

    // Thuật toán chọn cửa thông minh & cân bằng tự nhiên
    // Giúp tiền 2 cửa Tài và Xỉu tăng đều, đôi lúc chênh lệch nhẹ tạo cảm xúc tranh đua gay cấn
    const currentTai = this.gameEngine.totalTai || 0;
    const currentXiu = this.gameEngine.totalXiu || 0;

    let betType;
    if (currentTai === 0 && currentXiu === 0) {
      betType = Math.random() < 0.5 ? 'tai' : 'xiu';
    } else {
      const total = currentTai + currentXiu;
      const taiRatio = currentTai / (total || 1);

      // Nếu cửa Tài đang quá nhiều (> 60%), bot có 70% khả năng cược vào Xỉu để cân bảng
      if (taiRatio > 0.60) {
        betType = Math.random() < 0.72 ? 'xiu' : 'tai';
      } else if (taiRatio < 0.40) {
        // Cửa Xỉu đang quá nhiều, bot có 70% khả năng cược vào Tài
        betType = Math.random() < 0.72 ? 'tai' : 'xiu';
      } else {
        // Tương đối cân bằng -> 50/50
        betType = Math.random() < 0.5 ? 'tai' : 'xiu';
      }
    }

    // Chọn số tiền cược thực tế với phân bổ xác suất như sòng bạc thật:
    // - 45% cược nhỏ (50k - 200k)
    // - 35% cược vừa (500k - 2M)
    // - 15% cược lớn (3M - 5M)
    // - 5% cược VIP tay to (10M - 30M)
    const roll = Math.random();
    let amount;

    if (roll < 0.45) {
      const smallChips = [50000, 100000, 150000, 200000, 300000];
      amount = smallChips[Math.floor(Math.random() * smallChips.length)];
    } else if (roll < 0.80) {
      const medChips = [500000, 800000, 1000000, 1500000, 2000000];
      amount = medChips[Math.floor(Math.random() * medChips.length)];
    } else if (roll < 0.95) {
      const bigChips = [3000000, 5000000, 7000000, 10000000];
      amount = bigChips[Math.floor(Math.random() * bigChips.length)];
    } else {
      const vipChips = [15000000, 20000000, 30000000, 50000000];
      amount = vipChips[Math.floor(Math.random() * vipChips.length)];
    }

    // Đưa vé cược vào GameEngine
    this.gameEngine.placeBotBet(botName, betType, amount);
  }

  clearSchedule() {
    if (this.activeLoopTimeout) {
      clearTimeout(this.activeLoopTimeout);
      this.activeLoopTimeout = null;
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (!this.enabled) {
      this.clearSchedule();
    } else if (this.gameEngine.phase === 'betting') {
      this.scheduleNextBet(300);
    }
    return this.enabled;
  }

  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.crowdLevel) {
      this.config.crowdLevel = newConfig.crowdLevel;
    }
    return this.config;
  }
}

module.exports = BotEngine;

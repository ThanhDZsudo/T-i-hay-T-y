// DICE & BÁT ÚP CONTROLLER FOR TÀI XỈU - HỖ TRỢ KÉO NẶN BÁT CHÂN THỰC 360 ĐỘ

class DicePlateController {
  constructor() {
    this.bowlEl = document.getElementById('dish-bowl');
    this.plateEl = document.querySelector('.dish-plate-container');
    this.diceContainerEl = document.getElementById('dice-trio');
    this.resultBadgeEl = document.getElementById('result-badge');
    this.openBowlBtn = document.getElementById('btn-open-bowl');
    this.nanBatHintEl = document.getElementById('nan-bat-hint');

    this.isBowlOpened = false;
    this.isReadyToOpen = false;
    this.isDragging = false;
    this.enableNanBat = true; // Chế độ Nặn Bát

    this.currentDice = [1, 2, 3];
    this.currentResult = 'xiu';
    this.currentTotal = 6;

    // Drag positions
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;

    // Distance threshold in pixels to open full on drag release
    this.OPEN_THRESHOLD = 115;

    // Callback when player opens bowl
    this.onBowlOpened = null;

    this.initBowlInteraction();
  }

  initBowlInteraction() {
    if (!this.bowlEl) return;

    // Direct click on "MỞ BÁT NGAY" button
    if (this.openBowlBtn) {
      this.openBowlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBowlFull();
      });
    }

    // Pointer Events for ultra-smooth drag & touch support
    this.bowlEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    // Double click to open immediately
    this.bowlEl.addEventListener('dblclick', () => {
      if (this.isReadyToOpen && !this.isBowlOpened) {
        this.openBowlFull();
      }
    });
  }

  onPointerDown(e) {
    if (!this.isReadyToOpen || this.isBowlOpened) {
      // If tapped while closed, give a subtle shake hint
      if (!this.isReadyToOpen && !this.isBowlOpened) {
        this.bowlEl.classList.add('nudge-locked');
        setTimeout(() => this.bowlEl.classList.remove('nudge-locked'), 400);
      }
      return;
    }

    this.isDragging = true;
    try {
      this.bowlEl.setPointerCapture(e.pointerId);
    } catch (err) {
      // fallback if pointer capture fails
    }

    this.startX = e.clientX - this.currentX;
    this.startY = e.clientY - this.currentY;

    this.bowlEl.style.transition = 'none';
    this.bowlEl.style.cursor = 'grabbing';

    if (e.cancelable) e.preventDefault();
  }

  onPointerMove(e) {
    if (!this.isDragging || !this.isReadyToOpen || this.isBowlOpened) return;

    this.currentX = e.clientX - this.startX;
    this.currentY = e.clientY - this.startY;

    // Restrict dragging within max bounds for realistic dish border constraint
    const maxDistance = 190;
    const dist = Math.hypot(this.currentX, this.currentY);
    if (dist > maxDistance) {
      const angle = Math.atan2(this.currentY, this.currentX);
      this.currentX = Math.cos(angle) * maxDistance;
      this.currentY = Math.sin(angle) * maxDistance;
    }

    // Apply movement to bowl smoothly
    this.bowlEl.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;

    if (e.cancelable) e.preventDefault();
  }

  onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;

    try {
      this.bowlEl.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (!this.bowlEl) return;
    this.bowlEl.style.cursor = 'grab';

    const dist = Math.hypot(this.currentX, this.currentY);

    if (dist >= this.OPEN_THRESHOLD) {
      // Dragged far enough to reveal completely
      this.openBowlFull();
    } else if (dist < 20) {
      // Barely moved / tap: snap gently back to center
      this.bowlEl.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      this.currentX = 0;
      this.currentY = 0;
      this.bowlEl.style.transform = 'translate(0px, 0px)';
    } else {
      // Stay peeked at current location so player can keep inspecting and grab again!
      this.bowlEl.style.transition = 'transform 0.15s ease-out';
      this.bowlEl.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
    }
  }

  // Render 3 dice faces
  renderDice(dice = [1, 2, 3]) {
    this.currentDice = dice;
    if (!this.diceContainerEl) return;

    this.diceContainerEl.innerHTML = '';
    dice.forEach(value => {
      const dieEl = document.createElement('div');
      dieEl.className = 'die';
      dieEl.innerHTML = this.getDieHtml(value);
      this.diceContainerEl.appendChild(dieEl);
    });
  }

  getDieHtml(value) {
    let pipsHtml = '';
    const activePositions = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9]
    }[value] || [5];

    for (let i = 1; i <= 9; i++) {
      if (activePositions.includes(i)) {
        const isLargeCenter = (value === 1 && i === 5);
        pipsHtml += `<div class="pip ${isLargeCenter ? 'large-center' : ''}"></div>`;
      } else {
        pipsHtml += `<div class="pip" style="visibility: hidden;"></div>`;
      }
    }
    return pipsHtml;
  }

  // Start shaking bowl
  startShaking() {
    this.closeBowl();
    this.isReadyToOpen = false;

    const discScore = document.getElementById('disc-score-badge');
    if (discScore) discScore.style.display = 'none';

    if (this.bowlEl) {
      this.bowlEl.style.display = 'flex';
      this.bowlEl.style.opacity = '1';
      this.bowlEl.style.transform = 'translate(0px, 0px)';
      this.bowlEl.style.transition = 'none';
      this.bowlEl.classList.add('shaking');
    }
    if (this.plateEl) {
      this.plateEl.classList.add('plate-shaking');
    }
    if (this.diceContainerEl) {
      this.diceContainerEl.style.display = 'flex';
      this.diceContainerEl.classList.add('dice-shaking');
    }
    if (this.resultBadgeEl) {
      this.resultBadgeEl.style.display = 'none';
      this.resultBadgeEl.className = 'result-display-badge';
    }
    if (this.openBowlBtn) {
      this.openBowlBtn.style.display = 'none';
    }
    if (this.nanBatHintEl) {
      this.nanBatHintEl.style.display = 'none';
    }
  }

  stopShaking() {
    if (this.bowlEl) {
      this.bowlEl.classList.remove('shaking');
      this.bowlEl.style.transition = 'transform 0.3s ease';
      this.bowlEl.style.transform = 'translate(0px, 0px)';
    }
    if (this.plateEl) {
      this.plateEl.classList.remove('plate-shaking');
    }
    if (this.diceContainerEl) {
      this.diceContainerEl.classList.remove('dice-shaking');
    }
  }

  // Reset bowl to initial centered closed state
  closeBowl() {
    this.isBowlOpened = false;
    this.isReadyToOpen = false;
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;

    const discScore = document.getElementById('disc-score-badge');
    if (discScore) discScore.style.display = 'flex';

    if (this.plateEl) {
      this.plateEl.classList.remove('plate-shaking');
    }
    if (this.diceContainerEl) {
      this.diceContainerEl.style.display = 'none';
      this.diceContainerEl.classList.remove('dice-shaking');
    }

    if (this.bowlEl) {
      this.bowlEl.classList.remove('opened', 'ready-to-nan', 'shaking', 'nudge-locked');
      this.bowlEl.style.transition = 'none';
      this.bowlEl.style.transform = 'translate(0px, 0px)';
      this.bowlEl.style.opacity = '1';
      this.bowlEl.style.display = 'none'; // Hidden during countdown
      this.bowlEl.style.pointerEvents = 'auto';
      this.bowlEl.style.cursor = 'default';
    }
    if (this.resultBadgeEl) {
      this.resultBadgeEl.style.display = 'none';
    }
    if (this.nanBatHintEl) {
      this.nanBatHintEl.style.display = 'none';
    }
    if (this.openBowlBtn) {
      this.openBowlBtn.style.display = 'none';
    }
  }

  // State when shaking stops and player can start Nặn Bát (15 seconds)
  showReadyToOpen(dice, total, result) {
    this.stopShaking();
    this.isReadyToOpen = true;
    this.isBowlOpened = false;
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;

    this.currentDice = dice;
    this.currentTotal = total;
    this.currentResult = result;

    const discScore = document.getElementById('disc-score-badge');
    if (discScore) discScore.style.display = 'none';

    // Render the 3 dice values underneath the bowl
    if (this.diceContainerEl) {
      this.diceContainerEl.style.display = 'flex';
      this.renderDice(dice);
    }

    // Keep result badge HIDDEN until bowl is opened!
    if (this.resultBadgeEl) {
      this.resultBadgeEl.style.display = 'none';
      this.resultBadgeEl.className = 'result-display-badge';
    }

    if (this.bowlEl) {
      this.bowlEl.style.display = 'flex';
      this.bowlEl.classList.remove('opened', 'shaking');
      this.bowlEl.classList.add('ready-to-nan');
      this.bowlEl.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
      this.bowlEl.style.transform = 'translate(0px, 0px)';
      this.bowlEl.style.opacity = '1';
      this.bowlEl.style.pointerEvents = 'auto';
      this.bowlEl.style.cursor = 'grab';
    }

    // Show Nặn Bát Guide Hint
    if (this.nanBatHintEl) {
      this.nanBatHintEl.style.display = 'flex';
      this.nanBatHintEl.innerHTML = '<span>🖐️ GIỮ & KÉO BÁT ĐỂ NẶN KẾT QUẢ</span>';
    }

    // Show quick button to open immediately
    if (this.openBowlBtn) {
      this.openBowlBtn.style.display = 'inline-block';
      this.openBowlBtn.textContent = 'MỞ BÁT NGAY 🎲';
    }
  }

  // Fully open bowl with celebratory animation
  openBowlFull() {
    if (this.isBowlOpened) return;
    this.isBowlOpened = true;
    this.isReadyToOpen = false;
    this.isDragging = false;

    const discScore = document.getElementById('disc-score-badge');
    if (discScore) discScore.style.display = 'none';

    if (this.diceContainerEl) {
      this.diceContainerEl.style.display = 'flex';
    }

    // Bowl cleanly disappears (never hovers over #round-id)
    if (this.bowlEl) {
      this.bowlEl.classList.remove('ready-to-nan');
      this.bowlEl.classList.add('opened');
      this.bowlEl.style.transition = 'transform 0.35s ease, opacity 0.25s ease';
      this.bowlEl.style.transform = 'scale(0.85) translateY(-20px)';
      this.bowlEl.style.opacity = '0';
      this.bowlEl.style.pointerEvents = 'none';
      setTimeout(() => {
        if (this.isBowlOpened && this.bowlEl) {
          this.bowlEl.style.display = 'none';
        }
      }, 300);
    }

    if (this.openBowlBtn) {
      this.openBowlBtn.style.display = 'none';
    }
    if (this.nanBatHintEl) {
      this.nanBatHintEl.style.display = 'none';
    }

    // Play gong/bell sound
    if (window.soundEngine) {
      window.soundEngine.playBellSound();
    }

    // Show result badge
    if (this.resultBadgeEl) {
      this.resultBadgeEl.style.display = 'flex';
      const resultName = this.currentResult === 'bao' 
        ? 'BÃO ' + this.currentDice[0] 
        : (this.currentResult === 'tai' ? 'TÀI' : 'XỈU');
      
      this.resultBadgeEl.className = `result-display-badge ${this.currentResult}`;
      this.resultBadgeEl.innerHTML = `<span>${this.currentTotal} Điểm</span> • <strong>${resultName}</strong>`;
    }

    // Notify game controller that bowl is opened -> reveal winner, payout, fanfare & roadmap
    if (typeof this.onBowlOpened === 'function') {
      this.onBowlOpened({
        dice: this.currentDice,
        total: this.currentTotal,
        result: this.currentResult
      });
    }
  }
}

window.DicePlateController = DicePlateController;

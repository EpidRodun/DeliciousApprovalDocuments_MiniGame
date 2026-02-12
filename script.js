// Game State
let gameState = {
    score: 0,
    combo: 0,
    time: 100,
    fever: 0,
    feverActive: false,
    gameActive: false,
    currentItem: null,
    isProcessing: false,
    isPaused: false,
    status: 'yes', // Current inspector state: 'yes' or 'no'
    itemQueue: [] // Store 5 items
};

// DOM Elements
const comboText = document.getElementById('combo-text');
const scoreText = document.getElementById('score-text');
const timerFill = document.getElementById('timer-gauge-fill');
const feverFill = document.getElementById('fever-gauge-fill');
const itemQueueContainer = document.getElementById('item-queue');
const flashOverlay = document.getElementById('flash-overlay');
const paperStack = document.getElementById('paper-stack');
const icons = {
    yes: document.getElementById('icon-yes'),
    no: document.getElementById('icon-no')
};
const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const btnStart = document.getElementById('btn-start');
const btnApprove = document.getElementById('btn-approve');
const btnSwap = document.getElementById('btn-swap');
const btnPause = document.getElementById('btn-pause');
const btnResume = document.getElementById('btn-resume');
const btnDifficulty = document.getElementById('btn-difficulty');
const settingsOverlay = document.getElementById('settings-overlay');
const btnSaveSettings = document.getElementById('btn-save-settings');
const difficultyButtons = document.querySelectorAll('.diff-btn');

const btnBalanceTuning = document.getElementById('btn-balance-tuning');
const balanceOverlay = document.getElementById('balance-overlay');
const balanceTableBody = document.getElementById('balance-table-body');
const btnSaveBalance = document.getElementById('btn-save-balance');
const btnResetBalance = document.getElementById('btn-reset-balance');
const btnCloseBalance = document.getElementById('btn-close-balance');

const DEFAULT_DIFFICULTY_CONFIG = {
    'very-easy': { decay: 0.1, recover: 10, recoverBread: 20, penalty: 5, label: '매우 쉬움' },
    'easy': { decay: 0.15, recover: 6, recoverBread: 15, penalty: 10, label: '쉬움' },
    'normal': { decay: 0.2, recover: 3, recoverBread: 10, penalty: 15, label: '보통' },
    'hard': { decay: 0.3, recover: 1, recoverBread: 5, penalty: 25, label: '어려움' }
};

let DIFFICULTY_CONFIG = JSON.parse(localStorage.getItem('customDifficultyConfig')) || { ...DEFAULT_DIFFICULTY_CONFIG };

let currentDifficulty = localStorage.getItem('gameDifficulty') || 'normal';

let itemElements = []; // Store DOM elements of the queue

// Scaling Logic... [skipped for brevity, but I will include the full chunk below]
const gameWrapper = document.getElementById('game-wrapper');
const referenceWidth = 1280;
const referenceHeight = 720;

function resizeGame() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Aggressive safety margin (15%) to ensure buttons are never cut off by 
    // mobile browser bars or "safe area" obstructions.
    const safetyMargin = 0.85;
    const scaleX = (windowWidth * safetyMargin) / referenceWidth;
    const scaleY = (windowHeight * safetyMargin) / referenceHeight;
    const scale = Math.min(scaleX, scaleY);

    gameWrapper.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resizeGame);
window.addEventListener('load', resizeGame);
resizeGame();

// Difficulty UI Logic
btnDifficulty.addEventListener('click', () => {
    difficultyButtons.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.level === currentDifficulty);
    });
    settingsOverlay.classList.add('active');
});

difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentDifficulty = btn.dataset.level;
        difficultyButtons.forEach(b => b.classList.toggle('selected', b === btn));
    });
});

btnSaveSettings.addEventListener('click', () => {
    localStorage.setItem('gameDifficulty', currentDifficulty);
    settingsOverlay.classList.remove('active');
});

// Balance Tuning Logic
btnBalanceTuning.addEventListener('click', () => {
    populateBalanceTable();
    balanceOverlay.classList.add('active');
});

function populateBalanceTable() {
    balanceTableBody.innerHTML = '';
    const levels = ['very-easy', 'easy', 'normal', 'hard'];
    levels.forEach(level => {
        const config = DIFFICULTY_CONFIG[level];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${config.label}</td>
            <td><input type="number" step="0.01" data-level="${level}" data-prop="decay" value="${config.decay}"></td>
            <td><input type="number" data-level="${level}" data-prop="recover" value="${config.recover}"></td>
            <td><input type="number" data-level="${level}" data-prop="recoverBread" value="${config.recoverBread}"></td>
            <td><input type="number" data-level="${level}" data-prop="penalty" value="${config.penalty}"></td>
        `;
        balanceTableBody.appendChild(row);
    });
}

btnSaveBalance.addEventListener('click', () => {
    const inputs = balanceTableBody.querySelectorAll('input');
    inputs.forEach(input => {
        const { level, prop } = input.dataset;
        DIFFICULTY_CONFIG[level][prop] = parseFloat(input.value);
    });
    localStorage.setItem('customDifficultyConfig', JSON.stringify(DIFFICULTY_CONFIG));
    alert('밸런스 설정이 저장되었습니다.');
    balanceOverlay.classList.remove('active');
});

btnResetBalance.addEventListener('click', () => {
    if (confirm('모든 수치를 기본값으로 초기화하시겠습니까?')) {
        DIFFICULTY_CONFIG = JSON.parse(JSON.stringify(DEFAULT_DIFFICULTY_CONFIG));
        localStorage.removeItem('customDifficultyConfig');
        populateBalanceTable();
    }
});

btnCloseBalance.addEventListener('click', () => {
    balanceOverlay.classList.remove('active');
});

// Initial Setup
// Aggressive Zoom Prevention for Mobile
if ('ontouchstart' in window) {
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
}

btnStart.addEventListener('click', startGame);
btnApprove.addEventListener('click', () => {
    if (gameState.isPaused) return;
    handleApprove();
});
btnSwap.addEventListener('click', () => {
    if (gameState.isPaused) return;
    toggleStatus();
});
btnPause.addEventListener('click', () => togglePause());
btnResume.addEventListener('click', () => togglePause());

window.addEventListener('keydown', (e) => {
    if (!gameState.gameActive) return;
    if (e.key.toLowerCase() === 'p') togglePause();
    if (gameState.isPaused) return;
    if (e.key.toLowerCase() === 'a') toggleStatus();
    if (e.key.toLowerCase() === 's') {
        if (!gameState.isProcessing) handleApprove();
    }
});

function startGame() {
    // Request Fullscreen and Lock Orientation ONLY on mobile devices
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    if (isMobile) {
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().then(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(err => {
                            console.warn("Orientation lock failed:", err);
                        });
                    }
                }).catch(err => {
                    console.warn("Fullscreen request failed:", err);
                });
            }
        } catch (e) {
            console.error("Fullscreen/Orientation error:", e);
        }
    }

    gameState = {
        score: 0,
        combo: 0,
        time: 100,
        fever: 0,
        feverActive: false,
        gameActive: true,
        currentItem: null,
        isProcessing: false,
        isPaused: false,
        status: 'yes',
        itemQueue: []
    };

    updateUI();
    updateStatusUI();
    startOverlay.classList.remove('active');
    pauseOverlay.classList.remove('active');
    document.body.classList.remove('fever-mode');
    paperStack.innerHTML = '';
    itemQueueContainer.innerHTML = '';
    itemElements = [];

    // Initialize Queue with 5 items
    for (let i = 0; i < 5; i++) {
        const item = createRandomItem();
        gameState.itemQueue.push(item);
        createItemElement(item, i);
    }
    gameState.currentItem = gameState.itemQueue[0];

    const gameTick = setInterval(() => {
        if (!gameState.gameActive) {
            clearInterval(gameTick);
            return;
        }

        if (gameState.isPaused) return;

        const config = DIFFICULTY_CONFIG[currentDifficulty];
        const speed = config.decay + (gameState.score / 150000);
        gameState.time -= speed;

        if (gameState.time <= 0) endGame();

        if (gameState.feverActive) {
            gameState.fever -= 0.8;
            if (gameState.fever <= 0) {
                gameState.feverActive = false;
                document.body.classList.remove('fever-mode');
            }
        }

        updateUI();
    }, 100);
}

function togglePause() {
    if (!gameState.gameActive) return;
    gameState.isPaused = !gameState.isPaused;
    pauseOverlay.classList.toggle('active', gameState.isPaused);
}

function createRandomItem() {
    const types = [
        { type: 'yes', label: "YES 서류", visual: "📑" },
        { type: 'no', label: "NO 서류", visual: "📜" },
        { type: 'bread', label: "식빵", visual: "🍞" }
    ];
    return types[Math.floor(Math.random() * types.length)];
}

function createItemElement(item, index) {
    const el = document.createElement('div');
    el.className = `item-display pos-${index}`;
    if (index === 4) el.classList.add('doc-in'); // New items slide in
    el.innerHTML = `
        <div id="item-visual">${item.visual}</div>
        <div id="item-label">${item.label}</div>
        <div class="tear-part tear-left"></div>
        <div class="tear-part tear-right"></div>
    `;
    itemQueueContainer.appendChild(el);
    itemElements.push(el);
}

function shiftQueue() {
    // Remove the current active element (index 0) after a delay to let animation finish
    const oldEl = itemElements.shift();
    gameState.itemQueue.shift();

    setTimeout(() => oldEl.remove(), 400);

    // Update remaining elements' positions
    itemElements.forEach((el, i) => {
        el.className = `item-display pos-${i}`;
    });

    // Add new item at the end
    const newItem = createRandomItem();
    gameState.itemQueue.push(newItem);
    createItemElement(newItem, 4);

    gameState.currentItem = gameState.itemQueue[0];
    gameState.isProcessing = false;
}

function toggleStatus() {
    if (!gameState.gameActive) return;
    gameState.status = gameState.status === 'yes' ? 'no' : 'yes';
    updateStatusUI();
}

function updateStatusUI() {
    icons.yes.classList.toggle('active', gameState.status === 'yes');
    icons.no.classList.toggle('active', gameState.status === 'no');
}

function handleApprove() {
    if (!gameState.gameActive || gameState.isProcessing) return;

    const item = gameState.currentItem;
    const activeEl = itemElements[0];
    let result = 'none';
    let specialAction = '';

    if (gameState.status === 'yes') {
        if (item.type === 'yes') result = 'success_fever';
        else if (item.type === 'no') result = 'fail';
        else if (item.type === 'bread') {
            result = 'success_both';
        }
    } else { // status === 'no'
        if (item.type === 'yes') result = 'fail';
        else if (item.type === 'no') result = 'success_fever';
        else if (item.type === 'bread') result = 'none';
    }

    if (result === 'none') {
        if (item.type === 'bread') {
            activeEl.classList.add('item-tear');
            gameState.isProcessing = true;
            setTimeout(shiftQueue, 400); // Wait for tear animation
            return;
        }
        activeEl.classList.add('doc-reject');
        gameState.isProcessing = true;
        setTimeout(shiftQueue, 50); // Synchronized move-in
        return;
    }

    gameState.isProcessing = true;

    // Play sound effects could be added here

    if (result.startsWith('success')) {
        // Correct Action
        triggerFlash('flash-correct');
        gameState.combo++;
        const points = 100 + (gameState.combo * 20);
        gameState.score += gameState.feverActive ? points * 2 : points;

        if (result === 'success_fever' || result === 'success_both') {
            if (!gameState.feverActive) {
                gameState.fever = Math.min(100, gameState.fever + 10);
                if (gameState.fever >= 100) activateFever();
            }
        }

        const config = DIFFICULTY_CONFIG[currentDifficulty];
        if (result === 'success_both') gameState.time = Math.min(100, gameState.time + config.recoverBread);
        else gameState.time = Math.min(100, gameState.time + config.recover);

        // Combo animation
        comboText.classList.remove('combo-animate');
        void comboText.offsetWidth;
        comboText.classList.add('combo-animate');

        if (item.type === 'bread') {
            activeEl.classList.add('doc-up');
        } else {
            activeEl.classList.add('doc-approve');
            addPaperToStack();
        }
    } else {
        // Wrong Action
        triggerFlash('flash-wrong');
        const config = DIFFICULTY_CONFIG[currentDifficulty];
        gameState.combo = 0;
        gameState.time -= config.penalty;
        // Visual shake for container or camera
        activeEl.classList.add('item-tear');
    }

    setTimeout(shiftQueue, result.startsWith('success') ? 50 : 400);
}

function triggerFlash(className) {
    flashOverlay.classList.remove('flash-correct', 'flash-wrong');
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add(className);
}

function addPaperToStack() {
    const paper = document.createElement('div');
    paper.className = 'stacked-paper';
    const rotation = (Math.random() - 0.5) * 10;
    paper.style.setProperty('--rot', `${rotation}deg`);
    paperStack.appendChild(paper);

    // Limit stack size to prevent performance issues
    if (paperStack.children.length > 50) {
        paperStack.removeChild(paperStack.firstChild);
    }
}

function activateFever() {
    gameState.feverActive = true;
    document.body.classList.add('fever-mode');
}

function updateUI() {
    comboText.textContent = gameState.combo;
    scoreText.textContent = gameState.score.toLocaleString();
    timerFill.style.width = `${gameState.time}%`;
    feverFill.style.width = `${gameState.fever}%`;

    if (gameState.time < 30) {
        timerFill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
    } else {
        timerFill.style.background = 'linear-gradient(90deg, #4f46e5, #818cf8)';
    }
}

function endGame() {
    gameState.gameActive = false;
    alert(`게임 종료!\n최종 점수: ${gameState.score.toLocaleString()}\n최대 콤보: ${gameState.combo}`);
    startOverlay.classList.add('active');
    const startTitle = startOverlay.querySelector('h1');
    startTitle.textContent = "GAME OVER";
}

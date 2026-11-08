/**
 * GAME.JS - Main Controller, UI Logic, Game Loop
 * Designed for Checkers Royale (2026 Edition)
 */

'use strict';

// ==========================================
// 1. УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ (UI MANAGER)
// ==========================================
const GameUI = {
    screens: ['main-menu', 'deck-screen', 'matchmaking-screen', 'game-screen', 'result-screen'],
    currentMode: 'friendly',
    rating: 4200,

    showScreen(screenId) {
        this.screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === screenId) el.classList.add('active');
                else el.classList.remove('active');
            }
        });

        if (screenId === 'deck-screen') {
            this.renderDeckScreen();
        }
    },

    showMatchmaking(mode) {
        this.currentMode = mode;
        this.showScreen('matchmaking-screen');
        
        const modeText = document.getElementById('mm-mode-text');
        if (modeText) {
            modeText.innerText = mode === 'ranked' ? 'Рейтинговый бой' : 'Дружеский матч';
            modeText.style.color = mode === 'ranked' ? '#f59e0b' : '#3b82f6';
        }

        // Имитация поиска игры (2 секунды)
        setTimeout(() => {
            this.showScreen('game-screen');
            GameController.startMatch(mode);
        }, 2000);
    },

    updateRating(win) {
        this.rating += win ? 30 : -20;
        const el = document.querySelector('.rank-badge');
        if (el) el.innerHTML = `<i class="fa-solid fa-trophy"></i> ${this.rating} Кубков`;
    },

    showResult(win, crowns) {
        this.showScreen('result-screen');
        const title = document.getElementById('result-title');
        const trophies = document.getElementById('result-trophies');
        
        if (win) {
            title.innerText = 'ПОБЕДА';
            title.className = 'win';
            trophies.innerText = `+${30}`;
            this.updateRating(true);
        } else {
            title.innerText = 'ПОРАЖЕНИЕ';
            title.className = 'lose';
            trophies.innerText = `-${20}`;
            this.updateRating(false);
        }
    },

    renderDeckScreen() {
        const grid = document.getElementById('deck-grid');
        const collection = document.getElementById('collection-grid');
        if (!grid || !collection) return;

        grid.innerHTML = '';
        collection.innerHTML = '';

        // Дефолтная колода
        const deckCards = ['pawn_basic', 'knight_shield', 'archer_pawn', 'bomber_pawn', 'mage_pawn', 'prince_pawn', 'king_boss', 'princess_pawn'];
        
        deckCards.forEach(cardId => {
            grid.appendChild(this.createCardElement(cardId, true));
        });

        // Вся коллекция
        Object.keys(window.GameData.Cards).forEach(cardId => {
            collection.appendChild(this.createCardElement(cardId, false));
        });
    },

    createCardElement(cardId, isInDeck) {
        const card = window.GameData.Cards[cardId];
        const div = document.createElement('div');
        div.className = 'card';
        
        // Добавляем класс редкости для свечения
        if (card.rarity.id === 1) div.classList.add('rare');
        if (card.rarity.id === 2) div.classList.add('epic');
        if (card.rarity.id >= 3) div.classList.add('legendary');

        div.innerHTML = `
            <div class="cost">${card.cost}</div>
            <div class="icon">${card.icon}</div>
            <div class="name">${card.name}</div>
        `;

        if (!isInDeck) {
            div.style.opacity = '0.6';
            div.style.transform = 'scale(0.9)';
        }

        return div;
    }
};

// ==========================================
// 2. КОНТРОЛЛЕР ИГРЫ (GAME CONTROLLER)
// ==========================================
const GameController = {
    isRunning: false,
    time: 0,
    matchTime: 180, // 3 минуты
    mode: 'friendly',
    
    elixir: 5,
    enemyElixir: 5,
    maxElixir: 10,
    
    hand: [],
    enemyHand: [],
    
    playerCrowns: 0,
    enemyCrowns: 0,

    renderer: null,
    board: null,
    aiTimer: 0,

    init() {
        this.renderer = new window.Engine.Renderer('gameCanvas');
        this.board = new window.BoardManager(this.renderer);
        this.setupDragAndDrop();
    },

    startMatch(mode) {
        this.mode = mode;
        this.isRunning = true;
        this.time = 0;
        this.elixir = 5;
        this.enemyElixir = 5;
        this.playerCrowns = 0;
        this.enemyCrowns = 0;
        this.aiTimer = 0;

        this.board.initGrid();
        
        // Берем случайные 4 карты в руку
        const allCards = Object.keys(window.GameData.Cards);
        this.hand = [
            'pawn_basic', 'knight_shield', 'archer_pawn', 'mage_pawn' // Фиксированный старт для баланса
        ];
        
        this.enemyHand = [
            'pawn_basic', 'goblin_pawn', 'bomber_pawn', 'prince_pawn'
        ];

        this.renderHand();
        this.updateElixirUI();
        
        // Показываем оверлей "Приготовьтесь"
        const overlay = document.getElementById('game-overlay');
        overlay.style.display = 'flex';
        overlay.innerHTML = '<h2>ПРИГОТОВЬТЕСЬ!</h2>';
        setTimeout(() => { overlay.style.display = 'none'; }, 1500);
    },

    renderHand() {
        const container = document.getElementById('hand-container');
        if (!container) return;
        container.innerHTML = '';

        this.hand.forEach((cardId, index) => {
            const cardData = window.GameData.Cards[cardId];
            const cardEl = GameUI.createCardElement(cardId, true);
            
            if (this.elixir < cardData.cost) cardEl.classList.add('disabled');
            
            // Логика перетаскивания (Drag & Drop)
            cardEl.addEventListener('pointerdown', (e) => {
                if (this.elixir < cardData.cost || !this.isRunning) return;
                this.startDrag(cardId, e);
            });

            container.appendChild(cardEl);
        });
    },

    startDrag(cardId, e) {
        const proxy = document.getElementById('drag-proxy');
        const proxyIcon = document.getElementById('drag-icon');
        const cardData = window.GameData.Cards[cardId];
        
        proxyIcon.innerText = cardData.icon;
        proxy.style.display = 'flex';
        proxy.style.left = e.clientX + 'px';
        proxy.style.top = e.clientY + 'px';

        const onMove = (ev) => {
            proxy.style.left = ev.clientX + 'px';
            proxy.style.top = ev.clientY + 'px';
        };

        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            proxy.style.display = 'none';

            // Определяем, куда упала карта
            const cell = this.renderer.getCellFromXY(ev.clientX, ev.clientY);
            this.trySpawnCard(cardId, 'player', cell);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    },

    trySpawnCard(cardId, side, cell) {
        if (!cell) return;
        
        const cardData = window.GameData.Cards[cardId];
        const row = cell.row;
        const col = cell.col;

        // Проверка зоны спавна
        const validRows = side === 'player' ? window.GameData.Config.playerSpawnRows : window.GameData.Config.enemySpawnRows;
        if (!validRows.includes(row)) {
            // Ошибка: нельзя ставить сюда
            this.board.vfx.spawnText(this.renderer.getCellCenter(row, col).x, this.renderer.getCellCenter(row, col).y, "ЗАПРЕЩЕНО", "#ef4444");
            return;
        }

        // Проверка эликсира
        if (side === 'player' && this.elixir < cardData.cost) return;
        if (side === 'enemy' && this.enemyElixir < cardData.cost) return;

        // Пытаемся заспавнить
        if (this.board.spawnUnit(cardId, side, row, col)) {
            if (side === 'player') {
                this.elixir -= cardData.cost;
                this.updateElixirUI();
                this.renderHand(); // Обновляем состояние карт (делаем недоступными)
                
                // Убираем карту из руки и даем новую (упрощенная версия цикла карт)
                setTimeout(() => {
                    if (!this.isRunning) return;
                    const allCards = Object.keys(window.GameData.Cards);
                    const newCard = allCards[Math.floor(Math.random() * allCards.length)];
                    const index = this.hand.indexOf(cardId);
                    if (index > -1) this.hand[index] = newCard;
                    this.renderHand();
                }, 1000); // Через секунду после спавна
            } else {
                this.enemyElixir -= cardData.cost;
            }
        }
    },

    updateElixirUI() {
        const fill = document.getElementById('elixir-fill');
        const text = document.getElementById('elixir-text');
        if (!fill || !text) return;

        const pct = (this.elixir / this.maxElixir) * 100;
        fill.style.width = pct + '%';
        text.innerText = Math.floor(this.elixir);
    },

    update(dt) {
        if (!this.isRunning) return;
        
        this.time += dt;
        
        // Регенерация эликсира (x2 в последнюю минуту)
        const regenRate = this.time > 120 ? (dt / window.GameData.Config.elixirRegenTime) * 2 : (dt / window.GameData.Config.elixirRegenTime);
        this.elixir = Math.min(this.maxElixir, this.elixir + regenRate);
        this.enemyElixir = Math.min(this.maxElixir, this.enemyElixir + regenRate);
        
        this.updateElixirUI();
        this.checkCardAvailability();

        // Обновляем таймер
        const timeLeft = Math.max(0, this.matchTime - this.time);
        const min = Math.floor(timeLeft / 60);
        const sec = Math.floor(timeLeft % 60);
        document.getElementById('game-time').innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;

        // Логика ИИ
        this.aiTimer += dt;
        if (this.aiTimer > 2.5) { // ИИ думает каждые 2.5 секунды
            this.aiTimer = 0;
            this.executeAI();
        }

        // Обновляем доску (движение, бой)
        this.board.update(dt);
        this.renderer.updateTime(dt);

        // Проверка конца игры по времени
        if (this.time >= this.matchTime) {
            this.endGame(this.playerCrowns > this.enemyCrowns);
        }
    },

    checkCardAvailability() {
        const cards = document.querySelectorAll('#hand-container .card');
        cards.forEach((el, i) => {
            if (!this.hand[i]) return;
            const cost = window.GameData.Cards[this.hand[i]].cost;
            if (this.elixir < cost) el.classList.add('disabled');
            else el.classList.remove('disabled');
        });
    },

    executeAI() {
        // ИИ пытается спавнить карту, если хватает эликсира
        const availableCards = this.enemyHand.filter(cardId => window.GameData.Cards[cardId].cost <= this.enemyElixir);
        
        if (availableCards.length > 0 && Math.random() > 0.4) {
            // Ищем свободную клетку в зоне спавна ИИ
            const validRows = window.GameData.Config.enemySpawnRows;
            let spawned = false;
            let attempts = 0;
            
            while (!spawned && attempts < 10) {
                const cardId = availableCards[Math.floor(Math.random() * availableCards.length)];
                const r = validRows[Math.floor(Math.random() * validRows.length)];
                const c = Math.floor(Math.random() * 8);
                
                if (!this.board.grid[r][c]) {
                    this.trySpawnCard(cardId, 'enemy', { row: r, col: c });
                    spawned = true;
                }
                attempts++;
            }
        } else {
            // Иначе двигаем шашки
            this.board.executeAITurn();
        }
    },

    render() {
        this.renderer.clear();
        
        // Берем конфиг арены (пока первая - лес)
        const arena = window.GameData.Arenas[0];
        this.renderer.drawBackground(arena);
        this.renderer.drawBoard();
        
        // Рендерим всё, что на доске
        this.board.render(this.renderer.ctx);
    },

    endGame(win) {
        if (!this.isRunning) return;
        this.isRunning = false;
        
        setTimeout(() => {
            GameUI.showResult(win, win ? 3 : 0);
        }, 1000);
    }
};

// ==========================================
// 3. ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ
// ==========================================
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min(0.1, (timestamp - lastTime) / 1000); // Защита от лагов
    lastTime = timestamp;

    if (GameController.isRunning) {
        GameController.update(dt);
        GameController.render();
    } else {
        // Даже если игра на паузе, рендерим фон для красоты
        if (GameController.renderer) {
            GameController.renderer.clear();
            GameController.renderer.drawBackground(window.GameData.Arenas[0]);
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==========================================
// 4. ИНИЦИАЛИЗАЦИЯ
// ==========================================
window.addEventListener('load', () => {
    // Инициализируем контроллер при загрузке страницы
    GameController.init();
    
    // Запускаем цикл
    requestAnimationFrame(gameLoop);
    
    // Небольшая анимация загрузки
    setTimeout(() => {
        console.log("Game ready to play!");
    }, 500);
});

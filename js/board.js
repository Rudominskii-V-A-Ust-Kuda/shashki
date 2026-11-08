/**
 * BOARD.JS - Checkers Logic, Unit Entity, Combat and AI
 * Designed for Checkers Royale (2026 Edition)
 */

'use strict';

// ==========================================
// 1. КЛАСС ЮНИТА (ШАШКИ)
// ==========================================
class BoardUnit {
    /**
     * @param {string} id - Уникальный ID юнита
     * @param {string} cardId - ID карты из Data.js
     * @param {string} side - 'player' или 'enemy'
     * @param {number} row - Строка на доске (0-7)
     * @param {number} col - Колонка на доске (0-7)
     * @param {number} level - Уровень юнита (1-4, влияет на силу и визуал)
     */
    constructor(id, cardId, side, row, col, level = 1) {
        this.id = id;
        this.cardId = cardId;
        this.side = side; // 'player' (золотые) или 'enemy' (красные/синие)
        this.row = row;
        this.col = col;
        this.level = level; // Уровень шашки (башня)
        
        this.isDead = false;
        
        // Данные карты
        const cardData = window.GameData.Cards[cardId];
        this.cardData = cardData;
        this.name = cardData.name;
        
        // Статы с учетом уровня
        // Формула: BaseStat * (Scaling ^ (Level - 1)) * Модификатор за уровень
        const levelMultiplier = Math.pow(cardData.scaling, level - 1);
        
        this.maxHp = Math.floor(cardData.stats.hp * levelMultiplier);
        this.hp = this.maxHp;
        this.damage = Math.floor(cardData.stats.damage * levelMultiplier);
        this.attackSpeed = cardData.stats.hitSpeed; // Секунд между атаками
        this.range = cardData.stats.range; // В клетках
        this.speed = cardData.stats.speed; // Клеток в секунду
        
        // Состояние боя
        this.attackCooldown = 0;
        this.target = null;
        
        // Визуал и анимации
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.isMoving = false;
        this.moveProgress = 0;
        
        // Статусные эффекты (Замедление, Горение и т.д.)
        this.effects = {
            slow: 0,
            burn: { duration: 0, damage: 0 }
        };
    }

    /**
     * Обновление состояния юнита
     */
    update(dt, boardManager) {
        if (this.isDead) return;

        // Проверка смерти
        if (this.hp <= 0) {
            this.die(boardManager);
            return;
        }

        // Обработка статусных эффектов
        this.updateEffects(dt);

        // Обработка кулдауна атаки
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Если юнит движется
        if (this.isMoving) {
            this.moveProgress += dt * this.getCurrentSpeed();
            if (this.moveProgress >= 1) {
                this.isMoving = false;
                this.moveProgress = 0;
                this.x = this.targetX;
                this.y = this.targetY;
            } else {
                // Интерполяция движения
                const startX = boardManager.renderer.getCellCenter(this.prevRow, this.prevCol).x;
                const startY = boardManager.renderer.getCellCenter(this.prevRow, this.prevCol).y;
                this.x = window.Engine.Math.lerp(startX, this.targetX, this.moveProgress);
                this.y = window.Engine.Math.lerp(startY, this.targetY, this.moveProgress);
            }
            return; // Не атакуем в движении
        }

        // Если юнит на месте, ищем цель и атакуем
        if (this.range > 1.0) {
            this.handleRangedCombat(dt, boardManager);
        } else {
            this.handleMeleeCombat(dt, boardManager);
        }
    }

    getCurrentSpeed() {
        let base = this.speed;
        if (this.effects.slow > 0) base *= 0.5;
        return base * 0.5; // Модификатор для плавности на доске
    }

    updateEffects(dt) {
        if (this.effects.slow > 0) {
            this.effects.slow -= dt;
        }
        if (this.effects.burn.duration > 0) {
            this.effects.burn.duration -= dt;
            this.takeDamage(this.effects.burn.damage * dt, false);
        }
    }

    handleMeleeCombat(dt, boardManager) {
        // Ближний бой: ищем врага в соседних клетках
        if (this.target && !this.target.isDead) {
            if (boardManager.getDistance(this, this.target) <= 1.5) {
                this.attack(this.target, boardManager);
            } else {
                this.target = null; // Цель убежала
            }
        } else {
            const enemies = boardManager.getEnemiesInRange(this, 1.5);
            if (enemies.length > 0) {
                // Атакуем ближайшего
                this.target = enemies[0];
            }
        }
    }

    handleRangedCombat(dt, boardManager) {
        if (this.target && !this.target.isDead) {
            if (boardManager.getDistance(this, this.target) <= this.range) {
                this.attack(this.target, boardManager);
            } else {
                this.target = null;
            }
        } else {
            const enemies = boardManager.getEnemiesInRange(this, this.range);
            if (enemies.length > 0) {
                this.target = enemies[0];
            }
        }
    }

    attack(target, boardManager) {
        if (this.attackCooldown > 0 || this.cardData.stats.damage === 0) return;

        // Анимация выстрела
        const targetPos = boardManager.renderer.getCellCenter(target.row, target.col);
        const startPos = { x: this.x, y: this.y };
        
        // Цвет снаряда зависит от стихии
        let projColor = '#fbbf24';
        if (this.cardData.id.includes('ice')) projColor = '#38bdf8';
        if (this.cardData.id.includes('fire') || this.cardData.id.includes('mage')) projColor = '#ef4444';

        boardManager.vfx.spawnProjectile(
            startPos.x, startPos.y, 
            targetPos, 
            600, // Скорость снаряда
            projColor, 
            this.damage
        );

        this.attackCooldown = this.attackSpeed;
    }

    takeDamage(amount, showText = true) {
        if (this.isDead) return;
        this.hp -= amount;
        
        if (showText) {
            // Всплывающий текст (через VFX системы)
            const isCrit = Math.random() > 0.9; // Шанс крита для визуала
            if (isCrit) this.hp -= amount * 0.5; // Небольшой шанс двойного урона
        }
        
        if (this.hp <= 0) {
            this.isDead = true;
        }
    }

    die(boardManager) {
        // Эффект взрыва при смерти
        const pos = boardManager.renderer.getCellCenter(this.row, this.col);
        let deathColor = this.side === 'player' ? '#3b82f6' : '#ef4444';
        boardManager.vfx.spawnExplosion(pos.x, pos.y, deathColor, 15);
        
        // Если есть способность взрыва при смерти
        if (this.cardData.abilities.includes('death_damage')) {
            boardManager.applyAreaDamage(this.row, this.col, 2.0, this.damage * 2);
        }
    }
}

// ==========================================
// 2. МЕНЕДЖЕР ДОСКИ (ЛОГИКА ШАШЕК)
// ==========================================
class BoardManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.vfx = new window.Engine.VFXSystem();
        
        this.gridSize = window.GameData.Config.boardSize;
        this.grid = []; // Матрица 8x8
        this.units = []; // Плоский список всех юнитов для быстрой итерации
        
        this.selectedUnit = null;
        this.validMoves = [];
        this.validMerges = [];
        
        this.initGrid();
    }

    initGrid() {
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        this.units = [];
        this.selectedUnit = null;
    }

    // --- СИСТЕМА СПАВНА И СЛИЯНИЯ ---

    spawnUnit(cardId, side, row, col) {
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        if (this.grid[row][col] !== null) return false;

        const unit = new BoardUnit(window.Engine.Math.uuid(), cardId, side, row, col, 1);
        const pos = this.renderer.getCellCenter(row, col);
        unit.x = pos.x;
        unit.y = pos.y;

        this.grid[row][col] = unit;
        this.units.push(unit);
        
        // Эффект спавна
        this.vfx.spawnExplosion(pos.x, pos.y, side === 'player' ? '#60a5fa' : '#f87171', 10);
        return true;
    }

    mergeUnits(unit1, unit2) {
        // Слияние доступно, если они одного типа, одной стороны и уровень < 4
        if (unit1.cardId !== unit2.cardId) return false;
        if (unit1.side !== unit2.side) return false;
        if (unit1.level >= 4) return false; // Максимальный уровень башни

        // Уничтожаем первую, прокачиваем вторую
        this.removeUnit(unit1);
        
        unit2.level += 1;
        
        // Пересчет статов
        const cardData = unit2.cardData;
        const levelMultiplier = Math.pow(cardData.scaling, unit2.level - 1);
        unit2.maxHp = Math.floor(cardData.stats.hp * levelMultiplier * 1.5); // Бонус за слияние
        unit2.hp = unit2.maxHp;
        unit2.damage = Math.floor(cardData.stats.damage * levelMultiplier * 1.5);
        
        // Визуальный эффект апгрейда
        const pos = this.renderer.getCellCenter(unit2.row, unit2.col);
        this.vfx.spawnExplosion(pos.x, pos.y, '#fbbf24', 30);
        this.vfx.spawnText(pos.x, pos.y - 30, `LVL ${unit2.level}!`, '#fbbf24', true);
        
        return true;
    }

    removeUnit(unit) {
        if (this.grid[unit.row][unit.col] === unit) {
            this.grid[unit.row][unit.col] = null;
        }
        const index = this.units.indexOf(unit);
        if (index > -1) {
            this.units.splice(index, 1);
        }
    }

    // --- ЛОГИКА ШАШЕК (ДВИЖЕНИЕ) ---

    /**
     * Получить доступные ходы для классической шашки
     */
    getValidCheckersMoves(unit) {
        const moves = [];
        if (!unit || unit.isMoving) return moves;

        // Направления: Игрок ходит вверх (-1), Враг ходит вниз (+1)
        const dir = unit.side === 'player' ? -1 : 1;
        const dirs = [[dir, -1], [dir, 1]];
        
        // Если шашка прокачана до дамки (уровень 3+), она может ходить назад и на любое расстояние
        const isKing = unit.level >= 3;
        if (isKing) {
            dirs.push([-dir, -1], [-dir, 1]);
        }
        
        const maxStep = isKing ? 7 : 1;

        for (const [dr, dc] of dirs) {
            for (let step = 1; step <= maxStep; step++) {
                const nr = unit.row + dr * step;
                const nc = unit.col + dc * step;

                if (nr < 0 || nr >= this.gridSize || nc < 0 || nc >= this.gridSize) break;

                const targetCell = this.grid[nr][nc];

                if (targetCell === null) {
                    moves.push({ row: nr, col: nc, isCapture: false });
                } else {
                    // Если там враг, проверяем возможность "срубить" (прыжок)
                    if (targetCell.side !== unit.side && !targetCell.isDead) {
                        const jumpR = nr + dr;
                        const jumpC = nc + dc;
                        
                        if (jumpR >= 0 && jumpR < this.gridSize && jumpC >= 0 && jumpC < this.gridSize) {
                            if (this.grid[jumpR][jumpC] === null) {
                                moves.push({ 
                                    row: jumpR, col: jumpC, isCapture: true, 
                                    targetRow: nr, targetCol: nc, targetUnit: targetCell 
                                });
                            }
                        }
                    }
                    break; // Шашка не может проходить сквозь юнитов (если это не дамка)
                }
            }
        }
        return moves;
    }

    /**
     * Выполнить ход шашкой
     */
    executeMove(unit, moveData) {
        if (!unit || !moveData) return;

        // Запоминаем стартовую позицию для анимации
        unit.prevRow = unit.row;
        unit.prevCol = unit.col;

        // Обновляем матрицу
        this.grid[unit.row][unit.col] = null;
        this.grid[moveData.row][moveData.col] = unit;

        // Обновляем координаты юнита
        unit.row = moveData.row;
        unit.col = moveData.col;

        // Настройка анимации
        const targetPos = this.renderer.getCellCenter(unit.row, unit.col);
        unit.targetX = targetPos.x;
        unit.targetY = targetPos.y;
        unit.isMoving = true;
        unit.moveProgress = 0;

        // Если это было срубание врага
        if (moveData.isCapture && moveData.targetUnit) {
            const target = moveData.targetUnit;
            this.grid[target.row][target.col] = null;
            target.isDead = true;
            
            const tPos = this.renderer.getCellCenter(target.row, target.col);
            this.vfx.spawnExplosion(tPos.x, tPos.y, '#ef4444', 20);
            this.removeUnit(target);
        }

        // Проверка на превращение в дамку (достижение конца доски)
        if ((unit.side === 'player' && unit.row === 0) || (unit.side === 'enemy' && unit.row === 7)) {
            if (unit.level < 3) {
                unit.level = 3; // Превращается в летающую дамку
                const pos = this.renderer.getCellCenter(unit.row, unit.col);
                this.vfx.spawnText(pos.x, pos.y - 30, "KING!", "#fbbf24", true);
            }
        }

        this.clearSelection();
    }

    // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ БОЯ ---

    getDistance(unit1, unit2) {
        return Math.hypot(unit1.row - unit2.row, unit1.col - unit2.col);
    }

    getEnemiesInRange(unit, range) {
        const enemies = [];
        for (const other of this.units) {
            if (other.side !== unit.side && !other.isDead) {
                if (this.getDistance(unit, other) <= range) {
                    enemies.push(other);
                }
            }
        }
        // Сортируем по близости
        return enemies.sort((a, b) => this.getDistance(unit, a) - this.getDistance(unit, b));
    }

    applyAreaDamage(row, col, radius, damage) {
        const centerPos = this.renderer.getCellCenter(row, col);
        this.vfx.spawnExplosion(centerPos.x, centerPos.y, '#ef4444', 30);

        for (const unit of this.units) {
            if (unit.isDead) continue;
            const dist = Math.hypot(unit.row - row, unit.col - col);
            if (dist <= radius) {
                unit.takeDamage(damage);
                const pos = this.renderer.getCellCenter(unit.row, unit.col);
                this.vfx.spawnText(pos.x, pos.y, `-${Math.floor(damage)}`, '#f87171');
            }
        }
        this.cleanupDeadUnits();
    }

    cleanupDeadUnits() {
        for (let i = this.units.length - 1; i >= 0; i--) {
            if (this.units[i].isDead) {
                this.grid[this.units[i].row][this.units[i].col] = null;
                this.units.splice(i, 1);
            }
        }
    }

    // --- ВЫДЕЛЕНИЕ ЮНИТОВ (UI) ---

    selectUnit(unit) {
        this.clearSelection();
        if (unit && unit.side === 'player') {
            this.selectedUnit = unit;
            this.validMoves = this.getValidCheckersMoves(unit);
            
            // Поиск возможных слияний рядом
            this.validMerges = [];
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    const other = this.grid[r][c];
                    if (other && other.side === 'player' && other !== unit) {
                        // Слияние доступно, если они в соседних клетках (по горизонтали/вертикали/диагонали)
                        const dist = Math.hypot(unit.row - r, unit.col - c);
                        if (dist <= 1.5 && other.cardId === unit.cardId && unit.level < 4) {
                            this.validMerges.push(other);
                        }
                    }
                }
            }
        }
    }

    clearSelection() {
        this.selectedUnit = null;
        this.validMoves = [];
        this.validMerges = [];
    }

    // --- ОБНОВЛЕНИЕ И ОТРИСОВКА ---

    update(dt) {
        for (const unit of this.units) {
            unit.update(dt, this);
        }
        this.cleanupDeadUnits();
        this.vfx.update(dt);
    }

    render(ctx) {
        // Рендер подсветки ходов
        if (this.selectedUnit) {
            const highlights = [];
            highlights.push({ row: this.selectedUnit.row, col: this.selectedUnit.col, type: 'selected' });
            
            for (const move of this.validMoves) {
                highlights.push({ 
                    row: move.row, col: move.col, 
                    type: move.isCapture ? 'attack' : 'move' 
                });
            }
            
            for (const merge of this.validMerges) {
                highlights.push({ row: merge.row, col: merge.col, type: 'merge' });
            }
            
            this.renderer.drawHighlights(highlights);
        }

        // Рендер юнитов
        for (const unit of this.units) {
            this.renderUnit(unit, ctx);
        }

        // Рендер эффектов
        this.vfx.draw(ctx);
    }

    renderUnit(unit, ctx) {
        const isFlying = unit.cardData.abilities.includes('flying') || unit.level >= 3;
        const bob = isFlying ? Math.sin(this.renderer.time * 4 + unit.bobOffset) * 5 - 10 : 0;
        
        const cx = unit.x;
        const cy = unit.y + bob;
        const size = this.renderer.tileSize * 0.4;
        const layers = unit.level; // Количество слоев (уровней)

        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, unit.y + size * 0.6, size * 1.1, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Отрисовка башни из шашек (уровней)
        for (let i = 0; i < Math.min(layers, 4); i++) {
            const layerY = cy - i * (size * 0.4);
            const layerRadius = size * (1 - i * 0.1);

            // Градиент шашки
            const grad = ctx.createRadialGradient(
                cx - layerRadius * 0.3, layerY - layerRadius * 0.3, layerRadius * 0.1,
                cx, layerY, layerRadius
            );

            if (unit.side === 'player') {
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.4, '#3b82f6'); // Синий игрок
                grad.addColorStop(1, '#1e3a8a');
            } else {
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.4, '#ef4444'); // Красный враг
                grad.addColorStop(1, '#7f1d1d');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, layerY, layerRadius, 0, Math.PI * 2);
            ctx.fill();

            // Обводка (Цвет редкости)
            ctx.strokeStyle = unit.cardData.rarity.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Блик
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(cx - layerRadius*0.3, layerY - layerRadius*0.3, layerRadius*0.25, 0, Math.PI*2);
            ctx.fill();
        }

        // Иконка карты поверх башни
        ctx.font = `${Math.floor(size * 1.2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unit.cardData.icon, cx, cy - Math.min(layers, 4) * (size * 0.4) - 15);

        // Полоска здоровья
        if (unit.hp < unit.maxHp) {
            const barWidth = size * 2;
            const barHeight = 6;
            const barY = cy - Math.min(layers, 4) * (size * 0.4) - 35;
            
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(cx - barWidth/2, barY, barWidth, barHeight);
            
            const hpPercent = unit.hp / unit.maxHp;
            ctx.fillStyle = unit.side === 'player' ? '#10b981' : '#ef4444';
            ctx.fillRect(cx - barWidth/2, barY, barWidth * hpPercent, barHeight);
        }
    }

    // --- ПРОСТОЙ ИИ ---
    executeAITurn() {
        // 1. Ищем, кого можно срубить (приоритет)
        let captureAction = null;
        let bestMove = null;

        for (const unit of this.units) {
            if (unit.side === 'enemy') {
                const moves = this.getValidCheckersMoves(unit);
                for (const move of moves) {
                    if (move.isCapture) {
                        captureAction = { unit, move };
                        break;
                    }
                    if (!bestMove) bestMove = { unit, move };
                }
            }
            if (captureAction) break;
        }

        // Выполняем действие
        if (captureAction) {
            this.executeMove(captureAction.unit, captureAction.move);
            return true;
        } else if (bestMove) {
            this.executeMove(bestMove.unit, bestMove.move);
            return true;
        }

        // Если ходов нет — пробуем спавнить карту (ИИ)
        return false;
    }
}

// Экспорт
window.BoardManager = BoardManager;
console.log("Board.js loaded successfully.");

/**
 * ENGINE.JS - Core Rendering, Math, Physics and VFX System
 * Designed for Checkers Royale (2026 Edition)
 */

'use strict';

// ==========================================
// 1. МАТЕМАТИКА И УТИЛИТЫ (MATH & UTILS)
// ==========================================
const MathUtils = {
    // Ограничение значения в диапазоне
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    
    // Линейная интерполяция
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    
    // Расстояние между точками
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    
    // Случайное число с плавающей точкой в диапазоне
    randFloat: (min, max) => Math.random() * (max - min) + min,
    
    // Случайное целое число
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // Перевод градусов в радианы
    toRad: (deg) => deg * (Math.PI / 180),
    
    // Функция плавности (Ease Out)
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    
    // Функция плавности (Ease In Out)
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

    // Генерация уникального ID
    uuid: () => Math.random().toString(36).substring(2) + Date.now().toString(36)
};

// Вектор для физики и траекторий
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    div(n) { this.x /= n; this.y /= n; return this; }
    mag() { return Math.hypot(this.x, this.y); }
    normalize() {
        const m = this.mag();
        if (m !== 0) this.div(m);
        return this;
    }
    limit(max) {
        if (this.mag() > max) {
            this.normalize();
            this.mult(max);
        }
        return this;
    }
    static dist(v1, v2) { return Math.hypot(v2.x - v1.x, v2.y - v1.y); }
    static sub(v1, v2) { return new Vector2(v1.x - v2.x, v1.y - v2.y); }
}

// ==========================================
// 2. СИСТЕМА ЭФФЕКТОВ (VFX)
// ==========================================

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || MathUtils.randFloat(-100, 100);
        this.vy = options.vy || MathUtils.randFloat(-100, 100);
        this.gravity = options.gravity !== undefined ? options.gravity : 200;
        this.friction = options.friction || 0.95;
        this.life = options.life || 1.0;
        this.maxLife = this.life;
        this.color = options.color || '#ffffff';
        this.size = options.size || 4;
        this.glow = options.glow || false;
        this.shape = options.shape || 'circle'; // 'circle', 'square', 'spark'
        this.rotation = options.rotation || 0;
        this.vRot = options.vRot || 0;
    }

    update(dt) {
        this.vx *= Math.pow(this.friction, dt * 60);
        this.vy *= Math.pow(this.friction, dt * 60);
        this.vy += this.gravity * dt;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        this.rotation += this.vRot * dt;
        this.life -= dt;
        
        return this.life <= 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;

        if (this.glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'square') {
            const s = this.size * alpha;
            ctx.fillRect(-s / 2, -s / 2, s, s);
        } else if (this.shape === 'spark') {
            ctx.beginPath();
            ctx.moveTo(0, -this.size * 2 * alpha);
            ctx.lineTo(this.size * 0.5 * alpha, 0);
            ctx.lineTo(0, this.size * 2 * alpha);
            ctx.lineTo(-this.size * 0.5 * alpha, 0);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

class FloatingText {
    constructor(x, y, text, color = '#ffffff', isCrit = false) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.isCrit = isCrit;
        this.life = 1.2;
        this.maxLife = 1.2;
        this.vy = -60;
        this.vx = MathUtils.randFloat(-20, 20);
        this.scale = isCrit ? 1.5 : 1.0;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.vy += 100 * dt; // Замедление подъема
        this.life -= dt;
        return this.life <= 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const bounce = this.life > 1.0 ? MathUtils.easeOutCubic((1.2 - this.life) * 5) : 1;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = `900 ${20 * this.scale * bounce}px 'Rubik', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 4 * this.scale;
        
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        
        if (this.isCrit) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = `700 12px 'Rubik', sans-serif`;
            ctx.fillText('CRIT!', this.x, this.y - 25);
        }
        
        ctx.globalAlpha = 1;
    }
}

class Projectile {
    constructor(x, y, target, speed, color, damage) {
        this.pos = new Vector2(x, y);
        this.target = target;
        this.speed = speed;
        this.color = color;
        this.damage = damage;
        this.isDead = false;
        this.trailTimer = 0;
        
        // Начальная цель
        this.targetPos = new Vector2(target.x, target.y);
        this.angle = Math.atan2(this.targetPos.y - y, this.targetPos.x - x);
    }

    update(dt, vfxSystem) {
        if (this.isDead) return;

        // Самонаведение (Homing)
        if (this.target && !this.target.isDead) {
            this.targetPos.x = this.target.x;
            this.targetPos.y = this.target.y;
        }

        const dx = this.targetPos.x - this.pos.x;
        const dy = this.targetPos.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        // Поворот к цели
        const targetAngle = Math.atan2(dy, dx);
        this.angle = MathUtils.lerp(this.angle, targetAngle, 10 * dt);

        // Движение
        this.pos.x += Math.cos(this.angle) * this.speed * dt;
        this.pos.y += Math.sin(this.angle) * this.speed * dt;

        // Трейл (След)
        this.trailTimer += dt;
        if (this.trailTimer > 0.02) {
            vfxSystem.spawnParticle(this.pos.x, this.pos.y, {
                vx: MathUtils.randFloat(-20, 20),
                vy: MathUtils.randFloat(-20, 20),
                life: 0.3,
                color: this.color,
                size: 3,
                glow: true,
                gravity: 0
            });
            this.trailTimer = 0;
        }

        // Попадание
        if (dist < 15) {
            this.isDead = true;
            vfxSystem.spawnExplosion(this.targetPos.x, this.targetPos.y, this.color, 15);
            
            // Нанесение урона (если цель - юнит)
            if (this.target && !this.target.isDead && this.target.takeDamage) {
                this.target.takeDamage(this.damage);
            }
        }
    }

    draw(ctx) {
        if (this.isDead) return;
        
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        // Снаряд в виде вытянутой капли
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.quadraticCurveTo(0, 8, -15, 0);
        ctx.quadraticCurveTo(0, -8, 10, 0);
        ctx.fill();
        
        ctx.restore();
        ctx.shadowBlur = 0;
    }
}

class VFXSystem {
    constructor() {
        this.particles = [];
        this.floaters = [];
        this.projectiles = [];
    }

    spawnParticle(x, y, options) {
        this.particles.push(new Particle(x, y, options));
    }

    spawnExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = MathUtils.randFloat(0, Math.PI * 2);
            const speed = MathUtils.randFloat(50, 300);
            this.spawnParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: MathUtils.randFloat(0.4, 0.8),
                color: color,
                size: MathUtils.randFloat(2, 6),
                glow: true,
                shape: Math.random() > 0.5 ? 'circle' : 'spark',
                gravity: 300
            });
        }
        // Добавляем ударную волну
        this.spawnParticle(x, y, {
            vx: 0, vy: 0, life: 0.3, color: '#ffffff', size: 40, glow: true, gravity: 0, shape: 'circle'
        });
    }

    spawnText(x, y, text, color, isCrit = false) {
        this.floaters.push(new FloatingText(x, y, text, color, isCrit));
    }

    spawnProjectile(x, y, target, speed, color, damage) {
        this.projectiles.push(new Projectile(x, y, target, speed, color, damage));
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].update(dt)) this.particles.splice(i, 1);
        }
        for (let i = this.floaters.length - 1; i >= 0; i--) {
            if (this.floaters[i].update(dt)) this.floaters.splice(i, 1);
        }
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(dt, this);
            if (this.projectiles[i].isDead) this.projectiles.splice(i, 1);
        }
    }

    draw(ctx) {
        this.projectiles.forEach(p => p.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
        this.floaters.forEach(f => f.draw(ctx));
    }
}

// ==========================================
// 3. РЕНДЕРЕР ИГРОВОГО ПОЛЯ (RENDERER)
// ==========================================

class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        
        // Параметры доски
        this.gridSize = 8;
        this.tileSize = 0;
        this.boardSize = 0;
        this.boardX = 0;
        this.boardY = 0;
        
        this.backgroundImg = null; // Сюда можно будет загрузить сгенерированный фон
        this.time = 0;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        
        this.calculateBoardBounds();
    }

    calculateBoardBounds() {
        // Доска занимает 90% ширины, но не более 60% высоты (чтобы влез UI)
        const maxW = this.width * 0.95;
        const maxH = this.height * 0.55;
        
        this.tileSize = Math.floor(Math.min(maxW, maxH) / this.gridSize);
        this.boardSize = this.tileSize * this.gridSize;
        
        this.boardX = Math.floor((this.width - this.boardSize) / 2);
        this.boardY = Math.floor(this.height * 0.15); // Смещение вниз, чтобы освободить место сверху
    }

    getCellCenter(row, col) {
        return {
            x: this.boardX + col * this.tileSize + this.tileSize / 2,
            y: this.boardY + row * this.tileSize + this.tileSize / 2
        };
    }

    getCellFromXY(x, y) {
        const col = Math.floor((x - this.boardX) / this.tileSize);
        const row = Math.floor((y - this.boardY) / this.tileSize);
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            return { row, col };
        }
        return null;
    }

    // --- ОТРИСОВКА ФОНА ---
    drawBackground(biomeConfig) {
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, biomeConfig.skyTop);
        grad.addColorStop(0.4, biomeConfig.skyBottom);
        grad.addColorStop(0.41, biomeConfig.groundTop);
        grad.addColorStop(1, biomeConfig.groundBottom);
        
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Процедурные облака/туман
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.beginPath();
        this.ctx.arc(this.width * 0.2 + Math.sin(this.time * 0.1) * 20, this.height * 0.1, 100, 0, Math.PI * 2);
        this.ctx.arc(this.width * 0.8 + Math.cos(this.time * 0.15) * 30, this.height * 0.15, 150, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // --- ОТРИСОВКА ДОСКИ ---
    drawBoard() {
        const ctx = this.ctx;
        
        // 3D Тень под доской
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 20;
        
        // Деревянная база (рамка)
        ctx.fillStyle = '#2d1b10';
        this.roundRect(
            this.boardX - 15, this.boardY - 15, 
            this.boardSize + 30, this.boardSize + 30, 
            15
        );
        ctx.fill();
        
        ctx.shadowColor = 'transparent'; // Сброс тени
        
        // Внутренняя фаска
        ctx.strokeStyle = '#5c3a21';
        ctx.lineWidth = 4;
        this.roundRect(
            this.boardX - 10, this.boardY - 10, 
            this.boardSize + 20, this.boardSize + 20, 
            10
        );
        ctx.stroke();

        // Клетки
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = this.boardX + c * this.tileSize;
                const y = this.boardY + r * this.tileSize;
                const isDark = (r + c) % 2 === 0;
                
                if (isDark) {
                    const tileGrad = ctx.createLinearGradient(x, y, x + this.tileSize, y + this.tileSize);
                    tileGrad.addColorStop(0, '#3a4a5a'); // Темная клетка
                    tileGrad.addColorStop(1, '#1e293b');
                    ctx.fillStyle = tileGrad;
                } else {
                    const tileGrad = ctx.createLinearGradient(x, y, x + this.tileSize, y + this.tileSize);
                    tileGrad.addColorStop(0, '#cbd5e1'); // Светлая клетка
                    tileGrad.addColorStop(1, '#94a3b8');
                    ctx.fillStyle = tileGrad;
                }
                
                ctx.fillRect(x, y, this.tileSize, this.tileSize);
                
                // Тонкая сетка для эффекта реализма
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            }
        }
    }

    // --- ПОДСВЕТКА КЛЕТОК (ХОДЫ) ---
    drawHighlights(highlights) {
        const ctx = this.ctx;
        highlights.forEach(hl => {
            const x = this.boardX + hl.col * this.tileSize;
            const y = this.boardY + hl.row * this.tileSize;
            const center = this.getCellCenter(hl.row, hl.col);
            
            if (hl.type === 'move') {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
                ctx.beginPath();
                ctx.arc(center.x, center.y, this.tileSize * 0.2, 0, Math.PI * 2);
                ctx.fill();
                
                // Пульсация
                const pulse = (Math.sin(this.time * 5) + 1) * 0.5;
                ctx.strokeStyle = `rgba(96, 165, 250, ${0.5 + pulse * 0.5})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(center.x, center.y, this.tileSize * 0.25 + pulse * 5, 0, Math.PI * 2);
                ctx.stroke();
            } 
            else if (hl.type === 'attack') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.beginPath();
                ctx.arc(center.x, center.y, this.tileSize * 0.35, 0, Math.PI * 2);
                ctx.fill();
                
                // Прицел
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(center.x - 15, center.y); ctx.lineTo(center.x + 15, center.y);
                ctx.moveTo(center.x, center.y - 15); ctx.lineTo(center.x, center.y + 15);
                ctx.stroke();
            }
            else if (hl.type === 'selected') {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4;
                ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
                
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#fbbf24';
                ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
                ctx.shadowBlur = 0;
            }
        });
    }

    roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    updateTime(dt) {
        this.time += dt;
    }
}

// Экспорт в глобальную область для использования в game.js
window.Engine = {
    Math: MathUtils,
    Vector2: Vector2,
    VFXSystem: VFXSystem,
    Renderer: Renderer
};

console.log("Engine.js loaded successfully.");

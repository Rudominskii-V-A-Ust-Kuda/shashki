/**
 * DATA.JS - Game Database, Stats, Cards and Arenas
 * Designed for Checkers Royale (2026 Edition)
 */

'use strict';

// ==========================================
// 1. ГЛОБАЛЬНЫЕ НАСТРОЙКИ ИГРЫ (CONFIG)
// ==========================================
const GameConfig = {
    matchDuration: 180, // Длительность матча в секундах (3 минуты)
    overtimeDuration: 60, // Овертайм (1 минута)
    elixirRegenTime: 2.8, // Время регенерации 1 единицы эликсира
    startElixir: 5,
    maxElixir: 10,
    doubleElixirTime: 60, // За сколько секунд до конца включается x2 эликсир
    boardSize: 8, // Размер поля 8x8
    
    // Зоны спавна (ряды от 0 до 7)
    playerSpawnRows: [4, 5, 6, 7],
    enemySpawnRows: [0, 1, 2, 3],

    // Базовые статы
    baseTowerHp: 2500,
    baseTowerDamage: 50,
    baseTowerRange: 7.5, // В клетках
    baseTowerHitSpeed: 1.0, // Секунд между выстрелами
};

// ==========================================
// 2. РЕДКОСТИ И ИХ ЦВЕТА
// ==========================================
const Rarity = {
    COMMON: { id: 0, name: 'Обычная', color: '#b0bec5', glow: 'rgba(176, 190, 197, 0.5)' },
    RARE: { id: 1, name: 'Редкая', color: '#ffb300', glow: 'rgba(255, 179, 0, 0.6)' },
    EPIC: { id: 2, name: 'Эпическая', color: '#8e24aa', glow: 'rgba(142, 36, 170, 0.7)' },
    LEGENDARY: { id: 3, name: 'Легендарная', color: '#ef5350', glow: 'rgba(239, 83, 80, 0.8)' },
    CHAMPION: { id: 4, name: 'Чемпион', color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.9)' }
};

// ==========================================
// 3. БАЗА ДАННЫХ КАРТ (ШАШЕК)
// ==========================================
/**
 * Структура карты:
 * id: уникальный ключ
 * name: название
 * cost: стоимость эликсира (1-10)
 * rarity: редкость
 * type: тип атаки ('melee', 'ranged', 'splash', 'spawner', 'spell')
 * target: по кому атакует ('ground', 'air', 'both', 'buildings')
 * stats: базовые характеристики на 1 уровне
 * scaling: множитель роста характеристик за уровень (обычно 1.1 = +10%)
 * abilities: массив особых способностей
 */
const CardDatabase = {
    // --- ОБЫЧНЫЕ (COMMON) ---
    pawn_basic: {
        id: 'pawn_basic',
        name: 'Пешка-Новобранец',
        cost: 2,
        rarity: Rarity.COMMON,
        type: 'melee',
        target: 'ground',
        icon: '🛡️',
        description: 'Базовый юнит. Дешевый, но эффективный в больших количествах.',
        stats: { hp: 400, damage: 80, hitSpeed: 1.1, speed: 1.0, range: 1.0, count: 3 },
        scaling: 1.1,
        abilities: []
    },
    pawn_spear: {
        id: 'pawn_spear',
        name: 'Копейщик',
        cost: 2,
        rarity: Rarity.COMMON,
        type: 'ranged',
        target: 'both',
        icon: '🗡️',
        description: 'Атакует с дистанции. Может бить летающих юнитов.',
        stats: { hp: 250, damage: 60, hitSpeed: 1.3, speed: 1.2, range: 3.5, count: 3 },
        scaling: 1.1,
        abilities: []
    },
    knight_shield: {
        id: 'knight_shield',
        name: 'Рыцарь-Щитоносец',
        cost: 3,
        rarity: Rarity.COMMON,
        type: 'melee',
        target: 'ground',
        icon: '⚔️',
        description: 'Крепкий боец. Имеет щит, который поглощает первый удар.',
        stats: { hp: 800, damage: 120, hitSpeed: 1.2, speed: 0.9, range: 1.0, count: 1 },
        scaling: 1.1,
        abilities: ['shield_break']
    },
    archer_pawn: {
        id: 'archer_pawn',
        name: 'Пешка-Лучник',
        cost: 3,
        rarity: Rarity.COMMON,
        type: 'ranged',
        target: 'both',
        icon: '🏹',
        description: 'Стреляет двумя стрелами. Хрупкая, но смертоносная.',
        stats: { hp: 300, damage: 50, hitSpeed: 1.2, speed: 1.0, range: 5.0, count: 2 },
        scaling: 1.1,
        abilities: []
    },
    minion_pawn: {
        id: 'minion_pawn',
        name: 'Пешка-Миньон',
        cost: 3,
        rarity: Rarity.COMMON,
        type: 'melee',
        target: 'ground',
        icon: '🦇',
        description: 'Летающая шашка. Быстрая, но слабая.',
        stats: { hp: 200, damage: 70, hitSpeed: 1.0, speed: 1.5, range: 1.0, count: 3 },
        scaling: 1.1,
        abilities: ['flying']
    },

    // --- РЕДКИЕ (RARE) ---
    bomber_pawn: {
        id: 'bomber_pawn',
        name: 'Бомбист',
        cost: 4,
        rarity: Rarity.RARE,
        type: 'splash',
        target: 'ground',
        icon: '💣',
        description: 'Бросает бомбы, наносящие урон по площади.',
        stats: { hp: 600, damage: 200, hitSpeed: 1.5, speed: 1.0, range: 4.5, count: 1 },
        scaling: 1.1,
        abilities: ['area_damage']
    },
    sniper_pawn: {
        id: 'sniper_pawn',
        name: 'Снайпер',
        cost: 4,
        rarity: Rarity.RARE,
        type: 'ranged',
        target: 'both',
        icon: '🎯',
        description: 'Огромная дальность, но очень медленная перезарядка.',
        stats: { hp: 400, damage: 400, hitSpeed: 2.5, speed: 0.8, range: 7.0, count: 1 },
        scaling: 1.1,
        abilities: ['long_range']
    },
    healer_pawn: {
        id: 'healer_pawn',
        name: 'Пешка-Целитель',
        cost: 4,
        rarity: Rarity.RARE,
        type: 'ranged',
        target: 'ground',
        icon: '✨',
        description: 'Не атакует. Лечит союзных шашек вокруг себя.',
        stats: { hp: 500, damage: 0, hitSpeed: 1.0, speed: 1.0, range: 3.0, count: 1, healAmount: 60 },
        scaling: 1.1,
        abilities: ['heal_aura']
    },
    goblin_pawn: {
        id: 'goblin_pawn',
        name: 'Гоблин-Пешка',
        cost: 2,
        rarity: Rarity.RARE,
        type: 'melee',
        target: 'ground',
        icon: '👺',
        description: 'Быстрый и наносит высокий урон. Очень хрупкий.',
        stats: { hp: 300, damage: 150, hitSpeed: 0.8, speed: 1.8, range: 1.0, count: 3 },
        scaling: 1.1,
        abilities: ['fast_attack']
    },

    // --- ЭПИЧЕСКИЕ (EPIC) ---
    mage_pawn: {
        id: 'mage_pawn',
        name: 'Маг Огня',
        cost: 5,
        rarity: Rarity.EPIC,
        type: 'splash',
        target: 'both',
        icon: '🔥',
        description: 'Стреляет огненными шарами, поджигая врагов.',
        stats: { hp: 700, damage: 250, hitSpeed: 1.4, speed: 1.1, range: 5.5, count: 1 },
        scaling: 1.1,
        abilities: ['area_damage', 'burn']
    },
    prince_pawn: {
        id: 'prince_pawn',
        name: 'Принц',
        cost: 5,
        rarity: Rarity.EPIC,
        type: 'melee',
        target: 'ground',
        icon: '🐎',
        description: 'Разгоняется с течением времени, нанося двойной урон.',
        stats: { hp: 1200, damage: 200, hitSpeed: 1.4, speed: 1.0, range: 1.5, count: 1 },
        scaling: 1.1,
        abilities: ['charge_damage']
    },
    necromancer_pawn: {
        id: 'necromancer_pawn',
        name: 'Некромант',
        cost: 6,
        rarity: Rarity.EPIC,
        type: 'ranged',
        target: 'both',
        icon: '💀',
        description: 'Призывает скелетов при атаке и превращает павших врагов в союзников.',
        stats: { hp: 800, damage: 100, hitSpeed: 1.5, speed: 0.9, range: 4.0, count: 1 },
        scaling: 1.1,
        abilities: ['spawn_skeletons', 'raise_dead']
    },
    dragon_pawn: {
        id: 'dragon_pawn',
        name: 'Дракончик',
        cost: 6,
        rarity: Rarity.EPIC,
        type: 'splash',
        target: 'both',
        icon: '🐉',
        description: 'Летающая шашка. Дышит огнем по площади.',
        stats: { hp: 900, damage: 180, hitSpeed: 1.6, speed: 1.2, range: 3.5, count: 1 },
        scaling: 1.1,
        abilities: ['flying', 'area_damage']
    },

    // --- ЛЕГЕНДАРНЫЕ (LEGENDARY) ---
    king_boss: {
        id: 'king_boss',
        name: 'Король-Гигант',
        cost: 7,
        rarity: Rarity.LEGENDARY,
        type: 'melee',
        target: 'ground',
        icon: '👑',
        description: 'Огромный запас здоровья. При смерти взрывается, нанося урон по площади.',
        stats: { hp: 3500, damage: 250, hitSpeed: 1.8, speed: 0.7, range: 1.2, count: 1 },
        scaling: 1.1,
        abilities: ['death_damage']
    },
    ice_wizard_pawn: {
        id: 'ice_wizard_pawn',
        name: 'Ледяной Маг',
        cost: 5,
        rarity: Rarity.LEGENDARY,
        type: 'splash',
        target: 'both',
        icon: '❄️',
        description: 'Замедляет врагов при атаке. Идеален для защиты.',
        stats: { hp: 800, damage: 150, hitSpeed: 1.5, speed: 1.0, range: 5.0, count: 1 },
        scaling: 1.1,
        abilities: ['area_damage', 'slow']
    },
    sparky_pawn: {
        id: 'sparky_pawn',
        name: 'Искра',
        cost: 6,
        rarity: Rarity.LEGENDARY,
        type: 'splash',
        target: 'ground',
        icon: '⚡',
        description: 'Заряжается 5 секунд, затем наносит колоссальный урон по области.',
        stats: { hp: 1500, damage: 1500, hitSpeed: 5.0, speed: 0.6, range: 4.5, count: 1 },
        scaling: 1.1,
        abilities: ['massive_splash', 'slow_charge']
    },
    princess_pawn: {
        id: 'princess_pawn',
        name: 'Принцесса',
        cost: 3,
        rarity: Rarity.LEGENDARY,
        type: 'splash',
        target: 'both',
        icon: '👸',
        description: 'Огромная дальность атаки. Выпускает залп горящих стрел.',
        stats: { hp: 500, damage: 180, hitSpeed: 1.2, speed: 1.0, range: 8.0, count: 1 },
        scaling: 1.1,
        abilities: ['area_damage', 'long_range']
    },

    // --- ЧЕМПИОНЫ (CHAMPION) ---
    archer_queen: {
        id: 'archer_queen',
        name: 'Королева-Лучница',
        cost: 5,
        rarity: Rarity.CHAMPION,
        type: 'ranged',
        target: 'both',
        icon: '🏹',
        description: 'Использует способность: 3 выстрела по разным целям с огромным уроном.',
        stats: { hp: 1500, damage: 200, hitSpeed: 1.0, speed: 1.1, range: 6.0, count: 1 },
        scaling: 1.1,
        abilities: ['active_ability', 'cloaking']
    },
    golden_knight: {
        id: 'golden_knight',
        name: 'Золотой Рыцарь',
        cost: 4,
        rarity: Rarity.CHAMPION,
        type: 'melee',
        target: 'ground',
        icon: '🛡️',
        description: 'Использует способность: Неуязвимость и рывок к врагу.',
        stats: { hp: 2000, damage: 300, hitSpeed: 1.2, speed: 1.0, range: 1.2, count: 1 },
        scaling: 1.1,
        abilities: ['active_ability', 'dash']
    },
    mighty_miner: {
        id: 'mighty_miner',
        name: 'Могучий Шахтер',
        cost: 4,
        rarity: Rarity.CHAMPION,
        type: 'melee',
        target: 'ground',
        icon: '⛏️',
        description: 'Использует способность: Телепортируется в любую точку поля.',
        stats: { hp: 1800, damage: 250, hitSpeed: 1.3, speed: 1.2, range: 1.0, count: 1 },
        scaling: 1.1,
        abilities: ['active_ability', 'teleport']
    }
};

// ==========================================
// 4. КОНФИГУРАЦИИ АРЕН (BIOMES)
// ==========================================
const ArenaDatabase = [
    {
        id: 0,
        name: 'Изумрудный Лес',
        requiredTrophies: 0,
        skyTop: '#0f172a',
        skyBottom: '#1e3a8a',
        groundTop: '#065f46',
        groundBottom: '#022c22',
        tileDark: '#064e3b',
        tileLight: '#047857',
        ambientParticle: 'leaf',
        ambientColor: '#34d399',
        bossName: 'Древень',
        bossType: 'treant'
    },
    {
        id: 1,
        name: 'Затерянная Пустыня',
        requiredTrophies: 400,
        skyTop: '#451a03',
        skyBottom: '#d97706',
        groundTop: '#92400e',
        groundBottom: '#451a03',
        tileDark: '#78350f',
        tileLight: '#b45309',
        ambientParticle: 'sand',
        ambientColor: '#fcd34d',
        bossName: 'Костяной Император',
        bossType: 'skeleton'
    },
    {
        id: 2,
        name: 'Ледяные Пещеры',
        requiredTrophies: 800,
        skyTop: '#082f49',
        skyBottom: '#38bdf8',
        groundTop: '#0369a1',
        groundBottom: '#082f49',
        tileDark: '#0c4a6e',
        tileLight: '#0284c7',
        ambientParticle: 'snow',
        ambientColor: '#e0f2fe',
        bossName: 'Фрост-Голем',
        bossType: 'frost'
    },
    {
        id: 3,
        name: 'Глубины Океана',
        requiredTrophies: 1200,
        skyTop: '#020617',
        skyBottom: '#0f766e',
        groundTop: '#115e59',
        groundBottom: '#042f2e',
        tileDark: '#134e4a',
        tileLight: '#0f766e',
        ambientParticle: 'bubble',
        ambientColor: '#5eead4',
        bossName: 'Кракен',
        bossType: 'kraken'
    },
    {
        id: 4,
        name: 'Пылающая Бездна',
        requiredTrophies: 1600,
        skyTop: '#450a0a',
        skyBottom: '#991b1b',
        groundTop: '#7f1d1d',
        groundBottom: '#450a0a',
        tileDark: '#7f1d1d',
        tileLight: '#b91c1c',
        ambientParticle: 'ember',
        ambientColor: '#fca5a5',
        bossName: 'Люцифер',
        bossType: 'lucifer'
    }
];

// ==========================================
// 5. КОНФИГУРАЦИИ БОССОВ (PVE РЕЖИМ)
// ==========================================
const BossDatabase = {
    treant: {
        name: 'Древень',
        hp: 10000,
        damage: 300,
        speed: 0.5,
        abilities: ['root', 'summon_treants'],
        phases: [
            { hpPercent: 1.0, color: '#22c55e' },
            { hpPercent: 0.5, color: '#eab308', enraged: true },
            { hpPercent: 0.2, color: '#ef4444', enraged: true }
        ]
    },
    skeleton: {
        name: 'Костяной Император',
        hp: 12000,
        damage: 400,
        speed: 0.8,
        abilities: ['bone_armor', 'summon_skeletons'],
        phases: [
            { hpPercent: 1.0, color: '#e5e7eb' },
            { hpPercent: 0.5, color: '#f59e0b', enraged: true }
        ]
    },
    frost: {
        name: 'Фрост-Голем',
        hp: 18000,
        damage: 500,
        speed: 0.4,
        abilities: ['freeze_aura', 'ice_shards'],
        phases: [
            { hpPercent: 1.0, color: '#93c5fd' },
            { hpPercent: 0.6, color: '#3b82f6', enraged: true },
            { hpPercent: 0.3, color: '#1d4ed8', enraged: true }
        ]
    },
    kraken: {
        name: 'Кракен',
        hp: 25000,
        damage: 600,
        speed: 0.6,
        abilities: ['tentacle_slam', 'whirlpool'],
        phases: [
            { hpPercent: 1.0, color: '#2dd4bf' },
            { hpPercent: 0.5, color: '#0ea5e9', enraged: true }
        ]
    },
    lucifer: {
        name: 'Люцифер',
        hp: 40000,
        damage: 1000,
        speed: 0.7,
        abilities: ['hellfire', 'summon_demons', 'meteor_strike'],
        phases: [
            { hpPercent: 1.0, color: '#ef4444' },
            { hpPercent: 0.7, color: '#b91c1c', enraged: true },
            { hpPercent: 0.3, color: '#7f1d1d', enraged: true }
        ]
    }
};

// ==========================================
// 6. ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ==========================================
window.GameData = {
    Config: GameConfig,
    Rarity: Rarity,
    Cards: CardDatabase,
    Arenas: ArenaDatabase,
    Bosses: BossDatabase
};

console.log("Data.js loaded successfully. Total cards:", Object.keys(CardDatabase).length);

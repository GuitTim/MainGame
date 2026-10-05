// ===== КЛАСС УРОВНЯ =====
class Level {
    constructor(id, name, description, type = 'normal') {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        
        // Геометрия уровня
        this.width = 1200;
        this.height = 700;
        this.corridorHeight = 450;
        this.livingQuartersY = 450;
        
        // Пути для врагов
        this.spawnPoints = [];
        this.basePath = [];
        this.alternativePaths = [];
        this.exitPoints = [];
        
        // Коридоры (видимые пути)
        this.corridors = []; // {x, y, width, height} - визуальные коридоры
        
        // Проломы в полу
        this.floorBreaches = [];
        
        // Места для башен и баррикад
        this.towerSlots = [];
        this.barricadeSlots = [];
        
        // Волны
        this.totalWaves = 5;
        this.currentWave = 0;
        this.waveDifficulty = 1.0;
        
        // Персонал
        this.startingMiners = 10;
        this.startingMilitary = 5;
        
        // Стартовые ресурсы
        this.startingResources = 100;
        
        // Цели миссии
        this.objectives = [];
        this.objectivesCompleted = {};
        
        // Сюжетные события
        this.events = [];
        
        // Статус прохождения
        this.completed = false;
        this.locked = false;
        this.stars = 0;
    }
    
    getCurrentPath(barricades) {
        let currentPath = this.basePath ? [...this.basePath] : [];
        
        if (barricades && Array.isArray(barricades)) {
            for (let barricade of barricades) {
                if (!barricade.active) continue;
                
                const blocksPath = this.pathIntersectsBarricade(currentPath, barricade);
                
                if (blocksPath && this.alternativePaths && this.alternativePaths.length > 0) {
                    currentPath = [...this.alternativePaths[0]];
                    break;
                }
            }
        }
        
        return currentPath;
    }
    
    pathIntersectsBarricade(path, barricade) {
        if (!path || !Array.isArray(path) || path.length < 2) return false;
        
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            if (this.lineIntersectsRect(
                p1.x, p1.y, p2.x, p2.y,
                barricade.x, barricade.y, 
                barricade.width, barricade.height
            )) {
                return true;
            }
        }
        return false;
    }
    
    lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        const left = rx;
        const right = rx + rw;
        const top = ry;
        const bottom = ry + rh;
        
        // Проверка конечных точек
        if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
            (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
            return true;
        }
        
        // Проверка пересечения с границами прямоугольника
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        if (minX > right || maxX < left || minY > bottom || maxY < top) {
            return false;
        }
        
        return true;
    }
    
    checkBreachFall(enemy) {
        if (!this.floorBreaches || !Array.isArray(this.floorBreaches)) return false;
        
        for (let breach of this.floorBreaches) {
            if (!breach.closed && 
                enemy.x >= breach.x && 
                enemy.x <= breach.x + breach.width &&
                enemy.y >= breach.y && 
                enemy.y <= breach.y + breach.height) {
                return true;
            }
        }
        return false;
    }
    
    closeBreach(breachIndex) {
        if (this.floorBreaches && 
            Array.isArray(this.floorBreaches) && 
            breachIndex >= 0 && 
            breachIndex < this.floorBreaches.length) {
            this.floorBreaches[breachIndex].closed = true;
        }
    }
    
    // ===== ОТРИСОВКА УРОВНЯ (ОБНОВЛЕНО) =====
    draw(ctx) {
        if (!ctx) return;
        
        // Фон
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Отрисовка коридоров
        this.drawCorridors(ctx);
        
        // Жилой отсек (увеличенная высота)
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, this.livingQuartersY, this.width, this.height - this.livingQuartersY);
        
        // Граница между коридором и жилым отсеком
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, this.livingQuartersY);
        ctx.lineTo(this.width, this.livingQuartersY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Проломы в полу
        this.drawBreaches(ctx);
        
        // Сетка
        this.drawGrid(ctx);
        
        // Места для башен
        this.drawTowerSlots(ctx);
        
        // Отрисовка пути врагов
        this.drawEnemyPath(ctx);
    }
    
    // Отрисовка коридоров
    drawCorridors(ctx) {
        if (!ctx || !this.corridors || !Array.isArray(this.corridors)) return;
        
        ctx.save();
        
        this.corridors.forEach(corridor => {
            if (!corridor) return;
            
            // Заливка коридора
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(corridor.x, corridor.y, corridor.width, corridor.height);
            
            // Границы коридора
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 2;
            ctx.strokeRect(corridor.x, corridor.y, corridor.width, corridor.height);
            
            // Узор коридора (полосы)
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 1;
            for (let i = 0; i < corridor.width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(corridor.x + i, corridor.y);
                ctx.lineTo(corridor.x + i, corridor.y + corridor.height);
                ctx.stroke();
            }
        });
        
        ctx.restore();
    }
    
    // Отрисовка пути врагов
    drawEnemyPath(ctx) {
        if (!ctx || !this.basePath || this.basePath.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Основной путь
        ctx.beginPath();
        ctx.moveTo(this.basePath[0].x, this.basePath[0].y);
        for (let i = 1; i < this.basePath.length; i++) {
            ctx.lineTo(this.basePath[i].x, this.basePath[i].y);
        }
        ctx.stroke();
        
        // Стрелки направления
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        for (let i = 0; i < this.basePath.length - 1; i++) {
            const p1 = this.basePath[i];
            const p2 = this.basePath[i + 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            
            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(-6, -10);
            ctx.lineTo(-6, 10);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    drawBreaches(ctx) {
        if (!ctx || !this.floorBreaches || !Array.isArray(this.floorBreaches)) return;
        
        ctx.save();
        this.floorBreaches.forEach(breach => {
            if (!breach) return;
            
            if (breach.closed) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
                ctx.fillRect(breach.x, breach.y, breach.width, breach.height);
                ctx.strokeStyle = '#00ff00';
            } else {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(breach.x, breach.y, breach.width, breach.height);
                ctx.strokeStyle = '#ff0000';
            }
            
            ctx.lineWidth = 3;
            ctx.strokeRect(breach.x, breach.y, breach.width, breach.height);
            
            if (!breach.closed) {
                ctx.strokeStyle = '#ffff00';
                ctx.setLineDash([8, 8]);
                ctx.lineWidth = 2;
                ctx.strokeRect(breach.x - 8, breach.y - 8, breach.width + 16, breach.height + 16);
                ctx.setLineDash([]);
            }
        });
        ctx.restore();
    }
    
    drawGrid(ctx) {
        if (!ctx) return;
        
        ctx.strokeStyle = 'rgba(68, 68, 68, 0.3)';
        ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }
    
    drawTowerSlots(ctx) {
        if (!ctx || !this.towerSlots || !Array.isArray(this.towerSlots)) return;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        this.towerSlots.forEach(slot => {
            if (!slot) return;
            ctx.beginPath();
            ctx.arc(slot.x, slot.y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
        
        ctx.setLineDash([]);
        ctx.restore();
    }
}

// ===== СОЗДАНИЕ УРОВНЕЙ (УЛУЧШЕННЫЕ И БОЛЕЕ ИЗВИЛИСТЫЕ) =====

// УРОВЕНЬ 1: Введение (УЛУЧШЕННЫЙ)
function createLevel1() {
    const level = new Level(
        'level_1',
        'СЕКТОР A-7: ПЕРВЫЙ КОНТАКТ',
        'Первая волна существ приближается. Активируйте оборону.',
        'story'
    );
    
    level.width = 1200;
    level.height = 700;
    level.corridorHeight = 450;
    level.livingQuartersY = 450;
    
    // Более извилистый путь
    level.basePath = [
        {x: 40, y: 240},
        {x: 150, y: 180},
        {x: 230, y: 300},
        {x: 320, y: 190},
        {x: 420, y: 310},
        {x: 520, y: 200},
        {x: 620, y: 320},
        {x: 720, y: 210},
        {x: 820, y: 330},
        {x: 930, y: 220},
        {x: 1030, y: 310},
        {x: 1100, y: 260},
        {x: 1100, y: 500}
    ];
    
    // Коридоры
    level.corridors = [
        {x: 30, y: 150, width: 1100, height: 200}
    ];
    
    level.spawnPoints = [{x: 50, y: 250}];
    level.exitPoints = [{x: 1100, y: 500}];
    
    // Проломы
    level.floorBreaches = [
        {x: 350, y: 400, width: 120, height: 40, closed: false, canBeClosed: true},
        {x: 750, y: 400, width: 120, height: 40, closed: false, canBeClosed: true}
    ];
    
    // Больше мест для башен
    level.towerSlots = [
        {x: 150, y: 180, type: 'cannon'},
        {x: 300, y: 150, type: 'machinegun'},
        {x: 450, y: 180, type: 'cannon'},
        {x: 600, y: 200, type: 'rocket'},
        {x: 800, y: 250, type: 'machinegun'}
    ];
    
    // Больше мест для баррикад
    level.barricadeSlots = [
        {x: 250, y: 220, width: 50, height: 50},
        {x: 400, y: 220, width: 50, height: 50},
        {x: 550, y: 270, width: 50, height: 50},
        {x: 700, y: 270, width: 50, height: 50},
        {x: 350, y: 400, width: 120, height: 40}, // На проломе
        {x: 750, y: 400, width: 120, height: 40}  // На проломе
    ];
    
    level.totalWaves = 4;
    level.startingMiners = 12;
    level.startingMilitary = 6;
    level.startingResources = 250;
    level.waveDifficulty = 0.7;
    
    level.objectives = [
        {id: 'survive', text: 'Пережить все волны', completed: false},
        {id: 'repair_tower', text: 'Починить хотя бы одну башню', completed: false},
        {id: 'close_breach', text: 'Закрыть хотя бы один пролом', completed: false}
    ];
    
    // События
    level.events = [
        {
            wave: 0,
            trigger: 'start',
            dialog: {
                title: 'КОМАНДИР МАРКУС',
                text: 'Капитан, неизвестные существа приближаются к сектору A-7. Системы повреждены. Активируйте орудия!',
                choices: [
                    {text: 'Начать ремонт систем', effect: null}
                ],
                timed: false
            }
        },
        {
            wave: 1,
            trigger: 'start',
            dialog: {
                title: 'ИНЖЕНЕР CHEN',
                text: 'Обнаружены проломы в полу. Существа могут провалиться прямо к нашим людям. Закрыть баррикадами?',
                choices: [
                    {text: 'Да, выделить ресурсы (+40 ресурсов)', effect: {type: 'resources', value: 40}},
                    {text: 'Нет, справимся сами', effect: null}
                ],
                timed: true,
                timeLimit: 15
            }
        },
        {
            wave: 2,
            trigger: 'start',
            dialog: {
                title: 'СКАНЕР УГРОЗ',
                text: 'Следующая волна будет усилена. Нужна дополнительная огневая мощь или больше людей для защиты?',
                choices: [
                    {text: 'Переобучить 3 шахтёров в военные', effect: {type: 'convert', count: 3}},
                    {text: 'Получить 60 дополнительных ресурсов', effect: {type: 'resources', value: 60}}
                ],
                timed: true,
                timeLimit: 12
            }
        },
        {
            wave: 3,
            trigger: 'start',
            dialog: {
                title: 'ТАКТИЧЕСКИЙ ОФИЦЕР',
                text: 'Последняя волна! У нас есть шанс, но нужно принять решение!',
                choices: [
                    {text: 'Усилить оборону (+100 ресурсов)', effect: {type: 'resources', value: 100}},
                    {text: 'Подготовить людей (+3 военных)', effect: {type: 'addMilitary', count: 3}}
                ],
                timed: false
            }
        }
    ];
    
    return level;
}

// УРОВЕНЬ 2: Эскалация (УЛУЧШЕННЫЙ)
function createLevel2() {
    const level = new Level(
        'level_2',
        'СЕКТОР B-3: ДВОЙНАЯ УГРОЗА',
        'Враги атакуют с двух направлений. Требуется координация.',
        'normal'
    );
    
    level.width = 1400;
    level.height = 800;
    level.corridorHeight = 500;
    level.livingQuartersY = 500;
    
    // Основной путь (более извилистый)
    level.basePath = [
        {x: 60, y: 180},
        {x: 150, y: 120},
        {x: 240, y: 230},
        {x: 330, y: 140},
        {x: 430, y: 250},
        {x: 520, y: 150},
        {x: 620, y: 260},
        {x: 710, y: 160},
        {x: 820, y: 270},
        {x: 920, y: 170},
        {x: 1020, y: 260},
        {x: 1120, y: 190},
        {x: 1220, y: 280},
        {x: 1300, y: 210},
        {x: 1300, y: 550}
    ];
    
    // Альтернативный путь
    level.alternativePaths = [
        [
            {x: 60, y: 340},
            {x: 160, y: 410},
            {x: 260, y: 300},
            {x: 360, y: 390},
            {x: 460, y: 310},
            {x: 560, y: 400},
            {x: 660, y: 320},
            {x: 760, y: 410},
            {x: 870, y: 330},
            {x: 980, y: 420},
            {x: 1100, y: 360},
            {x: 1220, y: 430},
            {x: 1300, y: 360},
            {x: 1300, y: 550}
        ]
    ];
    
    // Коридоры
    level.corridors = [
        {x: 30, y: 100, width: 1300, height: 150},
        {x: 30, y: 250, width: 1300, height: 150}
    ];
    
    level.spawnPoints = [
        {x: 50, y: 200},
        {x: 50, y: 350}
    ];
    
    level.exitPoints = [{x: 1300, y: 550}];
    
    // Проломы
    level.floorBreaches = [
        {x: 400, y: 450, width: 100, height: 40, closed: false, canBeClosed: true},
        {x: 900, y: 450, width: 100, height: 40, closed: false, canBeClosed: true}
    ];
    
    // Больше башен
    level.towerSlots = [
        {x: 150, y: 130, type: 'cannon'},
        {x: 300, y: 100, type: 'machinegun'},
        {x: 450, y: 130, type: 'rocket'},
        {x: 600, y: 150, type: 'cannon'},
        {x: 200, y: 300, type: 'machinegun'},
        {x: 350, y: 270, type: 'laser'},
        {x: 500, y: 300, type: 'rocket'}
    ];
    
    // Больше баррикад
    level.barricadeSlots = [
        {x: 220, y: 180, width: 50, height: 50},
        {x: 370, y: 180, width: 50, height: 50},
        {x: 520, y: 230, width: 50, height: 50},
        {x: 670, y: 230, width: 50, height: 50},
        {x: 180, y: 330, width: 50, height: 50},
        {x: 330, y: 330, width: 50, height: 50},
        {x: 480, y: 380, width: 50, height: 50},
        {x: 400, y: 450, width: 100, height: 40}, // На проломе
        {x: 900, y: 450, width: 100, height: 40}  // На проломе
    ];
    
    level.totalWaves = 5;
    level.startingMiners = 15;
    level.startingMilitary = 8;
    level.startingResources = 300;
    level.waveDifficulty = 0.8;
    
    level.objectives = [
        {id: 'survive', text: 'Пережить все волны', completed: false},
        {id: 'close_breach', text: 'Закрыть проломы', completed: false},
        {id: 'upgrade_tower', text: 'Улучшить башню до 2 уровня', completed: false}
    ];
    
    // События
    level.events = [
        {
            wave: 1,
            trigger: 'start',
            dialog: {
                title: 'ТАКТИЧЕСКИЙ ОФИЦЕР',
                text: 'Вторая волна идёт по двум путям! Как распределим силы?',
                choices: [
                    {text: 'Построить больше башен на верхнем пути (+50 ресурсов)', effect: {type: 'resources', value: 50}},
                    {text: 'Усилить нижний путь (+3 военных)', effect: {type: 'addMilitary', count: 3}}
                ],
                timed: true,
                timeLimit: 15
            }
        },
        {
            wave: 2,
            trigger: 'start',
            dialog: {
                title: 'МЕДИЦИНСКИЙ ОТСЕК',
                text: 'Группа раненых просит эвакуации через наш сектор. Это рискованно, но они могут помочь.',
                choices: [
                    {text: 'Принять их (+4 шахтёра, +2 военных)', effect: {type: 'addPersonnel', miners: 4, military: 2}},
                    {text: 'Отказать (сохранить безопасность)', effect: null}
                ],
                timed: true,
                timeLimit: 20
            }
        },
        {
            wave: 3,
            trigger: 'start',
            dialog: {
                title: 'РАЗВЕДКА',
                text: 'Сканеры показывают крупных существ в следующей волне. Подготовиться?',
                choices: [
                    {text: 'Экстренное улучшение башен (+80 ресурсов)', effect: {type: 'resources', value: 80}},
                    {text: 'Укрепить позиции (+3 военных)', effect: {type: 'addMilitary', count: 3}}
                ],
                timed: true,
                timeLimit: 12
            }
        },
        {
            wave: 4,
            trigger: 'start',
            dialog: {
                title: 'ИНЖЕНЕР ПЕТРОВ',
                text: 'Обнаружены аномалии в поведении врагов. Они адаптируются к нашим атакам!',
                choices: [
                    {text: 'Разработать новую тактику (+100 ресурсов)', effect: {type: 'resources', value: 100}},
                    {text: 'Увеличить численность (+4 военных)', effect: {type: 'addMilitary', count: 4}}
                ],
                timed: true,
                timeLimit: 15
            }
        }
    ];
    
    return level;
}

// УРОВЕНЬ 3: Адаптация (УЛУЧШЕННЫЙ)
function createLevel3() {
    const level = new Level(
        'level_3',
        'СЕКТОР C-9: УМНАЯ УГРОЗА',
        'Существа адаптируются. Требуется новая тактика.',
        'story'
    );
    
    level.width = 1600;
    level.height = 900;
    level.corridorHeight = 550;
    level.livingQuartersY = 550;
    
    // Очень извилистый путь
    level.basePath = [
        {x: 100, y: 240},
        {x: 200, y: 160},
        {x: 320, y: 260},
        {x: 430, y: 150},
        {x: 540, y: 270},
        {x: 650, y: 160},
        {x: 760, y: 280},
        {x: 870, y: 170},
        {x: 990, y: 280},
        {x: 1100, y: 180},
        {x: 1220, y: 290},
        {x: 1330, y: 200},
        {x: 1430, y: 310},
        {x: 1500, y: 360},
        {x: 1500, y: 600}
    ];
    
    // Коридор
    level.corridors = [
        {x: 80, y: 150, width: 1450, height: 250}
    ];
    
    level.spawnPoints = [{x: 100, y: 250}];
    level.exitPoints = [{x: 1500, y: 600}];
    
    // Проломы
    level.floorBreaches = [
        {x: 450, y: 450, width: 120, height: 50, closed: false, canBeClosed: true},
        {x: 850, y: 450, width: 120, height: 50, closed: false, canBeClosed: true},
        {x: 1250, y: 450, width: 120, height: 50, closed: false, canBeClosed: true}
    ];
    
    // Много башен
    level.towerSlots = [
        {x: 180, y: 180, type: 'cannon'},
        {x: 320, y: 150, type: 'laser'},
        {x: 460, y: 180, type: 'rocket'},
        {x: 600, y: 200, type: 'machinegun'},
        {x: 740, y: 230, type: 'shock'},
        {x: 880, y: 250, type: 'cannon'},
        {x: 1020, y: 280, type: 'laser'},
        {x: 1160, y: 300, type: 'rocket'}
    ];
    
    // Много баррикад
    level.barricadeSlots = [
        {x: 250, y: 220, width: 60, height: 50},
        {x: 390, y: 220, width: 60, height: 50},
        {x: 530, y: 270, width: 60, height: 50},
        {x: 670, y: 270, width: 60, height: 50},
        {x: 810, y: 320, width: 60, height: 50},
        {x: 950, y: 320, width: 60, height: 50},
        {x: 1090, y: 370, width: 60, height: 50},
        {x: 1230, y: 370, width: 60, height: 50},
        {x: 450, y: 450, width: 120, height: 50}, // На проломе
        {x: 850, y: 450, width: 120, height: 50}, // На проломе
        {x: 1250, y: 450, width: 120, height: 50} // На проломе
    ];
    
    level.totalWaves = 6;
    level.startingMiners = 18;
    level.startingMilitary = 10;
    level.startingResources = 350;
    level.waveDifficulty = 1.0;
    
    level.objectives = [
        {id: 'survive', text: 'Пережить все волны', completed: false},
        {id: 'upgrade_tower', text: 'Улучшить башню до 3 уровня', completed: false},
        {id: 'max_towers', text: 'Иметь минимум 6 активных башен', completed: false}
    ];
    
    // События
    level.events = [
        {
            wave: 0,
            trigger: 'start',
            dialog: {
                title: 'DR. SILVA',
                text: 'Капитан, сканеры показывают странную активность. Существа... меняются. Учатся.',
                choices: [
                    {text: 'Понял. Будем готовы.', effect: null}
                ],
                timed: false
            }
        },
        {
            wave: 1,
            trigger: 'start',
            dialog: {
                title: 'ВЫБОР: ТЕХНОЛОГИЯ',
                text: 'Инженеры разработали два прототипа. Что выбрать?',
                choices: [
                    {text: 'Улучшенные снаряды (+урон башням)', effect: {type: 'buffDamage', value: 1.3}},
                    {text: 'Укрепленные баррикады (+прочность)', effect: {type: 'buffBarricades', value: 1.6}}
                ],
                timed: true,
                timeLimit: 15
            }
        },
        {
            wave: 2,
            trigger: 'start',
            dialog: {
                title: 'СОСЕДНИЙ СЕКТОР',
                text: 'Сектор D-4 запрашивает подкрепление. Можем отправить людей или ресурсы.',
                choices: [
                    {text: 'Отправить 3 военных (получить 100 ресурсов)', effect: {type: 'removeMilitary', count: 3, resources: 100}},
                    {text: 'Отправить 120 ресурсов (получить 4 военных)', effect: {type: 'resources', value: -120, military: 4}},
                    {text: 'Отказать', effect: null}
                ],
                timed: true,
                timeLimit: 20
            }
        },
        {
            wave: 3,
            trigger: 'start',
            dialog: {
                title: 'ПРЕДУПРЕЖДЕНИЕ',
                text: 'Следующая волна содержит существ с особыми способностями!',
                choices: [
                    {text: 'Усилить оборону (+120 ресурсов)', effect: {type: 'resources', value: 120}},
                    {text: 'Подготовить людей (+4 военных)', effect: {type: 'addMilitary', count: 4}}
                ],
                timed: true,
                timeLimit: 12
            }
        },
        {
            wave: 4,
            trigger: 'start',
            dialog: {
                title: 'КРИТИЧЕСКАЯ СИТУАЦИЯ',
                text: 'Враги адаптируются быстрее! Нужны срочные меры!',
                choices: [
                    {text: 'Активировать резервы (+150 ресурсов, +3 военных)', effect: {type: 'emergency', resources: 150, military: 3}},
                    {text: 'Перегрузить башни (+60% урон)', effect: {type: 'buffDamage', value: 1.6}}
                ],
                timed: true,
                timeLimit: 15
            }
        },
        {
            wave: 5,
            trigger: 'start',
            dialog: {
                title: 'ПОСЛЕДНЯЯ ВОЛНА',
                text: 'Это решающий момент. Дать всё что есть?',
                choices: [
                    {text: 'Да! Максимальная мощь! (+200 ресурсов)', effect: {type: 'resources', value: 200}},
                    {text: 'Сохранить резервы', effect: null}
                ],
                timed: false
            }
        }
    ];
    
    return level;
}

// УРОВЕНЬ 4: Осада (УЛУЧШЕННЫЙ)
function createLevel4() {
    const level = new Level(
        'level_4',
        'СЕКТОР D-1: МАССОВАЯ АТАКА',
        'Огромные силы врага. Это испытание на прочность.',
        'normal'
    );
    
    level.width = 1800;
    level.height = 1000;
    level.corridorHeight = 600;
    level.livingQuartersY = 600;
    
    // Очень сложный путь
    level.basePath = [
        {x: 120, y: 260},
        {x: 240, y: 170},
        {x: 360, y: 280},
        {x: 480, y: 180},
        {x: 600, y: 300},
        {x: 720, y: 190},
        {x: 840, y: 310},
        {x: 960, y: 200},
        {x: 1080, y: 320},
        {x: 1200, y: 210},
        {x: 1320, y: 330},
        {x: 1440, y: 220},
        {x: 1560, y: 340},
        {x: 1700, y: 400},
        {x: 1700, y: 650}
    ];
    
    // Коридоры
    level.corridors = [
        {x: 80, y: 200, width: 1650, height: 250}
    ];
    
    level.spawnPoints = [{x: 100, y: 300}];
    level.exitPoints = [{x: 1700, y: 650}];
    
    // Проломы
    level.floorBreaches = [
        {x: 500, y: 500, width: 150, height: 60, closed: false, canBeClosed: true},
        {x: 900, y: 500, width: 150, height: 60, closed: false, canBeClosed: true},
        {x: 1300, y: 500, width: 150, height: 60, closed: false, canBeClosed: true}
    ];
    
    // Много башен
    level.towerSlots = [
        {x: 180, y: 230, type: 'cannon'},
        {x: 320, y: 200, type: 'laser'},
        {x: 460, y: 230, type: 'rocket'},
        {x: 600, y: 250, type: 'machinegun'},
        {x: 740, y: 280, type: 'shock'},
        {x: 880, y: 300, type: 'cannon'},
        {x: 1020, y: 330, type: 'laser'},
        {x: 1160, y: 350, type: 'rocket'},
        {x: 1300, y: 380, type: 'machinegun'},
        {x: 1440, y: 400, type: 'shock'}
    ];
    
    // Много баррикад
    level.barricadeSlots = [
        {x: 250, y: 270, width: 70, height: 60},
        {x: 390, y: 270, width: 70, height: 60},
        {x: 530, y: 320, width: 70, height: 60},
        {x: 670, y: 320, width: 70, height: 60},
        {x: 810, y: 370, width: 70, height: 60},
        {x: 950, y: 370, width: 70, height: 60},
        {x: 1090, y: 420, width: 70, height: 60},
        {x: 1230, y: 420, width: 70, height: 60},
        {x: 1370, y: 470, width: 70, height: 60},
        {x: 500, y: 500, width: 150, height: 60}, // На проломе
        {x: 900, y: 500, width: 150, height: 60}, // На проломе
        {x: 1300, y: 500, width: 150, height: 60} // На проломе
    ];
    
    level.totalWaves = 7;
    level.startingMiners = 22;
    level.startingMilitary = 12;
    level.startingResources = 400;
    level.waveDifficulty = 1.2;
    
    level.objectives = [
        {id: 'survive', text: 'Пережить все волны', completed: false},
        {id: 'max_towers', text: 'Иметь минимум 8 активных башен', completed: false},
        {id: 'save_reactor', text: 'Защитить реактор', completed: false}
    ];
    
    // События
    level.events = [
        {
            wave: 1,
            trigger: 'start',
            dialog: {
                title: 'РАЗВЕДКА',
                text: 'Волны становятся сильнее. Нужна стратегия!',
                choices: [
                    {text: 'Фокус на урон (+100 ресурсов)', effect: {type: 'resources', value: 100}},
                    {text: 'Фокус на защиту (+5 военных)', effect: {type: 'addMilitary', count: 5}}
                ],
                timed: true,
                timeLimit: 15
            }
        },
        {
            wave: 2,
            trigger: 'start',
            dialog: {
                title: 'НАХОДКА',
                text: 'Нашли склад с припасами! Что взять?',
                choices: [
                    {text: 'Технические части (+150 ресурсов)', effect: {type: 'resources', value: 150}},
                    {text: 'Медикаменты (+6 шахтёров)', effect: {type: 'addMiners', count: 6}}
                ],
                timed: true,
                timeLimit: 18
            }
        },
        {
            wave: 3,
            trigger: 'start',
            dialog: {
                title: 'АНОМАЛИЯ',
                text: 'Сканеры зафиксировали мощную энергию. Существа мутируют!',
                choices: [
                    {text: 'Экстренная подготовка (+120 ресурсов, +3 военных)', effect: {type: 'emergency', resources: 120, military: 3}},
                    {text: 'Наблюдать и ждать', effect: null}
                ],
                timed: true,
                timeLimit: 12
            }
        },
        {
            wave: 4,
            trigger: 'start',
            dialog: {
                title: 'КРИТИЧЕСКАЯ СИТУАЦИЯ',
                text: 'Половина пути! Нужны силы для финального рывка!',
                choices: [
                    {text: 'Все на оборону! (+200 ресурсов)', effect: {type: 'resources', value: 200}},
                    {text: 'Мобилизация! (+6 военных)', effect: {type: 'addMilitary', count: 6}}
                ],
                timed: true,
                timeLimit: 15
            }
        },
        {
            wave: 5,
            trigger: 'start',
            dialog: {
                title: 'ИНЖЕНЕР ПЕТРОВ',
                text: 'Оборудование перегружено! Риск поломки!',
                choices: [
                    {text: 'Ремонтировать оборудование (+80 ресурсов)', effect: {type: 'resources', value: 80}},
                    {text: 'Продолжить на максимальной мощности', effect: null}
                ],
                timed: true,
                timeLimit: 12
            }
        },
        {
            wave: 6,
            trigger: 'start',
            dialog: {
                title: 'ПОСЛЕДНИЙ БОЙ',
                text: 'Финальная волна! Это наш шанс!',
                choices: [
                    {text: 'Максимальная огневая мощь! (+250 ресурсов)', effect: {type: 'resources', value: 250}},
                    {text: 'Доверимся построенной обороне', effect: null}
                ],
                timed: false
            }
        }
    ];
    
    return level;
}

// УРОВЕНЬ 5: Босс (УЛУЧШЕННЫЙ)
function createLevel5() {
    const level = new Level(
        'level_5',
        'ЦЕНТРАЛЬНЫЙ РЕАКТОР: РЕШАЮЩАЯ БИТВА',
        'Главное существо-улей у реактора. Последний бой.',
        'story'
    );
    
    level.width = 2000;
    level.height = 1100;
    level.corridorHeight = 700;
    level.livingQuartersY = 700;
    
    // Центральный путь
    level.basePath = [
        {x: 120, y: 320},
        {x: 240, y: 220},
        {x: 360, y: 340},
        {x: 480, y: 230},
        {x: 600, y: 360},
        {x: 720, y: 240},
        {x: 840, y: 370},
        {x: 960, y: 250},
        {x: 1080, y: 380},
        {x: 1200, y: 260},
        {x: 1320, y: 390},
        {x: 1440, y: 270},
        {x: 1560, y: 400},
        {x: 1680, y: 280},
        {x: 1800, y: 420},
        {x: 1900, y: 500},
        {x: 1900, y: 750}
    ];
    
    // Коридор
    level.corridors = [
        {x: 80, y: 250, width: 1850, height: 250}
    ];
    
    level.spawnPoints = [{x: 100, y: 350}];
    level.exitPoints = [{x: 1900, y: 750}];
    
    // Проломы
    level.floorBreaches = [
        {x: 600, y: 600, width: 180, height: 70, closed: false, canBeClosed: true},
        {x: 1100, y: 600, width: 180, height: 70, closed: false, canBeClosed: true},
        {x: 1600, y: 600, width: 180, height: 70, closed: false, canBeClosed: true}
    ];
    
    // Очень много башен
    level.towerSlots = [
        {x: 180, y: 280, type: 'cannon'},
        {x: 320, y: 250, type: 'laser'},
        {x: 460, y: 280, type: 'rocket'},
        {x: 600, y: 300, type: 'machinegun'},
        {x: 740, y: 330, type: 'shock'},
        {x: 880, y: 350, type: 'cannon'},
        {x: 1020, y: 380, type: 'laser'},
        {x: 1160, y: 400, type: 'rocket'},
        {x: 1300, y: 430, type: 'machinegun'},
        {x: 1440, y: 450, type: 'shock'},
        {x: 1580, y: 480, type: 'cannon'},
        {x: 1720, y: 500, type: 'laser'}
    ];
    
    // Очень много баррикад
    level.barricadeSlots = [
        {x: 250, y: 320, width: 80, height: 70},
        {x: 390, y: 320, width: 80, height: 70},
        {x: 530, y: 370, width: 80, height: 70},
        {x: 670, y: 370, width: 80, height: 70},
        {x: 810, y: 420, width: 80, height: 70},
        {x: 950, y: 420, width: 80, height: 70},
        {x: 1090, y: 470, width: 80, height: 70},
        {x: 1230, y: 470, width: 80, height: 70},
        {x: 1370, y: 520, width: 80, height: 70},
        {x: 1510, y: 520, width: 80, height: 70},
        {x: 1650, y: 570, width: 80, height: 70},
        {x: 600, y: 600, width: 180, height: 70}, // На проломе
        {x: 1100, y: 600, width: 180, height: 70}, // На проломе
        {x: 1600, y: 600, width: 180, height: 70} // На проломе
    ];
    
    level.totalWaves = 5;
    level.startingMiners = 25;
    level.startingMilitary = 15;
    level.startingResources = 500;
    level.waveDifficulty = 1.5;
    
    level.objectives = [
        {id: 'survive', text: 'Победить главное существо', completed: false},
        {id: 'save_reactor', text: 'Защитить реактор', completed: false},
        {id: 'no_personnel_loss', text: 'Потерять не более 5 человек', completed: false}
    ];
    
    // События
    level.events = [
        {
            wave: 0,
            trigger: 'start',
            dialog: {
                title: 'КАПИТАН НА МОСТИКЕ',
                text: 'Это оно. Главное существо у реактора. Если потеряем его - потеряем всё. Готовы?',
                choices: [
                    {text: 'Мы готовы к бою!', effect: null}
                ],
                timed: false
            }
        },
        {
            wave: 1,
            trigger: 'start',
            dialog: {
                title: 'УСИЛЕНИЕ',
                text: 'Все системы корабля в вашем распоряжении!',
                choices: [
                    {text: 'Энергия в оружие! (+250 ресурсов)', effect: {type: 'resources', value: 250}},
                    {text: 'Энергия в щиты! (+60% прочность баррикад)', effect: {type: 'buffBarricades', value: 1.6}}
                ],
                timed: true,
                timeLimit: 15
            }
        },
        {
            wave: 2,
            trigger: 'start',
            dialog: {
                title: 'КРИТИЧЕСКИЙ МОМЕНТ',
                text: 'Существа адаптируются быстрее! Нужно действовать!',
                choices: [
                    {text: 'Активировать резервы (+200 ресурсов, +6 военных)', effect: {type: 'emergency', resources: 200, military: 6}},
                    {text: 'Перегрузить башни (+70% урон)', effect: {type: 'buffDamage', value: 1.7}}
                ],
                timed: true,
                timeLimit: 12
            }
        },
        {
            wave: 3,
            trigger: 'start',
            dialog: {
                title: 'ПОСЛЕДНИЙ ШАНС',
                text: 'Босс идёт! Можем активировать экспериментальное оружие реактора. Уничтожит 60% врагов, но потребует 7 военных.',
                choices: [
                    {text: 'Активировать! (-7 военных, убить 60% врагов)', effect: {type: 'superWeapon', military: -7, killPercent: 0.6}},
                    {text: 'Нет, сражаться обычными силами', effect: null}
                ],
                timed: true,
                timeLimit: 20
            }
        },
        {
            wave: 4,
            trigger: 'start',
            dialog: {
                title: 'ФИНАЛЬНАЯ АТАКА',
                text: 'Это последний момент! Всё или ничего!',
                choices: [
                    {text: 'ВСЁ НА МАКСИМУМ! (+300 ресурсов)', effect: {type: 'resources', value: 300}},
                    {text: 'Сохранить силы для защиты', effect: null}
                ],
                timed: false
            }
        }
    ];
    
    return level;
}

// ===== ГЛОБАЛЬНАЯ КАРТА КАМПАНИИ С СОХРАНЕНИЕМ В localStorage =====
class Campaign {
    constructor() {
        this.levels = [];
        this.currentLevelIndex = 0;
        this.completedLevels = [];
        this.totalStars = 0;
        this.reputation = 0;
        
        this.initializeLevels();
        this.loadProgressFromStorage(); // ✅ Загружаем прогресс при старте
    }
    
    initializeLevels() {
        this.levels = [
            createLevel1(),
            createLevel2(),
            createLevel3(),
            createLevel4(),
            createLevel5()
        ];
        
        this.levels.forEach((level, index) => {
            level.locked = index > 0;
        });
    }
    
    completeLevel(levelId, stars, survivedPersonnel) {
        const levelIndex = this.levels.findIndex(l => l.id === levelId);
        if (levelIndex === -1) return;
        
        const level = this.levels[levelIndex];
        level.completed = true;
        level.stars = Math.max(level.stars, stars);
        
        if (!this.completedLevels.includes(levelId)) {
            this.completedLevels.push(levelId);
        }
        
        if (levelIndex + 1 < this.levels.length) {
            this.levels[levelIndex + 1].locked = false;
        }
        
        this.totalStars = this.levels.reduce((sum, l) => sum + (l.stars || 0), 0);
        
        this.saveProgressToStorage(); // ✅ Сохраняем прогресс после завершения уровня
    }
    
    getCurrentLevel() {
        return this.levels[this.currentLevelIndex];
    }
    
    selectLevel(levelId) {
        const index = this.levels.findIndex(l => l.id === levelId);
        if (index !== -1 && !this.levels[index].locked) {
            this.currentLevelIndex = index;
            return this.levels[index];
        }
        return null;
    }
    
    getLevelProgress() {
        return {
            completed: this.completedLevels.length,
            total: this.levels.length,
            stars: this.totalStars,
            maxStars: this.levels.length * 3
        };
    }

    // ✅ Сохранение прогресса кампании в localStorage
    saveProgressToStorage() {
        try {
            const progress = {
                completedLevels: [...this.completedLevels],
                totalStars: this.totalStars,
                currentLevelIndex: this.currentLevelIndex,
                levels: this.levels.map(level => ({
                    id: level.id,
                    completed: level.completed || false,
                    stars: level.stars || 0,
                    locked: level.locked || false
                })),
                timestamp: Date.now(),
                version: '1.0'
            };

            localStorage.setItem('cosmicBastionCampaign', JSON.stringify(progress));
            console.log('✅ Campaign progress saved to localStorage');
        } catch (e) {
            console.error('❌ Failed to save campaign progress:', e);
        }
    }

    // ✅ Загрузка прогресса кампании из localStorage
    loadProgressFromStorage() {
        try {
            const saved = localStorage.getItem('cosmicBastionCampaign');
            if (!saved) {
                console.log('🆕 No saved campaign progress found. Starting fresh.');
                return;
            }

            const progress = JSON.parse(saved);
            
            if (progress.completedLevels) {
                this.completedLevels = [...progress.completedLevels];
            }
            if (typeof progress.totalStars === 'number') {
                this.totalStars = progress.totalStars;
            }
            if (typeof progress.currentLevelIndex === 'number') {
                this.currentLevelIndex = progress.currentLevelIndex;
            }
            if (progress.levels && Array.isArray(progress.levels)) {
                progress.levels.forEach(savedLevel => {
                    const level = this.levels.find(l => l.id === savedLevel.id);
                    if (level) {
                        level.completed = savedLevel.completed || false;
                        level.stars = savedLevel.stars || 0;
                        level.locked = savedLevel.locked || false;
                    }
                });
            }

            console.log('✅ Campaign progress loaded from localStorage');
        } catch (e) {
            console.error('❌ Failed to load campaign progress:', e);
        }
    }

    // ✅ Полный сброс прогресса (кнопка "Начать заново")
    resetProgress() {
        try {
            localStorage.removeItem('cosmicBastionCampaign');
            localStorage.removeItem('cosmicBastionSave');
            localStorage.removeItem('cosmicBastion_achievements');

            // Сброс локального состояния
            this.completedLevels = [];
            this.totalStars = 0;
            this.currentLevelIndex = 0;
            this.levels.forEach((level, index) => {
                level.completed = false;
                level.stars = 0;
                level.locked = index > 0;
            });

            console.log('♻️ Campaign progress reset');
            alert('Прогресс сброшен. Начинаем игру заново!');
            location.reload();
        } catch (e) {
            console.error('❌ Failed to reset progress:', e);
            alert('Не удалось сбросить прогресс. Попробуйте позже.');
        }
    }
    
    resumeFromSave(savedData) {
        if (savedData && savedData.campaign) {
            const campaignData = savedData.campaign;
            this.currentLevelIndex = campaignData.currentLevelIndex || 0;
            this.completedLevels = campaignData.completedLevels || [];
            this.totalStars = campaignData.totalStars || 0;
            
            if (campaignData.levels && Array.isArray(campaignData.levels)) {
                campaignData.levels.forEach(savedLevel => {
                    const level = this.levels.find(l => l.id === savedLevel.id);
                    if (level) {
                        level.completed = savedLevel.completed || false;
                        level.stars = savedLevel.stars || 0;
                        level.locked = savedLevel.locked || false;
                    }
                });
            }
        }
    }
}

// ===== ЭКСПОРТ ДАННЫХ УРОВНЕЙ =====
if (typeof window !== 'undefined') {
    window.Level = Level;
    window.Campaign = Campaign;
    
    // Функции создания уровней
    window.createLevel1 = createLevel1;
    window.createLevel2 = createLevel2;
    window.createLevel3 = createLevel3;
    window.createLevel4 = createLevel4;
    window.createLevel5 = createLevel5;
    
    console.log('Levels system initialized with', 5, 'levels');
    console.log('All levels ready for campaign play');
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ СОХРАНЕНИЯ/ЗАГРУЗКИ КАМПАНИИ =====
window.saveCampaignProgress = function() {
    if (!window.campaign) return;

    const saveData = {
        completedLevels: [...window.campaign.completedLevels],
        totalStars: window.campaign.totalStars,
        currentLevelIndex: window.campaign.currentLevelIndex,
        levels: window.campaign.levels.map(level => ({
            id: level.id,
            completed: level.completed || false,
            stars: level.stars || 0,
            locked: level.locked || false
        })),
        timestamp: Date.now(),
        version: '1.0'
    };

    try {
        localStorage.setItem('cosmicBastionCampaign', JSON.stringify(saveData));
        console.log('💾 Campaign progress saved to localStorage');
    } catch (e) {
        console.error('❌ Failed to save campaign progress:', e);
    }
};

window.loadCampaignProgress = function() {
    try {
        const saved = localStorage.getItem('cosmicBastionCampaign');
        if (!saved) {
            console.log('🆕 No saved campaign progress found');
            return null;
        }

        const data = JSON.parse(saved);
        console.log('✅ Campaign progress loaded from localStorage');
        return data;
    } catch (e) {
        console.error('❌ Failed to load campaign progress:', e);
        return null;
    }
};

// Автоматическое сохранение при закрытии вкладки
window.addEventListener('beforeunload', () => {
    if (window.campaign) {
        window.campaign.saveProgressToStorage();
    }
    if (window.game && window.game.running) {
        window.game.saveGameStateToStorage();
    }
});

console.log('Level system ready');
console.log('Campaign saving/loading via localStorage enabled');
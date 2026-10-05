// ===== СИСТЕМА ВРАГОВ =====

// Базовый класс врага
class Enemy {
    constructor(type, size, abilities = []) {
        this.id = Math.random().toString(36).substr(2, 9); // УНИКАЛЬНЫЙ ID
        this.type = type; // 'simple', 'ability', 'miniboss', 'boss'
        this.size = size; // 'small', 'medium', 'large'
        
        // Базовые характеристики в зависимости от размера
        this.setBaseStats();
        
        // Способности
        this.abilities = abilities;
        this.abilityStates = {}; // Состояния способностей
        
        // Позиция и движение
        this.x = 0;
        this.y = 0;
        this.pathIndex = 0;
        this.path = [];
        this.distanceOnSegment = 0;
        
        // Состояние
        this.currentHealth = this.maxHealth;
        this.alive = true;
        this.reached = false; // Достиг ли жилого отсека
        this.spawned = true; // Для волн
        this.spawnDelay = 0; // Задержка перед появлением
        
        // Визуальные эффекты
        this.opacity = 1;
        this.flashTimer = 0;
        this.blockFlashTimer = 0; // для weakImmunity блокировки
        
        // Для отрисовки
        this.particleOffset = Math.random() * Math.PI * 2;
        this.particleSpeed = 0.02 + Math.random() * 0.03;
        
        // Цель для атаки в жилом отсеке
        this.targetPerson = null;

        // Служебные флаги взаимодействия с баррикадами
        this._barricadeSlowActive = false;
        this._barricadeId = null;
    }
    
    setBaseStats() {
        const sizeStats = {
            small: {
                maxHealth: 30,
                speed: 2.0,
                damage: 1,
                reward: 5,
                mass: 1
            },
            medium: {
                maxHealth: 60,
                speed: 1.5,
                damage: 2,
                reward: 10,
                mass: 2
            },
            large: {
                maxHealth: 150,
                speed: 0.8,
                damage: 5,
                reward: 25,
                mass: 5
            }
        };
        
        const stats = sizeStats[this.size];
        this.maxHealth = stats.maxHealth;
        this.baseSpeed = stats.speed;
        this.speed = stats.speed;
        this.damage = stats.damage;
        this.reward = stats.reward;
        this.mass = stats.mass;
        
        // Модификаторы для типов
        if (this.type === 'ability') {
            this.maxHealth *= 1.5;
            this.reward *= 1.5;
        } else if (this.type === 'miniboss') {
            this.maxHealth *= 2.5;
            this.reward *= 3;
            this.mass *= 2;
        } else if (this.type === 'boss') {
            this.maxHealth *= 12;
            this.reward *= 10;
            this.mass *= 5;
        }
        
        this.maxHealth = Math.floor(this.maxHealth);
        this.reward = Math.floor(this.reward);
    }
    
    // Установка пути
    setPath(path) {
        this.path = path ? [...path] : [];
        if (this.path.length > 0) {
            this.x = this.path[0].x;
            this.y = this.path[0].y;
        }
    }
    
    // Получение урона
    takeDamage(damage, source = null) {
        if (!this.alive) return;
        
        // Проверка способности "Адаптация"
        if (this.hasAbility('adaptation') && source) {
            if (!this.abilityStates.adaptedTower) {
                // Случайно выбираем башню, которая может нанести урон
                this.abilityStates.adaptedTower = source.id;
            }
            
            // Урон наносит только "адаптированная" башня
            if (source.id !== this.abilityStates.adaptedTower) {
                return;
            }
        }
        
        // Проверка способности "Иммунитет к слабому урону" (для боссов)
        if (this.hasAbility('weakImmunity')) {
            const threshold = this.maxHealth * 0.005; // БЫЛО 0.03 → СТАЛО 0.005 (0.5% вместо 3%)
            if (damage < threshold) {
                this.blockFlashTimer = 5; // визуальная индикация блокировки
                console.log(`[DEBUG] Damage ${damage} blocked by weakImmunity (threshold: ${threshold})`);
                return;
            }
        }
        
        this.currentHealth -= damage;
        this.flashTimer = 5; // Визуальная вспышка
        
        if (this.currentHealth <= 0) {
            this.die();
        }
    }
    
    // Смерть врага
    die() {
        this.alive = false;
        
        // Активация способности "Рассеивание"
        if (this.hasAbility('split')) {
            this.onSplit();
        }
    }
    
    // Обновление состояния
    update(deltaTime, towers = [], enemies = []) {
        if (!this.alive) return;
        
        // Обновление визуальных эффектов
        if (this.flashTimer > 0) {
            this.flashTimer--;
        }
        if (this.blockFlashTimer > 0) {
            this.blockFlashTimer--;
        }
        
        this.particleOffset += this.particleSpeed;
        
        // Активация способностей
        this.updateAbilities(deltaTime, towers, enemies);
        
        // Движение
        this.move(deltaTime);
    }
    
    // Движение по пути
    move(deltaTime) {
        if (this.pathIndex >= this.path.length - 1) {
            this.reached = true;
            return;
        }
        
        const current = this.path[this.pathIndex];
        const next = this.path[this.pathIndex + 1];
        
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const moveDistance = this.speed * deltaTime;
        this.distanceOnSegment += moveDistance;
        
        if (this.distanceOnSegment >= distance) {
            this.pathIndex++;
            this.distanceOnSegment = 0;
            
            if (this.pathIndex < this.path.length) {
                this.x = this.path[this.pathIndex].x;
                this.y = this.path[this.pathIndex].y;
            }
        } else {
            const ratio = this.distanceOnSegment / distance;
            this.x = current.x + dx * ratio;
            this.y = current.y + dy * ratio;
        }
    }
    
    // Проверка наличия способности
    hasAbility(abilityName) {
        return this.abilities && this.abilities.includes(abilityName);
    }
    
    // Обновление способностей
    updateAbilities(deltaTime, towers, enemies) {
        // Способность "Ускорение"
        if (this.hasAbility('accelerate')) {
            if (!this.abilityStates.accelerateTimer) {
                this.abilityStates.accelerateTimer = 0;
            }
            this.abilityStates.accelerateTimer += deltaTime;
            
            // Увеличение скорости каждые 2 секунды на 3%
            if (this.abilityStates.accelerateTimer >= 120) {
                this.speed *= 1.03;
                this.abilityStates.accelerateTimer = 0;
            }
        }
        
        // Способность "Телепортация"
        if (this.hasAbility('teleport')) {
            if (!this.abilityStates.hasTeleported) {
                // Телепортация происходит при входе в радиус случайной башни
                for (let tower of towers) {
                    if (!tower.active) continue;
                    
                    const dist = this.distanceTo(tower.x, tower.y);
                    if (dist <= tower.range * 0.7) {
                        this.teleportPastTower(tower);
                        this.abilityStates.hasTeleported = true;
                        break;
                    }
                }
            }
        }
        
        // Способность "Саботаж"
        if (this.hasAbility('sabotage')) {
            if (!this.abilityStates.hasSabotaged) {
                // Саботаж при достижении 60% пути
                if (this.pathIndex >= Math.floor(this.path.length * 0.6)) {
                    this.sabotageRandomTower(towers);
                    this.abilityStates.hasSabotaged = true;
                }
            }
        }
        
        // Способность "Поглощение" (для боссов)
        if (this.hasAbility('absorb')) {
            if (!this.abilityStates.absorbTimer) {
                this.abilityStates.absorbTimer = 0;
            }
            this.abilityStates.absorbTimer += deltaTime;
            
            // Каждые 4 секунды пытается поглотить ближайшего врага
            if (this.abilityStates.absorbTimer >= 240) {
                this.absorbNearbyEnemy(enemies);
                this.abilityStates.absorbTimer = 0;
            }
        }
    }
    
    // Способность "Рассеивание" - вызывается при смерти
    onSplit() {
        const count = this.size === 'large' ? 5 : (this.size === 'medium' ? 3 : 2);
        this.spawnedEnemies = [];
        
        for (let i = 0; i < count; i++) {
            const smallEnemy = new Enemy('simple', 'small');
            if (this.path) {
                smallEnemy.setPath(this.path);
            }
            smallEnemy.pathIndex = this.pathIndex;
            smallEnemy.distanceOnSegment = this.distanceOnSegment;
            smallEnemy.x = this.x + (Math.random() - 0.5) * 30;
            smallEnemy.y = this.y + (Math.random() - 0.5) * 30;
            smallEnemy.spawnDelay = 10 + Math.random() * 20; // Задержка появления
            smallEnemy.spawned = false;
            this.spawnedEnemies.push(smallEnemy);
        }
    }
    
    // Телепортация через башню
    teleportPastTower(tower) {
        // Прыгает на 4-5 сегментов пути вперед
        this.pathIndex = Math.min(this.pathIndex + 4 + Math.floor(Math.random() * 2), this.path.length - 1);
        if (this.pathIndex < this.path.length) {
            this.x = this.path[this.pathIndex].x;
            this.y = this.path[this.pathIndex].y;
        }
        this.distanceOnSegment = 0;
    }
    
    // Саботаж случайной башни
    sabotageRandomTower(towers) {
        const activeTowers = towers.filter(t => t.active && !t.disabled);
        if (activeTowers.length === 0) return;
        
        const target = activeTowers[Math.floor(Math.random() * activeTowers.length)];
        if (target && target.disable) {
            target.disable(240); // Отключает на 4 секунды (240 фреймов при 60 FPS)
        }
    }
    
    // Поглощение ближайшего врага
    absorbNearbyEnemy(enemies) {
        let closest = null;
        let closestDist = 80; // Радиус поглощения
        
        for (let enemy of enemies) {
            if (enemy === this || !enemy.alive || enemy.type === 'boss') continue;
            
            const dist = this.distanceTo(enemy.x, enemy.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        }
        
        if (closest) {
            this.currentHealth = Math.min(this.maxHealth, this.currentHealth + closest.currentHealth * 0.3);
            closest.alive = false;
        }
    }
    
    // Расстояние до точки
    distanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Получить размер для отрисовки
    getDrawSize() {
        const sizeMap = {
            small: 10,
            medium: 18,
            large: 32
        };
        
        let baseSize = sizeMap[this.size];
        
        if (this.type === 'miniboss') baseSize *= 1.4;
        if (this.type === 'boss') baseSize *= 2.2;
        
        return baseSize;
    }
    
    // Отрисовка врага
    draw(ctx) {
        if (!this.alive && this.opacity <= 0) return;
        
        ctx.save();
        
        // Эффект блокировки урона (weakImmunity)
        if (this.blockFlashTimer > 0) {
            ctx.globalAlpha = 0.7 + Math.sin(this.blockFlashTimer * 2) * 0.3;
            ctx.fillStyle = '#00aaff'; // синий оттенок при блокировке
        } else if (this.flashTimer > 0) {
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.globalAlpha = this.opacity;
            // Цвет в зависимости от типа
            if (this.type === 'boss') {
                ctx.fillStyle = '#ff0000';
            } else if (this.type === 'miniboss') {
                ctx.fillStyle = '#ff6666';
            } else if (this.type === 'ability') {
                ctx.fillStyle = '#cccccc';
            } else {
                ctx.fillStyle = '#888888';
            }
        }
        
        const size = this.getDrawSize();
        
        // Основное тело врага (круг)
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Рисуем микрочастицы вокруг
        this.drawParticles(ctx, size);
        
        // Индикация способностей
        this.drawAbilityIndicators(ctx, size);
        
        // Полоса здоровья
        if (this.currentHealth < this.maxHealth) {
            this.drawHealthBar(ctx, size);
        }
        
        ctx.restore();
    }
    
    // Отрисовка микрочастиц
    drawParticles(ctx, size) {
        const particleCount = this.type === 'boss' ? 15 : (this.type === 'miniboss' ? 10 : 7);
        const particleSize = size * 0.25;
        const orbitRadius = size * 1.5;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + this.particleOffset;
            const px = this.x + Math.cos(angle) * orbitRadius;
            const py = this.y + Math.sin(angle) * orbitRadius;
            
            ctx.beginPath();
            ctx.arc(px, py, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Отрисовка индикаторов способностей
    drawAbilityIndicators(ctx, size) {
        if (!this.abilities || this.abilities.length === 0) return;
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        // Рамка вокруг врага с способностями
        if (this.type === 'ability' || this.type === 'miniboss') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, size + 4, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Специальная рамка для боссов
        if (this.type === 'boss') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size + 6, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, size + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Индикаторы конкретных способностей
        let indicatorY = this.y - size - 20;
        const indicatorSize = 4;
        
        if (this.hasAbility('split')) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(this.x - 10, indicatorY, indicatorSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.hasAbility('accelerate')) {
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(this.x, indicatorY, indicatorSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.hasAbility('teleport')) {
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.x + 10, indicatorY, indicatorSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Отрисовка полосы здоровья
    drawHealthBar(ctx, size) {
        const barWidth = size * 2.5;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - size - 15;
        
        // Фон полосы
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Текущее здоровье
        const healthPercent = Math.max(0, Math.min(1, this.currentHealth / this.maxHealth));
        ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : (healthPercent > 0.3 ? '#ffff00' : '#ff0000');
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Рамка
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// ===== ФАБРИКА ВРАГОВ =====
class EnemyFactory {
    // Создание простого врага
    static createSimple(size) {
        return new Enemy('simple', size, []);
    }
    
    // Создание врага со способностью
    static createWithAbility(size, ability) {
        return new Enemy('ability', size, [ability]);
    }
    
    // Создание мини-босса
    static createMiniBoss(size, abilities) {
        return new Enemy('miniboss', size, abilities || []);
    }
    
    // Создание босса
    static createBoss(abilities) {
        return new Enemy('boss', 'large', abilities || []);
    }
    
    // Генерация волны врагов
    static generateWave(waveNumber, difficulty = 1) {
        const enemies = [];
        const baseCount = 8 + waveNumber * 3;
        const count = Math.floor(baseCount * difficulty);
        
        for (let i = 0; i < count; i++) {
            let enemy;
            const rand = Math.random();
            
            // С увеличением волны больше шанс на сильных врагов
            const abilityChance = Math.min(0.4 + waveNumber * 0.06, 0.8);
            const miniBossChance = Math.min(0.08 + waveNumber * 0.03, 0.3);
            
            if (rand < miniBossChance && waveNumber >= 2) {
                // Мини-босс
                const abilities = this.getRandomAbilities(2);
                const size = Math.random() > 0.3 ? 'large' : 'medium';
                enemy = this.createMiniBoss(size, abilities);
            } else if (rand < abilityChance && waveNumber >= 1) {
                // Враг со способностью
                const ability = this.getRandomAbility();
                const size = this.getRandomSize(waveNumber);
                enemy = this.createWithAbility(size, ability);
            } else {
                // Простой враг
                const size = this.getRandomSize(waveNumber);
                enemy = this.createSimple(size);
            }
            
            // Добавляем задержку для визуального эффекта появления
            enemy.spawnDelay = i * 10;
            enemy.spawned = false;
            enemies.push(enemy);
        }
        
        // Босс на каждой 4-й волне
        if (waveNumber % 4 === 0 && waveNumber > 0) {
            const bossAbilities = this.getRandomAbilities(4, true);
            const boss = this.createBoss(bossAbilities);
            boss.spawnDelay = count * 10 + 50; // Появляется после всех
            boss.spawned = false;
            enemies.push(boss);
        }
        
        return enemies;
    }
    
    // Получение случайного размера
    static getRandomSize(waveNumber) {
        const rand = Math.random();
        const largeChance = Math.min(0.15 + waveNumber * 0.04, 0.4);
        const mediumChance = 0.5;
        
        if (rand < largeChance) return 'large';
        if (rand < largeChance + mediumChance) return 'medium';
        return 'small';
    }
    
    // Получение случайной способности
    static getRandomAbility() {
        const abilities = ['split', 'accelerate', 'teleport', 'adaptation', 'sabotage'];
        return abilities[Math.floor(Math.random() * abilities.length)];
    }
    
    // Получение нескольких случайных способностей
    static getRandomAbilities(count, isBoss = false) {
        const regularAbilities = ['split', 'accelerate', 'teleport', 'adaptation', 'sabotage'];
        const bossAbilities = ['absorb', 'weakImmunity', 'dodge', 'confuse', 'blind', 'destroy', 'spawn'];
        
        const pool = isBoss ? [...regularAbilities, ...bossAbilities] : [...regularAbilities];
        const selected = [];
        
        while (selected.length < count && pool.length > 0) {
            const index = Math.floor(Math.random() * pool.length);
            selected.push(pool[index]);
            pool.splice(index, 1);
        }
        
        return selected;
    }
}

// ===== ОПИСАНИЯ СПОСОБНОСТЕЙ =====
const ABILITY_DESCRIPTIONS = {
    split: 'РАССЕИВАНИЕ: При смерти создаёт малых врагов',
    accelerate: 'УСКОРЕНИЕ: Постоянно увеличивает скорость',
    teleport: 'ТЕЛЕПОРТАЦИЯ: Перелетает через башню',
    adaptation: 'АДАПТАЦИЯ: Уязвим только для одной башни',
    sabotage: 'САБОТАЖ: Отключает случайную башню',
    absorb: 'ПОГЛОЩЕНИЕ: Восстанавливает здоровье, убивая врагов',
    weakImmunity: 'ИММУНИТЕТ: Игнорирует урон ниже 0.5% от макс. здоровья',
    dodge: 'УКЛОНЕНИЕ: Уворачивается от снарядов',
    confuse: 'ЗАМЕШАТЕЛЬСТВО: Башни атакуют других врагов',
    blind: 'ОСЛЕПЛЕНИЕ: Башни стреляют по последней позиции',
    destroy: 'УНИЧТОЖЕНИЕ: Может полностью уничтожить башню',
    spawn: 'ГЕНЕРАЦИЯ: Создаёт других врагов'
};

// Экспорт для использования в других файлах
if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
    window.EnemyFactory = EnemyFactory;
    window.ABILITY_DESCRIPTIONS = ABILITY_DESCRIPTIONS;
}

console.log('Enemy system initialized');
console.log('All enemy types and factories ready');
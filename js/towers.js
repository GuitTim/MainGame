// ===== БАЗОВЫЙ КЛАСС БАШНИ =====
class Tower {
    constructor(type, x, y) {
        this.id = Math.random().toString(36).substr(2, 9); // УНИКАЛЬНЫЙ ID
        this.type = type;
        this.x = x;
        this.y = y;
        
        // Состояние
        this.active = false;
        this.level = 0;
        this.broken = true;
        
        // Строительство/Починка
        this.repairing = false;
        this.repairProgress = 0;
        this.repairTime = 180;
        
        // Улучшение
        this.upgrading = false;
        this.upgradeProgress = 0;
        this.upgradeTime = 240;
        
        // Боевые характеристики (устанавливаются в подклассах)
        this.damage = 0;
        this.range = 0;
        this.fireRate = 0; // Кадров между выстрелами
        this.fireTimer = 0;
        
        // Эффекты
        this.disabled = false;
        this.disableTimer = 0;
        
        // Визуализация
        this.angle = 0;
        this.targetAngle = 0;
        this.projectiles = [];
        this.baseStats = {};
        this.abilities = [];
    }

    setBaseStats() {
        // Переопределяется в подклассах
    }

    resetAbilities() {
        this.abilities = [];
    }

    unlockAbility(name, description) {
        if (!name) return;
        if (!this.abilities.some(ability => ability.name === name)) {
            this.abilities.push({name, description: description || ''});
        }
    }

    unlockAbilityByLevel(level = this.level) {
        if (!window.TOWER_UPGRADE_BENEFITS) return;
        const benefits = TOWER_UPGRADE_BENEFITS[this.type];
        if (!benefits) return;
        const ability = benefits[level];
        if (ability) {
            this.unlockAbility(ability.name, ability.description);
        }
    }
    
    // Починка башни
    startRepair(militaryCount) {
        if (this.active || this.repairing) return false;
        this.repairing = true;
        this.repairProgress = 0;
        return true;
    }
    
    // Обновление починки
    updateRepair(militaryCount) {
        if (!this.repairing) return false;
        
        // Скорость починки зависит от количества военных
        const repairSpeed = Math.max(1, militaryCount * 0.5);
        this.repairProgress += repairSpeed;
        
        if (this.repairProgress >= this.repairTime) {
            this.active = true;
            this.broken = false;
            this.repairing = false;
            this.repairProgress = 0;
            return true; // Починка завершена
        }
        
        return false;
    }
    
    // Начало улучшения
    startUpgrade(militaryCount) {
        if (!this.active || this.upgrading || this.level >= 3) return false;
        this.upgrading = true;
        this.upgradeProgress = 0;
        return true;
    }
    
    // Обновление улучшения
    updateUpgrade(militaryCount) {
        if (!this.upgrading) return false;
        
        const upgradeSpeed = Math.max(1, militaryCount * 0.3);
        this.upgradeProgress += upgradeSpeed;
        
        if (this.upgradeProgress >= this.upgradeTime) {
            this.level++;
            this.upgrading = false;
            this.upgradeProgress = 0;
            this.applyUpgrade();
            return true; // Улучшение завершено
        }
        
        return false;
    }
    
    // Применение улучшения (переопределяется в подклассах)
    applyUpgrade() {
        // Базовое улучшение характеристик
    }
    
    // Отключение башни (саботаж)
    disable(duration) {
        this.disabled = true;
        this.disableTimer = duration;
    }
    
    // Обновление состояния
    update(deltaTime, enemies) {
        if (!this.active) return;
        
        // Обновление отключения
        if (this.disabled) {
            this.disableTimer--;
            if (this.disableTimer <= 0) {
                this.disabled = false;
            }
            return; // Не стреляет пока отключена
        }
        
        // Обновление таймера стрельбы
        if (this.fireTimer > 0) {
            this.fireTimer--;
        }
        
        // Обновление снарядов
        this.projectiles = this.projectiles.filter(proj => {
            proj.update();
            return proj.active;
        });
        
        // Поиск цели и атака
        if (this.fireTimer <= 0) {
            this.findTargetAndFire(enemies);
        }
        
        // Плавный поворот к цели
        this.updateRotation();
    }
    
    // Поиск цели и стрельба (переопределяется в подклассах)
    findTargetAndFire(enemies) {
        const target = this.findTarget(enemies);
        if (target) {
            this.targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
            this.fire(target, enemies);
            this.fireTimer = this.fireRate;
        }
    }
    
    // Поиск ближайшей цели в радиусе
    findTarget(enemies) {
        let closest = null;
        let closestDist = this.range;
        
        for (let enemy of enemies) {
            if (!enemy.alive) continue;
            
            const dist = this.distanceTo(enemy.x, enemy.y);
            if (dist <= this.range && dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        }
        
        return closest;
    }
    
    // Поиск самого сильного врага (для лазера)
    findStrongestTarget(enemies) {
        let strongest = null;
        let maxHealth = 0;
        
        for (let enemy of enemies) {
            if (!enemy.alive) continue;
            
            const dist = this.distanceTo(enemy.x, enemy.y);
            if (dist <= this.range && enemy.maxHealth > maxHealth) {
                maxHealth = enemy.maxHealth;
                strongest = enemy;
            }
        }
        
        return strongest;
    }
    
    // Стрельба (переопределяется в подклассах)
    fire(target, allEnemies) {
        // Базовая стрельба
    }
    
    // Обновление поворота
    updateRotation() {
        const angleDiff = this.targetAngle - this.angle;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.angle += normalizedDiff * 0.2;
    }
    
    // Расстояние до точки
    distanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Отрисовка башни
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.broken && !this.repairing) {
            this.drawBroken(ctx);
        } else if (this.repairing) {
            this.drawRepairing(ctx);
        } else if (this.upgrading) {
            this.drawUpgrading(ctx);
        } else {
            this.drawActive(ctx);
        }
        
        ctx.restore();
        
        // Отрисовка снарядов
        this.projectiles.forEach(proj => {
            if (proj && proj.draw) {
                proj.draw(ctx);
            }
        });
    }
    
    // Отрисовка сломанной башни
    drawBroken(ctx) {
        ctx.strokeStyle = '#444444';
        ctx.fillStyle = '#222222';
        ctx.lineWidth = 2;
        
        // Основание
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Знак поломки
        ctx.strokeStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, 8);
        ctx.moveTo(8, -8);
        ctx.lineTo(-8, 8);
        ctx.stroke();
    }
    
    // Отрисовка процесса починки
    drawRepairing(ctx) {
        this.drawBroken(ctx);
        
        // Прогресс-бар
        const progress = this.repairProgress / this.repairTime;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-15, 20, 30 * progress, 4);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(-15, 20, 30, 4);
    }
    
    // Отрисовка процесса улучшения
    drawUpgrading(ctx) {
        this.drawActive(ctx);
        
        // Прогресс-бар улучшения
        const progress = this.upgradeProgress / this.upgradeTime;
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-15, 20, 30 * progress, 4);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(-15, 20, 30, 4);
    }
    
    // Отрисовка активной башни (переопределяется в подклассах)
    drawActive(ctx) {
        ctx.strokeStyle = this.disabled ? '#666666' : '#ffffff';
        ctx.fillStyle = this.disabled ? '#333333' : '#555555';
        ctx.lineWidth = 2;
        
        // Основание
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Уровень башни
        if (this.level > 0) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`LVL${this.level}`, 0, 30);
        }
    }
    
    // Отрисовка радиуса действия
    drawRange(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

Tower.MAX_LEVEL = 3;

// ===== СТАНДАРТНАЯ ПУШКА =====
class CannonTower extends Tower {
    constructor(x, y) {
        super('cannon', x, y);
        this.damage = 15;
        this.range = 120;
        this.fireRate = 60; // 1 выстрел в секунду
        this.multiTarget = false;

        this.baseStats = {
            damage: 15,
            range: 120,
            fireRate: 60
        };
    }

    setBaseStats() {
        this.resetAbilities();
        this.damage = this.baseStats.damage;
        this.range = this.baseStats.range;
        this.fireRate = this.baseStats.fireRate;
        this.multiTarget = false;
    }
    
    applyUpgrade() {
        if (this.level === 1) {
            this.damage = 25;
        } else if (this.level === 2) {
            this.damage = 35;
        } else if (this.level === 3) {
            this.multiTarget = true; // Урон по 3 целям
        }
        this.unlockAbilityByLevel();
    }
    
    fire(target, allEnemies) {
        if (this.multiTarget && this.level >= 3) {
            // Находим 3 ближайших цели
            const targets = allEnemies
                .filter(e => e.alive && this.distanceTo(e.x, e.y) <= this.range)
                .sort((a, b) => this.distanceTo(a.x, a.y) - this.distanceTo(b.x, b.y))
                .slice(0, 3);
            
            targets.forEach(t => {
                const projectile = new Projectile(this.x, this.y, t, this.damage, 'cannon');
                this.projectiles.push(projectile);
            });
        } else {
            const projectile = new Projectile(this.x, this.y, target, this.damage, 'cannon');
            this.projectiles.push(projectile);
        }
    }
    
    drawActive(ctx) {
        super.drawActive(ctx);
        
        // Ствол
        ctx.save();
        ctx.rotate(this.angle);
        ctx.fillStyle = this.disabled ? '#555555' : '#888888';
        ctx.fillRect(0, -4, 20, 8);
        ctx.strokeStyle = this.disabled ? '#666666' : '#ffffff';
        ctx.strokeRect(0, -4, 20, 8);
        ctx.restore();
    }
}

// ===== РАКЕТНИЦА =====
class RocketTower extends Tower {
    constructor(x, y) {
        super('rocket', x, y);
        this.damage = 20;
        this.range = 100;
        this.fireRate = 120; // Медленная
        this.explosionRadius = 40;
        this.knockback = false;

        this.baseStats = {
            damage: 20,
            range: 100,
            fireRate: 120,
            explosionRadius: 40
        };
    }
    
    setBaseStats() {
        this.resetAbilities();
        this.damage = this.baseStats.damage;
        this.range = this.baseStats.range;
        this.fireRate = this.baseStats.fireRate;
        this.explosionRadius = this.baseStats.explosionRadius;
        this.knockback = false;
    }

    applyUpgrade() {
        if (this.level === 1) {
            this.damage = 30;
        } else if (this.level === 2) {
            this.range = 150;
            this.explosionRadius = 60;
        } else if (this.level === 3) {
            this.knockback = true;
        }
        this.unlockAbilityByLevel();
    }
    
    fire(target, allEnemies) {
        const projectile = new ExplosiveProjectile(
            this.x, this.y, target, this.damage, 
            this.explosionRadius, this.knockback, allEnemies
        );
        this.projectiles.push(projectile);
    }
    
    drawActive(ctx) {
        super.drawActive(ctx);
        
        // Пусковая установка
        ctx.save();
        ctx.rotate(this.angle);
        ctx.fillStyle = this.disabled ? '#555555' : '#888888';
        ctx.fillRect(0, -6, 18, 12);
        ctx.fillRect(5, -3, 12, 6);
        ctx.strokeStyle = this.disabled ? '#666666' : '#ffffff';
        ctx.strokeRect(0, -6, 18, 12);
        ctx.restore();
    }
}

// ===== ПУЛЕМЁТ =====
class MachineGunTower extends Tower {
    constructor(x, y) {
        super('machinegun', x, y);
        this.damage = 5;
        this.range = 100;
        this.fireRate = 15; // Очень быстрая
        this.slowEffect = false;

        this.baseStats = {
            damage: 5,
            range: 100,
            fireRate: 15
        };
    }
    
    setBaseStats() {
        this.resetAbilities();
        this.damage = this.baseStats.damage;
        this.range = this.baseStats.range;
        this.fireRate = this.baseStats.fireRate;
        this.slowEffect = false;
    }

    applyUpgrade() {
        if (this.level === 1) {
            this.fireRate = 10; // Ещё быстрее
        } else if (this.level === 2) {
            this.damage = 10;
        } else if (this.level === 3) {
            this.slowEffect = true;
        }
        this.unlockAbilityByLevel();
    }
    
    fire(target, allEnemies) {
        const projectile = new Projectile(
            this.x, this.y, target, this.damage, 'bullet', this.slowEffect
        );
        this.projectiles.push(projectile);
    }
    
    drawActive(ctx) {
        super.drawActive(ctx);
        
        // Двойной ствол
        ctx.save();
        ctx.rotate(this.angle);
        ctx.fillStyle = this.disabled ? '#555555' : '#888888';
        ctx.fillRect(0, -3, 22, 2);
        ctx.fillRect(0, 1, 22, 2);
        ctx.strokeStyle = this.disabled ? '#666666' : '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, -3, 22, 2);
        ctx.strokeRect(0, 1, 22, 2);
        ctx.restore();
    }
}

// ===== ЛАЗЕРНАЯ УСТАНОВКА =====
class LaserTower extends Tower {
    constructor(x, y) {
        super('laser', x, y);
        this.damage = 2; // Урон в кадр
        this.range = 130;
        this.fireRate = 1; // Постоянный луч
        this.currentTarget = null;
        this.piercing = false;

        this.baseStats = {
            damage: 2,
            range: 130,
            fireRate: 1
        };
    }
    
    setBaseStats() {
        this.resetAbilities();
        this.damage = this.baseStats.damage;
        this.range = this.baseStats.range;
        this.fireRate = this.baseStats.fireRate;
        this.piercing = false;
        this.currentTarget = null;
    }

    applyUpgrade() {
        if (this.level === 1) {
            this.range = 180;
        } else if (this.level === 2) {
            this.damage = 3;
        } else if (this.level === 3) {
            this.piercing = true; // Сквозной луч через всю карту
            this.range = 1000;
            this.fireRate = 180; // Но с перезарядкой
        }
        this.unlockAbilityByLevel();
    }
    
    findTargetAndFire(enemies) {
        if (this.piercing && this.level >= 3) {
            // Атакует самого сильного врага
            const target = this.findStrongestTarget(enemies);
            if (target && this.fireTimer <= 0) {
                this.currentTarget = target;
                target.takeDamage(this.damage * 60, this); // Большой разовый урон
                this.fireTimer = this.fireRate;
            } else if (this.fireTimer > 0) {
                this.currentTarget = null;
            }
        } else {
            // Непрерывный луч
            const target = this.findTarget(enemies);
            this.currentTarget = target;
            if (target) {
                this.targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
                target.takeDamage(this.damage, this);
            }
        }
    }
    
    drawActive(ctx) {
        super.drawActive(ctx);
        
        // Лазерная установка
        ctx.save();
        ctx.rotate(this.angle);
        
        // Основа
        ctx.fillStyle = this.disabled ? '#555555' : '#0088ff';
        ctx.fillRect(0, -5, 15, 10);
        ctx.strokeStyle = this.disabled ? '#666666' : '#00ccff';
        ctx.strokeRect(0, -5, 15, 10);
        
        ctx.restore();
        
        // Луч, если есть цель
        if (this.currentTarget && !this.disabled) {
            ctx.save();
            ctx.strokeStyle = this.piercing ? '#ff0000' : '#00ffff';
            ctx.lineWidth = this.piercing ? 4 : 2;
            ctx.globalAlpha = 0.7;
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.currentTarget.x, this.currentTarget.y);
            ctx.stroke();
            
            // Свечение
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            
            ctx.restore();
        }
    }
}

// ===== ЭЛЕКТРОШОКОВАЯ УСТАНОВКА =====
class ShockTower extends Tower {
    constructor(x, y) {
        super('shock', x, y);
        this.damage = 3;
        this.range = 9999; // Бьёт по всей карте
        this.fireRate = 90; // Раз в 1.5 секунды
        this.stunEffect = false;

        this.baseStats = {
            damage: 3,
            range: 9999,
            fireRate: 90
        };
    }

    setBaseStats() {
        this.resetAbilities();
        this.damage = this.baseStats.damage;
        this.range = this.baseStats.range;
        this.fireRate = this.baseStats.fireRate;
        this.stunEffect = false;
    }    
    
    applyUpgrade() {
        if (this.level === 1) {
            this.damage = 5;
        } else if (this.level === 2) {
            this.damage = 8;
        } else if (this.level === 3) {
            this.stunEffect = true;
        }
        this.unlockAbilityByLevel();
    }
    
    findTargetAndFire(enemies) {
        if (this.fireTimer > 0) return;
        
        // Атакует всех врагов
        let hitAny = false;
        enemies.forEach(enemy => {
            if (enemy.alive) {
                enemy.takeDamage(this.damage, this);
                
                // Оглушение на 3 уровне
                if (this.stunEffect && Math.random() < 0.3) {
                    const originalSpeed = enemy.speed;
                    enemy.speed = 0;
                    setTimeout(() => {
                        if (enemy.alive) {
                            enemy.speed = originalSpeed;
                        }
                    }, 1000);
                }
                hitAny = true;
            }
        });
        
        if (hitAny) {
            this.fireTimer = this.fireRate;
            this.showShockEffect = 30; // Показываем эффект 0.5 секунды
        }
    }
    
    update(deltaTime, enemies) {
        super.update(deltaTime, enemies);
        if (this.showShockEffect > 0) {
            this.showShockEffect--;
        }
    }
    
    drawActive(ctx) {
        super.drawActive(ctx);
        
        // Катушка Тесла
        ctx.strokeStyle = this.disabled ? '#666666' : '#ffff00';
        ctx.lineWidth = 2;
        
        // Спираль
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -8 + i * 8, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Эффект разряда
        if (this.showShockEffect > 0 && !this.disabled) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.globalAlpha = this.showShockEffect / 30;
            
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const length = 20 + Math.random() * 10;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }
}

// ===== СНАРЯДЫ =====
class Projectile {
    constructor(x, y, target, damage, type = 'bullet', slowEffect = false) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.type = type;
        this.slowEffect = slowEffect;
        this.speed = type === 'bullet' ? 8 : 6;
        this.active = true;
    }
    
    update() {
        if (!this.target || !this.target.alive) {
            this.active = false;
            return;
        }
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.speed) {
            this.hit();
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }
    
    hit() {
        if (this.target && this.target.takeDamage) {
            this.target.takeDamage(this.damage);
        }
        
        // Замедление
        if (this.slowEffect && this.target && this.target.alive) {
            const originalSpeed = this.target.speed;
            this.target.speed *= 0.5;
            setTimeout(() => {
                if (this.target && this.target.alive) {
                    this.target.speed = originalSpeed;
                }
            }, 2000);
        }
        
        this.active = false;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.type === 'cannon' ? '#ffffff' : '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.type === 'cannon' ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ExplosiveProjectile extends Projectile {
    constructor(x, y, target, damage, explosionRadius, knockback, allEnemies) {
        super(x, y, target, damage, 'rocket');
        this.explosionRadius = explosionRadius;
        this.knockback = knockback;
        this.allEnemies = allEnemies;
        this.speed = 5;
    }
    
    hit() {
        // Урон по площади
        if (this.allEnemies) {
            this.allEnemies.forEach(enemy => {
                if (!enemy.alive) return;
                
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= this.explosionRadius) {
                    const damageMult = 1 - (dist / this.explosionRadius) * 0.5;
                    if (enemy.takeDamage) {
                        enemy.takeDamage(this.damage * damageMult);
                    }
                    
                    // Отталкивание
                    if (this.knockback && dist > 0) {
                        const knockbackDist = 20;
                        enemy.x += (dx / dist) * knockbackDist;
                        enemy.y += (dy / dist) * knockbackDist;
                    }
                }
            });
        }
        
        this.active = false;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Ракета
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(-6, -3, 12, 6);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-10, -4);
        ctx.lineTo(-10, 4);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

// ===== БАРРИКАДЫ =====
class Barricade {
    constructor(type, x, y, width, height) {
        this.id = Math.random().toString(36).substr(2, 9); // УНИКАЛЬНЫЙ ID
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        this.level = 0;
        this.active = false;
        this.broken = true;
        
        // Строительство
        this.building = false;
        this.buildProgress = 0;
        this.buildTime = 120;
        
        // Характеристики
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.selfRepair = false;
        this.repairRate = 0;
        this.damageMitigation = 0.4;
        this.damageToEnemies = 0;
        this.filterSlowMultiplier = 1;
        this.pushBackStrength = 0;
        this.counterDamage = 0;
        this.knockbackEnemies = false;
        this.filterMode = false;
        this.forceField = false;
        this.maxAttackers = Infinity;
        this.currentAttackers = new Set();
        this.abilities = [];
        
        this.setStats();
    }
    
    setStats() {
        this.selfRepair = false;
        this.repairRate = 0;
        this.damageMitigation = 0.4;
        this.damageToEnemies = 0;
        this.filterSlowMultiplier = 1;
        this.pushBackStrength = 0;
        this.counterDamage = 0;
        this.knockbackEnemies = false;
        this.filterMode = false;
        this.forceField = false;
        this.maxAttackers = Infinity;
        this.resetAbilities();
        
        if (this.type === 'wall') {
            this.maxHealth = 400;
            this.buildTime = 140;
            this.damageMitigation = 0.35;
            this.pushBackStrength = 3;
        } else if (this.type === 'filter') {
            this.maxHealth = 220;
            this.buildTime = 160;
            this.damageMitigation = 0.45;
            this.damageToEnemies = 4;
            this.filterSlowMultiplier = 0.45;
        } else if (this.type === 'shield') {
            this.maxHealth = 550;
            this.buildTime = 200;
            this.damageMitigation = 0.25;
            this.maxAttackers = 4;
        }
        
        this.currentHealth = this.maxHealth;
    }
    
    resetAbilities() {
        this.abilities = [];
    }

    unlockAbility(name, description) {
        if (!name) return;
        if (!this.abilities.some(ability => ability.name === name)) {
            this.abilities.push({name, description: description || ''});
        }
    }

    unlockAbilityByLevel(level = this.level) {
        if (!window.BARRICADE_UPGRADE_BENEFITS) return;
        const benefits = BARRICADE_UPGRADE_BENEFITS[this.type];
        if (!benefits) return;
        const ability = benefits[level];
        if (ability) {
            this.unlockAbility(ability.name, ability.description);
        }
    }

    resetAttackers() {
        if (this.currentAttackers) {
            this.currentAttackers.clear();
        }
    }

    canAcceptAttacker(enemyId) {
        if (!this.currentAttackers) {
            this.currentAttackers = new Set();
        }
        if (this.currentAttackers.has(enemyId)) return true;
        return this.currentAttackers.size < this.maxAttackers;
    }

    registerAttacker(enemyId) {
        if (!this.currentAttackers) {
            this.currentAttackers = new Set();
        }
        this.currentAttackers.add(enemyId);
    }
    
    startBuild() {
        if (this.active || this.building) return false;
        this.building = true;
        this.buildProgress = 0;
        return true;
    }
    
    updateBuild(militaryCount) {
        if (!this.building) return false;
        
        const buildSpeed = Math.max(1, militaryCount * 0.4);
        this.buildProgress += buildSpeed;
        
        if (this.buildProgress >= this.buildTime) {
            this.active = true;
            this.broken = false;
            this.building = false;
            this.buildProgress = 0;
            this.currentHealth = this.maxHealth;
            return true;
        }
        
        return false;
    }
    
    takeDamage(damage) {
        if (!this.active) return;
        if (damage <= 0) return; // Защита от отрицательного урона
        
        this.currentHealth -= damage;
        if (this.currentHealth <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        this.active = false;
        this.broken = true;
        this.currentHealth = 0;
    }
    
    update() {
        if (!this.active) return;
        
        // Самопочинка
        if (this.selfRepair && this.currentHealth < this.maxHealth) {
            this.currentHealth = Math.min(this.maxHealth, this.currentHealth + this.repairRate);
        }
    }
    
    applyUpgrade() {
        if (this.type === 'wall') {
            if (this.level === 1) {
                this.maxHealth = 520;
                this.currentHealth = this.maxHealth;
                this.damageMitigation = 0.3;
                this.pushBackStrength = 4;
            } else if (this.level === 2) {
                this.selfRepair = true;
                this.repairRate = 0.8;
                this.damageMitigation = 0.26;
            } else if (this.level === 3) {
                this.knockbackEnemies = true;
                this.counterDamage = 6;
                this.damageMitigation = 0.22;
                this.pushBackStrength = 6;
            }
        } else if (this.type === 'filter') {
            if (this.level === 1) {
                this.maxHealth = 280;
                this.currentHealth = this.maxHealth;
                this.damageToEnemies = 8;
                this.filterSlowMultiplier = 0.35;
            } else if (this.level === 2) {
                this.selfRepair = true;
                this.repairRate = 0.6;
                this.filterSlowMultiplier = 0.28;
                this.damageMitigation = 0.4;
            } else if (this.level === 3) {
                this.filterMode = true;
                this.filterSlowMultiplier = 0.2;
                this.damageToEnemies = 12;
                this.damageMitigation = 0.35;
            }
        } else if (this.type === 'shield') {
            if (this.level === 1) {
                this.selfRepair = true;
                this.repairRate = 1.2;
                this.damageMitigation = 0.18;
                this.maxAttackers = 3;
            } else if (this.level === 2) {
                this.maxHealth = 720;
                this.currentHealth = this.maxHealth;
                this.repairRate = 2.5;
                this.damageMitigation = 0.14;
                this.maxAttackers = 2;
            } else if (this.level === 3) {
                this.forceField = true;
                this.damageMitigation = 0.1;
                this.maxAttackers = 2;
                this.pushBackStrength = 4;
            }
        }

        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + this.maxHealth * 0.25);
        this.unlockAbilityByLevel();
    }
    
    draw(ctx) {
        if (this.broken && !this.building) {
            this.drawBroken(ctx);
        } else if (this.building) {
            this.drawBuilding(ctx);
        } else {
            this.drawActive(ctx);
        }
    }
    
    drawBroken(ctx) {
        ctx.save();
        ctx.strokeStyle = '#444444';
        ctx.fillStyle = '#222222';
        ctx.lineWidth = 2;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // X
        ctx.strokeStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.moveTo(this.x + this.width, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawBuilding(ctx) {
        this.drawBroken(ctx);
        
        const progress = this.buildProgress / this.buildTime;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y + this.height + 5, this.width * progress, 4);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(this.x, this.y + this.height + 5, this.width, 4);
    }
    
    drawActive(ctx) {
        ctx.save();
        
        const healthPercent = this.currentHealth / this.maxHealth;
        const color = healthPercent > 0.6 ? '#00ff00' : (healthPercent > 0.3 ? '#ffff00' : '#ff0000');
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 1;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Тип баррикады
        if (this.type === 'shield') {
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
        } else if (this.type === 'filter') {
            ctx.strokeStyle = '#ffff00';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.setLineDash([]);
        }
        
        // Полоса здоровья
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x, this.y - 8, this.width, 4);
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y - 8, this.width * Math.max(0, Math.min(1, healthPercent)), 4);
        
        ctx.restore();
    }
}

Barricade.MAX_LEVEL = 3;

// ===== ДАННЫЕ О БАШНЯХ И БАРРИКАДАХ =====
const TOWER_DATA = {
    cannon: {
        name: 'Пушка',
        description: 'Средний урон и скорость',
        cost: 50,
        upgradeCosts: [75, 100, 150],
        class: CannonTower
    },
    rocket: {
        name: 'Ракетница',
        description: 'Урон по площади',
        cost: 80,
        upgradeCosts: [100, 150, 200],
        class: RocketTower
    },
    machinegun: {
        name: 'Пулемёт',
        description: 'Высокая скорострельность',
        cost: 60,
        upgradeCosts: [80, 120, 180],
        class: MachineGunTower
    },
    laser: {
        name: 'Лазер',
        description: 'Непрерывный урон',
        cost: 100,
        upgradeCosts: [120, 180, 250],
        class: LaserTower
    },
    shock: {
        name: 'Электрошок',
        description: 'Урон всем врагам',
        cost: 120,
        upgradeCosts: [150, 200, 300],
        class: ShockTower
    }
};

const TOWER_UPGRADE_BENEFITS = {
    cannon: {
        1: {name: 'Усиленные снаряды', description: 'Урон увеличен до 25 ед.'},
        2: {name: 'Противоброневые ядра', description: 'Урон увеличен до 35 ед.'},
        3: {name: 'Залповый режим', description: 'Одновременно поражает до 3 целей'}
    },
    rocket: {
        1: {name: 'Осколочные боеголовки', description: 'Урон увеличен до 30 ед.'},
        2: {name: 'Усиленные ускорители', description: 'Дальность до 150, радиус взрыва до 60 ед.'},
        3: {name: 'Шоковая волна', description: 'Отбрасывает поражённых врагов'}
    },
    machinegun: {
        1: {name: 'Синхронные приводы', description: 'Скорострельность повышена на 33%'},
        2: {name: 'Укреплённый калибр', description: 'Урон увеличен до 10 ед.'},
        3: {name: 'Подавляющий огонь', description: 'Замедляет поражённых врагов'}
    },
    laser: {
        1: {name: 'Фокусировка луча', description: 'Дальность увеличена до 180 ед.'},
        2: {name: 'Перегрев ядра', description: 'Урон увеличен до 3 ед. в тик'},
        3: {name: 'Пробивной импульс', description: 'Луч пробивает весь коридор и наносит мощный урон'}
    },
    shock: {
        1: {name: 'Усиленный разряд', description: 'Урон увеличен до 5 ед.'},
        2: {name: 'Грозовой конденсатор', description: 'Урон увеличен до 8 ед.'},
        3: {name: 'Импульсное оглушение', description: '30% шанс оглушить поражённых врагов'}
    }
};

const BARRICADE_UPGRADE_BENEFITS = {
    wall: {
        1: {name: 'Усиленная обшивка', description: 'Прочность увеличена, враги задерживаются дольше'},
        2: {name: 'Самопочинка', description: 'Баррикада постепенно восстанавливает прочность'},
        3: {name: 'Отбрасывающий барьер', description: 'Сильный толчок и урон по врагу при контакте'}
    },
    filter: {
        1: {name: 'Коррозийные решётки', description: 'Сильнее замедляет врагов и наносит им урон'},
        2: {name: 'Автоочистка', description: 'Фильтр регенерирует и сохраняет высокое замедление'},
        3: {name: 'Интеллектуальный пропуск', description: 'Слабые враги проходят медленно, сильные почти останавливаются'}
    },
    shield: {
        1: {name: 'Статический регенератор', description: 'Барьер быстро восстанавливается после атак'},
        2: {name: 'Усиленная матрица', description: 'Увеличена прочность и сопротивление урону'},
        3: {name: 'Силовое поле', description: 'Ограничивает количество врагов, которые могут атаковать одновременно'}
    }
};

// Экспортируем для использования в Game
if (typeof window !== 'undefined') {
    window.TOWER_UPGRADE_BENEFITS = TOWER_UPGRADE_BENEFITS;
    window.BARRICADE_UPGRADE_BENEFITS = BARRICADE_UPGRADE_BENEFITS;
}

const BARRICADE_DATA = {
    wall: {
        name: 'Стена',
        description: 'Блокирует путь',
        cost: 30,
        upgradeCosts: [50, 80, 120]
    },
    filter: {
        name: 'Фильтр',
        description: 'Пропускает слабых врагов',
        cost: 40,
        upgradeCosts: [60, 100, 150]
    },
    shield: {
        name: 'Щит',
        description: 'Очень прочный барьер',
        cost: 80,
        upgradeCosts: [100, 150, 250]
    }
};

// Экспорт для использования в других файлах
if (typeof window !== 'undefined') {
    window.Tower = Tower;
    window.CannonTower = CannonTower;
    window.RocketTower = RocketTower;
    window.MachineGunTower = MachineGunTower;
    window.LaserTower = LaserTower;
    window.ShockTower = ShockTower;
    window.Barricade = Barricade;
    window.Projectile = Projectile;
    window.ExplosiveProjectile = ExplosiveProjectile;
    window.TOWER_DATA = TOWER_DATA;
    window.BARRICADE_DATA = BARRICADE_DATA;
}

console.log('Tower defense system initialized');
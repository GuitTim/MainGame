// ===== НАСТРОЙКИ ИГРЫ =====
const GAME_SETTINGS = {
    brightness: 100,
    volume: 50,
    enemySpeedMultiplier: 1.0
};

// ===== КЛАСС ПЕРСОНАЖА В ЖИЛОМ ОТСЕКЕ =====
class Person {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.baseSpeed = this.type === 'military' ? 1.5 : 1.1;
        this.speed = this.baseSpeed;
        this.alive = true;
        this.idleTimer = 0;
        this.freezeIdle = false;
        this.state = 'idle';
        this.clusterId = null;
        this.isShooting = false;
        this.shootTimer = 0;
        this.shootAngle = 0;
    }
    
    update(livingQuartersY, width, height) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            if (!this.freezeIdle) {
                this.idleTimer++;
                if (this.idleTimer > 120) {
                    if (this.type === 'miner') {
                        this.targetX = 50 + Math.random() * (width - 100);
                        this.targetY = livingQuartersY + 50 + Math.random() * (height - livingQuartersY - 100);
                    } else {
                        this.targetX = 50 + Math.random() * 200;
                        this.targetY = livingQuartersY + 30;
                    }
                    this.idleTimer = 0;
                }
            } else {
                this.idleTimer = 0;
            }
        }
        
        this.x = Math.max(20, Math.min(width - 20, this.x));
        this.y = Math.max(livingQuartersY + 20, Math.min(height - 20, this.y));
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        
        if (this.type === 'miner') {
            ctx.fillStyle = '#ffaa00';
            ctx.strokeStyle = '#ff8800';
        } else {
            ctx.fillStyle = '#00ff00';
            ctx.strokeStyle = '#00cc00';
        }
        
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 4);
        ctx.lineTo(this.x, this.y + 6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y);
        ctx.lineTo(this.x + 5, this.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 6);
        ctx.lineTo(this.x - 3, this.y + 12);
        ctx.moveTo(this.x, this.y + 6);
        ctx.lineTo(this.x + 3, this.y + 12);
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.type === 'miner' ? '⚒' : '⚔', this.x, this.y - 15);
        
        ctx.restore();
        
        if (this.type === 'military') {
            ctx.save();
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            const weaponLength = 16;
            const angle = (this.isShooting && this.shootTimer > 0) ? this.shootAngle : 0;
            const weaponStartX = this.x;
            const weaponStartY = this.y - 4;
            const weaponEndX = weaponStartX + Math.cos(angle) * weaponLength;
            const weaponEndY = weaponStartY + Math.sin(angle) * weaponLength;
            
            ctx.beginPath();
            ctx.moveTo(weaponStartX, weaponStartY);
            ctx.lineTo(weaponEndX, weaponEndY);
            ctx.stroke();
            
            if (this.isShooting && this.shootTimer > 0) {
                ctx.fillStyle = '#ffdd55';
                ctx.beginPath();
                ctx.arc(weaponEndX, weaponEndY, 3 + Math.random() * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

// ===== КЛАСС КОНВЕРСИИ =====
class Conversion {
    constructor(fromType, toType, count) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.fromType = fromType;
        this.toType = toType;
        this.count = count;
        this.progress = 0;
        this.time = fromType === 'miner' ? 120 : 180;
        this.completed = false;
    }
    
    update(deltaTime) {
        if (this.completed) return false;
        
        this.progress += deltaTime;
        
        if (this.progress >= this.time) {
            this.completed = true;
            return true;
        }
        
        return false;
    }
    
    getProgress() {
        return (this.progress / this.time) * 100;
    }
}

// ===== ОСНОВНОЙ ИГРОВОЙ КЛАСС =====
class Game {
    constructor(level) {
        this.level = level;
        
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.resources = level.startingResources;
        this.miners = level.startingMiners;
        this.military = level.startingMilitary;
        this.resourceRate = 0;
        this.resourceGenerationPaused = false;
        
        this.currentWave = 0;
        this.totalWaves = level.totalWaves;
        this.waveInProgress = false;
        this.enemies = [];
        this.enemiesKilled = 0;
        this.enemiesReached = 0;
        this.enemiesInLivingQuarters = [];
        
        this.towers = [];
        this.barricades = [];
        this.initializeDefenses();
        
        this.conversions = [];
        
        this.selectedBuildType = null;
        this.selectedBuildCategory = null;
        this.hoveredSlot = null;
        this.hoveredObject = null;
        this.previewedObject = null;
        
        this.selectedObject = null;
        
        this.currentView = 'corridor';
        
        this.people = [];
        this.initializePeople();
        this.livingQuartersAlert = false;
        this.livingScatterTimer = 0;
        this.livingRegroupStarted = false;
        this.livingRegroupPoints = [];
        
        this.cameraX = 0;
        this.cameraY = 0;
        
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.animationFrameId = null;
        this.timeScale = 1;
        this.speedModes = [
            {multiplier: 1, label: '×1'},
            {multiplier: 2, label: '×2'}
        ];
        this.currentSpeedModeIndex = 0;
        this.controlsLocked = false;
        
        this.totalResourcesGathered = 0;
        this.personnelLost = 0;
        
        this.eventQueue = [...level.events];
        this.triggeredEvents = [];
        
        this.unlockedTowers = ['cannon', 'machinegun', 'rocket'];
        this.unlockedBarricades = ['wall', 'filter'];
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.initializeInput();
        
        this.uiManager = window.uiManager;
        
        this.settings = {...GAME_SETTINGS};
        this.applySettings();
        this.clearEndOfLevelOverlay();
        this.controlsLocked = false;

        // ✅ Достижения
        this.achievements = {
            firstBlood: false,           // Убил первого врага
            builder: false,              // Построил 5 башен
            survivor: false,             // Завершил уровень без потерь
            economist: false,            // Собрал 1000 ресурсов за игру
            general: false               // Имеет 20+ военных одновременно
        };
        this.loadAchievementsFromStorage();
    }
    
    resizeCanvas() {
        const sidePanel = document.getElementById('side-panel');
        const topPanel = document.getElementById('top-panel');
        
        const sidePanelWidth = sidePanel ? sidePanel.offsetWidth : 320;
        const topPanelHeight = topPanel ? topPanel.offsetHeight : 60;
        
        // Учитываем devicePixelRatio для четкой отрисовки
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = (window.innerWidth - sidePanelWidth) * dpr;
        this.canvas.height = (window.innerHeight - topPanelHeight) * dpr;
        
        // Устанавливаем CSS-размеры
        this.canvas.style.width = (window.innerWidth - sidePanelWidth) + 'px';
        this.canvas.style.height = (window.innerHeight - topPanelHeight) + 'px';
        
        // Масштабируем контекст
        this.ctx.scale(dpr, dpr);
        
        this.level.width = Math.max(this.canvas.width, this.level.width);
        this.level.height = Math.max(this.canvas.height, this.level.height);
    }
    
    initializeDefenses() {
        this.level.towerSlots.forEach(slot => {
            const TowerClass = TOWER_DATA[slot.type].class;
            const tower = new TowerClass(slot.x, slot.y);
            this.towers.push(tower);
        });
    }
    
    initializePeople() {
        const livingY = this.level.livingQuartersY;
        
        for (let i = 0; i < this.miners; i++) {
            const person = new Person(
                'miner',
                100 + Math.random() * (this.level.width - 200),
                livingY + 100 + Math.random() * 200
            );
            this.people.push(person);
        }
        
        for (let i = 0; i < this.military; i++) {
            const person = new Person(
                'military',
                50 + i * 30,
                livingY + 50
            );
            this.people.push(person);
        }
    }
    
    initializeInput() {
        // ПРАВИЛЬНОЕ ПРЕОБРАЗОВАНИЕ КООРДИНАТОВ С УЧЕТОМ МАСШТАБИРОВАНИЯ
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Учитываем devicePixelRatio и CSS-масштабирование
            const scaleX = this.canvas.width / rect.width / (window.devicePixelRatio || 1);
            const scaleY = this.canvas.height / rect.height / (window.devicePixelRatio || 1);
            
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            
            this.updateHoveredSlot();
        });
        
        document.addEventListener('keydown', (e) => {
            if (this.controlsLocked) {
                e.preventDefault();
                return;
            }

            if (e.key === 'Escape') {
                if (this.selectedBuildType) {
                    this.setSelectedBuild(null, null);
                    if (this.uiManager) {
                        this.uiManager.deselectBuildItem();
                    }
                } else if (this.selectedObject) {
                    this.deselectObject();
                } else {
                    this.togglePause();
                }
            }
            
            if (e.key === ' ' && !this.waveInProgress && this.currentWave < this.totalWaves) {
                e.preventDefault();
                this.startNextWave();
            }
            
            if (e.key === 'v' || e.key === 'V') {
                this.toggleView();
            }

            // ✅ ИСПРАВЛЕНИЕ: Клавиша U работает при выделенном объекте, даже если курсор уведён
            if ((e.key === 'u' || e.key === 'U')) {
                e.preventDefault();
                if (this.selectedObject) {
                    if (this.selectedObject instanceof Tower) {
                        this.upgradeTower(this.selectedObject);
                    } else if (this.selectedObject instanceof Barricade) {
                        this.upgradeBarricade(this.selectedObject);
                    }
                }
                // Также проверяем наведение, если ничего не выделено
                else if (this.hoveredObject) {
                    if (this.hoveredObject instanceof Tower) {
                        this.upgradeTower(this.hoveredObject);
                    } else if (this.hoveredObject instanceof Barricade) {
                        this.upgradeBarricade(this.hoveredObject);
                    }
                }
            }
        });
        
        // Исправленные обработчики кнопок
        this.bindUIControls();
    }

    bindUIControls() {
        // Основные игровые кнопки
        const startWaveBtn = document.getElementById('start-wave-btn');
        if (startWaveBtn) {
            startWaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.waveInProgress && this.currentWave < this.totalWaves) {
                    this.startNextWave();
                }
            });
        }
        
        const pauseGameBtn = document.getElementById('pause-game-btn');
        if (pauseGameBtn) {
            pauseGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePause();
            });
        }
        
        const resumeGameBtn = document.getElementById('resume-game-btn');
        if (resumeGameBtn) {
            resumeGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePause();
            });
        }
        
        const restartGameBtn = document.getElementById('restart-game-btn');
        if (restartGameBtn) {
            restartGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Перезапустить уровень?')) {
                    this.restartLevel();
                }
            });
        }
        
        const quitGameBtn = document.getElementById('quit-game-btn');
        if (quitGameBtn) {
            quitGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Выйти в меню? Прогресс не сохранится.')) {
                    if (this.uiManager) {
                        this.uiManager.showLevelSelect();
                    }
                    this.cleanup();
                }
            });
        }
        
        const nextLevelBtn = document.getElementById('next-level-btn');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.uiManager) {
                    this.uiManager.showLevelSelect();
                }
            });
        }
        
        const victoryMenuBtn = document.getElementById('victory-menu-btn');
        if (victoryMenuBtn) {
            victoryMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.uiManager) {
                    this.uiManager.showLevelSelect();
                }
            });
        }
        
        const retryGameBtn = document.getElementById('retry-game-btn');
        if (retryGameBtn) {
            retryGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.restartLevel();
            });
        }
        
        const defeatMenuBtn = document.getElementById('defeat-menu-btn');
        if (defeatMenuBtn) {
            defeatMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.uiManager) {
                    this.uiManager.showLevelSelect();
                }
            });
        }
        
        const toggleViewBtn = document.getElementById('toggle-view-btn');
        if (toggleViewBtn) {
            toggleViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleView();
            });
        }

        const speedWaveBtn = document.getElementById('speed-wave-btn');
        if (speedWaveBtn) {
            speedWaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.cycleWaveSpeed();
            });
        }
        
        // Кнопки управления персоналом
        this.initializeConversionHandlers();
        
        // Кнопки настроек
        this.initializeSettingsHandlers();
        
        // Глобальные обработчики для кнопок улучшения/демонтажа
        this.initializeGlobalButtonHandlers();
    }

    initializeGlobalButtonHandlers() {
        // Обработка кликов по кнопкам улучшения башен
        document.addEventListener('click', (e) => {
            if (this.controlsLocked) return;

            if (e.target.classList.contains('upgrade-tower-btn')) {
                e.preventDefault();
                const towerId = e.target.dataset.towerId;
                const tower = this.towers.find(t => t.id === towerId);
                if (tower) {
                    this.upgradeTower(tower);
                }
            }
            
            // Обработка кликов по кнопкам демонтажа башен
            if (e.target.classList.contains('demolish-tower-btn')) {
                e.preventDefault();
                const towerId = e.target.dataset.towerId;
                const tower = this.towers.find(t => t.id === towerId);
                if (tower) {
                    this.demolishTower(tower);
                }
            }
            
            // Обработка кликов по кнопкам улучшения баррикад
            if (e.target.classList.contains('upgrade-barricade-btn')) {
                e.preventDefault();
                const barricadeId = e.target.dataset.barricadeId;
                const barricade = this.barricades.find(b => b.id === barricadeId);
                if (barricade) {
                    this.upgradeBarricade(barricade);
                }
            }
            
            // Обработка кликов по кнопкам демонтажа баррикад
            if (e.target.classList.contains('demolish-barricade-btn')) {
                e.preventDefault();
                const barricadeId = e.target.dataset.barricadeId;
                const barricade = this.barricades.find(b => b.id === barricadeId);
                if (barricade) {
                    this.demolishBarricade(barricade);
                }
            }
        });
    }

    handleClick(e) {
        if (this.controlsLocked || this.paused) return;
        
        // Преобразуем координаты с учетом камеры
        const worldX = this.mouseX + this.cameraX;
        const worldY = this.mouseY + this.cameraY;
        
        if (this.currentView === 'corridor') {
            if (this.selectedBuildType && this.selectedBuildCategory) {
                this.handleBuildPlacement(worldX, worldY);
            } else {
                this.handleObjectSelection(worldX, worldY);
            }
        }
    }

    handleBuildPlacement(worldX, worldY) {
        if (this.selectedBuildCategory === 'tower' && this.hoveredSlot) {
            this.buildTower(this.hoveredSlot, this.selectedBuildType);
        } else if (this.selectedBuildCategory === 'barricade') {
            this.buildBarricade(worldX - 20, worldY - 20);
        }
        
        // Снимаем выделение после строительства
        this.setSelectedBuild(null, null);
        if (this.uiManager) {
            this.uiManager.deselectBuildItem();
        }
    }

    handleObjectSelection(worldX, worldY) {
        // Проверяем башни
        for (let tower of this.towers) {
            const dist = Math.sqrt((tower.x - worldX) ** 2 + (tower.y - worldY) ** 2);
            if (dist < 30) {
                this.selectObject(tower);
                if (this.uiManager) {
                    this.uiManager.showObjectInfo(tower);
                }
                return;
            }
        }
        
        // Проверяем баррикады
        for (let barricade of this.barricades) {
            if (this.pointInRectangle(worldX, worldY, barricade.x, barricade.y, barricade.width, barricade.height)) {
                this.selectObject(barricade);
                if (this.uiManager) {
                    this.uiManager.showObjectInfo(barricade);
                }
                return;
            }
        }
        
        // Если ничего не выбрано, снимаем выделение
        this.deselectObject();
        if (this.uiManager) {
            this.uiManager.hideObjectInfo();
        }
    }

    updateHoveredSlot() {
        this.hoveredSlot = null;
        const previousPreview = this.previewedObject;
        this.previewedObject = null;
        this.hoveredObject = null;
        
        if (this.currentView !== 'corridor') return;
        
        // Преобразуем экранные координаты в мировые
        const worldX = this.mouseX + this.cameraX;
        const worldY = this.mouseY + this.cameraY;
        
        if (this.selectedBuildType && this.selectedBuildCategory) {
            if (this.selectedBuildCategory === 'tower') {
                let closestDist = 50;
                this.towers.forEach(tower => {
                    if (!tower.active && !tower.repairing) {
                        const dist = Math.sqrt((tower.x - worldX) ** 2 + (tower.y - worldY) ** 2);
                        if (dist < closestDist) {
                            closestDist = dist;
                            this.hoveredSlot = tower;
                        }
                    }
                });
            } else if (this.selectedBuildCategory === 'barricade') {
                this.hoveredSlot = {x: worldX - 20, y: worldY - 20, width: 40, height: 40};
            }
        } else {
            for (let tower of this.towers) {
                const dist = Math.sqrt((tower.x - worldX) ** 2 + (tower.y - worldY) ** 2);
                if (dist < 30) {
                    this.hoveredObject = tower;
                    this.previewedObject = tower;

                    if (!this.selectedObject || this.selectedObject === tower) {
                        if (this.uiManager) {
                            this.uiManager.showObjectInfo(tower);
                        }
                    }
                    return;
                }
            }
            
            for (let barricade of this.barricades) {
                if (this.pointInRectangle(worldX, worldY, barricade.x, barricade.y, barricade.width, barricade.height)) {
                    this.hoveredObject = barricade;
                    this.previewedObject = barricade;
                    if (!this.selectedObject || this.selectedObject === barricade) {
                        if (this.uiManager) {
                            this.uiManager.showObjectInfo(barricade);
                        }
                    }
                    return;
                }
            }

            if (!this.selectedObject && previousPreview) {
                if (this.uiManager) {
                    this.uiManager.hideObjectInfo();
                }
            }
        }
    }
    
    toggleView() {
        if (this.controlsLocked) return;
        this.currentView = this.currentView === 'corridor' ? 'living' : 'corridor';
        
        const viewBtn = document.getElementById('toggle-view-btn');
        const viewIcon = document.getElementById('view-icon');
        const viewLabel = document.getElementById('view-label');
        
        if (this.currentView === 'living') {
            viewIcon.textContent = '🔧';
            viewLabel.textContent = 'ЖИЛ. ОТСЕК';
            viewBtn.title = 'Переключить на жилой отсек';
        } else {
            viewIcon.textContent = '🏢';
            viewLabel.textContent = 'КОРИДОР';
            viewBtn.title = 'Переключить на коридор';
        }
        
        this.deselectObject();
        this.setSelectedBuild(null, null);
        if (this.uiManager) {
            this.uiManager.deselectBuildItem();
        }
    }
    
    applySettings() {
        document.body.style.setProperty('--brightness', this.settings.brightness / 100);
    }
    
    start() {
        this.running = true;
        this.lastTime = performance.now();
        
        if (!this.level) {
            console.error('Level is not defined!');
            return;
        }
        
        console.log('Starting level:', this.level.name);
        
        if (this.uiManager) {
            this.uiManager.populateBuildLists(this.unlockedTowers, this.unlockedBarricades);
        }
        
        this.initializeConversionHandlers();
        this.initializeSettingsHandlers();
        
        this.updateUI();

        // ✅ Загружаем сохранённое состояние уровня
        const savedProgress = window.loadGameProgress();
        if (savedProgress && savedProgress.gameState && savedProgress.gameState.levelId === this.level.id) {
            const restored = this.deserializeState(savedProgress.gameState);
            if (restored) {
                console.log('✅ Game state restored from localStorage');
                // Восстанавливаем достижения
                if (savedProgress.achievements) {
                    Object.assign(this.achievements, savedProgress.achievements);
                }
            } else {
                console.log('No valid saved state found for this level. Starting fresh.');
            }
        } else {
            console.log('No saved state found. Starting fresh level.');
        }

        // ✅ Настраиваем автосохранение
        this.setupAutoSave();

        console.log('Starting game loop...');
        this.gameLoop();
        
        this.checkEvents('start');
        
        console.log('Game started successfully');
    }
    
    initializeConversionHandlers() {
        const convertToMilitaryBtn = document.getElementById('convert-to-military-multi');
        if (convertToMilitaryBtn) {
            convertToMilitaryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = document.getElementById('miners-to-military-input');
                const count = parseInt(input.value) || 1;
                this.startConversion('miner', 'military', Math.min(count, this.miners));
            });
        }
        
        const convertToMinerBtn = document.getElementById('convert-to-miner-multi');
        if (convertToMinerBtn) {
            convertToMinerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = document.getElementById('military-to-miners-input');
                const count = parseInt(input.value) || 1;
                this.startConversion('military', 'miner', Math.min(count, this.military));
            });
        }
    }
    
    initializeSettingsHandlers() {
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettings();
            });
        }
        
        const settingsMenuBtn = document.getElementById('settings-menu-btn');
        if (settingsMenuBtn) {
            settingsMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettings();
            });
        }
        
        const brightnessSlider = document.getElementById('brightness-slider');
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                this.settings.brightness = parseInt(e.target.value);
                const brightnessValue = document.getElementById('brightness-value');
                if (brightnessValue) {
                    brightnessValue.textContent = this.settings.brightness + '%';
                }
                this.applySettings();
            });
        }
        
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.settings.volume = parseInt(e.target.value);
                const volumeValue = document.getElementById('volume-value');
                if (volumeValue) {
                    volumeValue.textContent = this.settings.volume + '%';
                }
            });
        }
        
        const speedSlowBtn = document.getElementById('speed-slow');
        if (speedSlowBtn) {
            speedSlowBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setEnemySpeed(0.7, 'Медленная');
            });
        }
        
        const speedNormalBtn = document.getElementById('speed-normal');
        if (speedNormalBtn) {
            speedNormalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setEnemySpeed(1.0, 'Нормальная');
            });
        }
        
        const speedFastBtn = document.getElementById('speed-fast');
        if (speedFastBtn) {
            speedFastBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setEnemySpeed(1.3, 'Быстрая');
            });
        }
        
        const resetSettingsBtn = document.getElementById('reset-settings-btn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetSettings();
            });
        }
        
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const settingsOverlay = document.getElementById('settings-overlay');
                if (settingsOverlay) {
                    settingsOverlay.style.display = 'none';
                }
            });
        }
    }
    
    showSettings() {
        const overlay = document.getElementById('settings-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
        
        const brightnessSlider = document.getElementById('brightness-slider');
        const brightnessValue = document.getElementById('brightness-value');
        if (brightnessSlider && brightnessValue) {
            brightnessSlider.value = this.settings.brightness;
            brightnessValue.textContent = this.settings.brightness + '%';
        }
        
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        if (volumeSlider && volumeValue) {
            volumeSlider.value = this.settings.volume;
            volumeValue.textContent = this.settings.volume + '%';
        }
    }
    
    setEnemySpeed(multiplier, label) {
        this.settings.enemySpeedMultiplier = multiplier;
        const enemySpeedValue = document.getElementById('enemy-speed-value');
        if (enemySpeedValue) {
            enemySpeedValue.textContent = label;
        }
        
        const speedButtons = document.querySelectorAll('.setting-btn');
        speedButtons.forEach(btn => btn.classList.remove('active'));
        
        if (multiplier === 0.7) {
            const speedSlowBtn = document.getElementById('speed-slow');
            if (speedSlowBtn) speedSlowBtn.classList.add('active');
        } else if (multiplier === 1.0) {
            const speedNormalBtn = document.getElementById('speed-normal');
            if (speedNormalBtn) speedNormalBtn.classList.add('active');
        } else if (multiplier === 1.3) {
            const speedFastBtn = document.getElementById('speed-fast');
            if (speedFastBtn) speedFastBtn.classList.add('active');
        }
    }
    
    resetSettings() {
        this.settings = {...GAME_SETTINGS};
        this.applySettings();
        this.showSettings();
        this.setEnemySpeed(1.0, 'Нормальная');
    }
    
    gameLoop(currentTime = performance.now()) {
        if (!this.running) {
            console.log('Game loop stopped - running is false');
            return;
        }
        
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;
        
        const rawDelta = Math.min((currentTime - this.lastTime) / 16.67, 2);
        this.lastTime = currentTime;
        
        if (!this.paused) {
            const speedMultiplier = this.timeScale;
            const fullSteps = Math.max(1, Math.floor(speedMultiplier));
            const fractionalStep = speedMultiplier - fullSteps;
            
            for (let i = 0; i < fullSteps; i++) {
                try {
                    this.update(rawDelta);
                } catch (e) {
                    console.error('Error in update:', e);
                    break;
                }
            }
            
            if (fractionalStep > 0) {
                try {
                    this.update(rawDelta * fractionalStep);
                } catch (e) {
                    console.error('Error in partial update:', e);
                }
            }
        }
        
        try {
            this.render();
        } catch (e) {
            console.error('Error in render:', e);
        }
        
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.updateResources(deltaTime);
        this.updateConversions(deltaTime);
        this.updateTowers(deltaTime);
        this.updateBarricades(deltaTime);
        this.updateEnemies(deltaTime);
        this.updatePeople(deltaTime);
        this.updateEnemiesInLivingQuarters(deltaTime);
        this.checkGameConditions();
        
        try {
            this.updateUI();
        } catch (e) {
            console.error('Error updating UI:', e);
        }

        // ✅ Проверка достижений каждый кадр
        this.checkAchievements();
    }
    
    // ===== ОБНОВЛЕНИЕ СИСТЕМ =====
    updateResources(deltaTime) {
        if (this.resourceGenerationPaused) {
            this.resourceRate = 0;
            return;
        }
        
        this.resourceRate = this.miners * 0.5;
        const resourceGain = (this.resourceRate / 60) * deltaTime;
        this.resources += resourceGain;
        this.totalResourcesGathered += resourceGain;
    }
    
    updateConversions(deltaTime) {
        const completedConversions = [];
        
        this.conversions.forEach((conversion, index) => {
            const completed = conversion.update(deltaTime);
            
            if (completed) {
                if (conversion.fromType === 'miner' && conversion.toType === 'military') {
                    this.military += conversion.count;
                    
                    for (let i = 0; i < conversion.count; i++) {
                        const minerIndex = this.people.findIndex(p => p.type === 'miner' && p.alive);
                        if (minerIndex !== -1) {
                            this.people[minerIndex].type = 'military';
                            this.people[minerIndex].targetX = 50 + minerIndex * 30;
                            this.people[minerIndex].targetY = this.level.livingQuartersY + 50;
                        }
                    }
                } else if (conversion.fromType === 'military' && conversion.toType === 'miner') {
                    this.miners += conversion.count;
                    
                    for (let i = 0; i < conversion.count; i++) {
                        const militaryIndex = this.people.findIndex(p => p.type === 'military' && p.alive);
                        if (militaryIndex !== -1) {
                            this.people[militaryIndex].type = 'miner';
                            this.people[militaryIndex].targetX = 100 + Math.random() * (this.level.width - 200);
                            this.people[militaryIndex].targetY = this.level.livingQuartersY + 100 + Math.random() * 200;
                        }
                    }
                }
                
                completedConversions.push(index);
            }
        });
        
        for (let i = completedConversions.length - 1; i >= 0; i--) {
            this.conversions.splice(completedConversions[i], 1);
        }
        
        this.updateConversionsUI();
    }
    
    updateTowers(deltaTime) {
        this.towers.forEach(tower => {
            if (tower.repairing) {
                const completed = tower.updateRepair(this.military);
                if (completed) {
                    this.checkObjectiveCompletion('repair_tower');
                }
            }
            
            if (tower.upgrading) {
                const completed = tower.updateUpgrade(this.military);
                if (completed) {
                    this.checkObjectiveCompletion('upgrade_tower');
                }
            }
            
            if (!this.resourceGenerationPaused) {
                tower.update(deltaTime, this.enemies);
            }
        });
    }
    
    updateBarricades(deltaTime) {
        this.barricades.forEach(barricade => {
            if (barricade.building) {
                const completed = barricade.updateBuild(this.military);
                if (completed) {
                    this.checkObjectiveCompletion('close_breach');
                    
                    this.level.floorBreaches.forEach((breach, index) => {
                        if (this.rectanglesOverlap(
                            barricade.x, barricade.y, barricade.width, barricade.height,
                            breach.x, breach.y, breach.width, breach.height
                        )) {
                            this.level.closeBreach(index);
                        }
                    });
                }
            }
            
            barricade.update();
        });
    }

    updateEnemies(deltaTime) {
        const toAdd = [];
        
        if (this.barricades && this.barricades.length > 0) {
            this.barricades.forEach(b => {
                if (b && typeof b.resetAttackers === 'function') {
                    b.resetAttackers();
                }
            });
        }
        
        this.enemies.forEach(enemy => {
            if (!enemy.spawned && enemy.spawnDelay !== undefined) {
                enemy.spawnDelay -= deltaTime;
                if (enemy.spawnDelay <= 0) {
                    enemy.spawned = true;
                }
            }
        });
        
        this.enemies = this.enemies.filter(enemy => {
            if (!enemy.spawned) return true;
            
            const originalSpeed = enemy.baseSpeed;
            enemy.speed = originalSpeed * this.settings.enemySpeedMultiplier;
            
            enemy.update(deltaTime, this.towers, this.enemies);
            
            if (this.level.checkBreachFall(enemy)) {
                enemy.reached = true;
                this.handleEnemyReached(enemy);
                return false;
            }
            
            if (enemy.reached) {
                this.handleEnemyReached(enemy);
                return false;
            }
            
            this.checkEnemyBarricadeCollision(enemy, deltaTime);
            
            if (!enemy.alive && enemy.spawnedEnemies) {
                enemy.spawnedEnemies.forEach(spawned => {
                    spawned.spawnDelay = 0;
                    spawned.spawned = true;
                    toAdd.push(spawned);
                });
                this.enemiesKilled++;
                return false;
            }
            
            if (!enemy.alive) {
                this.enemiesKilled++;
                this.resources += enemy.reward;
                return false;
            }
            
            return true;
        });
        
        toAdd.forEach(enemy => this.enemies.push(enemy));
        
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesInLivingQuarters.length === 0) {
            this.completeWave();
        }
    }
    
    updatePeople(deltaTime) {
        if (this.livingQuartersAlert) {
            this.livingScatterTimer -= deltaTime;
            if (this.livingScatterTimer <= 0 && !this.livingRegroupStarted) {
                this.beginLivingQuartersRegroup();
            }
        }

        this.people.forEach(person => {
            if (!person.alive) return;

            if (!this.livingQuartersAlert) {
                person.speed = person.baseSpeed;
                person.freezeIdle = false;
                person.state = 'idle';
            } else {
                if (person.type === 'military') {
                    if (person.state === 'regroup') {
                        const dx = person.targetX - person.x;
                        const dy = person.targetY - person.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 6) {
                            person.state = 'hold';
                            person.freezeIdle = true;
                            person.speed = person.baseSpeed;
                            person.targetX = person.x;
                            person.targetY = person.y;
                        }
                    } else if (person.state === 'hold' && this.livingRegroupPoints.length > 0) {
                        const cluster = this.livingRegroupPoints[person.clusterId % this.livingRegroupPoints.length];
                        if (cluster && Math.random() < 0.02) {
                            person.targetX = cluster.x + (Math.random() - 0.5) * 24;
                            person.targetY = cluster.y + (Math.random() - 0.5) * 24;
                        }
                    }
                } else {
                    if (person.state !== 'panic') {
                        person.state = 'panic';
                        person.speed = person.baseSpeed * 1.3;
                    }
                    if (Math.random() < 0.01) {
                        const point = this.getRandomLivingPoint();
                        person.targetX = point.x;
                        person.targetY = point.y;
                    }
                }
            }

            person.update(this.level.livingQuartersY, this.level.width, this.level.height);
            person.shootTimer = Math.max(0, person.shootTimer - deltaTime);
        });
    }
    
    updateEnemiesInLivingQuarters(deltaTime) {
        if (this.enemiesInLivingQuarters.length === 0) {
            this.resourceGenerationPaused = false;
            if (this.livingQuartersAlert) {
                this.resetLivingQuartersAlert();
            }
            return;
        }
        
        this.resourceGenerationPaused = true;
        
        const soldiers = this.people.filter(p => p.alive && p.type === 'military');
        soldiers.forEach(soldier => {
            soldier.isShooting = false;
        });

        this.enemiesInLivingQuarters = this.enemiesInLivingQuarters.filter(enemy => {
            enemy.update(deltaTime, [], []);
            
            if (!enemy.targetPerson || !enemy.targetPerson.alive) {
                const alivePeople = this.people.filter(p => p.alive);
                if (alivePeople.length > 0) {
                    enemy.targetPerson = this.findNearestPerson(enemy, alivePeople);
                }
            }
            
            if (enemy.targetPerson) {
                const dx = enemy.targetPerson.x - enemy.x;
                const dy = enemy.targetPerson.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 10) {
                    enemy.x += (dx / dist) * enemy.speed * 0.5;
                    enemy.y += (dy / dist) * enemy.speed * 0.5;
                } else {
                    enemy.targetPerson.alive = false;
                    
                    if (enemy.targetPerson.type === 'miner') {
                        this.miners--;
                    } else {
                        this.military--;
                    }
                    
                    this.personnelLost++;
                    enemy.targetPerson = null;
                    
                    this.startLivingQuartersAlert(true);
                }
            }
            
            if (!enemy.alive) {
                this.enemiesKilled++;
                this.resources += enemy.reward;
                return false;
            }
            
            return true;
        });
        
        if (soldiers.length > 0 && this.enemiesInLivingQuarters.length > 0) {
            const damagePerSecond = 6;
            soldiers.forEach(soldier => {
                if (!soldier.alive) return;
                const target = this.findNearestEnemyInQuarters(soldier);
                if (target) {
                    const damage = damagePerSecond * (deltaTime / 60);
                    target.takeDamage(damage);
                    soldier.isShooting = true;
                    soldier.shootTimer = Math.max(soldier.shootTimer, 5);
                    soldier.shootAngle = Math.atan2(target.y - soldier.y, target.x - soldier.x);
                }
            });
            
            this.enemiesInLivingQuarters = this.enemiesInLivingQuarters.filter(enemy => {
                if (!enemy.alive) {
                    this.enemiesKilled++;
                    this.resources += enemy.reward;
                    return false;
                }
                return true;
            });
        }
        
        if (this.enemiesInLivingQuarters.length === 0) {
            this.resetLivingQuartersAlert();
        }
        
        this.people = this.people.filter(p => p.alive);
    } 

   // ===== СИСТЕМА СОХРАНЕНИЯ СОСТОЯНИЯ УРОВНЯ В localStorage =====
    serializeState() {
        return {
            levelId: this.level.id,
            currentWave: this.currentWave,
            waveInProgress: this.waveInProgress,
            resources: this.resources,
            miners: this.miners,
            military: this.military,
            towers: this.towers.map(t => ({
                id: t.id,
                type: t.type,
                x: t.x,
                y: t.y,
                active: t.active,
                level: t.level,
                repairing: t.repairing,
                repairProgress: t.repairProgress,
                upgrading: t.upgrading,
                upgradeProgress: t.upgradeProgress,
                disabled: t.disabled,
                disableTimer: t.disableTimer
            })),
            barricades: this.barricades.map(b => ({
                id: b.id,
                type: b.type,
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                active: b.active,
                level: b.level,
                building: b.building,
                buildProgress: b.buildProgress,
                currentHealth: b.currentHealth
            })),
            conversions: this.conversions.map(c => ({
                id: c.id,
                fromType: c.fromType,
                toType: c.toType,
                count: c.count,
                progress: c.progress,
                time: c.time,
                completed: c.completed
            })),
            enemiesKilled: this.enemiesKilled,
            enemiesReached: this.enemiesReached,
            personnelLost: this.personnelLost,
            totalResourcesGathered: this.totalResourcesGathered,
            paused: this.paused,
            cameraX: this.cameraX,
            cameraY: this.cameraY,
            selectedBuildType: this.selectedBuildType,
            selectedBuildCategory: this.selectedBuildCategory,
            currentView: this.currentView,
            timestamp: Date.now(),
            version: '1.0'
        };
    }

    deserializeState(state) {
        if (!state || state.levelId !== this.level.id) return false;

        this.currentWave = state.currentWave || 0;
        this.waveInProgress = state.waveInProgress || false;
        this.resources = state.resources || this.level.startingResources;
        this.miners = state.miners || this.level.startingMiners;
        this.military = state.military || this.level.startingMilitary;

        // Восстанавливаем башни
        if (state.towers && Array.isArray(state.towers)) {
            this.towers.forEach(tower => {
                const saved = state.towers.find(t => t.id === tower.id);
                if (saved) {
                    Object.assign(tower, saved);
                    if (tower.setBaseStats) tower.setBaseStats();
                    if (tower.applyUpgrade && tower.level > 0) {
                        for (let i = 0; i < tower.level; i++) {
                            tower.applyUpgrade();
                        }
                    }
                }
            });
        }

        // Восстанавливаем баррикады
        if (state.barricades && Array.isArray(state.barricades)) {
            this.barricades = state.barricades.map(data => {
                const barricade = new Barricade(data.type, data.x, data.y, data.width, data.height);
                Object.assign(barricade, data);
                barricade.setStats();
                if (barricade.applyUpgrade && barricade.level > 0) {
                    for (let i = 0; i < barricade.level; i++) {
                        barricade.applyUpgrade();
                    }
                }
                return barricade;
            });
        }

        // Восстанавливаем конверсии
        if (state.conversions && Array.isArray(state.conversions)) {
            this.conversions = state.conversions.map(data => {
                const conv = new Conversion(data.fromType, data.toType, data.count);
                Object.assign(conv, data);
                return conv;
            });
        }

        this.enemiesKilled = state.enemiesKilled || 0;
        this.enemiesReached = state.enemiesReached || 0;
        this.personnelLost = state.personnelLost || 0;
        this.totalResourcesGathered = state.totalResourcesGathered || 0;

        this.paused = state.paused || false;
        this.cameraX = state.cameraX || 0;
        this.cameraY = state.cameraY || 0;
        this.selectedBuildType = state.selectedBuildType || null;
        this.selectedBuildCategory = state.selectedBuildCategory || null;
        this.currentView = state.currentView || 'corridor';

        console.log('✅ Game state restored from localStorage');
        return true;
    }

    // Автоматическое сохранение каждые 30 секунд + при паузе/выходе
    setupAutoSave() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);

        this.autoSaveInterval = setInterval(() => {
            this.saveGameStateToStorage();
        }, 30000); // каждые 30 секунд

        // Сохраняем при паузе
        const originalTogglePause = this.togglePause;
        this.togglePause = () => {
            originalTogglePause.call(this);
            if (this.paused) {
                this.saveGameStateToStorage();
            }
        };

        // Сохраняем при выходе
        window.addEventListener('beforeunload', () => {
            this.saveGameStateToStorage();
        });
    }

    saveGameStateToStorage() {
        try {
            const gameState = this.serializeState();
            const saveData = {
                gameState: gameState,
                achievements: this.achievements,
                timestamp: Date.now()
            };
            localStorage.setItem(`cosmicBastion_level_${this.level.id}`, JSON.stringify(saveData));
            console.log('💾 Game state auto-saved to localStorage');
        } catch (e) {
            console.error('❌ Failed to save game state:', e);
        }
    }

    loadGameStateFromStorage() {
        try {
            const saved = localStorage.getItem(`cosmicBastion_level_${this.level.id}`);
            if (!saved) return false;

            const data = JSON.parse(saved);
            if (data.gameState.levelId !== this.level.id) return false;

            const restored = this.deserializeState(data.gameState);
            if (restored) {
                console.log('✅ Game state loaded from localStorage');
                this.updateUI();
                return true;
            }
        } catch (e) {
            console.error('❌ Failed to load game state:', e);
        }
        return false;
    }

    // ===== СИСТЕМА ДОСТИЖЕНИЙ =====
    unlockAchievement = function(key, title) {
        if (this.achievements[key]) return; // уже разблокировано
        
        this.achievements[key] = true;
        this.showMessage(`🏆 ДОСТИЖЕНИЕ: ${title}`);
        
        this.saveAchievementsToStorage();
    };

    checkAchievements() {
        if (!this.achievements.firstBlood && this.enemiesKilled >= 1) {
            this.unlockAchievement('firstBlood', 'Первая кровь — убил первого врага');
        }
        if (!this.achievements.builder && this.towers.filter(t => t.active).length >= 5) {
            this.unlockAchievement('builder', 'Строитель — построил 5 башен');
        }
        if (!this.achievements.survivor && this.currentWave >= this.totalWaves && this.personnelLost === 0) {
            this.unlockAchievement('survivor', 'Выживший — прошёл уровень без потерь');
        }
        if (!this.achievements.economist && this.totalResourcesGathered >= 1000) {
            this.unlockAchievement('economist', 'Экономист — собрал 1000 ресурсов');
        }
        if (!this.achievements.general && this.military >= 20) {
            this.unlockAchievement('general', 'Генерал — 20+ военных под командованием');
        }
    };

    saveAchievementsToStorage() {
        try {
            localStorage.setItem('cosmicBastion_achievements', JSON.stringify(this.achievements));
        } catch (e) {
            console.error('Failed to save achievements:', e);
        }
    };

    loadAchievementsFromStorage() {
        try {
            const saved = localStorage.getItem('cosmicBastion_achievements');
            if (saved) {
                const data = JSON.parse(saved);
                Object.assign(this.achievements, data);
                console.log('✅ Achievements loaded from localStorage');
            }
        } catch (e) {
            console.error('Failed to load achievements:', e);
        }
    };

    // ===== ПОБЕДА/ПОРАЖЕНИЕ =====
    victory() {
        this.running = false;
        
        // ❌ УДАЛЕНО: затемнение экрана — игрок может нажимать кнопки
        const surviveObj = this.level.objectives.find(o => o.id === 'survive');
        if (surviveObj) surviveObj.completed = true;
        
        const completedObjectives = this.level.objectives.filter(o => o.completed).length;
        const stars = Math.min(3, completedObjectives);
        
        if (window.campaign) {
            window.campaign.completeLevel(
                this.level.id,
                stars,
                this.miners + this.military
            );
        }
        
        const miniMenu = document.getElementById('mini-victory-menu');
        const statsEl = document.getElementById('mini-victory-stats');
        
        if (statsEl) {
            statsEl.innerHTML = '';
            
            const statsList = [
                {label: 'Волн отражено', value: this.currentWave},
                {label: 'Врагов уничтожено', value: this.enemiesKilled},
                {label: 'Выжившие', value: `${this.miners + this.military} чел.`},
                {label: 'Ресурсов', value: Math.floor(this.totalResourcesGathered)},
                {label: 'Задач', value: `${completedObjectives}/${this.level.objectives.length}`}
            ];
            
            statsList.forEach(stat => {
                const row = document.createElement('div');
                row.className = 'stat-row';
                row.innerHTML = `<span>${stat.label}:</span><span><strong>${stat.value}</strong></span>`;
                statsEl.appendChild(row);
            });
            
            const starsDiv = document.createElement('div');
            starsDiv.className = 'stars';
            starsDiv.innerHTML = '★'.repeat(stars) + '☆'.repeat(3 - stars);
            statsEl.appendChild(starsDiv);
        }
        
        if (miniMenu) {
            miniMenu.style.display = 'block';
        }

        // ✅ Явно убираем любой затемняющий оверлей
        const overlay = document.querySelector('.overlay-darken');
        if (overlay) {
            overlay.remove();
        }
        const levelOverlay = document.querySelector('.level-overlay');
        if (levelOverlay) {
            levelOverlay.classList.remove('visible');
            levelOverlay.style.display = 'none';
        }

        // ✅ Сохраняем прогресс кампании
        window.saveGameProgress();
    }
    
    defeat(reason) {
        this.running = false;
        // ❌ УДАЛЕНО: this.applyEndOfLevelOverlay('defeat'); — не будем блокировать экран
        
        const miniMenu = document.getElementById('mini-defeat-menu');
        const statsEl = document.getElementById('mini-defeat-stats');
        
        if (statsEl) {
            statsEl.innerHTML = '';
            
            const reasonP = document.createElement('p');
            reasonP.textContent = reason || 'Весь персонал погиб';
            reasonP.style.textAlign = 'center';
            reasonP.style.color = '#ff6666';
            reasonP.style.marginBottom = '15px';
            statsEl.appendChild(reasonP);
            
            const statsList = [
                {label: 'Волн выдержано', value: `${this.currentWave - 1}/${this.totalWaves}`},
                {label: 'Врагов уничтожено', value: this.enemiesKilled},
                {label: 'Потери персонала', value: this.personnelLost},
                {label: 'Прорвалось врагов', value: this.enemiesReached}
            ];
            
            statsList.forEach(stat => {
                const row = document.createElement('div');
                row.className = 'stat-row';
                row.innerHTML = `<span>${stat.label}:</span><span><strong>${stat.value}</strong></span>`;
                statsEl.appendChild(row);
            });
        }
        
        if (miniMenu) {
            miniMenu.style.display = 'block';
        }

        // ✅ Явно убираем затемнение
        const overlay = document.querySelector('.overlay-darken');
        if (overlay) {
            overlay.remove();
        }
        const levelOverlay = document.querySelector('.level-overlay');
        if (levelOverlay) {
            levelOverlay.classList.remove('visible');
            levelOverlay.style.display = 'none';
        }

        // ✅ Сохраняем прогресс кампании
        window.saveGameProgress();
    }
    
    // ===== УПРАВЛЕНИЕ ИГРОЙ =====
    togglePause() {
        if (this.controlsLocked) return;
        this.paused = !this.paused;
        
        const pauseBtn = document.getElementById('pause-game-btn');
        const miniMenu = document.getElementById('mini-pause-menu');
        
        if (this.paused) {
            if (pauseBtn) {
                const btnText = pauseBtn.querySelector('.btn-text');
                const btnIcon = pauseBtn.querySelector('.btn-icon');
                if (btnText) btnText.textContent = 'ПРОДОЛЖИТЬ';
                if (btnIcon) btnIcon.textContent = '▶';
                pauseBtn.classList.add('paused');
            }
            if (miniMenu) {
                miniMenu.style.display = 'block';
            }
            // ✅ Сохраняем при паузе
            this.saveGameStateToStorage();
        } else {
            if (pauseBtn) {
                const btnText = pauseBtn.querySelector('.btn-text');
                const btnIcon = pauseBtn.querySelector('.btn-icon');
                if (btnText) btnText.textContent = 'ПАУЗА';
                if (btnIcon) btnIcon.textContent = '⏸';
                pauseBtn.classList.remove('paused');
            }
            if (miniMenu) {
                miniMenu.style.display = 'none';
            }
        }
    }
    
    restartLevel() {
        this.clearEndOfLevelOverlay();
        const miniPauseMenu = document.getElementById('mini-pause-menu');
        const miniVictoryMenu = document.getElementById('mini-victory-menu');
        const miniDefeatMenu = document.getElementById('mini-defeat-menu');
        
        if (miniPauseMenu) miniPauseMenu.style.display = 'none';
        if (miniVictoryMenu) miniVictoryMenu.style.display = 'none';
        if (miniDefeatMenu) miniDefeatMenu.style.display = 'none';
        
        // Удаляем затемнение
        const overlay = document.querySelector('.overlay-darken');
        if (overlay) {
            overlay.remove();
        }
        
        if (this.uiManager) {
            this.uiManager.showScreen('game');
        }
        
        this.cleanup();
        
        let freshLevel;
        switch(this.level.id) {
            case 'level_1': freshLevel = createLevel1(); break;
            case 'level_2': freshLevel = createLevel2(); break;
            case 'level_3': freshLevel = createLevel3(); break;
            case 'level_4': freshLevel = createLevel4(); break;
            case 'level_5': freshLevel = createLevel5(); break;
            default: freshLevel = this.level;
        }
        
        const newGame = new Game(freshLevel);
        window.game = newGame;
        newGame.start();
        
        if (this.uiManager) {
            this.uiManager.hidePause();
        }
    }
    
    cleanup() {
        this.running = false;
        this.clearEndOfLevelOverlay();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.enemies = [];
        this.towers = [];
        this.barricades = [];
        this.people = [];
        this.conversions = [];
        this.enemiesInLivingQuarters = [];
    }

    // ===== СТРОИТЕЛЬСТВО И УПРАВЛЕНИЕ =====
    setSelectedBuild(type, category) {
        this.selectedBuildType = type;
        this.selectedBuildCategory = category;
        
        // Обновляем курсор
        const buildCursor = document.getElementById('build-cursor');
        if (buildCursor) {
            buildCursor.style.display = type ? 'block' : 'none';
        }
    }
    
    buildTower(slot, type) {
        if (!slot || !type) return false;
        
        const towerData = TOWER_DATA[type];
        if (!towerData) return false;
        
        if (this.resources < towerData.cost) {
            this.showMessage('Недостаточно ресурсов!');
            return false;
        }
        
        // Находим башню в списке
        const tower = this.towers.find(t => t === slot);
        if (!tower) return false;
        
        // Проверяем, можно ли строить
        if (tower.active || tower.repairing) return false;
        
        // Снимаем ресурсы
        this.resources -= towerData.cost;
        
        // Начинаем ремонт (строительство)
        tower.type = type;
        const result = tower.startRepair(this.military);
        
        if (result) {
            console.log(`Начато строительство башни ${type} в позиции (${tower.x}, ${tower.y})`);
            return true;
        }
        
        return false;
    }
    
    buildBarricade(x, y) {
        const barricadeType = this.selectedBuildType;
        if (!barricadeType) return false;
        
        const barricadeData = BARRICADE_DATA[barricadeType];
        if (!barricadeData) return false;
        
        if (this.resources < barricadeData.cost) {
            this.showMessage('Недостаточно ресурсов!');
            return false;
        }
        
        // Снимаем ресурсы
        this.resources -= barricadeData.cost;
        
        // Создаем баррикаду
        const barricade = new Barricade(barricadeType, x, y, 40, 40);
        const result = barricade.startBuild();
        
        if (result) {
            this.barricades.push(barricade);
            console.log(`Начато строительство баррикады ${barricadeType} в позиции (${x}, ${y})`);
            return true;
        }
        
        return false;
    }
    
    upgradeTower(tower) {
        if (!tower || !tower.active || tower.upgrading || tower.level >= Tower.MAX_LEVEL) return false;
        
        const towerData = TOWER_DATA[tower.type];
        if (!towerData) return false;
        
        const upgradeCost = towerData.upgradeCosts[tower.level];
        if (this.resources < upgradeCost) {
            this.showMessage('Недостаточно ресурсов для улучшения!');
            return false;
        }
        
        // Снимаем ресурсы
        this.resources -= upgradeCost;
        
        // Начинаем улучшение
        const result = tower.startUpgrade(this.military);
        
        if (result) {
            console.log(`Начато улучшение башни ${tower.type} до уровня ${tower.level + 1}`);
            return true;
        }
        
        return false;
    }
    
    demolishTower(tower) {
        if (!tower || (!tower.active && !tower.repairing)) return false;
        
        if (!confirm('Демонтировать башню? Вы получите 50% стоимости обратно.')) {
            return false;
        }
        
        const towerData = TOWER_DATA[tower.type];
        if (!towerData) return false;
        
        // Возвращаем ресурсы
        const refund = Math.floor(towerData.cost * 0.5);
        this.resources += refund;
        
        // Сбрасываем состояние башни
        tower.active = false;
        tower.broken = true;
        tower.repairing = false;
        tower.upgrading = false;
        tower.level = 0;
        tower.repairProgress = 0;
        tower.upgradeProgress = 0;
        
        if (tower.setBaseStats) {
            tower.setBaseStats();
        }
        
        // Снимаем выделение
        if (this.selectedObject === tower) {
            this.deselectObject();
            if (this.uiManager) {
                this.uiManager.hideObjectInfo();
            }
        }
        
        console.log(`Башня демонтирована. Возвращено ${refund} ресурсов.`);
        return true;
    }
    
    upgradeBarricade(barricade) {
        if (!barricade || !barricade.active || barricade.upgrading || barricade.level >= Barricade.MAX_LEVEL) return false;
        
        const barricadeData = BARRICADE_DATA[barricade.type];
        if (!barricadeData) return false;
        
        const upgradeCost = barricadeData.upgradeCosts[barricade.level];
        if (this.resources < upgradeCost) {
            this.showMessage('Недостаточно ресурсов для усиления!');
            return false;
        }
        
        // Снимаем ресурсы
        this.resources -= upgradeCost;
        
        // Начинаем улучшение
        const result = barricade.startUpgrade(this.military);
        
        if (result) {
            console.log(`Начато усиление баррикады ${barricade.type} до уровня ${barricade.level + 1}`);
            return true;
        }
        
        return false;
    }
    
    demolishBarricade(barricade) {
        if (!barricade || (!barricade.active && !barricade.building)) return false;
        
        if (!confirm('Демонтировать баррикаду? Вы получите 50% стоимости обратно.')) {
            return false;
        }
        
        const barricadeData = BARRICADE_DATA[barricade.type];
        if (!barricadeData) return false;
        
        // Возвращаем ресурсы
        const refund = Math.floor(barricadeData.cost * 0.5);
        this.resources += refund;
        
        // Удаляем баррикаду
        const index = this.barricades.indexOf(barricade);
        if (index > -1) {
            this.barricades.splice(index, 1);
        }
        
        // Снимаем выделение
        if (this.selectedObject === barricade) {
            this.deselectObject();
            if (this.uiManager) {
                this.uiManager.hideObjectInfo();
            }
        }
        
        console.log(`Баррикада демонтирована. Возвращено ${refund} ресурсов.`);
        return true;
    }
    
    startConversion(fromType, toType, count) {
        if (count <= 0) return false;
        
        if (fromType === 'miner' && toType === 'military') {
            if (this.miners < count) {
                this.showMessage('Недостаточно шахтёров для перевода!');
                return false;
            }
            this.miners -= count;
        } else if (fromType === 'military' && toType === 'miner') {
            if (this.military < count) {
                this.showMessage('Недостаточно военных для перевода!');
                return false;
            }
            this.military -= count;
        }
        
        const conversion = new Conversion(fromType, toType, count);
        this.conversions.push(conversion);
        
        console.log(`Начата конверсия: ${count} ${fromType} → ${toType}`);
        return true;
    }
    
    selectObject(object) {
        this.selectedObject = object;
    }
    
    deselectObject() {
        this.selectedObject = null;
    }
    
    startNextWave() {
        if (this.waveInProgress || this.currentWave >= this.totalWaves) return;
        
        this.currentWave++;
        this.waveInProgress = true;
        
        // Генерируем врагов
        const waveEnemies = EnemyFactory.generateWave(this.currentWave, this.level.waveDifficulty);
        
        // Устанавливаем путь для каждого врага
        const path = this.level.getCurrentPath(this.barricades);
        waveEnemies.forEach(enemy => {
            enemy.setPath([...path]);
        });
        
        this.enemies = [...this.enemies, ...waveEnemies];
        
        console.log(`Начата волна ${this.currentWave} с ${waveEnemies.length} врагами`);
        
        // Проверяем события
        this.checkEvents('wave_start');
    }
    
    completeWave() {
        this.waveInProgress = false;
        
        if (this.currentWave >= this.totalWaves) {
            // Победа
            setTimeout(() => this.victory(), 1000);
        } else {
            this.showMessage(`Волна ${this.currentWave} отражена!`);
        }
    }
    
    handleEnemyReached(enemy) {
        // Враг достиг жилого отсека
        this.enemiesReached++;
        enemy.alive = false;
        
        // Добавляем врага в список врагов в жилом отсеке
        this.enemiesInLivingQuarters.push(enemy);
        
        // Запускаем тревогу
        this.startLivingQuartersAlert();
        
        console.log('Враг прорвался в жилой отсек!');
    }
    
    checkEnemyBarricadeCollision(enemy, deltaTime) {
        this.barricades.forEach(barricade => {
            if (!barricade.active) return;
            
            // Проверяем столкновение
            if (this.pointInRectangle(enemy.x, enemy.y, barricade.x, barricade.y, barricade.width, barricade.height)) {
                // Наносим урон баррикаде
                const damage = enemy.damage * deltaTime * 0.1;
                barricade.takeDamage(damage);
                
                // Отбрасываем врага назад
                this.pushEnemyBackward(enemy, 5);
                
                // Если баррикада имеет специальные эффекты
                if (barricade.damageToEnemies > 0) {
                    enemy.takeDamage(barricade.damageToEnemies * deltaTime * 0.1);
                }
                
                if (barricade.filterSlowMultiplier < 1) {
                    enemy.speed *= barricade.filterSlowMultiplier;
                }
                
                if (barricade.pushBackStrength > 0) {
                    this.pushEnemyBackward(enemy, barricade.pushBackStrength);
                }
            }
        });
    }
    
    // ===== ОТРИСОВКА =====
    render() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);
        
        if (this.currentView === 'corridor') {
            this.renderCorridor();
        } else {
            this.renderLivingQuarters();
        }
        
        this.ctx.restore();
    }
    
    renderCorridor() {
        if (this.level && this.level.draw) {
            this.level.draw(this.ctx);
        }
        
        if (this.barricades) {
            this.barricades.forEach(barricade => {
                if (barricade && barricade.draw) {
                    barricade.draw(this.ctx);
                }
            });
        }
        
        if (this.towers) {
            this.towers.forEach(tower => {
                if (tower && tower.draw) {
                    tower.draw(this.ctx);
                    
                    if (this.selectedObject === tower && tower.drawRange) {
                        tower.drawRange(this.ctx);
                    }
                }
            });
        }
        
        if (this.enemies) {
            this.enemies.forEach(enemy => {
                if (enemy && enemy.alive && enemy.spawned && enemy.draw) {
                    enemy.draw(this.ctx);
                }
            });
        }
        
        if (this.hoveredObject && !this.selectedBuildType) {
            this.drawHoveredObject();
            
            if (this.hoveredObject instanceof Tower) {
                this.drawTowerUpgradeHint(this.hoveredObject);
            } else if (this.hoveredObject instanceof Barricade) {
                this.drawBarricadeUpgradeHint(this.hoveredObject);
            }
        }
        
        if (this.hoveredSlot && this.selectedBuildType) {
            this.drawHoveredSlot(this.hoveredSlot);
        }
        
        if (this.selectedBuildType) {
            this.drawBuildCursor();
        }
    }
    
    renderLivingQuarters() {
        this.ctx.fillStyle = '#0f0f0f';
        this.ctx.fillRect(0, this.level.livingQuartersY, this.level.width, this.level.height - this.level.livingQuartersY);
        
        this.ctx.strokeStyle = 'rgba(68, 68, 68, 0.2)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        
        for (let x = 0; x < this.level.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.level.livingQuartersY);
            this.ctx.lineTo(x, this.level.height);
            this.ctx.stroke();
        }
        
        for (let y = this.level.livingQuartersY; y < this.level.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.level.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.level.livingQuartersY);
        this.ctx.lineTo(this.level.width, this.level.livingQuartersY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.fillStyle = '#888888';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ЖИЛОЙ ОТСЕК', this.level.width / 2, this.level.livingQuartersY + 30);
        
        if (this.people) {
            this.people.forEach(person => {
                if (person && person.draw) {
                    person.draw(this.ctx);
                }
            });
        }
        
        if (this.enemiesInLivingQuarters) {
            this.enemiesInLivingQuarters.forEach(enemy => {
                if (enemy && enemy.draw) {
                    enemy.draw(this.ctx);
                }
            });
        }
        
        if (this.enemiesInLivingQuarters && this.enemiesInLivingQuarters.length > 0) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!!! ТРЕВОГА: ВРАГИ В ОТСЕКЕ !!!', this.level.width / 2, this.level.livingQuartersY + 60);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Военные ведут огонь. Врагов: ${this.enemiesInLivingQuarters.length}`, this.level.width / 2, this.level.livingQuartersY + 85);
        } else {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Отсек в безопасности', this.level.width / 2, this.level.livingQuartersY + 60);
        }
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        const alivePeople = this.people ? this.people.filter(p => p.alive) : [];
        const aliveMiners = alivePeople.filter(p => p.type === 'miner').length;
        const aliveMilitary = alivePeople.filter(p => p.type === 'military').length;
        
        this.ctx.fillText(`⚒ Шахтёры: ${this.miners} (${aliveMiners} активных)`, 20, this.level.livingQuartersY + 110);
        this.ctx.fillText(`⚔ Военные: ${this.military} (${aliveMilitary} активных)`, 20, this.level.livingQuartersY + 130);
    }
    
    drawHoveredSlot(slot) {
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 0.8;
        
        if (slot.width !== undefined) {
            this.ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            this.ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
        } else {
            this.ctx.beginPath();
            this.ctx.arc(slot.x, slot.y, 25, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            this.ctx.fill();
            
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 12px monospace';
            this.ctx.textAlign = 'center';
            const towerName = TOWER_DATA[this.selectedBuildType]?.name || 'Башня';
            this.ctx.fillText(towerName, slot.x, slot.y - 35);
            
            const cost = TOWER_DATA[this.selectedBuildType]?.cost || 0;
            this.ctx.fillText(`💎 ${cost}`, slot.x, slot.y - 50);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawHoveredObject() {
        if (!this.hoveredObject) return;
        
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        if (this.hoveredObject.type) {
            this.ctx.beginPath();
            this.ctx.arc(this.hoveredObject.x, this.hoveredObject.y, 30, 0, Math.PI * 2);
            this.ctx.stroke();
        } else {
            this.ctx.strokeRect(
                this.hoveredObject.x - 2, 
                this.hoveredObject.y - 2, 
                this.hoveredObject.width + 4, 
                this.hoveredObject.height + 4
            );
        }
        
        this.ctx.setLineDash([]);
    }

    drawTowerUpgradeHint(tower) {
        const towerData = TOWER_DATA[tower.type];
        const nextCost = tower.level < (Tower.MAX_LEVEL ?? 3) ? towerData?.upgradeCosts?.[tower.level] : null;
        
        let text;
        let borderColor = '#00ffff';
        
        if (!tower.active) {
            text = 'Башня неактивна';
            borderColor = '#888888';
        } else if (tower.repairing) {
            text = 'Ремонт в процессе';
            borderColor = '#ffaa00';
        } else if (tower.level >= (Tower.MAX_LEVEL ?? 3)) {
            text = 'Максимальный уровень';
            borderColor = '#888888';
        } else if (nextCost === undefined) {
            text = 'Улучшение недоступно';
            borderColor = '#888888';
        } else {
            text = `U ▸ улучшить (💎 ${nextCost})`;
        }
        
        this.ctx.save();
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        const padding = 6;
        const textWidth = this.ctx.measureText(text).width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 24;
        const x = tower.x;
        const y = tower.y - 40;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        this.ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(text, x, y + 3);
        this.ctx.restore();
    }

    drawBarricadeUpgradeHint(barricade) {
        const barricadeData = BARRICADE_DATA[barricade.type];
        const maxLevel = Barricade.MAX_LEVEL ?? 3;
        const nextCost = barricade.level < maxLevel ? barricadeData?.upgradeCosts?.[barricade.level] : null;
        
        let text;
        let borderColor = '#00ff88';
        
        if (!barricade.active) {
            text = barricade.building ? 'Строительство...' : 'Баррикада повреждена';
            borderColor = '#ffaa00';
        } else if (barricade.level >= maxLevel) {
            text = 'Максимальный уровень';
            borderColor = '#888888';
        } else if (nextCost === undefined) {
            text = 'Улучшение недоступно';
            borderColor = '#888888';
        } else {
            text = `U ▸ усилить (💎 ${nextCost})`;
        }
        
        this.ctx.save();
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        const padding = 6;
        const textWidth = this.ctx.measureText(text).width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 24;
        const x = barricade.x + barricade.width / 2;
        const y = barricade.y - 20;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(text, x, y + 4);
        this.ctx.restore();
    }

    // ИСПРАВЛЕНИЕ: Метод отталкивания врагов
    pushEnemyBackward(enemy, distance) {
        if (!distance || distance <= 0) return;
        
        if (enemy.path && enemy.path.length > enemy.pathIndex) {
            const current = enemy.path[enemy.pathIndex];
            const prev = enemy.pathIndex > 0 ? enemy.path[enemy.pathIndex - 1] : current;
            const dx = prev.x - current.x;
            const dy = prev.y - current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                enemy.x += (dx / dist) * distance;
                enemy.y += (dy / dist) * distance;
            }
        } else {
            enemy.x -= distance;
        }
    }

    startLivingQuartersAlert(force = false) {
        if (!force && this.livingQuartersAlert) return;
        
        this.livingQuartersAlert = true;
        this.livingScatterTimer = 240;
        this.livingRegroupStarted = false;
        this.livingRegroupPoints = [];
        
        this.people.forEach(person => {
            if (!person.alive) return;
            person.speed = person.baseSpeed;
            person.freezeIdle = false;
            person.state = 'idle';
            person.isShooting = false;
            person.shootTimer = 0;
            person.clusterId = null;
            
            const target = this.getRandomLivingPoint();
            if (person.type === 'military') {
                person.state = 'scatter';
                person.freezeIdle = true;
                person.speed = person.baseSpeed * 1.6;
                person.targetX = target.x;
                person.targetY = target.y;
            } else {
                person.state = 'panic';
                person.speed = person.baseSpeed * 1.3;
                person.targetX = target.x;
                person.targetY = target.y;
            }
        });
    }

    beginLivingQuartersRegroup() {
        if (this.livingRegroupStarted) return;
        this.livingRegroupStarted = true;
        this.livingRegroupPoints = this.generateRegroupPoints(3);
        let index = 0;
        
        this.people.forEach(person => {
            if (!person.alive || person.type !== 'military') return;
            const clusterIndex = index % this.livingRegroupPoints.length;
            const cluster = this.livingRegroupPoints[clusterIndex];
            index++;
            person.state = 'regroup';
            person.freezeIdle = true;
            person.speed = person.baseSpeed;
            person.clusterId = clusterIndex;
            person.targetX = cluster.x + (Math.random() - 0.5) * 60;
            person.targetY = cluster.y + (Math.random() - 0.5) * 40;
        });
    }

    resetLivingQuartersAlert() {
        if (!this.livingQuartersAlert) return;
        this.livingQuartersAlert = false;
        this.livingScatterTimer = 0;
        this.livingRegroupStarted = false;
        this.livingRegroupPoints = [];
        
        this.people.forEach(person => {
            person.state = 'idle';
            person.freezeIdle = false;
            person.speed = person.baseSpeed;
            person.isShooting = false;
            person.shootTimer = 0;
        });
    }

    generateRegroupPoints(count = 3) {
        const points = [];
        const paddingX = 120;
        const availableWidth = Math.max(0, this.level.width - paddingX * 2);
        const spacing = count > 1 ? availableWidth / (count - 1) : 0;
        const baseY = this.level.livingQuartersY + 120;
        
        for (let i = 0; i < count; i++) {
            const x = paddingX + spacing * i;
            const y = baseY + (i % 2 === 0 ? 0 : 40);
            points.push({
                x: Math.min(this.level.width - 60, Math.max(60, x)),
                y: Math.min(this.level.height - 80, Math.max(this.level.livingQuartersY + 60, y))
            });
        }
        
        return points;
    }

    getRandomLivingPoint() {
        const padding = 60;
        const x = padding + Math.random() * (this.level.width - padding * 2);
        const y = this.level.livingQuartersY + 60 + Math.random() * (this.level.height - this.level.livingQuartersY - 120);
        return {x, y};
    }

    findNearestPerson(enemy, candidates) {
        let closest = null;
        let closestDistSq = Infinity;
        candidates.forEach(person => {
            const dx = person.x - enemy.x;
            const dy = person.y - enemy.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                closest = person;
            }
        });
        return closest;
    }

    findNearestEnemyInQuarters(soldier) {
        let closest = null;
        let closestDistSq = Infinity;
        this.enemiesInLivingQuarters.forEach(enemy => {
            const dx = enemy.x - soldier.x;
            const dy = enemy.y - soldier.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                closest = enemy;
            }
        });
        return closest;
    }

    applyEndOfLevelOverlay(type) {
        this.controlsLocked = true;
        
        let overlay = document.querySelector('.level-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'level-overlay';
            const message = document.createElement('div');
            message.className = 'overlay-message';
            overlay.appendChild(message);
            document.body.appendChild(overlay);
        }
        
        const messageEl = overlay.querySelector('.overlay-message');
        if (messageEl) {
            messageEl.textContent = type === 'victory' ? '// СЕКТОР ЗАЩИЩЁН //' : '// СЕКТОР ПОТЕРЯН //';
        }
        
        overlay.classList.add('visible');
        
    }

    clearEndOfLevelOverlay() {
        this.controlsLocked = false;
        const overlay = document.querySelector('.level-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    drawBuildCursor() {
        // Обновляем позицию курсора
        const buildCursor = document.getElementById('build-cursor');
        if (buildCursor) {
            buildCursor.style.left = (this.mouseX + this.cameraX) + 'px';
            buildCursor.style.top = (this.mouseY + this.cameraY) + 'px';
        }
        
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.lineWidth = 2;
        
        if (this.selectedBuildCategory === 'tower') {
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        } else if (this.selectedBuildCategory === 'barricade') {
            this.ctx.fillRect(this.mouseX - 20, this.mouseY - 20, 40, 40);
            this.ctx.strokeRect(this.mouseX - 20, this.mouseY - 20, 40, 40);
        }
    }
    
    // ===== UI =====
    updateUI() {
        try {
            if (this.uiManager && typeof this.uiManager.updateGameUI === 'function') {
                this.uiManager.updateGameUI({
                    levelName: this.level?.name || 'Unknown',
                    currentWave: this.currentWave || 0,
                    totalWaves: this.totalWaves || 0,
                    resources: this.resources || 0,
                    resourceRate: this.resourceRate || 0,
                    miners: this.miners || 0,
                    military: this.military || 0,
                    waveInProgress: this.waveInProgress || false
                });
                
                this.uiManager.updateBuildItemsAvailability(this.resources || 0);
                
                if (this.selectedObject) {
                    if (this.selectedObject instanceof Tower) {
                        this.uiManager.showObjectInfo(this.selectedObject);
                    } else if (this.selectedObject instanceof Barricade) {
                        this.uiManager.showObjectInfo(this.selectedObject);
                    }
                } else if (this.previewedObject) {
                    if (this.previewedObject instanceof Tower) {
                        this.uiManager.showObjectInfo(this.previewedObject);
                    } else if (this.previewedObject instanceof Barricade) {
                        this.uiManager.showObjectInfo(this.previewedObject);
                    }
                }
            }
            
            const waveBtn = document.getElementById('start-wave-btn');
            if (waveBtn) {
                const btnText = waveBtn.querySelector('.btn-text');
                waveBtn.style.display = 'flex';
                const allWavesCleared = this.currentWave >= this.totalWaves;
                waveBtn.disabled = this.waveInProgress || allWavesCleared;

                if (btnText) {
                    if (allWavesCleared) {
                        btnText.textContent = 'ВОЛНЫ ЗАВЕРШЕНЫ';
                    } else if (this.waveInProgress) {
                        btnText.textContent = 'ВОЛНА В ПРОЦЕССЕ';
                    } else {
                        btnText.textContent = `НАЧАТЬ ВОЛНУ ${this.currentWave + 1}`;
                    }
                }
            }

            const speedBtn = document.getElementById('speed-wave-btn');
            if (speedBtn) {
                const btnText = speedBtn.querySelector('.btn-text');
                const mode = this.speedModes[this.currentSpeedModeIndex];
                if (btnText) {
                    btnText.textContent = `УСКОРЕНИЕ ${mode.label}`;
                }
                speedBtn.classList.toggle('active', this.currentSpeedModeIndex !== 0);
            }
        } catch (e) {
            if (this.frameCount && this.frameCount % 300 === 0) {
                console.warn('UI update error (logged every 5 sec):', e.message);
            }
        }
    }

    cycleWaveSpeed() {
        this.currentSpeedModeIndex = (this.currentSpeedModeIndex + 1) % this.speedModes.length;
        const mode = this.speedModes[this.currentSpeedModeIndex];
        this.timeScale = mode.multiplier;

        const speedBtn = document.getElementById('speed-wave-btn');
        if (speedBtn) {
            speedBtn.classList.toggle('active', this.currentSpeedModeIndex !== 0);
        }
        this.showMessage(`Скорость волны: ${mode.label}`);
    }
    
    showMessage(text) {
        console.log('GAME MESSAGE:', text);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.9);
            color: #ffffff;
            padding: 15px 30px;
            border: 2px solid #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
        `;
        notification.textContent = text;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
    pointInRectangle(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }
    
    rectanglesOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
    }
    
    // ===== НОВЫЕ МЕТОДЫ ДЛЯ ПОКАЗА ИНФОРМАЦИИ О БАШНЯХ И БАРРИКАДАХ =====
    showTowerInfo(tower) {
        if (this.uiManager) {
            this.uiManager.showObjectInfo(tower);
        }
    }
    
    showBarricadeInfo(barricade) {
        if (this.uiManager) {
            this.uiManager.showObjectInfo(barricade);
        }
    }
    
    checkEvents(trigger) {
        // Проверяем события по триггеру
        const eventsToTrigger = this.eventQueue.filter(event => 
            event.trigger === trigger && 
            (event.wave === undefined || event.wave === this.currentWave)
        );
        
        eventsToTrigger.forEach(event => {
            if (this.uiManager && event.dialog) {
                this.uiManager.showDialog(event.dialog, (effect, choiceIndex) => {
                    this.processEventEffect(effect, choiceIndex);
                });
            }
            
            // Удаляем событие из очереди
            const index = this.eventQueue.indexOf(event);
            if (index !== -1) {
                this.eventQueue.splice(index, 1);
            }
            
            this.triggeredEvents.push(event);
        });
    }
    
    processEventEffect(effect, choiceIndex) {
        if (!effect) return;
        
        switch (effect.type) {
            case 'resources':
                this.resources += effect.value || 0;
                break;
            case 'convert':
                this.startConversion('miner', 'military', effect.count || 1);
                break;
            case 'addMilitary':
                this.military += effect.count || 0;
                // Обновляем военных в жилом отсеке
                for (let i = 0; i < (effect.count || 0); i++) {
                    const person = new Person(
                        'military',
                        50 + (this.military - (effect.count || 0) + i) * 30,
                        this.level.livingQuartersY + 50
                    );
                    this.people.push(person);
                }
                break;
            case 'addMiners':
                this.miners += effect.count || 0;
                // Обновляем шахтеров в жилом отсеке
                for (let i = 0; i < (effect.count || 0); i++) {
                    const person = new Person(
                        'miner',
                        100 + Math.random() * (this.level.width - 200),
                        this.level.livingQuartersY + 100 + Math.random() * 200
                    );
                    this.people.push(person);
                }
                break;
            case 'emergency':
                this.resources += effect.resources || 0;
                this.military += effect.military || 0;
                // Обновляем персонал
                for (let i = 0; i < (effect.military || 0); i++) {
                    const person = new Person(
                        'military',
                        50 + (this.military - (effect.military || 0) + i) * 30,
                        this.level.livingQuartersY + 50
                    );
                    this.people.push(person);
                }
                break;
            case 'buffDamage':
                // TODO: Реализовать усиление урона
                break;
            case 'buffBarricades':
                // TODO: Реализовать усиление баррикад
                break;
            case 'superWeapon':
                this.military += effect.military || 0;
                // Убиваем процент врагов
                const killCount = Math.floor(this.enemies.length * (effect.killPercent || 0));
                for (let i = 0; i < killCount && this.enemies.length > 0; i++) {
                    const randomIndex = Math.floor(Math.random() * this.enemies.length);
                    this.enemies[randomIndex].alive = false;
                    this.enemiesKilled++;
                }
                break;
        }
    }
    
    checkObjectiveCompletion(objectiveId) {
        const objective = this.level.objectives.find(o => o.id === objectiveId);
        if (objective && !objective.completed) {
            objective.completed = true;
            this.showMessage(`Задача выполнена: ${objective.text}`);
        }
    }
    
    checkGameConditions() {
        // Проверка поражения - все люди погибли
        if (this.miners <= 0 && this.military <= 0) {
            this.defeat('Весь персонал погиб');
        }
        
        // Проверка поражения - слишком много врагов прорвалось
        if (this.enemiesReached >= 10) {
            this.defeat('Слишком много врагов прорвалось в жилой отсек');
        }
    }
    
    updateConversionsUI() {
        const conversionsList = document.getElementById('conversions-list');
        if (!conversionsList) return;
        
        conversionsList.innerHTML = '';
        
        this.conversions.forEach(conversion => {
            const item = document.createElement('div');
            item.className = 'conversion-item';
            
            const header = document.createElement('div');
            header.className = 'conversion-item-header';
            header.innerHTML = `
                <span>${conversion.fromType === 'miner' ? '⚒→⚔' : '⚔→⚒'} (${conversion.count})</span>
                <span>${Math.round(conversion.getProgress())}%</span>
            `;
            
            const progressBar = document.createElement('div');
            progressBar.className = 'conversion-item-progress';
            
            const fill = document.createElement('div');
            fill.className = 'conversion-item-fill';
            fill.style.width = conversion.getProgress() + '%';
            
            progressBar.appendChild(fill);
            
            item.appendChild(header);
            item.appendChild(progressBar);
            
            conversionsList.appendChild(item);
        });
    }
}

// ===== ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ =====
window.Game = Game;

console.log('Game engine loaded successfully');
console.log('All systems ready. Start the game from the main menu!');
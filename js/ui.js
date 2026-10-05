// ===== МЕНЕДЖЕР ПОЛЬЗОВАТЕЛЬСКОГО ИНТЕРФЕЙСА =====
class UIManager {
    constructor() {
        // Экраны
        this.mainMenu = document.getElementById('main-menu');
        this.levelSelect = document.getElementById('level-select');
        this.gameScreen = document.getElementById('game-screen');
        
        // Игровые панели
        this.topPanel = document.getElementById('top-panel');
        this.sidePanel = document.getElementById('side-panel');
        
        // Элементы информации
        this.levelNameEl = document.getElementById('level-name');
        this.waveCounterEl = document.getElementById('wave-counter');
        this.resourcesEl = document.getElementById('resources-count');
        this.resourceRateEl = document.getElementById('resource-rate');
        
        // Персонал
        this.minersCountEl = document.getElementById('miners-count');
        this.militaryCountEl = document.getElementById('military-count');
        
        // Списки строительства
        this.towersListEl = document.getElementById('towers-list');
        this.barricadesListEl = document.getElementById('barricades-list');
        
        // Информация о выбранном объекте
        this.selectedInfoEl = document.getElementById('selected-info');
        this.selectedDetailsEl = document.getElementById('selected-details');
        
        // Кнопки
        this.startWaveBtn = document.getElementById('start-wave-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        
        // Диалоги
        this.dialogOverlay = document.getElementById('dialog-overlay');
        this.dialogTitle = document.getElementById('dialog-title');
        this.dialogText = document.getElementById('dialog-text');
        this.dialogChoices = document.getElementById('dialog-choices');
        this.dialogTimer = document.getElementById('dialog-timer');
        this.dialogTimerValue = document.getElementById('timer-value');
        
        // Карта уровней
        this.shipMap = document.getElementById('ship-map');
        this.missionTitle = document.getElementById('mission-title');
        this.missionDescription = document.getElementById('mission-description');
        this.missionObjectives = document.getElementById('mission-objectives');
        this.startMissionBtn = document.getElementById('start-mission-btn');
        
        // Текущий выбранный объект
        this.selectedObject = null;
        this.selectedBuildType = null;
        this.selectedBuildCategory = null;
        
        // Состояние UI
        this.currentScreen = 'main-menu';
        
        this.initializeEventListeners();
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ =====
    initializeEventListeners() {
        // Главное меню
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // ✅ Проверяем сохранённый прогресс
                const savedProgress = window.loadGameProgress();
                const continueBtn = document.getElementById('continue-btn');
                if (savedProgress && savedProgress.campaign && continueBtn) {
                    continueBtn.style.display = 'block';
                    continueBtn.onclick = () => {
                        this.showLevelSelect();
                        // Продолжаем с сохранённого уровня
                        if (window.campaign) {
                            // window.campaign.resumeFromSave(savedProgress);
                        }
                    };
                }
                this.showLevelSelect();
            });
        }
        
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHelpOverlay();
            });
        }
        
        const settingsMenuBtn = document.getElementById('settings-menu-btn');
        if (settingsMenuBtn) {
            settingsMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettings();
            });
        }
        
        // ✅ Кнопка "Начать заново"
        const resetProgressBtn = document.getElementById('reset-progress-btn');
        if (resetProgressBtn) {
            resetProgressBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Вы уверены? Это удалит весь ваш прогресс навсегда.')) {
                    try {
                        localStorage.clear();
                        console.log('♻️ All progress cleared from localStorage');
                        alert('Прогресс сброшен. Начинаем игру заново!');
                        location.reload();
                    } catch (e) {
                        console.error('❌ Failed to reset progress:', e);
                        alert('Не удалось сбросить прогресс. Попробуйте позже.');
                    }
                }
            });
        }
        
        // Выбор уровня
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showMainMenu();
            });
        }
        
        // Игровой экран
        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.game) {
                    window.game.togglePause();
                }
            });
        }
        
        const quitLevelBtn = document.getElementById('quit-level-btn');
        if (quitLevelBtn) {
            quitLevelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showQuitDialog();
            });
        }
        
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.game) {
                    window.game.showSettings();
                }
            });
        }

        // ✅ Кнопка "Начать заново" в игре
        const resetGameBtn = document.getElementById('reset-game-btn');
        if (resetGameBtn) {
            resetGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Сбросить весь прогресс и начать заново?')) {
                    try {
                        localStorage.clear();
                        console.log('♻️ All game progress cleared');
                        alert('Прогресс сброшен. Перезапуск игры...');
                        location.reload();
                    } catch (e) {
                        console.error('❌ Failed to reset game:', e);
                    }
                }
            });
        }
    }
    
    showQuitDialog() {
        // Создаем внутриигровое окно подтверждения
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.innerHTML = `
            <div class="dialog-box">
                <h3>ПОДТВЕРЖДЕНИЕ</h3>
                <p>Выйти в меню? Прогресс не сохранится.</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="menu-btn" id="confirm-quit">ДА</button>
                    <button class="menu-btn secondary" id="cancel-quit">ОТМЕНА</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const confirmQuitBtn = overlay.querySelector('#confirm-quit');
        if (confirmQuitBtn) {
            confirmQuitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                overlay.remove();
                this.showLevelSelect();
                if (window.game) {
                    window.game.cleanup();
                }
            });
        }
        
        const cancelQuitBtn = overlay.querySelector('#cancel-quit');
        if (cancelQuitBtn) {
            cancelQuitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                overlay.remove();
            });
        }
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }
    
    // ===== УПРАВЛЕНИЕ ЭКРАНАМИ =====
    showScreen(screenName) {
        const screens = [
            this.mainMenu,
            this.levelSelect,
            this.gameScreen
        ];
        
        screens.forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
                screen.style.display = 'none';
            }
        });
        
        let targetScreen = null;
        switch(screenName) {
            case 'main-menu':
                targetScreen = this.mainMenu;
                break;
            case 'level-select':
                targetScreen = this.levelSelect;
                break;
            case 'game':
                targetScreen = this.gameScreen;
                break;
        }
        
        if (targetScreen) {
            targetScreen.classList.add('active');
            targetScreen.style.display = 'flex';
            this.currentScreen = screenName;
        }
    }
    
    showMainMenu() {
        this.showScreen('main-menu');
    }
    
    showLevelSelect() {
        this.showScreen('level-select');
        if (window.campaign) {
            this.renderLevelMap(window.campaign);
        }
    }
    
    showGame() {
        this.showScreen('game');
    }
    
    hidePause() {
        const miniMenu = document.getElementById('mini-pause-menu');
        if (miniMenu) {
            miniMenu.style.display = 'none';
        }
    }
    
    // ===== ОКНО ПОМОЩИ =====
    showHelpOverlay() {
        let helpOverlay = document.getElementById('help-overlay');
        
        if (!helpOverlay) {
            helpOverlay = document.createElement('div');
            helpOverlay.id = 'help-overlay';
            helpOverlay.className = 'dialog-overlay';
            helpOverlay.innerHTML = `
                <div class="dialog-box" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin-bottom: 20px; text-align: center; border-bottom: 2px solid #ffffff; padding-bottom: 10px;">// ИНСТРУКЦИИ COSMIC BASTION //</h3>
                    <div style="text-align: left; line-height: 1.8;">
                        <h4 style="color: #00ff00; margin-top: 15px; border-left: 3px solid #00ff00; padding-left: 10px;">ЦЕЛЬ:</h4>
                        <p style="margin-left: 15px;">Защитить экипаж разбившегося корабля от волн враждебных существ до завершения ремонта.</p>
                        
                        <h4 style="color: #00ff00; margin-top: 15px; border-left: 3px solid #00ff00; padding-left: 10px;">УПРАВЛЕНИЕ ПЕРСОНАЛОМ:</h4>
                        <p style="margin-left: 15px;">• <strong>Шахтёры (⚒)</strong> добывают ресурсы пассивно (0.5 ресурсов/сек на человека)</p>
                        <p style="margin-left: 15px;">• <strong>Военные (⚔)</strong> строят и улучшают башни (скорость зависит от количества)</p>
                        <p style="margin-left: 15px;">• <strong>Переобучение:</strong> введите количество и нажмите "ПЕРЕВЕСТИ"</p>
                        <p style="margin-left: 15px;">• Можно переобучать несколько групп параллельно!</p>
                        <p style="margin-left: 15px; color: #ffff00;">⚠ Балансируйте количество персонала!</p>
                        
                        <h4 style="color: #00ff00; margin-top: 15px; border-left: 3px solid #00ff00; padding-left: 10px;">СТРОИТЕЛЬСТВО ОБОРОНЫ:</h4>
                        <p style="margin-left: 15px;">1. Выберите тип башни или баррикады в меню справа</p>
                        <p style="margin-left: 15px;">2. Кликните на подсвеченный слот для начала строительства</p>
                        <p style="margin-left: 15px;">3. Военные автоматически начнут строительство</p>
                        <p style="margin-left: 15px;">4. Наведите курсор на башню/баррикаду для улучшения или демонтажа</p>
                        <p style="margin-left: 15px; color: #00ff00;">✓ Можно ставить любую башню на любой слот!</p>
                        
                        <h4 style="color: #00ff00; margin-top: 15px; border-left: 3px solid #00ff00; padding-left: 10px;">ТИПЫ БАШЕН:</h4>
                        <p style="margin-left: 15px;">• <strong>Пушка (💎60):</strong> Средний урон и скорость</p>
                        <p style="margin-left: 15px;">• <strong>Ракетница (💎90):</strong> Урон по площади</p>
                        <p style="margin-left: 15px;">• <strong>Пулемёт (💎70):</strong> Высокая скорострельность</p>
                        <p style="margin-left: 15px;">• <strong>Лазер (💎120):</strong> Непрерывный урон</p>
                        <p style="margin-left: 15px;">• <strong>Электрошок (💎140):</strong> Урон всем врагам</p>
                        
                        <h4 style="color: #00ff00; margin-top: 15px; border-left: 3px solid #00ff00; padding-left: 10px;">БАРРИКАДЫ:</h4>
                        <p style="margin-left: 15px;">• Размещаются в любом месте коридора (красные стрелки показывают путь)</p>
                        <p style="margin-left: 15px;">• <strong>Стена:</strong> Полностью останавливает врагов пока не сломается</p>
                        <p style="margin-left: 15px;">• <strong>Фильтр:</strong> Замедляет слабых врагов, останавливает сильных</p>
                        <p style="margin-left: 15px;">• <strong>Щит:</strong> Очень прочный с самовосстановлением</p>
                        
                        <h4 style="color: #00ff00; margin-top: 15px; border-left: 3px solid #00ff00; padding-left: 10px;">ПЕРЕКЛЮЧЕНИЕ ВИДОВ:</h4>
                        <p style="margin-left: 15px;">• Кнопка вверху справа или клавиша <strong>V</strong></p>
                        <p style="margin-left: 15px;">• <strong>КОРИДОР:</strong> Обзор башен, баррикад и врагов</p>
                        <p style="margin-left: 15px;">• <strong>ЖИЛОЙ ОТСЕК:</strong> Наблюдение за персоналом</p>
                        <p style="margin-left: 15px; color: #ff0000;">⚠ Если враг прорвался - переключитесь чтобы увидеть бой!</p>
                        
                        <h4 style="color: #ff0000; margin-top: 15px; border-left: 3px solid #ff0000; padding-left: 10px;">ПОРАЖЕНИЕ:</h4>
                        <p style="margin-left: 15px;">• Потеря всего персонала</p>
                        <p style="margin-left: 15px;">• Враги убивают людей при контакте</p>
                        
                        <h4 style="color: #00ff00; margin-top: 15px; border-left: 3px solid #00ff00; padding-left: 10px;">УПРАВЛЕНИЕ:</h4>
                        <p style="margin-left: 15px;">• <strong>ЛКМ</strong> - выбор / строительство</p>
                        <p style="margin-left: 15px;">• <strong>ESC</strong> - отмена / пауза</p>
                        <p style="margin-left: 15px;">• <strong>ПРОБЕЛ</strong> - начать волну</p>
                        <p style="margin-left: 15px;">• <strong>V</strong> - переключить вид</p>
                        <p style="margin-left: 15px;">• <strong>U</strong> - улучшить выделенную башню/баррикаду</p>
                        
                        <h4 style="color: #ffff00; margin-top: 15px; border-left: 3px solid #ffff00; padding-left: 10px;">СОВЕТЫ:</h4>
                        <p style="margin-left: 15px;">✓ Улучшение мгновенное - улучшайте в бою!</p>
                        <p style="margin-left: 15px;">✓ Демонтаж возвращает 50% стоимости</p>
                        <p style="margin-left: 15px;">✓ Закрывайте проломы баррикадами</p>
                        <p style="margin-left: 15px;">✓ Следите за сюжетными событиями</p>
                        <p style="margin-left: 15px;">✓ Используйте настройки для изменения сложности</p>
                    </div>
                    <button class="menu-btn" id="close-help-btn" style="margin-top: 20px; width: 100%;">ПОНЯТНО</button>
                </div>
            `;
            document.body.appendChild(helpOverlay);
            
            const closeHelpBtn = document.getElementById('close-help-btn');
            if (closeHelpBtn) {
                closeHelpBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    helpOverlay.style.display = 'none';
                });
            }
            
            helpOverlay.addEventListener('click', (e) => {
                if (e.target === helpOverlay) {
                    helpOverlay.style.display = 'none';
                }
            });
        }
        
        helpOverlay.style.display = 'flex';
    }
    
    // ===== КАРТА УРОВНЕЙ =====
    renderLevelMap(campaign) {
        if (!this.shipMap) return;
        
        this.shipMap.innerHTML = '';
        
        campaign.levels.forEach((level, index) => {
            const levelNode = document.createElement('div');
            levelNode.className = 'level-node';
            
            if (level.completed) {
                levelNode.classList.add('completed');
            }
            if (level.locked) {
                levelNode.classList.add('locked');
            }
            if (level.type === 'story') {
                levelNode.classList.add('story');
            }
            
            const status = document.createElement('div');
            status.className = 'level-status';
            if (level.completed) {
                status.textContent = `★ ${level.stars}/3`;
                status.style.borderColor = '#00ff00';
                status.style.color = '#00ff00';
            } else if (level.locked) {
                status.textContent = '🔒 ЗАБЛОКИРОВАН';
                status.style.borderColor = '#ff0000';
                status.style.color = '#ff0000';
            } else {
                status.textContent = '● ДОСТУПЕН';
                status.style.borderColor = '#ffffff';
                status.style.color = '#ffffff';
            }
            
            const title = document.createElement('h4');
            title.textContent = level.name;
            
            const desc = document.createElement('p');
            desc.textContent = level.description;
            
            levelNode.appendChild(status);
            levelNode.appendChild(title);
            levelNode.appendChild(desc);
            
            if (!level.locked) {
                levelNode.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectLevel(level, campaign);
                });
            }
            
            this.shipMap.appendChild(levelNode);
        });
    }
    
    selectLevel(level, campaign) {
        const allNodes = this.shipMap.querySelectorAll('.level-node');
        allNodes.forEach(node => node.classList.remove('active'));
        
        const selectedNode = Array.from(allNodes).find(node => 
            node.querySelector('h4').textContent === level.name
        );
        if (selectedNode) {
            selectedNode.classList.add('active');
        }
        
        if (this.missionTitle) {
            this.missionTitle.textContent = level.name;
        }
        if (this.missionDescription) {
            this.missionDescription.textContent = level.description;
        }
        
        if (this.missionObjectives) {
            this.missionObjectives.innerHTML = '<h4>ЗАДАЧИ:</h4>';
            level.objectives.forEach(obj => {
                const objItem = document.createElement('div');
                objItem.className = 'objective-item';
                objItem.textContent = `▸ ${obj.text}`;
                this.missionObjectives.appendChild(objItem);
            });
            
            const conditions = document.createElement('div');
            conditions.className = 'objective-item';
            conditions.style.marginTop = '20px';
            conditions.style.borderColor = '#888888';
            conditions.innerHTML = `
                <strong>НАЧАЛЬНЫЕ РЕСУРСЫ:</strong><br>
                ⚒ Шахтёры: ${level.startingMiners}<br>
                ⚔ Военные: ${level.startingMilitary}<br>
                💎 Ресурсы: ${level.startingResources}<br>
                🌊 Волн: ${level.totalWaves}
            `;
            this.missionObjectives.appendChild(conditions);
        }
        
        if (this.startMissionBtn) {
            this.startMissionBtn.style.display = 'block';
            this.startMissionBtn.onclick = (e) => {
                e.preventDefault();
                campaign.selectLevel(level.id);
                this.startLevel(level);
            };
        }
    }
    
    startLevel(level) {
        // Скрыть все мини-меню перед стартом
        const miniMenus = ['mini-pause-menu', 'mini-victory-menu', 'mini-defeat-menu'];
        miniMenus.forEach(id => {
            const menu = document.getElementById(id);
            if (menu) menu.style.display = 'none';
        });
        
        this.showGame();
        
        if (window.Game) {
            window.game = new Game(level);
            window.game.start();
        }
    }
    
    // ===== ОБНОВЛЕНИЕ ИГРОВОГО UI =====
    updateGameUI(gameState) {
        if (this.levelNameEl) {
            this.levelNameEl.textContent = gameState.levelName;
        }
        
        if (this.waveCounterEl) {
            this.waveCounterEl.textContent = `${gameState.currentWave}/${gameState.totalWaves}`;
        }
        
        if (this.resourcesEl) {
            this.resourcesEl.textContent = Math.floor(gameState.resources);
        }
        
        if (this.resourceRateEl) {
            this.resourceRateEl.textContent = gameState.resourceRate.toFixed(1);
        }
        
        if (this.minersCountEl) {
            this.minersCountEl.textContent = gameState.miners;
        }
        
        if (this.militaryCountEl) {
            this.militaryCountEl.textContent = gameState.military;
        }
    }
    
    // ===== ПАНЕЛЬ СТРОИТЕЛЬСТВА =====
    populateBuildLists(unlockedTowers, unlockedBarricades) {
        if (this.towersListEl) {
            this.towersListEl.innerHTML = '';
        }
        
        Object.keys(TOWER_DATA).forEach(towerType => {
            if (!unlockedTowers.includes(towerType)) return;
            
            const towerInfo = TOWER_DATA[towerType];
            const item = this.createBuildItem(towerType, towerInfo, 'tower');
            if (this.towersListEl) {
                this.towersListEl.appendChild(item);
            }
        });
        
        if (this.barricadesListEl) {
            this.barricadesListEl.innerHTML = '';
        }
        
        Object.keys(BARRICADE_DATA).forEach(barricadeType => {
            if (!unlockedBarricades.includes(barricadeType)) return;
            
            const barricadeInfo = BARRICADE_DATA[barricadeType];
            const item = this.createBuildItem(barricadeType, barricadeInfo, 'barricade');
            if (this.barricadesListEl) {
                this.barricadesListEl.appendChild(item);
            }
        });
    }
    
    createBuildItem(type, info, category) {
        const item = document.createElement('div');
        item.className = 'build-item';
        item.dataset.type = type;
        item.dataset.category = category;
        
        const header = document.createElement('div');
        header.className = 'build-item-header';
        
        const name = document.createElement('span');
        name.className = 'build-item-name';
        name.textContent = info.name;
        
        const cost = document.createElement('span');
        cost.className = 'build-item-cost';
        cost.textContent = `💎 ${info.cost}`;
        
        header.appendChild(name);
        header.appendChild(cost);
        
        const desc = document.createElement('div');
        desc.className = 'build-item-desc';
        desc.textContent = info.description;
        
        item.appendChild(header);
        item.appendChild(desc);
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            this.selectBuildItem(type, category);
        });
        
        return item;
    }
    
    selectBuildItem(type, category) {
        const allItems = document.querySelectorAll('.build-item');
        allItems.forEach(item => item.classList.remove('selected'));
        
        const selectedItem = document.querySelector(`.build-item[data-type="${type}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        this.selectedBuildType = type;
        this.selectedBuildCategory = category;
        
        if (window.game) {
            window.game.setSelectedBuild(type, category);
        }
    }
    
    deselectBuildItem() {
        const allItems = document.querySelectorAll('.build-item');
        allItems.forEach(item => item.classList.remove('selected'));
        
        this.selectedBuildType = null;
        this.selectedBuildCategory = null;
        
        if (window.game) {
            window.game.setSelectedBuild(null, null);
        }
    }
    
    updateBuildItemsAvailability(resources) {
        const allItems = document.querySelectorAll('.build-item');
        
        allItems.forEach(item => {
            const type = item.dataset.type;
            const category = item.dataset.category;
            
            let cost = 0;
            if (category === 'tower') {
                cost = TOWER_DATA[type].cost;
            } else if (category === 'barricade') {
                cost = BARRICADE_DATA[type].cost;
            }
            
            if (resources < cost) {
                item.style.opacity = '0.5';
            } else {
                item.style.opacity = '1';
            }
        });
    }
    
    // ===== ИНФОРМАЦИЯ О ВЫБРАННОМ ОБЪЕКТЕ =====
    showObjectInfo(object) {
        this.selectedObject = object;
        if (this.selectedInfoEl) {
            this.selectedInfoEl.style.display = 'block';
        }
        
        if (this.selectedDetailsEl) {
            this.selectedDetailsEl.innerHTML = '';
        }
        
        if (object.type) {
            this.displayTowerInfo(object);
        } else {
            this.displayBarricadeInfo(object);
        }
    }
    
    displayTowerInfo(tower) {
        if (!this.selectedDetailsEl) return;
        
        const info = TOWER_DATA[tower.type];
        
        const title = document.createElement('h4');
        title.textContent = `${info.name} (Ур. ${tower.level + 1})`;
        title.style.marginBottom = '10px';
        this.selectedDetailsEl.appendChild(title);
        
        if (tower.active) {
            const stats = [
                {label: 'Урон', value: Math.floor(tower.damage)},
                {label: 'Дальность', value: Math.floor(tower.range)},
                {label: 'Скорострельность', value: (60 / tower.fireRate).toFixed(1) + '/с'}
            ];
            
            stats.forEach(stat => {
                const row = this.createDetailRow(stat.label, stat.value);
                this.selectedDetailsEl.appendChild(row);
            });
        }
        
        const statusRow = this.createDetailRow('Состояние', tower.active ? 'Активна' : (tower.repairing ? 'Ремонт' : 'Сломана'));
        this.selectedDetailsEl.appendChild(statusRow);
        
        if (tower.disabled) {
            const disabledRow = this.createDetailRow('Статус', 'ОТКЛЮЧЕНА!');
            disabledRow.style.color = '#ff0000';
            this.selectedDetailsEl.appendChild(disabledRow);
        }
        
        if (tower.repairing) {
            const progress = (tower.repairProgress / tower.repairTime) * 100;
            const progressBar = this.createProgressBar(progress, 'Ремонт');
            this.selectedDetailsEl.appendChild(progressBar);
        }
        
        if (tower.upgrading) {
            const progress = (tower.upgradeProgress / tower.upgradeTime) * 100;
            const progressBar = this.createProgressBar(progress, 'Улучшение');
            this.selectedDetailsEl.appendChild(progressBar);
        }
        
        // Кнопка улучшения
        if (tower.active && !tower.upgrading && tower.level < 3 && window.game) {
            const upgradeSection = document.createElement('div');
            upgradeSection.className = 'upgrade-section';
            upgradeSection.style.marginTop = '15px';
            
            const upgradeCost = info.upgradeCosts[tower.level];
            const upgradeBtn = document.createElement('button');
            upgradeBtn.className = 'upgrade-tower-btn menu-btn';
            upgradeBtn.dataset.towerId = tower.id;
            upgradeBtn.textContent = `УЛУЧШИТЬ (💎 ${upgradeCost})`;
            upgradeBtn.style.width = '100%';
            upgradeBtn.style.margin = '5px 0';
            
            upgradeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.game && window.game.resources >= upgradeCost) {
                    window.game.upgradeTower(tower);
                    setTimeout(() => this.showObjectInfo(tower), 100);
                } else {
                    this.showMessage('Недостаточно ресурсов!');
                }
            });
            
            if (window.game.resources < upgradeCost) {
                upgradeBtn.disabled = true;
                upgradeBtn.style.opacity = '0.5';
            }
            
            upgradeSection.appendChild(upgradeBtn);
            this.selectedDetailsEl.appendChild(upgradeSection);
        }
        
        // Кнопка демонтажа
        if ((tower.active || tower.repairing) && window.game) {
            const sellBtn = document.createElement('button');
            sellBtn.className = 'demolish-tower-btn menu-btn secondary';
            sellBtn.dataset.towerId = tower.id;
            sellBtn.textContent = 'ДЕМОНТИРОВАТЬ (возврат 50%)';
            sellBtn.style.width = '100%';
            sellBtn.style.marginTop = '10px';
            
            sellBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Демонтировать башню? Вы получите 50% стоимости обратно.')) {
                    const refund = Math.floor(info.cost * 0.5);
                    
                    window.game.resources += refund;
                    
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
                    
                    this.hideObjectInfo();
                    
                    console.log(`Башня демонтирована. Возвращено ${refund} ресурсов.`);
                }
            });
            
            this.selectedDetailsEl.appendChild(sellBtn);
        }
    }
    
    displayBarricadeInfo(barricade) {
        if (!this.selectedDetailsEl) return;
        
        const info = BARRICADE_DATA[barricade.type];
        
        const title = document.createElement('h4');
        title.textContent = `${info.name} (Ур. ${barricade.level + 1})`;
        title.style.marginBottom = '10px';
        this.selectedDetailsEl.appendChild(title);
        
        if (barricade.active) {
            const healthRow = this.createDetailRow('Прочность', `${Math.floor(barricade.currentHealth)}/${barricade.maxHealth}`);
            this.selectedDetailsEl.appendChild(healthRow);
            
            const healthPercent = (barricade.currentHealth / barricade.maxHealth) * 100;
            const healthBar = this.createProgressBar(healthPercent, 'Состояние');
            this.selectedDetailsEl.appendChild(healthBar);
        }
        
        const statusRow = this.createDetailRow('Состояние', barricade.active ? 'Активна' : (barricade.building ? 'Строительство' : 'Разрушена'));
        this.selectedDetailsEl.appendChild(statusRow);
        
        if (barricade.building) {
            const progress = (barricade.buildProgress / barricade.buildTime) * 100;
            const progressBar = this.createProgressBar(progress, 'Строительство');
            this.selectedDetailsEl.appendChild(progressBar);
        }
        
        if (barricade.upgrading) {
            const progress = (barricade.upgradeProgress / barricade.upgradeTime) * 100;
            const progressBar = this.createProgressBar(progress, 'Улучшение');
            this.selectedDetailsEl.appendChild(progressBar);
        }
        
        // Кнопка улучшения
        if (barricade.active && !barricade.upgrading && barricade.level < 3 && window.game) {
            const upgradeSection = document.createElement('div');
            upgradeSection.className = 'upgrade-section';
            upgradeSection.style.marginTop = '15px';
            
            const upgradeCost = info.upgradeCosts[barricade.level];
            const upgradeBtn = document.createElement('button');
            upgradeBtn.className = 'upgrade-barricade-btn menu-btn';
            upgradeBtn.dataset.barricadeId = barricade.id;
            upgradeBtn.textContent = `УСИЛИТЬ (💎 ${upgradeCost})`;
            upgradeBtn.style.width = '100%';
            upgradeBtn.style.margin = '5px 0';
            
            upgradeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.game && window.game.resources >= upgradeCost) {
                    window.game.upgradeBarricade(barricade);
                    setTimeout(() => this.showObjectInfo(barricade), 100);
                } else {
                    this.showMessage('Недостаточно ресурсов!');
                }
            });
            
            if (window.game.resources < upgradeCost) {
                upgradeBtn.disabled = true;
                upgradeBtn.style.opacity = '0.5';
            }
            
            upgradeSection.appendChild(upgradeBtn);
            this.selectedDetailsEl.appendChild(upgradeSection);
        }
        
        // Кнопка демонтажа
        if ((barricade.active || barricade.building) && window.game) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'demolish-barricade-btn menu-btn secondary';
            removeBtn.dataset.barricadeId = barricade.id;
            removeBtn.textContent = 'ДЕМОНТИРОВАТЬ (возврат 50%)';
            removeBtn.style.width = '100%';
            removeBtn.style.marginTop = '10px';
            
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Демонтировать баррикаду? Вы получите 50% стоимости обратно.')) {
                    const refund = Math.floor(info.cost * 0.5);
                    
                    window.game.resources += refund;
                    
                    const index = window.game.barricades.indexOf(barricade);
                    if (index > -1) {
                        window.game.barricades.splice(index, 1);
                    }
                    
                    this.hideObjectInfo();
                    
                    console.log(`Баррикада демонтирована. Возвращено ${refund} ресурсов.`);
                }
            });
            
            this.selectedDetailsEl.appendChild(removeBtn);
        }
    }
    
    hideObjectInfo() {
        this.selectedObject = null;
        if (this.selectedInfoEl) {
            this.selectedInfoEl.style.display = 'none';
        }
    }
    
    createDetailRow(label, value) {
        const row = document.createElement('div');
        row.className = 'detail-row';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'detail-label';
        labelSpan.textContent = label + ':';
        
        const valueSpan = document.createElement('span');
        valueSpan.textContent = value;
        
        row.appendChild(labelSpan);
        row.appendChild(valueSpan);
        
        return row;
    }
    
    createProgressBar(percent, label) {
        const container = document.createElement('div');
        container.style.marginTop = '10px';
        
        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.fontSize = '11px';
        labelEl.style.marginBottom = '4px';
        labelEl.style.color = '#888888';
        
        const barBg = document.createElement('div');
        barBg.className = 'progress-bar';
        
        const barFill = document.createElement('div');
        barFill.className = 'progress-fill';
        barFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        
        barBg.appendChild(barFill);
        container.appendChild(labelEl);
        container.appendChild(barBg);
        
        return container;
    }
    
    // ===== ДИАЛОГОВАЯ СИСТЕМА =====
    showDialog(dialogData, onChoice) {
        if (!this.dialogOverlay) return;
        
        this.dialogOverlay.style.display = 'flex';
        
        if (this.dialogTitle) {
            this.dialogTitle.textContent = dialogData.title || 'ВХОДЯЩЕЕ СОБЩЕНИЕ';
        }
        if (this.dialogText) {
            this.dialogText.textContent = dialogData.text;
        }
        
        if (this.dialogChoices) {
            this.dialogChoices.innerHTML = '';
        }
        
        if (dialogData.choices && this.dialogChoices) {
            dialogData.choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.textContent = choice.text;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideDialog();
                    if (onChoice) {
                        onChoice(choice.effect, index);
                    }
                });
                this.dialogChoices.appendChild(btn);
            });
        }
        
        if (dialogData.timed && dialogData.timeLimit && this.dialogTimer) {
            this.dialogTimer.style.display = 'block';
            this.startDialogTimer(dialogData.timeLimit, () => {
                this.hideDialog();
                if (onChoice) {
                    onChoice(dialogData.choices[dialogData.choices.length - 1].effect, dialogData.choices.length - 1);
                }
            });
        } else if (this.dialogTimer) {
            this.dialogTimer.style.display = 'none';
        }
    }
    
    hideDialog() {
        if (this.dialogOverlay) {
            this.dialogOverlay.style.display = 'none';
        }
        if (this.dialogTimerInterval) {
            clearInterval(this.dialogTimerInterval);
            this.dialogTimerInterval = null;
        }
    }
    
    startDialogTimer(seconds, onTimeout) {
        let remaining = seconds;
        if (this.dialogTimerValue) {
            this.dialogTimerValue.textContent = remaining;
        }
        
        if (this.dialogTimerInterval) {
            clearInterval(this.dialogTimerInterval);
        }
        
        this.dialogTimerInterval = setInterval(() => {
            remaining--;
            if (this.dialogTimerValue) {
                this.dialogTimerValue.textContent = remaining;
            }
            
            if (remaining <= 0) {
                clearInterval(this.dialogTimerInterval);
                this.dialogTimerInterval = null;
                if (onTimeout) {
                    onTimeout();
                }
            }
        }, 1000);
    }
    
    showMessage(text) {
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
}

// ===== ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ UI =====
window.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
    window.campaign = new Campaign();
    
    console.log('UI Manager initialized');
    console.log('Campaign initialized with', window.campaign.levels.length, 'levels');
    
    // ✅ Автозагрузка сохранённого прогресса
    const savedProgress = window.loadGameProgress();
    if (savedProgress && savedProgress.campaign) {
        console.log('✅ Loading saved campaign progress...');
        // window.campaign.loadProgressFromStorage(savedProgress.campaign);
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.style.display = 'block';
        }
    }
});

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ СОХРАНЕНИЯ/ЗАГРУЗКИ =====
window.saveGameProgress = function() {
    if (!window.campaign || !window.game) return;

    const saveData = {
        campaign: {
            currentLevelIndex: window.campaign.currentLevelIndex,
            completedLevels: [...window.campaign.completedLevels],
            totalStars: window.campaign.totalStars,
            levels: window.campaign.levels.map(level => ({
                id: level.id,
                completed: level.completed,
                stars: level.stars,
                locked: level.locked
            }))
        },
        gameState: window.game.serializeState ? window.game.serializeState() : null,
        achievements: window.game.achievements || {},
        timestamp: Date.now(),
        version: '1.0'
    };

    try {
        localStorage.setItem('cosmicBastionSave', JSON.stringify(saveData));
        console.log('💾 Game progress saved to localStorage');
    } catch (e) {
        console.error('❌ Failed to save game progress:', e);
    }
};

window.loadGameProgress = function() {
    try {
        const saved = localStorage.getItem('cosmicBastionSave');
        if (!saved) {
            console.log('🆕 No saved progress found');
            return null;
        }

        const data = JSON.parse(saved);
        console.log('✅ Game progress loaded from localStorage');
        return data;
    } catch (e) {
        console.error('❌ Failed to load game progress:', e);
        return null;
    }
};
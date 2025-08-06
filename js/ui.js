// UI менеджер для SNAKE WORLD
class UIManager {
    constructor() {
        this.currentScreen = 'loading';
        this.selectedSkin = 0;
        this.selectedHead = 0;
        this.playerName = '';
        
        this.skins = [
            { id: 0, name: 'Классический', color: '#4ecdc4', headColor: '#45b7d1' },
            { id: 1, name: 'Огненный', color: '#ff6b6b', headColor: '#ff4757' },
            { id: 2, name: 'Ледяной', color: '#74b9ff', headColor: '#0984e3' },
            { id: 3, name: 'Зеленый', color: '#00b894', headColor: '#00a085' },
            { id: 4, name: 'Фиолетовый', color: '#a29bfe', headColor: '#6c5ce7' },
            { id: 5, name: 'Золотой', color: '#fdcb6e', headColor: '#e17055' },
            { id: 6, name: 'Розовый', color: '#fd79a8', headColor: '#e84393' },
            { id: 7, name: 'Темный', color: '#2d3436', headColor: '#636e72' },
            { id: 8, name: 'Радужный', color: '#00cec9', headColor: '#6c5ce7' },
            { id: 9, name: 'Неоновый', color: '#00d2d3', headColor: '#54a0ff' }
        ];
        
        this.heads = [
            { id: 0, name: 'Обычная', icon: '🐍' },
            { id: 1, name: 'Дракон', icon: '🐉' },
            { id: 2, name: 'Воин', icon: '⚔️' },
            { id: 3, name: 'Череп', icon: '💀' },
            { id: 4, name: 'Ученик', icon: '🎓' },
            { id: 5, name: 'Кристалл', icon: '💎' },
            { id: 6, name: 'Доктор', icon: '⛑️' },
            { id: 7, name: 'Третий глаз', icon: '🪬' },
            { id: 8, name: 'Корона', icon: '👑' },
            { id: 9, name: 'Ангел', icon: '👼' },
            { id: 10, name: 'Демон', icon: '😈' },
            { id: 11, name: 'Робот', icon: '🤖' }
        ];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createSkinOptions();
        this.createHeadOptions();
        this.loadSettings();
    }

    setupEventListeners() {
        // Основные кнопки
        document.getElementById('playBtn').addEventListener('click', () => {
            this.showScreen('customize');
        });

        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.showScreen('main');
        });

        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('playerName').addEventListener('input', (e) => {
            this.playerName = e.target.value.trim();
            this.saveSettings();
        });

        // Игровые кнопки
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.togglePauseScreen();
            });
        }

        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.resumeGame();
            });
        }

        const quitGameBtn = document.getElementById('quitGameBtn');
        if (quitGameBtn) {
            quitGameBtn.addEventListener('click', () => {
                this.backToMenuFromGame();
            });
        }

        // Кнопки игрового экрана
        const backToMenuFromGameBtn = document.getElementById('backToMenuFromGameBtn');
        if (backToMenuFromGameBtn) {
            backToMenuFromGameBtn.addEventListener('click', () => {
                this.backToMenuFromGame();
            });
        }

        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showHelp();
            });
        }

        const closeHelpBtn = document.getElementById('closeHelpBtn');
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => {
                this.hideHelp();
            });
        }

        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // Кнопки Game Over
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.playAgain();
            });
        }

        const backToMainBtn = document.getElementById('backToMainBtn');
        if (backToMainBtn) {
            backToMainBtn.addEventListener('click', () => {
                this.backToMenuFromGameOver();
            });
        }

        // Кнопки настроек
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.hideSettings();
            });
        }
    }

    createSkinOptions() {
        const skinGrid = document.getElementById('skinGrid');
        if (!skinGrid) return;
        
        skinGrid.innerHTML = '';

        this.skins.forEach((skin, index) => {
            const skinOption = document.createElement('div');
            skinOption.className = 'skin-option';
            skinOption.dataset.skinId = skin.id;
            
            const canvas = document.createElement('canvas');
            canvas.width = 60;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.arc(30, 30, 20, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = skin.headColor;
            ctx.beginPath();
            ctx.arc(30, 10, 8, 0, Math.PI * 2);
            ctx.fill();
            
            skinOption.appendChild(canvas);
            
            skinOption.addEventListener('click', () => {
                this.selectSkin(index);
            });
            
            skinGrid.appendChild(skinOption);
        });

        this.selectSkin(0);
    }

    createHeadOptions() {
        const headGrid = document.getElementById('headGrid');
        if (!headGrid) return;
        
        headGrid.innerHTML = '';

        this.heads.forEach((head, index) => {
            const headOption = document.createElement('div');
            headOption.className = 'head-option';
            headOption.dataset.headId = head.id;
            
            headOption.innerHTML = `<span style="font-size: 2rem;">${head.icon}</span>`;
            
            headOption.addEventListener('click', () => {
                this.selectHead(index);
            });
            
            headGrid.appendChild(headOption);
        });

        this.selectHead(0);
    }

    selectSkin(index) {
        document.querySelectorAll('.skin-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-skin-id="${this.skins[index].id}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        this.selectedSkin = index;
        this.saveSettings();
    }

    selectHead(index) {
        document.querySelectorAll('.head-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-head-id="${this.heads[index].id}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        this.selectedHead = index;
        this.saveSettings();
    }

    showScreen(screenName) {
        document.querySelectorAll('.loading-screen, .main-menu, .customize-screen, .game-screen, .pause-screen, .game-over-screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        switch (screenName) {
            case 'loading':
                document.getElementById('loadingScreen').classList.remove('hidden');
                break;
            case 'main':
                document.getElementById('mainMenu').classList.remove('hidden');
                break;
            case 'customize':
                document.getElementById('customizeScreen').classList.remove('hidden');
                break;
            case 'game':
                document.getElementById('gameScreen').classList.remove('hidden');
                break;
            case 'pause':
                document.getElementById('pauseScreen').classList.remove('hidden');
                break;
            case 'gameOver':
                document.getElementById('gameOverScreen').classList.remove('hidden');
                break;
        }
        
        this.currentScreen = screenName;
    }

    startGame() {
        if (!this.playerName) {
            this.showNotification('Введите имя игрока!', 'error');
            return;
        }

        const playerData = {
            id: this.generatePlayerId(),
            name: this.playerName,
            color: this.skins[this.selectedSkin].color,
            headColor: this.skins[this.selectedSkin].headColor,
            headType: this.heads[this.selectedHead].id,
            x: Math.random() * 4000 + 500,
            y: Math.random() * 4000 + 500,
            radius: 15,
            score: 0,
            segments: [
                { x: 0, y: 0 },
                { x: -20, y: 0 },
                { x: -40, y: 0 }
            ],
            boost: false
        };

        this.showScreen('game');
        
        if (!window.gameEngine) {
            const canvas = document.getElementById('gameCanvas');
            window.gameEngine = new GameEngine(canvas);
        }
        
        window.gameEngine.startGame(playerData);
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    updateScore(length, score) {
        const lengthElement = document.getElementById('lengthScore');
        const pointsElement = document.getElementById('pointsScore');
        
        if (lengthElement) lengthElement.textContent = length;
        if (pointsElement) pointsElement.textContent = score;
    }

    updatePlayersCount(count) {
        const countElement = document.getElementById('playersCount');
        if (countElement) countElement.textContent = count;
    }

    updateLeaderboard(leaderboard) {
        const leaderboardElement = document.getElementById('leaderboard');
        if (!leaderboardElement) return;
        
        leaderboardElement.innerHTML = '';
        
        leaderboard.slice(0, 10).forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'leaderboard-player';
            
            const rank = document.createElement('span');
            rank.className = 'rank';
            rank.textContent = `#${index + 1}`;
            
            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = player.name;
            
            const score = document.createElement('span');
            score.className = 'score';
            score.textContent = player.score;
            
            playerElement.appendChild(rank);
            playerElement.appendChild(name);
            playerElement.appendChild(score);
            
            leaderboardElement.appendChild(playerElement);
        });
    }

    showGameOver(finalScore, finalLength, killedBy) {
        const finalScoreElement = document.getElementById('finalScore');
        const finalLengthElement = document.getElementById('finalLength');
        const killedByElement = document.getElementById('killedBy');
        
        if (finalScoreElement) finalScoreElement.textContent = finalScore;
        if (finalLengthElement) finalLengthElement.textContent = finalLength;
        if (killedByElement) killedByElement.textContent = killedBy || 'Стена';
        
        this.showScreen('gameOver');
    }

    togglePauseScreen() {
        if (this.currentScreen === 'game') {
            this.showScreen('pause');
            if (window.gameEngine) {
                window.gameEngine.pause();
            }
        } else if (this.currentScreen === 'pause') {
            this.resumeGame();
        }
    }

    resumeGame() {
        this.showScreen('game');
        if (window.gameEngine) {
            window.gameEngine.resume();
        }
    }

    backToMenuFromGame() {
        if (window.gameEngine) {
            window.gameEngine.stop();
        }
        this.showScreen('main');
    }

    backToMenuFromGameOver() {
        this.showScreen('main');
    }

    playAgain() {
        this.startGame();
    }

    showHelp() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.classList.remove('hidden');
        }
    }

    hideHelp() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.classList.add('hidden');
        }
    }

    showSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
        }
    }

    hideSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.add('hidden');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Ошибка перехода в полноэкранный режим:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    onConnectionChange(isConnected) {
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            connectionStatus.textContent = isConnected ? 'Подключено' : 'Отключено';
            connectionStatus.className = isConnected ? 'connected' : 'disconnected';
        }
        
        if (!isConnected) {
            this.showNotification('Соединение потеряно. Переподключение...', 'warning');
        } else {
            this.showNotification('Соединение восстановлено!', 'success');
        }
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('snakeWorldSettings') || '{}');
            this.selectedSkin = settings.selectedSkin || 0;
            this.selectedHead = settings.selectedHead || 0;
            this.playerName = settings.playerName || '';
            
            const playerNameInput = document.getElementById('playerName');
            if (playerNameInput) {
                playerNameInput.value = this.playerName;
            }
            
            this.selectSkin(this.selectedSkin);
            this.selectHead(this.selectedHead);
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }

    saveSettings() {
        try {
            const settings = {
                selectedSkin: this.selectedSkin,
                selectedHead: this.selectedHead,
                playerName: this.playerName
            };
            localStorage.setItem('snakeWorldSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
        }
    }
}

window.uiManager = new UIManager(); 
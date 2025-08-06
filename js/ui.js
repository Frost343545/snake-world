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
            { id: 4, name: 'Фиолетовый', color: '#a29bfe', headColor: '#6c5ce7' }
        ];
        
        this.heads = [
            { id: 0, name: 'Обычная', icon: '🐍' },
            { id: 1, name: 'Дракон', icon: '🐉' },
            { id: 2, name: 'Кобра', icon: '🐍' },
            { id: 3, name: 'Череп', icon: '💀' },
            { id: 4, name: 'Корона', icon: '👑' }
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
    }

    createSkinOptions() {
        const skinGrid = document.getElementById('skinGrid');
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
        
        document.querySelector(`[data-skin-id="${this.skins[index].id}"]`).classList.add('selected');
        
        this.selectedSkin = index;
        this.saveSettings();
    }

    selectHead(index) {
        document.querySelectorAll('.head-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelector(`[data-head-id="${this.heads[index].id}"]`).classList.add('selected');
        
        this.selectedHead = index;
        this.saveSettings();
    }

    showScreen(screenName) {
        document.querySelectorAll('.loading-screen, .main-menu, .customize-screen, .game-screen').forEach(screen => {
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
        document.getElementById('lengthScore').textContent = length;
        document.getElementById('pointsScore').textContent = score;
    }

    updatePlayersCount(count) {
        document.getElementById('playersCount').textContent = count;
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
            
            document.getElementById('playerName').value = this.playerName;
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
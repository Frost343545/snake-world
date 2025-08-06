// Главный файл SNAKE WORLD
class GameManager {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('Инициализация SNAKE WORLD...');
            
            this.showLoadingScreen();
            await this.initializeWebSocket();
            this.initializeGameEngine();
            this.setupGlobalEventListeners();
            this.showMainMenu();
            
            this.isInitialized = true;
            console.log('SNAKE WORLD успешно инициализирован!');
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showErrorScreen('Ошибка инициализации игры');
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingText = document.querySelector('.loading-text');
        
        loadingScreen.classList.remove('hidden');
        
        const loadingSteps = [
            'Подключение к серверу...',
            'Загрузка ресурсов...',
            'Инициализация игрового движка...',
            'Готово!'
        ];
        
        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < loadingSteps.length) {
                loadingText.textContent = loadingSteps[currentStep];
                currentStep++;
            } else {
                clearInterval(interval);
            }
        }, 800);
    }

    async initializeWebSocket() {
        try {
            await window.webSocketManager.connect();
            
            window.webSocketManager.onConnectionChange((connected) => {
                if (window.uiManager) {
                    window.uiManager.onConnectionChange(connected);
                }
            });
            
        } catch (error) {
            console.warn('Не удалось подключиться к серверу, игра будет работать в офлайн режиме');
            this.createMockWebSocket();
        }
    }

    createMockWebSocket() {
        window.webSocketManager.isConnected = true;
        
        setInterval(() => {
            if (window.gameEngine && window.gameEngine.isPlaying) {
                this.simulateOtherPlayers();
            }
        }, 2000);
        
        setInterval(() => {
            if (window.gameEngine && window.gameEngine.isPlaying) {
                this.spawnMockFood();
            }
        }, 3000);
    }

    simulateOtherPlayers() {
        if (!window.gameEngine) return;
        
        const mockPlayers = [
            { name: 'Игрок1', color: '#ff6b6b', headColor: '#ff4757' },
            { name: 'Игрок2', color: '#74b9ff', headColor: '#0984e3' },
            { name: 'Игрок3', color: '#00b894', headColor: '#00a085' }
        ];
        
        const randomPlayer = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
        
        const mockPlayerData = {
            id: 'mock_' + Math.random().toString(36).substr(2, 9),
            name: randomPlayer.name,
            color: randomPlayer.color,
            headColor: randomPlayer.headColor,
            x: Math.random() * 4000 + 500,
            y: Math.random() * 4000 + 500,
            radius: 15 + Math.random() * 10,
            score: Math.floor(Math.random() * 1000),
            segments: Array.from({ length: 5 + Math.floor(Math.random() * 10) }, (_, i) => ({
                x: Math.random() * 4000 + 500,
                y: Math.random() * 4000 + 500
            })),
            boost: false
        };
        
        window.gameEngine.addPlayer(mockPlayerData);
    }

    spawnMockFood() {
        if (!window.gameEngine) return;
        
        const foodColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
        const randomColor = foodColors[Math.floor(Math.random() * foodColors.length)];
        
        const mockFoodData = {
            id: 'food_' + Math.random().toString(36).substr(2, 9),
            x: Math.random() * 4000 + 500,
            y: Math.random() * 4000 + 500,
            radius: 5 + Math.random() * 5,
            color: randomColor,
            value: 10 + Math.floor(Math.random() * 20)
        };
        
        window.gameEngine.addFood(mockFoodData);
    }

    initializeGameEngine() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            window.gameEngine = new GameEngine(canvas);
        }
    }

    setupGlobalEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });

        window.addEventListener('resize', () => {
            if (window.gameEngine) {
                window.gameEngine.resizeCanvas();
            }
        });
    }

    showMainMenu() {
        if (window.uiManager) {
            window.uiManager.showScreen('main');
        }
    }

    showErrorScreen(message) {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingContent = document.querySelector('.loading-content');
        
        loadingContent.innerHTML = `
            <h1 class="game-title">SNAKE WORLD</h1>
            <div style="color: #ff6b6b; margin: 2rem 0; font-size: 1.2rem;">
                ${message}
            </div>
            <button onclick="location.reload()" class="menu-btn primary-btn">
                <i class="fas fa-redo"></i> Перезагрузить
            </button>
        `;
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
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Загрузка SNAKE WORLD...');
    window.gameManager = new GameManager();
});

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('Глобальная ошибка:', event.error);
    if (window.uiManager) {
        window.uiManager.showNotification('Произошла ошибка в игре', 'error');
    }
}); 
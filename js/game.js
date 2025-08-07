class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.gameState = 'loading';
        this.player = null;
        this.players = new Map();
        this.foods = new Map();
        this.particles = [];
        this.camera = { x: 0, y: 0 };
        this.mouse = { x: 0, y: 0 };
        this.boost = false;
        
        this.settings = {
            soundEffects: true,
            music: true,
            fullscreen: false
        };
        
        this.stats = {
            length: 0,
            score: 0,
            survivalTime: 0,
            startTime: 0
        };
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        this.setupWebSocket();
        this.loadSettings();
        this.showScreen('loadingScreen');
        
        // Подключение к серверу
        wsClient.connect();
        
        // Запуск игрового цикла
        this.gameLoop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
    }

    setupEventListeners() {
        // Изменение размера окна
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Мышь
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.boost = true;
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.boost = false;
            }
        });
        
        // Кнопки меню
        document.getElementById('playBtn').addEventListener('click', () => {
            this.showScreen('characterSetup');
        });
        
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('exitToMenuBtn').addEventListener('click', () => {
            this.exitToMenu();
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showScreen('settingsScreen');
        });
        
        document.getElementById('pauseSettingsBtn').addEventListener('click', () => {
            this.showScreen('settingsScreen');
        });
        
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        document.getElementById('leaderboardBtn').addEventListener('click', () => {
            this.showLeaderboard();
        });
        
        document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
            this.hideLeaderboard();
        });
        
        document.getElementById('howToPlayBtn').addEventListener('click', () => {
            this.showScreen('howToPlayScreen');
        });
        
        document.getElementById('closeHowToPlayBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        // Выбор скинов и голов
        document.querySelectorAll('.skin-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });
        
        document.querySelectorAll('.head-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.head-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });
        
        // Полноэкранный режим
        document.addEventListener('fullscreenchange', () => {
            this.resizeCanvas();
        });
    }

    setupWebSocket() {
        wsClient.on('connected', () => {
            this.updateLoadingText('Подключено! Нажмите "Играть"');
            this.showScreen('mainMenu');
        });
        
        wsClient.on('disconnected', () => {
            this.updateLoadingText('Соединение потеряно. Переподключение...');
        });
        
        wsClient.on('gameState', (data) => {
            this.updateGameState(data);
        });
        
        wsClient.on('playerJoined', (data) => {
            this.addPlayer(data);
        });
        
        wsClient.on('playerLeft', (data) => {
            this.removePlayer(data.id);
        });
        
        wsClient.on('foodSpawned', (data) => {
            this.addFood(data);
        });
        
        wsClient.on('foodEaten', (data) => {
            this.removeFood(data.id);
            if (data.playerId === this.player?.id) {
                this.playSound('eat');
                this.createEatEffect(data.x, data.y);
            }
        });
        
        wsClient.on('playerDied', (data) => {
            if (data.id === this.player?.id) {
                this.gameOver();
            } else {
                this.removePlayer(data.id);
                this.createDeathEffect(data.x, data.y);
            }
        });
        
        wsClient.on('leaderboardUpdate', (data) => {
            this.updateLeaderboard(data);
        });
        
        wsClient.on('error', (error) => {
            this.showNotification('Ошибка сервера: ' + error.message, 'error');
        });
    }

    updateLoadingText(text) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
        this.gameState = screenId;
    }

    startGame() {
        const playerName = document.getElementById('playerName').value || 'Игрок';
        const selectedSkin = document.querySelector('.skin-option.active').dataset.skin;
        const selectedHead = document.querySelector('.head-option.active').dataset.head;
        
        this.player = {
            id: 'local',
            name: playerName,
            skin: selectedSkin,
            head: selectedHead,
            x: 0,
            y: 0,
            segments: [],
            length: 10,
            score: 0
        };
        
        this.stats.startTime = Date.now();
        this.stats.length = 10;
        this.stats.score = 0;
        
        wsClient.joinGame({
            name: playerName,
            skin: selectedSkin,
            head: selectedHead
        });
        
        this.showScreen('gameScreen');
        this.gameState = 'playing';
        
        if (this.settings.music) {
            document.getElementById('bgMusic').play().catch(() => {});
        }
        
        this.createCustomCursor();
    }

    createCustomCursor() {
        const cursor = document.createElement('div');
        cursor.className = 'game-cursor';
        cursor.id = 'gameCursor';
        document.body.appendChild(cursor);
        
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX - 10 + 'px';
            cursor.style.top = e.clientY - 10 + 'px';
        });
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showScreen('pauseMenu');
        }
    }

    resumeGame() {
        this.gameState = 'playing';
        this.showScreen('gameScreen');
    }

    exitToMenu() {
        wsClient.leaveGame();
        this.gameState = 'menu';
        this.showScreen('mainMenu');
        this.removeCustomCursor();
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.stats.survivalTime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        
        document.getElementById('finalLength').textContent = this.stats.length;
        document.getElementById('finalScore').textContent = this.stats.score;
        document.getElementById('survivalTime').textContent = this.formatTime(this.stats.survivalTime);
        
        this.showScreen('gameOverScreen');
        this.removeCustomCursor();
        
        if (this.settings.soundEffects) {
            document.getElementById('deathSound').play().catch(() => {});
        }
    }

    restartGame() {
        this.showScreen('characterSetup');
    }

    removeCustomCursor() {
        const cursor = document.getElementById('gameCursor');
        if (cursor) {
            cursor.remove();
        }
    }

    updateGameState(data) {
        if (data.players) {
            this.players.clear();
            data.players.forEach(player => {
                this.players.set(player.id, player);
                if (player.id === this.player?.id) {
                    this.player = player;
                    this.stats.length = player.length;
                    this.stats.score = player.score;
                    this.updateHUD();
                }
            });
        }
        
        if (data.foods) {
            this.foods.clear();
            data.foods.forEach(food => {
                this.foods.set(food.id, food);
            });
        }
        
        if (data.playerCount) {
            document.getElementById('playersValue').textContent = data.playerCount;
        }
    }

    addPlayer(player) {
        this.players.set(player.id, player);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    addFood(food) {
        this.foods.set(food.id, food);
    }

    removeFood(foodId) {
        this.foods.delete(foodId);
    }

    updateHUD() {
        document.getElementById('lengthValue').textContent = this.stats.length;
        document.getElementById('scoreValue').textContent = this.stats.score;
    }

    updateLeaderboard(data) {
        const leaderboardList = document.getElementById('leaderboardList');
        const globalLeaderboard = document.getElementById('globalLeaderboard');
        
        if (leaderboardList) {
            leaderboardList.innerHTML = '';
            data.slice(0, 10).forEach((player, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <span class="rank">${index + 1}</span>
                    <span class="name">${player.name}</span>
                    <span class="score">${player.score}</span>
                `;
                leaderboardList.appendChild(item);
            });
        }
        
        if (globalLeaderboard) {
            globalLeaderboard.innerHTML = '';
            data.slice(0, 10).forEach((player, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <span class="rank">${index + 1}</span>
                    <span class="name">${player.name}</span>
                    <span class="score">${player.score}</span>
                `;
                globalLeaderboard.appendChild(item);
            });
        }
    }

    showLeaderboard() {
        wsClient.getLeaderboard();
        this.showScreen('leaderboardScreen');
    }

    hideLeaderboard() {
        this.showScreen('mainMenu');
    }

    loadSettings() {
        const saved = localStorage.getItem('snakeWorldSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Применяем настройки к UI
        document.getElementById('soundEffects').checked = this.settings.soundEffects;
        document.getElementById('music').checked = this.settings.music;
        document.getElementById('fullscreen').checked = this.settings.fullscreen;
    }

    saveSettings() {
        this.settings.soundEffects = document.getElementById('soundEffects').checked;
        this.settings.music = document.getElementById('music').checked;
        this.settings.fullscreen = document.getElementById('fullscreen').checked;
        
        localStorage.setItem('snakeWorldSettings', JSON.stringify(this.settings));
        this.showNotification('Настройки сохранены!', 'success');
        this.showScreen('mainMenu');
    }

    playSound(soundName) {
        if (!this.settings.soundEffects) return;
        
        const audio = document.getElementById(soundName + 'Sound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }

    createEatEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                color: `hsl(${Math.random() * 60 + 120}, 100%, 50%)`
            });
        }
    }

    createDeathEffect(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1,
                color: `hsl(${Math.random() * 60}, 100%, 50%)`
            });
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    gameLoop() {
        if (this.gameState === 'playing' && this.player) {
            // Обновление позиции игрока
            const dx = this.mouse.x - this.canvas.width / 2;
            const dy = this.mouse.y - this.canvas.height / 2;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speed = this.boost ? 8 : 4;
                const angle = Math.atan2(dy, dx);
                
                this.player.x += Math.cos(angle) * speed;
                this.player.y += Math.sin(angle) * speed;
                
                // Отправка позиции на сервер
                wsClient.updatePosition(this.player.x, this.player.y, this.boost);
            }
            
            // Обновление камеры
            this.camera.x = this.player.x - this.canvas.width / 2;
            this.camera.y = this.player.y - this.canvas.height / 2;
        }
        
        // Обновление частиц
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            return particle.life > 0;
        });
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    render() {
        // Очистка канваса
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисование сетки
        this.drawGrid();
        
        // Рисование еды
        this.foods.forEach(food => {
            this.drawFood(food);
        });
        
        // Рисование игроков
        this.players.forEach(player => {
            this.drawPlayer(player);
        });
        
        // Рисование частиц
        this.particles.forEach(particle => {
            this.drawParticle(particle);
        });
        
        // Рисование мини-карты
        this.drawMinimap();
    }

    drawGrid() {
        const gridSize = 50;
        const offsetX = this.camera.x % gridSize;
        const offsetY = this.camera.y % gridSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = -offsetX; x < this.canvas.width + gridSize; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = -offsetY; y < this.canvas.height + gridSize; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawFood(food) {
        const x = food.x - this.camera.x;
        const y = food.y - this.camera.y;
        
        if (x < -20 || x > this.canvas.width + 20 || y < -20 || y > this.canvas.height + 20) {
            return;
        }
        
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Градиент
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(1, '#ffaa00');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Свечение
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawPlayer(player) {
        const x = player.x - this.camera.x;
        const y = player.y - this.camera.y;
        
        if (x < -100 || x > this.canvas.width + 100 || y < -100 || y > this.canvas.height + 100) {
            return;
        }
        
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Рисование сегментов змеи
        if (player.segments && player.segments.length > 0) {
            for (let i = player.segments.length - 1; i >= 0; i--) {
                const segment = player.segments[i];
                const segmentX = segment.x - this.camera.x;
                const segmentY = segment.y - this.camera.y;
                
                if (segmentX < -20 || segmentX > this.canvas.width + 20 || 
                    segmentY < -20 || segmentY > this.canvas.height + 20) {
                    continue;
                }
                
                const size = Math.max(3, 10 - i * 0.3);
                const alpha = Math.max(0.3, 1 - i * 0.1);
                
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = this.getPlayerColor(player, i === 0);
                this.ctx.beginPath();
                this.ctx.arc(segmentX - x, segmentY - y, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Свечение для головы
                if (i === 0) {
                    this.ctx.shadowColor = this.getPlayerColor(player, true);
                    this.ctx.shadowBlur = 15;
                    this.ctx.beginPath();
                    this.ctx.arc(segmentX - x, segmentY - y, size + 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        // Рисование имени игрока
        if (player.name) {
            this.ctx.globalAlpha = 0.8;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, 0, -25);
        }
        
        this.ctx.restore();
    }

    getPlayerColor(player, isHead = false) {
        const colors = {
            default: isHead ? '#00ff88' : '#00cc66',
            rainbow: `hsl(${(Date.now() / 20) % 360}, 100%, 50%)`,
            neon: '#00ff88',
            fire: isHead ? '#ff4400' : '#ff6600'
        };
        
        return colors[player.skin] || colors.default;
    }

    drawParticle(particle) {
        const x = particle.x - this.camera.x;
        const y = particle.y - this.camera.y;
        
        this.ctx.save();
        this.ctx.globalAlpha = particle.life;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3 * particle.life, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawMinimap() {
        this.minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.minimapCtx.fillRect(0, 0, 200, 200);
        
        const scale = 200 / 2000; // Масштаб мини-карты
        
        // Рисование еды на мини-карте
        this.foods.forEach(food => {
            const x = (food.x + 1000) * scale;
            const y = (food.y + 1000) * scale;
            
            this.minimapCtx.fillStyle = '#ffff00';
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(x, y, 2, 0, Math.PI * 2);
            this.minimapCtx.fill();
        });
        
        // Рисование игроков на мини-карте
        this.players.forEach(player => {
            const x = (player.x + 1000) * scale;
            const y = (player.y + 1000) * scale;
            
            this.minimapCtx.fillStyle = player.id === this.player?.id ? '#00ff88' : '#ff0088';
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
            this.minimapCtx.fill();
        });
        
        // Рисование игрока в центре
        if (this.player) {
            const x = (this.player.x + 1000) * scale;
            const y = (this.player.y + 1000) * scale;
            
            this.minimapCtx.strokeStyle = '#00ff88';
            this.minimapCtx.lineWidth = 2;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(x, y, 5, 0, Math.PI * 2);
            this.minimapCtx.stroke();
        }
    }
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.game = new SnakeGame();
}); 
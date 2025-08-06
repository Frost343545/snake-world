// Игровой движок SNAKE WORLD
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.playerId = null;
        
        // Игровые объекты
        this.players = new Map();
        this.foods = new Map();
        this.particles = [];
        
        // Игровые настройки
        this.worldSize = { width: 5000, height: 5000 };
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.mouse = { x: 0, y: 0 };
        
        // Игровое состояние
        this.isPlaying = false;
        this.isPaused = false;
        this.gameStartTime = 0;
        this.lastUpdateTime = 0;
        
        // Настройки рендеринга
        this.gridSize = 50;
        this.backgroundPattern = null;
        
        // Анимации
        this.animations = new Map();
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.createBackgroundPattern();
        this.setupEventListeners();
        this.startGameLoop();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    createBackgroundPattern() {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = this.gridSize;
        patternCanvas.height = this.gridSize;
        const patternCtx = patternCanvas.getContext('2d');
        
        // Создаем сетку
        patternCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        patternCtx.lineWidth = 1;
        patternCtx.beginPath();
        patternCtx.moveTo(0, 0);
        patternCtx.lineTo(this.gridSize, 0);
        patternCtx.lineTo(this.gridSize, this.gridSize);
        patternCtx.stroke();
        
        this.backgroundPattern = this.ctx.createPattern(patternCanvas, 'repeat');
    }

    setupEventListeners() {
        // Обработка мыши
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        // Обработка клавиатуры
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleBoost();
            } else if (e.code === 'Escape') {
                this.togglePause();
            }
        });

        // Обработка касаний для мобильных устройств
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        });
    }

    startGame(playerData) {
        console.log('Starting game with player data:', playerData);
        
        this.playerId = playerData.id;
        this.isPlaying = true;
        this.gameStartTime = Date.now();
        this.lastUpdateTime = Date.now();
        
        // Инициализируем начальные сегменты змеи
        if (!playerData.segments || playerData.segments.length === 0) {
            playerData.segments = [];
            // Создаем начальные сегменты змеи
            for (let i = 0; i < 3; i++) {
                playerData.segments.push({
                    x: playerData.x - i * 20,
                    y: playerData.y
                });
            }
        }
        
        // Устанавливаем начальный радиус если его нет
        if (!playerData.radius) {
            playerData.radius = 15;
        }
        
        // Добавляем игрока в коллекцию
        this.players.set(playerData.id, playerData);
        
        console.log('Player added to collection, total players:', this.players.size);
        console.log('Game state - isPlaying:', this.isPlaying, 'isPaused:', this.isPaused);
        console.log('Player segments:', playerData.segments.length);
        console.log('Player position:', playerData.x, playerData.y);
        console.log('Player ID set to:', this.playerId);
        console.log('Player in collection with ID:', playerData.id);
        
        // Отправляем данные игрока на сервер
        window.webSocketManager.sendPlayerJoin(playerData);
        
        console.log('Игра началась для игрока:', playerData.name);
    }

    stopGame() {
        this.isPlaying = false;
        this.players.clear();
        this.foods.clear();
        this.particles = [];
        
        if (this.playerId) {
            window.webSocketManager.sendPlayerDisconnect();
        }
        
        console.log('Игра остановлена');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (window.uiManager) {
            window.uiManager.togglePauseScreen(this.isPaused);
        }
    }

    pause() {
        this.isPaused = true;
        if (window.uiManager) {
            window.uiManager.showScreen('pause');
        }
    }

    resume() {
        this.isPaused = false;
        if (window.uiManager) {
            window.uiManager.showScreen('game');
        }
    }

    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.lastUpdateTime) {
                this.lastUpdateTime = timestamp;
            }
            
            const deltaTime = timestamp - this.lastUpdateTime;
            this.lastUpdateTime = timestamp;
            
            if (this.isPlaying && !this.isPaused) {
                this.update(deltaTime);
            }
            
            this.render();
            this.updateAnimations(deltaTime);
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }

    update(deltaTime) {
        // Обновляем игрока
        const player = this.players.get(this.playerId);
        if (player) {
            this.updatePlayer(player, deltaTime);
        } else {
            console.warn('Player not found in collection, playerId:', this.playerId);
            console.log('Available players in collection:');
            for (const [id, p] of this.players) {
                console.log('  -', id, ':', p.name);
            }
        }
        
        // Обновляем частицы
        this.updateParticles(deltaTime);
        
        // Обновляем UI
        this.updateUI();
    }

    updatePlayer(player, deltaTime) {
        // Вычисляем направление к мыши
        const worldMouseX = (this.mouse.x - this.centerX) / this.camera.zoom + this.camera.x;
        const worldMouseY = (this.mouse.y - this.centerY) / this.camera.zoom + this.camera.y;
        
        const dx = worldMouseX - player.x;
        const dy = worldMouseY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = player.boost ? 200 : 100; // пикселей в секунду
            const moveDistance = (speed * deltaTime) / 1000;
            
            if (distance > moveDistance) {
                player.x += (dx / distance) * moveDistance;
                player.y += (dy / distance) * moveDistance;
            } else {
                player.x = worldMouseX;
                player.y = worldMouseY;
            }
        }
        
        // Обновляем сегменты змеи
        this.updateSnakeSegments(player);
        
        // Проверяем столкновения
        this.checkCollisions(player);
        
        // Отправляем обновление на сервер
        window.webSocketManager.sendPlayerMove({
            x: player.x,
            y: player.y,
            boost: player.boost
        });
        
        // Обновляем камеру
        this.updateCamera(player);
    }

    updateSnakeSegments(player) {
        const segments = player.segments;
        const segmentDistance = 20;
        
        // Обновляем позиции сегментов
        for (let i = segments.length - 1; i > 0; i--) {
            const current = segments[i];
            const target = segments[i - 1];
            
            const dx = target.x - current.x;
            const dy = target.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > segmentDistance) {
                const moveDistance = distance - segmentDistance;
                current.x += (dx / distance) * moveDistance;
                current.y += (dy / distance) * moveDistance;
            }
        }
        
        // Обновляем голову
        if (segments.length > 0) {
            segments[0].x = player.x;
            segments[0].y = player.y;
        }
    }

    checkCollisions(player) {
        // Проверяем столкновения с едой
        for (const [foodId, food] of this.foods) {
            const dx = player.x - food.x;
            const dy = player.y - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.radius + food.radius) {
                this.collectFood(foodId, food);
            }
        }
        
        // Проверяем столкновения с другими игроками
        for (const [otherId, otherPlayer] of this.players) {
            if (otherId === this.playerId) continue;
            
            const dx = player.x - otherPlayer.x;
            const dy = player.y - otherPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.radius + otherPlayer.radius) {
                // Проверяем, кто кого съедает
                if (player.radius > otherPlayer.radius * 1.1) {
                    this.eatPlayer(otherId, otherPlayer);
                } else if (otherPlayer.radius > player.radius * 1.1) {
                    this.playerEaten(otherPlayer);
                }
            }
        }
    }

    collectFood(foodId, food) {
        // Увеличиваем размер игрока
        const player = this.players.get(this.playerId);
        if (player) {
            player.radius += food.value * 0.1;
            player.score += food.value;
            
            // Добавляем сегмент
            const lastSegment = player.segments[player.segments.length - 1];
            if (lastSegment) {
                player.segments.push({
                    x: lastSegment.x,
                    y: lastSegment.y
                });
            }
            
            // Создаем эффект сбора еды
            this.createFoodCollectionEffect(food.x, food.y, food.color);
        }
        
        // Удаляем еду
        this.foods.delete(foodId);
    }

    eatPlayer(otherId, otherPlayer) {
        // Увеличиваем размер игрока
        const player = this.players.get(this.playerId);
        if (player) {
            player.radius += otherPlayer.radius * 0.1;
            player.score += otherPlayer.score;
            
            // Создаем эффект поедания
            this.createPlayerEatenEffect(otherPlayer.x, otherPlayer.y, otherPlayer.color);
        }
        
        // Удаляем съеденного игрока
        this.players.delete(otherId);
    }

    playerEaten(eater) {
        // Игрок был съеден
        this.createPlayerEatenEffect(this.players.get(this.playerId).x, this.players.get(this.playerId).y, this.players.get(this.playerId).color);
        this.gameOver({ killedBy: eater.name });
    }

    createFoodCollectionEffect(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                maxLife: 1.0,
                color: color,
                size: 3 + Math.random() * 3
            });
        }
    }

    createPlayerEatenEffect(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                maxLife: 1.5,
                color: color,
                size: 4 + Math.random() * 6
            });
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime / 1000;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateCamera(player) {
        // Плавно следуем за игроком
        const targetX = player.x - this.centerX / this.camera.zoom;
        const targetY = player.y - this.centerY / this.camera.zoom;
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
    }

    updateUI() {
        const player = this.players.get(this.playerId);
        if (player && window.uiManager) {
            window.uiManager.updateScore(player.segments.length, player.score);
            window.uiManager.updatePlayersCount(this.players.size);
        }
    }

    handleBoost() {
        const player = this.players.get(this.playerId);
        if (player && player.segments.length > 10) {
            player.boost = true;
            
            // Уменьшаем размер при ускорении
            setTimeout(() => {
                if (player.boost && player.segments.length > 5) {
                    player.segments.pop();
                    player.radius = Math.max(10, player.radius - 0.5);
                }
                player.boost = false;
            }, 100);
            
            window.webSocketManager.sendPlayerBoost({ boost: true });
        }
    }

    render() {
        // Проверяем, что canvas существует и имеет размеры
        if (!this.canvas || !this.ctx) {
            console.error('Canvas or context not available');
            return;
        }
        
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.error('Canvas has zero dimensions');
            return;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Сохраняем контекст
        this.ctx.save();
        
        // Применяем трансформации камеры
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Рендерим фон
        this.renderBackground();
        
        // Рендерим еду
        this.renderFoods();
        
        // Рендерим игроков
        this.renderPlayers();
        
        // Рендерим частицы
        this.renderParticles();
        
        // Восстанавливаем контекст
        this.ctx.restore();
    }

    renderBackground() {
        // Проверяем, что backgroundPattern существует
        if (!this.backgroundPattern) {
            console.warn('Background pattern not created, creating fallback');
            this.createBackgroundPattern();
        }
        
        // Рендерим сетку
        this.ctx.fillStyle = this.backgroundPattern;
        this.ctx.fillRect(0, 0, this.worldSize.width, this.worldSize.height);
        
        // Рендерим границы мира
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.worldSize.width, this.worldSize.height);
    }

    renderFoods() {
        for (const food of this.foods.values()) {
            this.ctx.save();
            
            // Создаем градиент для еды
            const gradient = this.ctx.createRadialGradient(
                food.x, food.y, 0,
                food.x, food.y, food.radius
            );
            gradient.addColorStop(0, food.color);
            gradient.addColorStop(1, this.darkenColor(food.color, 0.5));
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Добавляем блик
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(food.x - food.radius * 0.3, food.y - food.radius * 0.3, food.radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    renderPlayers() {
        for (const player of this.players.values()) {
            this.renderPlayer(player);
        }
    }

    renderPlayer(player) {
        this.ctx.save();
        
        // Рендерим сегменты змеи
        for (let i = player.segments.length - 1; i >= 0; i--) {
            const segment = player.segments[i];
            const segmentRadius = player.radius * (1 - i * 0.02);
            
            if (segmentRadius > 2) {
                // Создаем градиент для сегмента
                const gradient = this.ctx.createRadialGradient(
                    segment.x, segment.y, 0,
                    segment.x, segment.y, segmentRadius
                );
                
                const isHead = i === 0;
                const baseColor = isHead ? player.headColor : player.color;
                
                gradient.addColorStop(0, baseColor);
                gradient.addColorStop(1, this.darkenColor(baseColor, 0.3));
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(segment.x, segment.y, segmentRadius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Добавляем обводку
                this.ctx.strokeStyle = this.darkenColor(baseColor, 0.5);
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                // Добавляем блик для головы
                if (isHead) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    this.ctx.beginPath();
                    this.ctx.arc(segment.x - segmentRadius * 0.3, segment.y - segmentRadius * 0.3, segmentRadius * 0.3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        // Рендерим имя игрока
        if (player.name) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '14px Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - player.radius - 10);
        }
        
        this.ctx.restore();
    }

    renderParticles() {
        for (const particle of this.particles) {
            this.ctx.save();
            
            const alpha = particle.life / particle.maxLife;
            this.ctx.globalAlpha = alpha;
            
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    darkenColor(color, factor) {
        // Простая функция для затемнения цвета
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    }

    updateAnimations(deltaTime) {
        for (const [id, animation] of this.animations) {
            animation.update(deltaTime);
            if (animation.isFinished) {
                this.animations.delete(id);
            }
        }
    }

    // Методы для работы с сервером
    updateGameState(data) {
        // Обновляем состояние игры с сервера
        if (data.players) {
            this.players.clear();
            for (const playerData of data.players) {
                this.players.set(playerData.id, playerData);
            }
        }
        
        if (data.foods) {
            this.foods.clear();
            for (const foodData of data.foods) {
                this.foods.set(foodData.id, foodData);
            }
        }
    }

    addPlayer(playerData) {
        this.players.set(playerData.id, playerData);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    addFood(foodData) {
        this.foods.set(foodData.id, foodData);
    }

    removeFood(foodId) {
        this.foods.delete(foodId);
    }

    gameOver(data) {
        this.isPlaying = false;
        
        const player = this.players.get(this.playerId);
        const survivalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        
        if (window.uiManager) {
            window.uiManager.showGameOver({
                length: player ? player.segments.length : 0,
                score: player ? player.score : 0,
                survivalTime: survivalTime,
                killedBy: data.killedBy
            });
        }
    }
}

// Создаем глобальный экземпляр игрового движка
window.gameEngine = null; 
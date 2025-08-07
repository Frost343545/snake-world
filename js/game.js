// Игровой движок SNAKE WORLD
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Игровое состояние
        this.isPlaying = false;
        this.isPaused = false;
        this.playerId = null;
        this.players = new Map();
        this.foods = new Map();
        this.particles = [];
        this.animations = new Map();
        
        // Размеры мира (увеличено для большего количества игроков)
        this.worldSize = { width: 10000, height: 10000 };
        
        // Камера
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.centerX = 0;
        this.centerY = 0;
        
        // Мышь
        this.mouse = { x: 0, y: 0 };
        
        // Игровые настройки
        this.snakeSpeed = 2.5; // Скорость движения змеи
        this.boostSpeed = 4.0; // Скорость ускорения
        this.boostConsumption = 0.1; // Потребление длины при ускорении
        this.boostRegeneration = 0.05; // Восстановление длины
        
        // Гексагональная сетка
        this.gridSize = 50;
        this.gridOffset = 0;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.createBackgroundPattern();
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
        console.log('Canvas resized:', this.canvas.width, 'x', this.canvas.height);
        console.log('Center:', this.centerX, this.centerY);
    }

    createBackgroundPattern() {
        // Создаем гексагональную сетку как в Slither.io
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = this.gridSize * 2;
        patternCanvas.height = this.gridSize * 2;
        const patternCtx = patternCanvas.getContext('2d');
        
        // Рисуем гексагоны
        patternCtx.strokeStyle = '#1a1a1a';
        patternCtx.lineWidth = 1;
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const x = i * this.gridSize;
                const y = j * this.gridSize;
                
                // Рисуем гексагон
                patternCtx.beginPath();
                for (let k = 0; k < 6; k++) {
                    const angle = (k * Math.PI) / 3;
                    const hexX = x + this.gridSize/2 + Math.cos(angle) * this.gridSize/3;
                    const hexY = y + this.gridSize/2 + Math.sin(angle) * this.gridSize/3;
                    
                    if (k === 0) {
                        patternCtx.moveTo(hexX, hexY);
                    } else {
                        patternCtx.lineTo(hexX, hexY);
                    }
                }
                patternCtx.closePath();
                patternCtx.stroke();
            }
        }
        
        this.backgroundPattern = this.ctx.createPattern(patternCanvas, 'repeat');
    }

    setupEventListeners() {
        // Обработка движения мыши
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        // Обработка касаний для мобильных устройств
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        });

        // Обработка клавиш
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleBoost();
            } else if (e.code === 'Escape') {
                e.preventDefault();
                this.togglePause();
            }
        });

        // Обработка клика для ускорения
        this.canvas.addEventListener('click', (e) => {
            this.handleBoost();
        });
    }

    startGame(playerData) {
        console.log('Starting game with player data:', playerData);
        
        // Проверяем границы мира
        if (playerData.x < 0 || playerData.x > this.worldSize.width || 
            playerData.y < 0 || playerData.y > this.worldSize.height) {
            playerData.x = this.worldSize.width / 2;
            playerData.y = this.worldSize.height / 2;
        }
        
        // Сбрасываем позицию мыши в центр
        this.mouse.x = this.centerX;
        this.mouse.y = this.centerY;
        console.log('Mouse reset to center');
        
        // Добавляем игрока в коллекцию
        this.players.set(playerData.id, playerData);
        this.playerId = playerData.id;
        
        // Создаем начальные сегменты змеи
        if (!playerData.segments || playerData.segments.length === 0) {
            console.log('Creating new segments for player:', playerData.name);
            playerData.segments = [];
            for (let i = 0; i < 3; i++) {
                playerData.segments.push({
                    x: playerData.x - i * 20,
                    y: playerData.y
                });
            }
            console.log('Created segments:', playerData.segments);
        } else {
            console.log('Player already has segments:', playerData.segments);
            // Исправляем сегменты с координатами (0,0)
            for (let segment of playerData.segments) {
                if (segment.x === 0 && segment.y === 0) {
                    segment.x = playerData.x;
                    segment.y = playerData.y;
                }
            }
        }
        
        // Проверяем границы для сегментов
        for (let segment of playerData.segments) {
            if (segment.x < 0) segment.x = 0;
            if (segment.x > this.worldSize.width) segment.x = this.worldSize.width;
            if (segment.y < 0) segment.y = 0;
            if (segment.y > this.worldSize.height) segment.y = this.worldSize.height;
        }
        
        // Устанавливаем камеру на игрока
        this.camera.x = playerData.x - this.centerX;
        this.camera.y = playerData.y - this.centerY;
        
        // Проверяем границы камеры
        const maxX = this.worldSize.width - this.canvas.width;
        const maxY = this.worldSize.height - this.canvas.height;
        
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.x > maxX) this.camera.x = maxX;
        if (this.camera.y < 0) this.camera.y = 0;
        if (this.camera.y > maxY) this.camera.y = maxY;
        
        this.isPlaying = true;
        this.isPaused = false;
        
        console.log('Player added to collection, total players:', this.players.size);
        console.log('Game state - isPlaying:', this.isPlaying, 'isPaused:', this.isPaused);
        
        this.startGameLoop();
        
        console.log('Игра началась для игрока:', playerData.name);
    }

    stopGame() {
        this.isPlaying = false;
        this.players.clear();
        this.foods.clear();
        this.particles = [];
        this.animations.clear();
    }

    togglePause() {
        if (this.isPlaying) {
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                window.uiManager.showPauseScreen();
            } else {
                window.uiManager.hidePauseScreen();
            }
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.lastTime) this.lastTime = timestamp;
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            if (this.isPlaying && !this.isPaused) {
                this.update(deltaTime);
                this.render();
            }

            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }

    update(deltaTime) {
        // Обновляем игрока
        const player = this.players.get(this.playerId);
        if (player) {
            this.updatePlayer(player, deltaTime);
            this.updateSnakeSegments(player);
            this.checkCollisions(player);
        }

        // Обновляем частицы
        this.updateParticles(deltaTime);

        // Обновляем анимации
        this.updateAnimations(deltaTime);

        // Обновляем UI
        this.updateUI();
    }

    updatePlayer(player, deltaTime) {
        // Проверяем, движется ли мышь
        if (this.mouse.x === this.centerX && this.mouse.y === this.centerY) {
            return; // Мышь в центре, не двигаемся
        }

        // Вычисляем направление к мыши
        const worldMouseX = this.mouse.x + this.camera.x;
        const worldMouseY = this.mouse.y + this.camera.y;
        
        const dx = worldMouseX - player.x;
        const dy = worldMouseY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Минимальное расстояние для движения
        if (distance < 10) {
            return;
        }

        // Нормализуем направление
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Определяем скорость движения
        const currentSpeed = player.boost ? this.boostSpeed : this.snakeSpeed;
        const moveDistance = currentSpeed * (deltaTime / 16.67); // Нормализуем к 60 FPS

        // Обновляем позицию головы
        player.x += dirX * moveDistance;
        player.y += dirY * moveDistance;

        // Ограничиваем позицию границами мира
        if (player.x < player.radius) player.x = player.radius;
        if (player.x > this.worldSize.width - player.radius) player.x = this.worldSize.width - player.radius;
        if (player.y < player.radius) player.y = this.worldSize.height - player.radius;
        if (player.y > this.worldSize.height - player.radius) player.y = this.worldSize.height - player.radius;

        // Обновляем камеру
        this.updateCamera(player);

        // Отправляем обновление на сервер
        if (window.websocketManager && window.websocketManager.isConnected()) {
            window.websocketManager.sendPlayerUpdate({
                x: player.x,
                y: player.y,
                boost: player.boost
            });
        }
    }

    updateSnakeSegments(player) {
        if (!player.segments || player.segments.length === 0) return;

        // Проверяем границы для сегментов перед обновлением
        for (let segment of player.segments) {
            if (segment.x < 0) segment.x = 0;
            if (segment.x > this.worldSize.width) segment.x = this.worldSize.width;
            if (segment.y < 0) segment.y = 0;
            if (segment.y > this.worldSize.height) segment.y = this.worldSize.height;
        }

        // Обновляем сегменты (следование за головой)
        for (let i = player.segments.length - 1; i > 0; i--) {
            const current = player.segments[i];
            const target = player.segments[i - 1];
            
            const dx = target.x - current.x;
            const dy = target.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 20) {
                const moveDistance = distance - 20;
                const dirX = dx / distance;
                const dirY = dy / distance;
                
                current.x += dirX * moveDistance * 0.1;
                current.y += dirY * moveDistance * 0.1;
            }
        }

        // Первый сегмент следует за головой
        if (player.segments.length > 0) {
            const firstSegment = player.segments[0];
            const dx = player.x - firstSegment.x;
            const dy = player.y - firstSegment.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 20) {
                const moveDistance = distance - 20;
                const dirX = dx / distance;
                const dirY = dy / distance;
                
                firstSegment.x += dirX * moveDistance * 0.1;
                firstSegment.y += dirY * moveDistance * 0.1;
            }
        }

        // Проверяем границы для сегментов после обновления
        for (let segment of player.segments) {
            if (segment.x < 0) segment.x = 0;
            if (segment.x > this.worldSize.width) segment.x = this.worldSize.width;
            if (segment.y < 0) segment.y = 0;
            if (segment.y > this.worldSize.height) segment.y = this.worldSize.height;
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
            if (otherId === player.id) continue;
            
            // Проверяем столкновение головы с телом другого игрока
            for (let i = 0; i < otherPlayer.segments.length; i++) {
                const segment = otherPlayer.segments[i];
                const dx = player.x - segment.x;
                const dy = player.y - segment.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < player.radius + player.radius * 0.8) {
                    // Игрок съел другого игрока
                    this.eatPlayer(otherId, otherPlayer);
                    break;
                }
            }
        }
    }

    collectFood(foodId, food) {
        // Увеличиваем размер игрока
        const player = this.players.get(this.playerId);
        if (player) {
            player.radius += 0.5;
            player.score += 10;
            
            // Добавляем новый сегмент
            if (player.segments.length > 0) {
                const lastSegment = player.segments[player.segments.length - 1];
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
        
        // Отправляем на сервер
        if (window.websocketManager) {
            window.websocketManager.sendFoodCollected(foodId);
        }
    }

    eatPlayer(otherId, otherPlayer) {
        const player = this.players.get(this.playerId);
        if (player) {
            // Увеличиваем размер за счет съеденного игрока
            const bonusSize = otherPlayer.radius * 0.5;
            player.radius += bonusSize;
            player.score += otherPlayer.score;
            
            // Добавляем сегменты от съеденного игрока
            const segmentsToAdd = Math.floor(otherPlayer.segments.length * 0.3);
            for (let i = 0; i < segmentsToAdd; i++) {
                if (player.segments.length > 0) {
                    const lastSegment = player.segments[player.segments.length - 1];
                    player.segments.push({
                        x: lastSegment.x,
                        y: lastSegment.y
                    });
                }
            }
            
            // Создаем эффект съедения игрока
            this.createPlayerEatenEffect(otherPlayer.x, otherPlayer.y, otherPlayer.color);
        }
        
        // Удаляем съеденного игрока
        this.players.delete(otherId);
        
        // Отправляем на сервер
        if (window.websocketManager) {
            window.websocketManager.sendPlayerEaten(otherId);
        }
    }

    playerEaten(eater) {
        // Игрок был съеден
        this.createPlayerEatenEffect(this.players.get(this.playerId).x, this.players.get(this.playerId).y, this.players.get(this.playerId).color);
        this.stopGame();
        window.uiManager.showGameOver();
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
                color: color,
                size: 3 + Math.random() * 3,
                life: 60,
                maxLife: 60
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
                color: color,
                size: 4 + Math.random() * 4,
                life: 90,
                maxLife: 90
            });
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateCamera(player) {
        // Плавное следование камеры за игроком
        const targetX = player.x - this.centerX;
        const targetY = player.y - this.centerY;
        
        const cameraSpeed = 0.1;
        this.camera.x += (targetX - this.camera.x) * cameraSpeed;
        this.camera.y += (targetY - this.camera.y) * cameraSpeed;
        
        // Ограничиваем камеру границами мира
        const maxX = this.worldSize.width - this.canvas.width;
        const maxY = this.worldSize.height - this.canvas.height;
        
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.x > maxX) this.camera.x = maxX;
        if (this.camera.y < 0) this.camera.y = 0;
        if (this.camera.y > maxY) this.camera.y = maxY;
    }

    updateUI() {
        const player = this.players.get(this.playerId);
        if (player) {
            window.uiManager.updateScore(player.segments.length, player.score);
            window.uiManager.updatePlayersCount(this.players.size);
        }
    }

    handleBoost() {
        const player = this.players.get(this.playerId);
        if (player && player.segments.length > 3) {
            player.boost = true;
            
            // Уменьшаем длину при ускорении
            if (player.segments.length > 3) {
                player.segments.pop();
            }
            
            // Отправляем на сервер
            if (window.websocketManager) {
                window.websocketManager.sendBoost(true);
            }
            
            // Сбрасываем ускорение через некоторое время
            setTimeout(() => {
                if (player) {
                    player.boost = false;
                    if (window.websocketManager) {
                        window.websocketManager.sendBoost(false);
                    }
                }
            }, 200);
        }
    }

    render() {
        // Очищаем канвас
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Применяем трансформации камеры
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Рендерим фон
        this.renderBackground();
        
        // Рендерим еду
        this.renderFoods();
        
        // Рендерим игроков
        this.renderPlayers();
        
        // Рендерим частицы
        this.renderParticles();
        
        this.ctx.restore();
    }

    renderBackground() {
        // Рендерим гексагональную сетку
        if (this.backgroundPattern) {
            this.ctx.fillStyle = this.backgroundPattern;
            this.ctx.fillRect(0, 0, this.worldSize.width, this.worldSize.height);
        }
        
        // Добавляем темный фон
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.worldSize.width, this.worldSize.height);
        
        console.log('Background rendered, world size:', this.worldSize.width, 'x', this.worldSize.height);
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
            
            // Добавляем свечение
            this.ctx.shadowColor = food.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.radius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    renderPlayers() {
        console.log('=== РЕНДЕРИНГ ИГРОКОВ ===');
        console.log('Всего игроков в коллекции:', this.players.size);
        
        for (const [id, player] of this.players) {
            console.log('Рендерим игрока:', player.name, 'ID:', id);
            console.log('Позиция игрока:', player.x, player.y);
            console.log('Сегменты:', player.segments.length);
            console.log('Радиус:', player.radius);
            console.log('Камера:', this.camera.x, this.camera.y);
            
            const screenX = player.x - this.camera.x;
            const screenY = player.y - this.camera.y;
            console.log('Позиция на экране:', screenX, screenY);
            console.log('Размеры экрана:', this.canvas.width, this.canvas.height);
            
            // Проверяем, находится ли игрок в видимой области
            if (screenX + player.radius > 0 && screenX - player.radius < this.canvas.width &&
                screenY + player.radius > 0 && screenY - player.radius < this.canvas.height) {
                
                console.log('Начинаем рендеринг игрока:', player.name);
                this.renderPlayer(player);
            }
        }
        
        console.log('Render completed - Players:', this.players.size, 'Camera:', this.camera.x, this.camera.y, 'Player ID:', this.playerId);
    }

    renderPlayer(player) {
        this.ctx.save();
        
        console.log('Начинаем рендеринг игрока:', player.name);
        console.log('Сегменты для рендеринга:', player.segments.length);
        
        // Массив иконок голов
        const headIcons = [
            '🐍', '🐉', '⚔️', '💀', '🎓', '💎', '⛑️', '🪬', '👑', '👼', '😈', '🤖'
        ];
        
        // Рендерим сегменты змеи
        for (let i = player.segments.length - 1; i >= 0; i--) {
            const segment = player.segments[i];
            const segmentRadius = player.radius * (1 - i * 0.02);
            
            console.log(`Сегмент ${i}:`, segment.x, segment.y, 'радиус:', segmentRadius);
            
            if (segmentRadius > 2) {
                const isHead = i === 0;
                const baseColor = isHead ? player.headColor : player.color;
                
                // Для головы рисуем иконку, для остальных сегментов - круг
                if (isHead && player.headType !== undefined && headIcons[player.headType]) {
                    // Рендерим иконку головы
                    this.ctx.font = `${segmentRadius * 1.5}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(headIcons[player.headType], segment.x, segment.y);
                    
                    console.log(`Голова отрендерена с иконкой:`, headIcons[player.headType], 'headType:', player.headType);
                } else {
                    // Создаем градиент для сегмента
                    const gradient = this.ctx.createRadialGradient(
                        segment.x, segment.y, 0,
                        segment.x, segment.y, segmentRadius
                    );
                    
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
                    
                    // Добавляем блик для головы (если нет иконки)
                    if (isHead && (player.headType === undefined || !headIcons[player.headType])) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                        this.ctx.beginPath();
                        this.ctx.arc(segment.x - segmentRadius * 0.3, segment.y - segmentRadius * 0.3, segmentRadius * 0.3, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
                
                console.log(`Сегмент ${i} отрендерен с цветом:`, baseColor);
            } else {
                console.log(`Сегмент ${i} слишком маленький, пропускаем`);
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
        console.log('Рендеринг игрока завершен');
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
        console.log('updateGameState called with:', data);
        
        if (data.players) {
            console.log('Updating players, count:', data.players.length);
            
            // Очищаем старых игроков
            this.players.clear();
            
            // Добавляем новых игроков
            for (const playerData of data.players) {
                console.log('Current player before update:', playerData.name);
                
                // Проверяем, есть ли у игрока сегменты
                if (!playerData.segments || playerData.segments.length === 0) {
                    playerData.segments = [
                        { x: playerData.x, y: playerData.y },
                        { x: playerData.x - 20, y: playerData.y },
                        { x: playerData.x - 40, y: playerData.y }
                    ];
                }
                
                // Исправляем сегменты с координатами (0,0)
                for (let segment of playerData.segments) {
                    if (segment.x === 0 && segment.y === 0) {
                        segment.x = playerData.x;
                        segment.y = playerData.y;
                    }
                }
                
                this.players.set(playerData.id, playerData);
                console.log('Added player to collection:', playerData.id, playerData.name, 'at', playerData.x, playerData.y);
                
                // Обновляем playerId если это наш игрок
                if (playerData.name === this.players.get(this.playerId)?.name) {
                    console.log('Player ID updated from', this.playerId, 'to', playerData.id);
                    this.playerId = playerData.id;
                }
            }
            
            console.log('Final player collection size:', this.players.size);
        }
        
        if (data.foods) {
            this.foods.clear();
            for (const food of data.foods) {
                this.foods.set(food.id, food);
            }
        }
        
        console.log('Received playerData for ID:', data.playerId, 'Segments:', data.segments);
        
        // Исправляем сегменты с координатами (0,0) если они пришли с сервера
        if (data.segments) {
            for (let segment of data.segments) {
                if (segment.x === 0 && segment.y === 0) {
                    segment.x = data.x || 0;
                    segment.y = data.y || 0;
                }
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
        this.stopGame();
        window.uiManager.showGameOver(data.finalScore, data.finalLength, data.killedBy);
    }
}

// Создаем глобальный экземпляр игрового движка
window.gameEngine = null; 
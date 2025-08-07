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
        this.worldSize = { width: 10000, height: 10000 };
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
        
        // ИСПРАВЛЕНИЕ: Устанавливаем игрока в центр мира если координаты некорректные
        if (playerData.x < 0 || playerData.x > this.worldSize.width || 
            playerData.y < 0 || playerData.y > this.worldSize.height) {
            console.log('Исправляем позицию игрока - устанавливаем в центр мира');
            playerData.x = this.worldSize.width / 2;
            playerData.y = this.worldSize.height / 2;
        }
        
        // Инициализируем начальные сегменты змеи
        if (!playerData.segments || playerData.segments.length === 0) {
            console.log('Creating new segments for player:', playerData.name);
            playerData.segments = [];
            // Создаем начальные сегменты змеи (все в одной точке для начала)
            for (let i = 0; i < 3; i++) {
                playerData.segments.push({
                    x: playerData.x,
                    y: playerData.y
                });
            }
            console.log('Created segments:', playerData.segments);
        } else {
            console.log('Player already has segments:', playerData.segments);
            // ИСПРАВЛЕНИЕ: Проверяем и исправляем сегменты с координатами (0,0)
            for (let i = 0; i < playerData.segments.length; i++) {
                const segment = playerData.segments[i];
                if (segment.x === 0 && segment.y === 0) {
                    console.log('Fixing segment', i, 'with coordinates (0,0)');
                    segment.x = playerData.x;
                    segment.y = playerData.y;
                }
            }
        }
        
        // ИСПРАВЛЕНИЕ: Проверяем, что все сегменты находятся в пределах мира
        for (const segment of playerData.segments) {
            if (segment.x < 0) segment.x = 0;
            if (segment.y < 0) segment.y = 0;
            if (segment.x > this.worldSize.width) segment.x = this.worldSize.width;
            if (segment.y > this.worldSize.height) segment.y = this.worldSize.height;
        }
        
        // Устанавливаем начальный радиус если его нет
        if (!playerData.radius) {
            playerData.radius = 15;
        }
        
        // Добавляем игрока в коллекцию
        this.players.set(playerData.id, playerData);
        
        // ИСПРАВЛЕНИЕ: Правильно устанавливаем камеру на игрока (упрощенная версия)
        this.camera.x = playerData.x - this.centerX;
        this.camera.y = playerData.y - this.centerY;
        
        // Ограничиваем камеру в пределах мира при инициализации
        const maxX = this.worldSize.width - this.canvas.width;
        const maxY = this.worldSize.height - this.canvas.height;
        
        this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
        this.camera.y = Math.max(0, Math.min(maxY, this.camera.y));
        
        // ИСПРАВЛЕНИЕ: Сбрасываем позицию мыши
        this.mouse.x = this.centerX;
        this.mouse.y = this.centerY;
        
        console.log('Player added to collection, total players:', this.players.size);
        console.log('Game state - isPlaying:', this.isPlaying, 'isPaused:', this.isPaused);
        console.log('Player segments:', playerData.segments.length);
        console.log('Player position:', playerData.x, playerData.y);
        console.log('Player ID set to:', this.playerId);
        console.log('Player in collection with ID:', playerData.id);
        console.log('Camera set to:', this.camera.x, this.camera.y);
        console.log('Mouse reset to center:', this.mouse.x, this.mouse.y);
        
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
        // ИСПРАВЛЕННАЯ ЛОГИКА: Убираем дёргание змеи
        
        // Получаем позицию курсора в мировых координатах
        const worldMouseX = this.mouse.x + this.camera.x;
        const worldMouseY = this.mouse.y + this.camera.y;
        
        // Вычисляем направление к курсору
        const dx = worldMouseX - player.x;
        const dy = worldMouseY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // ИСПРАВЛЕНИЕ: Проверяем, что мышь действительно двигалась и не в центре
        if (this.mouse.x === this.centerX && this.mouse.y === this.centerY) {
            return; // Не двигаем игрока, если мышь в центре (не двигалась)
        }
        
        // ИСПРАВЛЕНИЕ: Увеличиваем минимальное расстояние для движения
        if (distance < 10) {
            return; // Не двигаемся, если курсор слишком близко
        }
        
        // Нормализуем вектор направления
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Вычисляем скорость движения
        const speed = player.boost ? 300 : 150; // пикселей в секунду
        const moveDistance = (speed * deltaTime) / 1000;
        
        // Двигаем игрока в направлении курсора
        player.x += dirX * moveDistance;
        player.y += dirY * moveDistance;
        
        // Ограничиваем игрока в пределах мира
        player.x = Math.max(player.radius, Math.min(this.worldSize.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(this.worldSize.height - player.radius, player.y));
        
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
        
        // ИСПРАВЛЕНИЕ: Проверяем, что все сегменты находятся в пределах мира
        for (const segment of segments) {
            if (segment.x < 0) segment.x = 0;
            if (segment.y < 0) segment.y = 0;
            if (segment.x > this.worldSize.width) segment.x = this.worldSize.width;
            if (segment.y > this.worldSize.height) segment.y = this.worldSize.height;
        }
        
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
        
        // ИСПРАВЛЕНИЕ: Еще раз проверяем границы после обновления
        for (const segment of segments) {
            if (segment.x < 0) segment.x = 0;
            if (segment.y < 0) segment.y = 0;
            if (segment.x > this.worldSize.width) segment.x = this.worldSize.width;
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
        // ИСПРАВЛЕНИЕ: Упрощенная логика камеры
        // Вычисляем целевую позицию камеры (центрируем игрока на экране)
        const targetX = player.x - this.centerX;
        const targetY = player.y - this.centerY;
        
        // Ограничиваем камеру в пределах мира
        const maxX = this.worldSize.width - this.canvas.width;
        const maxY = this.worldSize.height - this.canvas.height;
        
        const clampedTargetX = Math.max(0, Math.min(maxX, targetX));
        const clampedTargetY = Math.max(0, Math.min(maxY, targetY));
        
        // Плавное следование камеры
        const cameraSpeed = 0.1;
        this.camera.x += (clampedTargetX - this.camera.x) * cameraSpeed;
        this.camera.y += (clampedTargetY - this.camera.y) * cameraSpeed;
        
        console.log('Camera update - Player:', player.x, player.y, 'Target:', clampedTargetX, clampedTargetY, 'Camera:', this.camera.x, this.camera.y);
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
        
        // Применяем трансформации камеры (упрощенная версия)
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
        console.log('=== РЕНДЕРИНГ ИГРОКОВ ===');
        console.log('Всего игроков в коллекции:', this.players.size);
        
        for (const player of this.players.values()) {
            console.log('Рендерим игрока:', player.name, 'ID:', player.id);
            console.log('Позиция игрока:', player.x, player.y);
            console.log('Сегменты:', player.segments.length);
            console.log('Радиус:', player.radius);
            console.log('Камера:', this.camera.x, this.camera.y);
            
            // Проверяем, находится ли игрок в видимой области
            const screenX = player.x - this.camera.x;
            const screenY = player.y - this.camera.y;
            console.log('Позиция на экране:', screenX, screenY);
            console.log('Размеры экрана:', this.canvas.width, this.canvas.height);
            
            this.renderPlayer(player);
        }
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
        // Обновляем состояние игры с сервера
        if (data.players) {
            // Сохраняем текущего игрока перед очисткой
            const currentPlayer = this.players.get(this.playerId);
            
            this.players.clear();
            for (const playerData of data.players) {
                console.log('Received playerData for ID:', playerData.id, 'Segments:', playerData.segments);
                
                // ИСПРАВЛЕНИЕ: Проверяем и исправляем сегменты с координатами (0,0)
                if (playerData.segments) {
                    for (let i = 0; i < playerData.segments.length; i++) {
                        const segment = playerData.segments[i];
                        if (segment.x === 0 && segment.y === 0) {
                            console.log('Fixing segment', i, 'with coordinates (0,0) in updateGameState');
                            segment.x = playerData.x;
                            segment.y = playerData.y;
                        }
                    }
                }
                
                this.players.set(playerData.id, playerData);
                
                // ИСПРАВЛЕНИЕ: Обновляем playerId если это наш игрок
                if (currentPlayer && playerData.name === currentPlayer.name) {
                    console.log('Обновляем playerId с', this.playerId, 'на', playerData.id);
                    this.playerId = playerData.id;
                }
            }
            
            // ИСПРАВЛЕНИЕ: Если playerId не найден, но есть игроки, берем первого
            if (!this.players.has(this.playerId) && this.players.size > 0) {
                const firstPlayer = this.players.values().next().value;
                console.log('PlayerId не найден, устанавливаем первого игрока:', firstPlayer.id);
                this.playerId = firstPlayer.id;
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
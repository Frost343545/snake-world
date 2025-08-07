const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Настройки безопасности
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:"]
        }
    }
}));

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Игровые данные
const gameState = {
    players: new Map(),
    foods: new Map(),
    foodId: 0,
    worldSize: 2000,
    maxFood: 100
};

// Генерация случайной позиции в мире
function randomPosition() {
    return {
        x: (Math.random() - 0.5) * gameState.worldSize,
        y: (Math.random() - 0.5) * gameState.worldSize
    };
}

// Генерация еды
function spawnFood() {
    if (gameState.foods.size < gameState.maxFood) {
        const position = randomPosition();
        const food = {
            id: gameState.foodId++,
            x: position.x,
            y: position.y,
            type: Math.random() > 0.8 ? 'special' : 'normal'
        };
        gameState.foods.set(food.id, food);
        
        // Уведомляем всех игроков о новой еде
        broadcast({
            type: 'foodSpawned',
            data: food
        });
    }
}

// Отправка сообщения всем подключенным клиентам
function broadcast(message, exclude = null) {
    wss.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Отправка состояния игры конкретному игроку
function sendGameState(ws) {
    const state = {
        type: 'gameState',
        data: {
            players: Array.from(gameState.players.values()),
            foods: Array.from(gameState.foods.values()),
            playerCount: gameState.players.size
        }
    };
    ws.send(JSON.stringify(state));
}

// Проверка столкновений
function checkCollisions() {
    const players = Array.from(gameState.players.values());
    
    for (let i = 0; i < players.length; i++) {
        const player1 = players[i];
        
        // Проверка столкновения с едой
        gameState.foods.forEach((food, foodId) => {
            const distance = Math.sqrt(
                Math.pow(player1.x - food.x, 2) + Math.pow(player1.y - food.y, 2)
            );
            
            if (distance < 15) {
                // Игрок съел еду
                gameState.foods.delete(foodId);
                player1.length += 1;
                player1.score += food.type === 'special' ? 10 : 1;
                
                // Уведомляем всех о съеденной еде
                broadcast({
                    type: 'foodEaten',
                    data: { id: foodId, playerId: player1.id, x: food.x, y: food.y }
                });
                
                // Спавним новую еду
                setTimeout(spawnFood, 100);
            }
        });
        
        // Проверка столкновения с другими игроками
        for (let j = i + 1; j < players.length; j++) {
            const player2 = players[j];
            
            if (player1.segments && player2.segments) {
                // Проверка столкновения головы с сегментами
                const headCollision = checkHeadSegmentCollision(player1, player2) ||
                                    checkHeadSegmentCollision(player2, player1);
                
                if (headCollision) {
                    // Определяем победителя (больший игрок)
                    const winner = player1.length > player2.length ? player1 : player2;
                    const loser = player1.length > player2.length ? player2 : player1;
                    
                    // Увеличиваем счет победителя
                    winner.score += Math.floor(loser.length / 2);
                    
                    // Удаляем проигравшего
                    gameState.players.delete(loser.id);
                    
                    // Уведомляем о смерти игрока
                    broadcast({
                        type: 'playerDied',
                        data: { id: loser.id, x: loser.x, y: loser.y, killedBy: winner.id }
                    });
                    
                    // Уведомляем о выходе игрока
                    broadcast({
                        type: 'playerLeft',
                        data: { id: loser.id, name: loser.name }
                    });
                }
            }
        }
    }
}

// Проверка столкновения головы с сегментами
function checkHeadSegmentCollision(headPlayer, segmentPlayer) {
    if (!headPlayer.segments || !segmentPlayer.segments) return false;
    
    const headX = headPlayer.x;
    const headY = headPlayer.y;
    const headRadius = 10;
    
    // Проверяем только сегменты (не голову)
    for (let i = 5; i < segmentPlayer.segments.length; i++) {
        const segment = segmentPlayer.segments[i];
        const distance = Math.sqrt(
            Math.pow(headX - segment.x, 2) + Math.pow(headY - segment.y, 2)
        );
        
        if (distance < headRadius + 5) {
            return true;
        }
    }
    
    return false;
}

// Обновление позиций игроков
function updatePlayerPositions() {
    gameState.players.forEach(player => {
        if (player.segments && player.segments.length > 0) {
            // Обновляем сегменты змеи
            const newSegments = [];
            let currentX = player.x;
            let currentY = player.y;
            
            for (let i = 0; i < player.length; i++) {
                if (i < player.segments.length) {
                    const segment = player.segments[i];
                    newSegments.push({
                        x: segment.x + (currentX - segment.x) * 0.1,
                        y: segment.y + (currentY - segment.y) * 0.1
                    });
                    currentX = segment.x;
                    currentY = segment.y;
                } else {
                    newSegments.push({ x: currentX, y: currentY });
                }
            }
            
            player.segments = newSegments;
        } else {
            // Инициализируем сегменты для нового игрока
            player.segments = [];
            for (let i = 0; i < player.length; i++) {
                player.segments.push({ x: player.x, y: player.y });
            }
        }
    });
}

// Обновление таблицы лидеров
function updateLeaderboard() {
    const players = Array.from(gameState.players.values());
    const leaderboard = players
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(player => ({
            id: player.id,
            name: player.name,
            score: player.score,
            length: player.length
        }));
    
    broadcast({
        type: 'leaderboardUpdate',
        data: leaderboard
    });
}

// Игровой цикл
setInterval(() => {
    updatePlayerPositions();
    checkCollisions();
    updateLeaderboard();
}, 50);

// Спавн еды каждые 2 секунды
setInterval(spawnFood, 2000);

// Инициализация начальной еды
for (let i = 0; i < 50; i++) {
    spawnFood();
}

// WebSocket обработчики
wss.on('connection', (ws) => {
    console.log('Новое подключение');
    
    let player = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'joinGame':
                    player = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        name: data.data.name || 'Игрок',
                        skin: data.data.skin || 'default',
                        head: data.data.head || 'default',
                        x: (Math.random() - 0.5) * gameState.worldSize,
                        y: (Math.random() - 0.5) * gameState.worldSize,
                        length: 10,
                        score: 0,
                        segments: []
                    };
                    
                    gameState.players.set(player.id, player);
                    
                    // Отправляем текущее состояние игры
                    sendGameState(ws);
                    
                    // Уведомляем других игроков
                    broadcast({
                        type: 'playerJoined',
                        data: { id: player.id, name: player.name }
                    });
                    
                    console.log(`Игрок ${player.name} присоединился`);
                    break;
                    
                case 'updatePosition':
                    if (player) {
                        player.x = data.data.x;
                        player.y = data.data.y;
                        player.boost = data.data.boost;
                        
                        // Обновляем сегменты при движении
                        if (player.boost && player.length > 5) {
                            player.length -= 0.1;
                        }
                    }
                    break;
                    
                case 'leaveGame':
                    if (player) {
                        gameState.players.delete(player.id);
                        broadcast({
                            type: 'playerLeft',
                            data: { id: player.id, name: player.name }
                        });
                        console.log(`Игрок ${player.name} покинул игру`);
                        player = null;
                    }
                    break;
                    
                case 'getLeaderboard':
                    const players = Array.from(gameState.players.values());
                    const leaderboard = players
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 10)
                        .map(p => ({
                            id: p.id,
                            name: p.name,
                            score: p.score,
                            length: p.length
                        }));
                    
                    ws.send(JSON.stringify({
                        type: 'leaderboardUpdate',
                        data: leaderboard
                    }));
                    break;
                    
                case 'pong':
                    // Обработка пинга для проверки соединения
                    break;
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Ошибка обработки сообщения' }
            }));
        }
    });
    
    ws.on('close', () => {
        if (player) {
            gameState.players.delete(player.id);
            broadcast({
                type: 'playerLeft',
                data: { id: player.id, name: player.name }
            });
            console.log(`Игрок ${player.name} отключился`);
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket ошибка:', error);
    });
});

// Маршруты API
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        players: gameState.players.size,
        foods: gameState.foods.size,
        uptime: process.uptime()
    });
});

app.get('/api/leaderboard', (req, res) => {
    const players = Array.from(gameState.players.values());
    const leaderboard = players
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(player => ({
            name: player.name,
            score: player.score,
            length: player.length
        }));
    
    res.json(leaderboard);
});

// Обработка всех остальных маршрутов (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Что-то пошло не так!' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Игра доступна по адресу: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Получен сигнал SIGTERM, закрываем сервер...');
    server.close(() => {
        console.log('Сервер закрыт');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Получен сигнал SIGINT, закрываем сервер...');
    server.close(() => {
        console.log('Сервер закрыт');
        process.exit(0);
    });
}); 
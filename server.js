const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Настройки CORS
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Игровое состояние
const gameState = {
    players: new Map(),
    foods: new Map(),
    worldSize: { width: 5000, height: 5000 },
    maxFood: 100
};

// Генерация ID
let nextPlayerId = 1;
let nextFoodId = 1;

// Создаем начальную еду
function spawnInitialFood() {
    for (let i = 0; i < gameState.maxFood; i++) {
        spawnFood();
    }
}

function spawnFood() {
    const food = {
        id: `food_${nextFoodId++}`,
        x: Math.random() * gameState.worldSize.width,
        y: Math.random() * gameState.worldSize.height,
        radius: 3 + Math.random() * 7,
        color: getRandomFoodColor(),
        value: 5 + Math.floor(Math.random() * 25)
    };
    
    gameState.foods.set(food.id, food);
    return food;
}

function getRandomFoodColor() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#fd79a8', '#a29bfe'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Обработка WebSocket соединений
wss.on('connection', (ws) => {
    console.log('Новое подключение');
    
    let playerId = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'playerJoin':
                    handlePlayerJoin(ws, data.data);
                    break;
                case 'playerMove':
                    handlePlayerMove(playerId, data.data);
                    break;
                case 'playerBoost':
                    handlePlayerBoost(playerId, data.data);
                    break;
                case 'playerDisconnect':
                    handlePlayerDisconnect(playerId);
                    break;
                case 'pong':
                    // Игнорируем pong
                    break;
                default:
                    console.log('Неизвестный тип сообщения:', data.type);
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
        }
    });
    
    ws.on('close', () => {
        if (playerId) {
            handlePlayerDisconnect(playerId);
        }
        console.log('Соединение закрыто');
    });
    
    function handlePlayerJoin(ws, playerData) {
        playerId = `player_${nextPlayerId++}`;
        
        const player = {
            id: playerId,
            name: playerData.name || 'Игрок',
            color: playerData.color || '#4ecdc4',
            headColor: playerData.headColor || '#45b7d1',
            headType: playerData.headType || 0,
            x: playerData.x || Math.random() * gameState.worldSize.width,
            y: playerData.y || Math.random() * gameState.worldSize.height,
            radius: playerData.radius || 15,
            score: 0,
            segments: playerData.segments || [
                { x: 0, y: 0 },
                { x: -20, y: 0 },
                { x: -40, y: 0 }
            ],
            boost: false,
            ws: ws
        };
        
        gameState.players.set(playerId, player);
        
        // Отправляем текущее состояние игры новому игроку
        ws.send(JSON.stringify({
            type: 'gameState',
            data: {
                players: Array.from(gameState.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    color: p.color,
                    headColor: p.headColor,
                    headType: p.headType,
                    x: p.x,
                    y: p.y,
                    radius: p.radius,
                    score: p.score,
                    segments: p.segments,
                    boost: p.boost
                })),
                foods: Array.from(gameState.foods.values())
            }
        }));
        
        // Уведомляем всех о новом игроке
        broadcastToAll({
            type: 'playerJoined',
            data: {
                id: player.id,
                name: player.name,
                color: player.color,
                headColor: player.headColor,
                headType: player.headType,
                x: player.x,
                y: player.y,
                radius: player.radius,
                score: player.score,
                segments: player.segments,
                boost: player.boost
            }
        }, ws);
        
        console.log(`Игрок ${player.name} присоединился`);
    }
    
    function handlePlayerMove(id, moveData) {
        const player = gameState.players.get(id);
        if (player) {
            player.x = moveData.x;
            player.y = moveData.y;
            player.boost = moveData.boost || false;
            
            // Обновляем сегменты
            if (player.segments.length > 0) {
                player.segments[0].x = moveData.x;
                player.segments[0].y = moveData.y;
            }
            
            // Проверяем столкновения
            checkCollisions(player);
            
            // Отправляем обновление всем игрокам
            broadcastToAll({
                type: 'gameState',
                data: {
                    players: Array.from(gameState.players.values()).map(p => ({
                        id: p.id,
                        name: p.name,
                        color: p.color,
                        headColor: p.headColor,
                        headType: p.headType,
                        x: p.x,
                        y: p.y,
                        radius: p.radius,
                        score: p.score,
                        segments: p.segments,
                        boost: p.boost
                    }))
                }
            });
        }
    }
    
    function handlePlayerBoost(id, boostData) {
        const player = gameState.players.get(id);
        if (player) {
            player.boost = boostData.boost;
        }
    }
    
    function handlePlayerDisconnect(id) {
        const player = gameState.players.get(id);
        if (player) {
            gameState.players.delete(id);
            
            broadcastToAll({
                type: 'playerLeft',
                data: {
                    id: player.id,
                    name: player.name
                }
            });
            
            console.log(`Игрок ${player.name} покинул игру`);
        }
    }
});

function checkCollisions(player) {
    // Проверяем столкновения с едой
    for (const [foodId, food] of gameState.foods) {
        const dx = player.x - food.x;
        const dy = player.y - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + food.radius) {
            // Игрок съел еду
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
            
            // Удаляем еду
            gameState.foods.delete(foodId);
            
            // Создаем новую еду
            const newFood = spawnFood();
            
            // Уведомляем всех о съеденной еде
            broadcastToAll({
                type: 'foodCollected',
                data: { id: foodId }
            });
            
            // Уведомляем о новой еде
            broadcastToAll({
                type: 'foodSpawned',
                data: newFood
            });
            
            break;
        }
    }
    
    // Проверяем столкновения с другими игроками
    for (const [otherId, otherPlayer] of gameState.players) {
        if (otherId === player.id) continue;
        
        const dx = player.x - otherPlayer.x;
        const dy = player.y - otherPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + otherPlayer.radius) {
            // Проверяем, кто кого съедает
            if (player.radius > otherPlayer.radius * 1.1) {
                // Игрок съел другого игрока
                player.radius += otherPlayer.radius * 0.1;
                player.score += otherPlayer.score;
                
                // Уведомляем о смерти игрока
                broadcastToAll({
                    type: 'playerDied',
                    data: {
                        id: otherPlayer.id,
                        name: otherPlayer.name,
                        killedBy: player.name
                    }
                });
                
                // Закрываем соединение съеденного игрока
                if (otherPlayer.ws && otherPlayer.ws.readyState === WebSocket.OPEN) {
                    otherPlayer.ws.close();
                }
                
                gameState.players.delete(otherId);
                
            } else if (otherPlayer.radius > player.radius * 1.1) {
                // Игрок был съеден
                otherPlayer.radius += player.radius * 0.1;
                otherPlayer.score += player.score;
                
                // Уведомляем о смерти игрока
                broadcastToAll({
                    type: 'playerDied',
                    data: {
                        id: player.id,
                        name: player.name,
                        killedBy: otherPlayer.name
                    }
                });
                
                // Закрываем соединение съеденного игрока
                if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.close();
                }
                
                gameState.players.delete(player.id);
                break;
            }
        }
    }
}

function broadcastToAll(message, excludeWs = null) {
    wss.clients.forEach((client) => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Обновление таблицы лидеров
function updateLeaderboard() {
    const players = Array.from(gameState.players.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    broadcastToAll({
        type: 'leaderboard',
        data: { players: players.map(p => ({ id: p.id, name: p.name, score: p.score })) }
    });
}

// Периодические обновления
setInterval(() => {
    updateLeaderboard();
}, 5000);

// Создаем начальную еду
spawnInitialFood();

// Маршруты API
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        players: gameState.players.size,
        foods: gameState.foods.size,
        uptime: process.uptime()
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`SNAKE WORLD сервер запущен на порту ${PORT}`);
    console.log(`Откройте http://localhost:${PORT} в браузере`);
}); 
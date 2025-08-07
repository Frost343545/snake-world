const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Настройки статических файлов
app.use(express.static(path.join(__dirname)));

// Игровое состояние
const gameState = {
    players: new Map(),
    foods: new Map(),
    worldSize: { width: 10000, height: 10000 },
    maxFood: 200,
    nextPlayerId: 1,
    nextFoodId: 1
};

// Генерируем начальную еду
function generateInitialFood() {
    for (let i = 0; i < gameState.maxFood; i++) {
        const food = {
            id: `food_${gameState.nextFoodId++}`,
            x: Math.random() * gameState.worldSize.width,
            y: Math.random() * gameState.worldSize.height,
            radius: 3 + Math.random() * 2,
            color: getRandomFoodColor(),
            value: 10
        };
        gameState.foods.set(food.id, food);
    }
}

// Генерируем случайный цвет еды
function getRandomFoodColor() {
    const colors = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
        '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Создаем новую еду
function createFood() {
    const food = {
        id: `food_${gameState.nextFoodId++}`,
        x: Math.random() * gameState.worldSize.width,
        y: Math.random() * gameState.worldSize.height,
        radius: 3 + Math.random() * 2,
        color: getRandomFoodColor(),
        value: 10
    };
    gameState.foods.set(food.id, food);
    return food;
}

// Обновляем позиции игроков
function updatePlayerPositions() {
    for (const [id, player] of gameState.players) {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            // Отправляем обновление позиции
            player.ws.send(JSON.stringify({
                type: 'playerUpdate',
                data: {
                    id: player.id,
                    x: player.x,
                    y: player.y,
                    radius: player.radius,
                    score: player.score,
                    segments: player.segments,
                    boost: player.boost
                }
            }));
        }
    }
}

// Проверяем коллизии
function checkCollisions() {
    const playersArray = Array.from(gameState.players.values());
    
    for (let i = 0; i < playersArray.length; i++) {
        const player1 = playersArray[i];
        if (!player1 || !player1.segments || player1.segments.length === 0) continue;
        
        for (let j = i + 1; j < playersArray.length; j++) {
            const player2 = playersArray[j];
            if (!player2 || !player2.segments || player2.segments.length === 0) continue;
            
            // Проверяем столкновение головы с телом
            const head1 = player1.segments[0];
            const head2 = player2.segments[0];
            
            // Проверяем, съел ли player1 player2
            for (let k = 1; k < player2.segments.length; k++) {
                const segment = player2.segments[k];
                const dx = head1.x - segment.x;
                const dy = head1.y - segment.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < player1.radius + player1.radius * 0.8) {
                    // player1 съел player2
                    handlePlayerEaten(player1, player2);
                    break;
                }
            }
            
            // Проверяем, съел ли player2 player1
            for (let k = 1; k < player1.segments.length; k++) {
                const segment = player1.segments[k];
                const dx = head2.x - segment.x;
                const dy = head2.y - segment.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < player2.radius + player2.radius * 0.8) {
                    // player2 съел player1
                    handlePlayerEaten(player2, player1);
                    break;
                }
            }
        }
    }
}

// Обрабатываем съедение игрока
function handlePlayerEaten(eater, eaten) {
    // Увеличиваем размер съевшего игрока
    const bonusSize = eaten.radius * 0.5;
    eater.radius += bonusSize;
    eater.score += eaten.score;
    
    // Добавляем сегменты от съеденного игрока
    const segmentsToAdd = Math.floor(eaten.segments.length * 0.3);
    for (let i = 0; i < segmentsToAdd; i++) {
        if (eater.segments.length > 0) {
            const lastSegment = eater.segments[eater.segments.length - 1];
            eater.segments.push({
                x: lastSegment.x,
                y: lastSegment.y
            });
        }
    }
    
    // Уведомляем съевшего игрока
    if (eater.ws && eater.ws.readyState === WebSocket.OPEN) {
        eater.ws.send(JSON.stringify({
            type: 'playerEaten',
            data: {
                eatenPlayerId: eaten.id,
                bonusSize: bonusSize,
                bonusScore: eaten.score
            }
        }));
    }
    
    // Уведомляем съеденного игрока
    if (eaten.ws && eaten.ws.readyState === WebSocket.OPEN) {
        eaten.ws.send(JSON.stringify({
            type: 'gameOver',
            data: {
                killedBy: eater.name,
                finalScore: eaten.score,
                finalLength: eaten.segments.length
            }
        }));
    }
    
    // Удаляем съеденного игрока
    gameState.players.delete(eaten.id);
    
    // Создаем еду из остатков съеденного игрока
    for (let i = 0; i < Math.floor(eaten.segments.length * 0.5); i++) {
        const segment = eaten.segments[Math.floor(Math.random() * eaten.segments.length)];
        if (segment) {
            const food = {
                id: `food_${gameState.nextFoodId++}`,
                x: segment.x + (Math.random() - 0.5) * 50,
                y: segment.y + (Math.random() - 0.5) * 50,
                radius: 3 + Math.random() * 2,
                color: eaten.color,
                value: 5
            };
            gameState.foods.set(food.id, food);
        }
    }
    
    // Оповещаем всех игроков об обновлении
    broadcastGameState();
}

// Отправляем состояние игры всем игрокам
function broadcastGameState() {
    const gameData = {
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
    };
    
    for (const [id, player] of gameState.players) {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(gameData));
        }
    }
}

// Обновляем лидерборд
function updateLeaderboard() {
    const players = Array.from(gameState.players.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    const leaderboardData = {
        type: 'leaderboard',
        data: players.map((player, index) => ({
            rank: index + 1,
            name: player.name,
            score: player.score,
            length: player.segments.length
        }))
    };
    
    for (const [id, player] of gameState.players) {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(leaderboardData));
        }
    }
}

// WebSocket соединения
wss.on('connection', (ws) => {
    let playerId = null;
    let playerData = null;
    
    console.log('Новое WebSocket соединение');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'playerJoin':
                    handlePlayerJoin(ws, data.data);
                    break;
                    
                case 'playerUpdate':
                    handlePlayerUpdate(ws, data.data);
                    break;
                    
                case 'foodCollected':
                    handleFoodCollected(ws, data.data);
                    break;
                    
                case 'playerEaten':
                    handlePlayerEatenRequest(ws, data.data);
                    break;
                    
                case 'boost':
                    handleBoost(ws, data.data);
                    break;
                    
                case 'disconnect':
                    handlePlayerDisconnect(ws);
                    break;
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
        }
    });
    
    ws.on('close', () => {
        handlePlayerDisconnect(ws);
    });
    
    function handlePlayerJoin(ws, playerData) {
        playerId = `player_${gameState.nextPlayerId++}`;
        
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
        
        // Исправляем сегменты с координатами (0,0)
        for (let segment of player.segments) {
            if (segment.x === 0 && segment.y === 0) {
                segment.x = player.x;
                segment.y = player.y;
            }
        }
        
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
        
        // Отправляем подтверждение подключения
        ws.send(JSON.stringify({
            type: 'playerJoined',
            data: {
                playerId: playerId,
                worldSize: gameState.worldSize
            }
        }));
        
        console.log('Игрок присоединился:', player);
        
        // Оповещаем всех игроков о новом игроке
        broadcastGameState();
    }
    
    function handlePlayerUpdate(ws, data) {
        const player = gameState.players.get(playerId);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            player.boost = data.boost;
            
            // Обновляем сегменты если они переданы
            if (data.segments) {
                player.segments = data.segments;
            }
        }
    }
    
    function handleFoodCollected(ws, data) {
        const food = gameState.foods.get(data.foodId);
        if (food) {
            const player = gameState.players.get(playerId);
            if (player) {
                // Увеличиваем размер игрока
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
            }
            
            // Удаляем еду
            gameState.foods.delete(data.foodId);
            
            // Создаем новую еду
            const newFood = createFood();
            
            // Оповещаем всех игроков
            broadcastGameState();
        }
    }
    
    function handlePlayerEatenRequest(ws, data) {
        const eater = gameState.players.get(playerId);
        const eaten = gameState.players.get(data.eatenPlayerId);
        
        if (eater && eaten) {
            handlePlayerEaten(eater, eaten);
        }
    }
    
    function handleBoost(ws, data) {
        const player = gameState.players.get(playerId);
        if (player) {
            player.boost = data.boost;
            
            if (data.boost && player.segments.length > 3) {
                // Уменьшаем длину при ускорении
                player.segments.pop();
            }
        }
    }
    
    function handlePlayerDisconnect(ws) {
        if (playerId && gameState.players.has(playerId)) {
            const player = gameState.players.get(playerId);
            
            // Создаем еду из остатков игрока
            for (let i = 0; i < Math.floor(player.segments.length * 0.3); i++) {
                const segment = player.segments[Math.floor(Math.random() * player.segments.length)];
                if (segment) {
                    const food = {
                        id: `food_${gameState.nextFoodId++}`,
                        x: segment.x + (Math.random() - 0.5) * 30,
                        y: segment.y + (Math.random() - 0.5) * 30,
                        radius: 3 + Math.random() * 2,
                        color: player.color,
                        value: 5
                    };
                    gameState.foods.set(food.id, food);
                }
            }
            
            gameState.players.delete(playerId);
            console.log('Игрок отключился:', playerId);
            
            // Оповещаем остальных игроков
            broadcastGameState();
        }
    }
});

// Игровой цикл
setInterval(() => {
    updatePlayerPositions();
    checkCollisions();
    updateLeaderboard();
    
    // Поддерживаем количество еды
    if (gameState.foods.size < gameState.maxFood * 0.8) {
        for (let i = 0; i < 5; i++) {
            createFood();
        }
    }
}, 50); // 20 FPS

// Генерируем начальную еду
generateInitialFood();

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Игровой мир: ${gameState.worldSize.width}x${gameState.worldSize.height}`);
    console.log(`Максимум еды: ${gameState.maxFood}`);
}); 
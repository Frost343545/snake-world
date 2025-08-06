// WebSocket модуль для SNAKE WORLD
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.serverUrl = this.getServerUrl();
        this.messageHandlers = new Map();
        this.connectionCallbacks = [];
        
        this.setupMessageHandlers();
    }

    getServerUrl() {
        // Для локальной разработки используем localhost
        // Для продакшена замените на ваш сервер
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
        return `${protocol}//${host}`;
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('Подключение к серверу:', this.serverUrl);
                this.socket = new WebSocket(this.serverUrl);

                this.socket.onopen = () => {
                    console.log('WebSocket соединение установлено');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.notifyConnectionCallbacks(true);
                    resolve();
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.socket.onclose = (event) => {
                    console.log('WebSocket соединение закрыто:', event.code, event.reason);
                    this.isConnected = false;
                    this.notifyConnectionCallbacks(false);
                    
                    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };

                this.socket.onerror = (error) => {
                    console.error('WebSocket ошибка:', error);
                    reject(error);
                };

            } catch (error) {
                console.error('Ошибка при создании WebSocket:', error);
                reject(error);
            }
        });
    }

    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect().catch(error => {
                    console.error('Ошибка переподключения:', error);
                });
            }
        }, delay);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'Пользователь отключился');
            this.socket = null;
            this.isConnected = false;
        }
    }

    send(type, data = {}) {
        if (!this.isConnected || !this.socket) {
            console.warn('WebSocket не подключен, сообщение не отправлено:', type);
            return false;
        }

        try {
            const message = {
                type: type,
                data: data,
                timestamp: Date.now()
            };
            
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            return false;
        }
    }

    setupMessageHandlers() {
        // Обработчики сообщений от сервера
        this.messageHandlers.set('gameState', this.handleGameState.bind(this));
        this.messageHandlers.set('playerJoined', this.handlePlayerJoined.bind(this));
        this.messageHandlers.set('playerLeft', this.handlePlayerLeft.bind(this));
        this.messageHandlers.set('foodSpawned', this.handleFoodSpawned.bind(this));
        this.messageHandlers.set('foodCollected', this.handleFoodCollected.bind(this));
        this.messageHandlers.set('playerDied', this.handlePlayerDied.bind(this));
        this.messageHandlers.set('leaderboard', this.handleLeaderboard.bind(this));
        this.messageHandlers.set('error', this.handleError.bind(this));
        this.messageHandlers.set('ping', this.handlePing.bind(this));
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const handler = this.messageHandlers.get(message.type);
            
            if (handler) {
                handler(message.data);
            } else {
                console.warn('Неизвестный тип сообщения:', message.type);
            }
        } catch (error) {
            console.error('Ошибка парсинга сообщения:', error);
        }
    }

    // Обработчики сообщений
    handleGameState(data) {
        // Обновление состояния игры
        if (window.gameEngine) {
            window.gameEngine.updateGameState(data);
        }
    }

    handlePlayerJoined(data) {
        console.log('Игрок присоединился:', data);
        if (window.gameEngine) {
            window.gameEngine.addPlayer(data);
        }
        this.showNotification(`${data.name} присоединился к игре`, 'success');
    }

    handlePlayerLeft(data) {
        console.log('Игрок покинул игру:', data);
        if (window.gameEngine) {
            window.gameEngine.removePlayer(data.id);
        }
        this.showNotification(`${data.name} покинул игру`, 'warning');
    }

    handleFoodSpawned(data) {
        if (window.gameEngine) {
            window.gameEngine.addFood(data);
        }
    }

    handleFoodCollected(data) {
        if (window.gameEngine) {
            window.gameEngine.removeFood(data.id);
        }
    }

    handlePlayerDied(data) {
        console.log('Игрок умер:', data);
        if (window.gameEngine) {
            window.gameEngine.removePlayer(data.id);
        }
        
        if (data.id === window.gameEngine?.playerId) {
            // Игрок умер
            if (window.gameEngine) {
                window.gameEngine.gameOver(data);
            }
        } else {
            this.showNotification(`${data.name} был съеден!`, 'warning');
        }
    }

    handleLeaderboard(data) {
        if (window.uiManager) {
            window.uiManager.updateLeaderboard(data.players);
        }
    }

    handleError(data) {
        console.error('Ошибка сервера:', data);
        this.showNotification(data.message || 'Ошибка сервера', 'error');
    }

    handlePing(data) {
        // Отправляем pong обратно
        this.send('pong', { timestamp: data.timestamp });
    }

    // Методы для отправки игровых событий
    sendPlayerJoin(playerData) {
        return this.send('playerJoin', playerData);
    }

    sendPlayerMove(moveData) {
        return this.send('playerMove', moveData);
    }

    sendPlayerBoost(boostData) {
        return this.send('playerBoost', boostData);
    }

    sendPlayerDisconnect() {
        return this.send('playerDisconnect', {});
    }

    // Уведомления
    showNotification(message, type = 'info') {
        if (window.uiManager) {
            window.uiManager.showNotification(message, type);
        }
    }

    // Callbacks для состояния соединения
    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
    }

    notifyConnectionCallbacks(connected) {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                console.error('Ошибка в callback соединения:', error);
            }
        });
    }

    // Получение статуса соединения
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Создаем глобальный экземпляр WebSocket менеджера
window.webSocketManager = new WebSocketManager(); 
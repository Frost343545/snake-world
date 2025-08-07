class WebSocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = [];
        this.eventHandlers = {};
        
        // Автоматическое переподключение
        this.autoReconnect = true;
    }

    connect(serverUrl = 'wss://snake-world.onrender.com') {
        try {
            console.log('Подключение к серверу:', serverUrl);
            this.socket = new WebSocket(serverUrl);
            
            this.socket.onopen = () => {
                console.log('WebSocket соединение установлено');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.processMessageQueue();
                this.emit('connected');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Ошибка парсинга сообщения:', error);
                }
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket соединение закрыто:', event.code, event.reason);
                this.isConnected = false;
                this.emit('disconnected', event);
                
                if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('Ошибка создания WebSocket соединения:', error);
            this.emit('error', error);
        }
    }

    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    disconnect() {
        this.autoReconnect = false;
        if (this.socket) {
            this.socket.close();
        }
    }

    send(type, data = {}) {
        const message = {
            type: type,
            data: data,
            timestamp: Date.now()
        };

        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.send(JSON.stringify(message));
        }
    }

    handleMessage(data) {
        const { type, data: messageData } = data;
        
        switch (type) {
            case 'gameState':
                this.emit('gameState', messageData);
                break;
            case 'playerJoined':
                this.emit('playerJoined', messageData);
                break;
            case 'playerLeft':
                this.emit('playerLeft', messageData);
                break;
            case 'foodSpawned':
                this.emit('foodSpawned', messageData);
                break;
            case 'foodEaten':
                this.emit('foodEaten', messageData);
                break;
            case 'playerDied':
                this.emit('playerDied', messageData);
                break;
            case 'leaderboardUpdate':
                this.emit('leaderboardUpdate', messageData);
                break;
            case 'error':
                this.emit('serverError', messageData);
                break;
            case 'ping':
                this.send('pong', { timestamp: Date.now() });
                break;
            default:
                console.log('Неизвестный тип сообщения:', type, messageData);
        }
    }

    // Система событий
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
    }

    // Методы для игры
    joinGame(playerData) {
        this.send('joinGame', playerData);
    }

    updatePosition(x, y, boost = false) {
        this.send('updatePosition', { x, y, boost });
    }

    leaveGame() {
        this.send('leaveGame');
    }

    getLeaderboard() {
        this.send('getLeaderboard');
    }
}

// Глобальный экземпляр WebSocket клиента
window.wsClient = new WebSocketClient(); 
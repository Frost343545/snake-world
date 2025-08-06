# 🚀 Быстрое развертывание SNAKE WORLD на Render.com

## ⚡ Быстрый старт (5 минут)

### 1. Настройте Git (если еще не настроен)
```bash
# Запустите setup-git.bat или выполните вручную:
git config --global user.name "Ваше Имя"
git config --global user.email "ваш@email.com"
```

### 2. Создайте репозиторий на GitHub
1. Перейдите на [GitHub.com](https://github.com)
2. Нажмите "New repository"
3. Назовите `snake-world`
4. НЕ добавляйте README (у нас есть)
5. Создайте репозиторий

### 3. Загрузите код
```bash
git add .
git commit -m "Initial commit: SNAKE WORLD game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/snake-world.git
git push -u origin main
```

### 4. Разверните на Render.com
1. Перейдите на [Render.com](https://render.com)
2. Войдите через GitHub
3. Нажмите "New +" → "Web Service"
4. Подключите ваш репозиторий
5. Настройки:
   - **Name:** `snake-world`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Нажмите "Create Web Service"

### 5. Готово! 🎉
- Дождитесь развертывания (2-5 минут)
- Скопируйте URL из Render
- Откройте в браузере и играйте!

## 🔧 Настройки для Render.com

### Environment Variables:
- `NODE_ENV` = `production`
- `PORT` = `10000` (Render автоматически назначит)

### Поддерживаемые функции:
- ✅ WebSocket соединения
- ✅ Многопользовательская игра
- ✅ Красивая графика
- ✅ Адаптивный дизайн
- ✅ SSL сертификаты
- ✅ Автоматические обновления

## 🌐 Ваш URL будет выглядеть так:
```
https://snake-world-xxxx.onrender.com
```

## 📱 Играйте с друзьями!
Отправьте URL друзьям и играйте вместе в SNAKE WORLD!

---

**Время развертывания: ~5 минут** ⚡ 
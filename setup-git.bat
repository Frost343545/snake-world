@echo off
echo Настройка Git репозитория для Snake World...

REM Инициализация Git репозитория
git init

REM Добавление всех файлов
git add .

REM Первый коммит
git commit -m "Initial commit: Snake World multiplayer game"

REM Добавление удаленного репозитория
git remote add origin https://github.com/Frost343545/snake-world.git

REM Отправка в GitHub
git branch -M main
git push -u origin main

echo.
echo Репозиторий успешно настроен!
echo Игра доступна по адресу: https://snake-world.onrender.com
echo GitHub репозиторий: https://github.com/Frost343545/snake-world
echo.
pause

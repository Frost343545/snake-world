@echo off
echo Настройка Git для SNAKE WORLD
echo.

echo Введите ваше имя для Git:
set /p git_name=

echo Введите ваш email для Git:
set /p git_email=

git config --global user.name "%git_name%"
git config --global user.email "%git_email%"

echo.
echo Git настроен!
echo Имя: %git_name%
echo Email: %git_email%
echo.
echo Теперь можно выполнить:
echo git commit -m "Initial commit: SNAKE WORLD game"
echo.
pause 
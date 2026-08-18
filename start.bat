@echo off
chcp 65001 >nul
title CampusDate 开发服务器
echo 正在启动 CampusDate...
echo.

cd /d %~dp0
call npm run dev

echo.
echo 服务器已停止
pause
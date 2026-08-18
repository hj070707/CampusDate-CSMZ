@echo off
chcp 65001 >nul
title CampusDate 环境配置
echo ========================================
echo   CampusDate 项目环境配置
echo ========================================
echo.

echo [1/4] 检查 Node.js 是否安装...
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js！
    echo 请先访问 https://nodejs.org 下载并安装 LTS 版本
    echo 安装完成后重新运行此脚本
    pause
    exit /b 1
)
echo [✓] Node.js 已安装
node -v
echo.

echo [2/4] 配置 npm 国内镜像（加速下载）...
call npm config set registry https://registry.npmmirror.com
echo [✓] 镜像配置完成
echo.

echo [3/4] 安装项目依赖（可能需要 2-5 分钟，请等待）...
echo   - 正在安装后端依赖...
call npm install
echo   - 正在安装前端依赖...
cd client
call npm install
cd ..
echo [✓] 依赖安装完成
echo.

echo [4/4] 初始化数据库...
call node server/db.js
echo [✓] 数据库初始化完成
echo.

echo ========================================
echo   配置完成！现在可以运行 start.bat 启动项目
echo ========================================
pause
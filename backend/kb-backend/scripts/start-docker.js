#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const composeFile = path.join(__dirname, '..', 'docker-compose.yml');

// 检查 docker-compose.yml 是否存在
if (!fs.existsSync(composeFile)) {
  console.error('错误: 未找到 docker-compose.yml 文件');
  process.exit(1);
}

// 尝试使用新版本的 docker compose（Docker Desktop 新版本）
function tryDockerCompose() {
  try {
    execSync('docker compose version', { stdio: 'ignore' });
    console.log('使用 docker compose 启动容器...');
    execSync('docker compose up -d', { 
      stdio: 'inherit', 
      cwd: path.dirname(composeFile) 
    });
    console.log('Docker 容器启动成功');
    return true;
  } catch (error) {
    return false;
  }
}

// 尝试使用旧版本的 docker-compose
function tryDockerComposeLegacy() {
  try {
    execSync('docker-compose --version', { stdio: 'ignore' });
    console.log('使用 docker-compose 启动容器...');
    execSync('docker-compose up -d', { 
      stdio: 'inherit', 
      cwd: path.dirname(composeFile) 
    });
    console.log('Docker 容器启动成功');
    return true;
  } catch (error) {
    return false;
  }
}

// 尝试启动 Docker 容器
if (!tryDockerCompose() && !tryDockerComposeLegacy()) {
  console.error('错误: 无法找到 docker compose 或 docker-compose 命令');
  console.error('请确保已安装 Docker 和 Docker Compose');
  process.exit(1);
}


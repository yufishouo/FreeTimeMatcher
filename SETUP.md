# 📋 本地開發設置指南

## 前置要求

- **Node.js** >= 18.0.0 ([下載](https://nodejs.org/))
- **npm** >= 9.0 (通常隨 Node.js 一起安裝)
- **PostgreSQL** 或雲端數據庫服務 (推薦 [Neon](https://neon.tech) - 免費)

## 第一步：克隆倉庫

```bash
git clone https://github.com/yufishouo/FreeTimeMatcher.git
cd FreeTimeMatcher
```

## 第二步：配置數據庫

### 選項 A：使用 Neon (推薦，免費)

1. 訪問 https://neon.tech 並註冊免費賬戶
2. 創建新項目
3. 複製連接字符串 (格式: `postgresql://user:password@host/database`)

### 選項 B：本地 PostgreSQL

1. 確保 PostgreSQL 已安裝並運行
2. 創建新數據庫:
```bash
createdb freetimematcher
```
3. 連接字符串格式: `postgresql://postgres:password@localhost:5432/freetimematcher`

## 第三步：設置環境變數

1. 複製 `.env.example` 為 `.env`:
```bash
cp .env.example .env
```

2. 編輯 `.env` 文件，設置你的數據庫連接:
```
DATABASE_URL=postgresql://your-connection-string-here
```

## 第四步：安裝依賴

根項目的 `postinstall` 腳本會自動安裝 client 和 server 的依賴:

```bash
npm install
```

這將:
- 安裝根項目依賴
- 進入 `client/` 安裝前端依賴
- 運行 `npm run build` 構建前端
- 進入 `server/` 安裝後端依賴

## 第五步：運行應用

### 開發模式 (推薦)

打開兩個終端:

**終端 1 - 啟動前端開發服務器:**
```bash
cd client
npm run dev
```
訪問 `http://localhost:5173`

**終端 2 - 啟動後端服務器:**
```bash
cd server
node server.js
```
後端運行在 `http://localhost:3000`

前端會自動代理 API 請求到後端 (詳見 `client/src/api.js`)

### 生產模式

```bash
npm start
```

後端會在 `http://localhost:3000` 運行並提供預構建的前端靜態文件。

## 常見問題

### 1. "DATABASE_URL is not set"

**問題:** 啟動時出現此錯誤

**解決:**
- 確保 `.env` 文件在項目根目錄
- 檢查 `DATABASE_URL` 值是否正確設置
- 重啟服務器

### 2. "connect ECONNREFUSED"

**問題:** 無法連接到數據庫

**解決:**
- 檢查數據庫連接字符串是否正確
- 確保數據庫服務正在運行 (本地) 或可訪問 (雲端)
- 檢查防火牆設置

### 3. "Port 3000 already in use"

**問題:** 端口已被占用

**解決:**
```bash
# 使用不同的端口
PORT=3001 node server/server.js
```

### 4. 前端無法連接後端

**問題:** 前端在 `localhost:5173`，但無法調用 API

**解決:**
- 確保後端在 `localhost:3000` 運行
- 檢查 `client/src/api.js` 中的 `API_BASE_URL`
- 在開發模式下應該是 `http://localhost:3000/api`
- 檢查瀏覽器控制台的網絡標籤查看具體錯誤

## 數據庫架構

首次啟動時，`server/db.js` 會自動創建以下表:

- **users** - 用戶賬戶 (username, password, profile info)
- **groups** - 群組信息 (name, invite code, creator)
- **schedules** - 用戶周時間表
- **group_members** - 群組成員關係 (weight, role)
- **messages** - 群組聊天消息
- **group_schedules** - 群組的時間表匹配數據

無需手動執行遷移腳本。

## 開發工具

### 前端調試
- Vue DevTools 瀏覽器擴展
- Vite 開發服務器提供快速刷新

### 後端調試
- 使用 `console.log` 或調試器
- 推薦工具: VSCode 內置調試器或 Chrome DevTools

### 數據庫查看
- 使用數據庫管理工具查看表:
  - Neon: 在線 SQL 編輯器
  - pgAdmin (本地)
  - DBeaver

## 下一步

- 閱讀 [README.md](./README.md) 了解功能
- 查看 `client/src/views/` 了解 UI 結構
- 查看 `server/server.js` 了解 API 端點
- 探索 Socket.IO 實時功能實現

祝開發愉快! 🚀

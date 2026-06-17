# 🕐 FreeTimeMatcher

快速媒合群組開會的共同空堂時段

## ✨ 功能

- 👥 **建立群組** - 建立群組並通過邀請碼邀請成員
- 📅 **上傳時間表** - 上傳每周的個人空堂時段
- ⚡ **實時匹配** - Socket.IO 實時計算群組最佳開會時段
- 🎨 **個性化設置** - 自訂頭像、昵稱、主題色和狀態小語
- 💬 **群組聊天** - 群組內即時訊息通知
- 📱 **PWA 支持** - 離線可用，支持移動設備
- 🔗 **特定日期匹配** - 支持針對具體日期範圍的開會時段

## 🛠 技術棧

- **Frontend:** Vue 3 + Vite + Vue Router + Socket.IO Client
- **Backend:** Express.js + PostgreSQL (Neon) + Socket.IO + bcryptjs
- **Authentication:** 用戶名 + 密碼認證 + bcrypt 加密

## 🚀 快速開始

### 前置要求
- Node.js >= 18.0.0
- PostgreSQL 數據庫 (推薦 [Neon](https://neon.tech))

### 本地開發

1. **克隆倉庫**
```bash
git clone https://github.com/yufishouo/FreeTimeMatcher.git
cd FreeTimeMatcher
```

2. **配置環境變數**
```bash
cp .env.example .env
```
編輯 `.env` 文件，設置 `DATABASE_URL`:
```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

3. **安裝依賴並啟動**
```bash
npm install
```

4. **開發模式**

終端1 - 啟動後端:
```bash
cd server
npm install
node server.js
```

終端2 - 啟動前端開發服務器:
```bash
cd client
npm install
npm run dev
```

訪問 `http://localhost:5173` (Vite 默認端口)

### 生產構建

```bash
npm start  # 後端會自動運行
```

前端已預構建到 `client/dist`，Express 會自動提供靜態文件。

## 📊 項目結構

```
FreeTimeMatcher/
├── client/                 # Vue 3 前端應用
│   ├── src/
│   │   ├── components/    # Vue 組件
│   │   ├── views/         # 頁面組件
│   │   ├── api.js         # API 客户端
│   │   ├── router.js      # 路由配置
│   │   └── main.js        # 應用入口
│   └── vite.config.js     # Vite 配置 (包括 PWA)
│
├── server/                 # Express 後端
│   ├── server.js          # 主服務器文件
│   ├── db.js              # 數據庫初始化和操作
│   └── package.json
│
└── package.json           # 根 package.json
```

## 🔌 核心功能說明

### 用戶管理
- 用戶可通過用戶名和密碼註冊/登入
- 密碼使用 bcryptjs 安全加密
- 支持個性化頭像、顯示名稱、狀態小語、主題色

### 群組與成員
- 創建者創建群組並獲得唯一邀請碼
- 成員通過邀請碼加入群組
- 支持成員權重設置 (1/2/5/10) - 影響時間表匹配優先級
- 支持副管理員角色

### 時間表匹配
- 每個成員上傳周時間表 (哪些時段有空)
- 系統實時計算群組的共同空堂時段
- 支持特定日期範圍的群組 (如項目期間)

### 實時功能
- 使用 Socket.IO 實現實時時間表同步
- 當成員更新時間表時，其他成員實時看到更新
- 群組內實時聊天和通知

## 🔐 安全特性

- **速率限制:**
  - 認證端點 (`/api/auth/*`): 每 15 分鐘最多 20 次請求
  - 一般 API: 每分鐘最多 120 次請求
- **密碼加密:** 使用 bcryptjs with salt
- **CORS:** 配置跨域請求保護
- **環境變數:** 敏感信息通過 `.env` 管理

## 📚 API 主要端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 用戶註冊 |
| POST | `/api/auth/login` | 用戶登入 |
| GET | `/api/user` | 獲取當前用戶信息 |
| PUT | `/api/user` | 更新用戶信息 |
| POST | `/api/groups` | 創建群組 |
| GET | `/api/groups/:id` | 獲取群組詳情 |
| POST | `/api/groups/join` | 加入群組 |
| PUT | `/api/schedules` | 上傳/更新時間表 |
| GET | `/api/schedules/:groupId` | 獲取群組時間表匹配結果 |

更多端點詳見 `server/server.js`

## 🔌 Socket.IO 事件

- `join-group` - 客户端加入群組實時更新
- 實時時間表更新
- 實時聊天消息

## 📱 PWA 特性

- 支持離線訪問 (Service Worker)
- 可安裝到手機主屏幕
- 即時性能和離線功能

## 🤝 貢獻

歡迎 Fork 和 Pull Request！

## 📝 許可證

ISC

## 🎯 後續計劃

- [ ] 添加單元測試
- [ ] 支持 Google/GitHub 第三方登入
- [ ] 優化移動端 UI
- [ ] 添加時間表模板
- [ ] 支持匯出會議日程到日曆應用

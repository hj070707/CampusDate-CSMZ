# CampusDate Code Wiki

> 校园恋爱匹配平台 —— 基于 65 道深度问卷的校园恋爱匹配系统
> 文档版本：1.0 ｜ 生成日期：2026-08-14

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 项目整体架构](#2-项目整体架构)
- [3. 目录结构](#3-目录结构)
- [4. 技术栈与依赖关系](#4-技术栈与依赖关系)
- [5. 数据库设计](#5-数据库设计)
- [6. 后端模块详解](#6-后端模块详解)
- [7. 前端模块详解](#7-前端模块详解)
- [8. API 接口清单](#8-api-接口清单)
- [9. 匹配算法说明](#9-匹配算法说明)
- [10. 认证与权限机制](#10-认证与权限机制)
- [11. 项目运行方式](#11-项目运行方式)
- [12. 已知问题与注意事项](#12-已知问题与注意事项)

---

## 1. 项目概述

**CampusDate** 是一个面向高校学生的恋爱匹配平台。核心理念是：用户完成一份基于心理学设计的深度问卷（覆盖价值观、性格、生活方式、沟通、未来规划五大维度），系统基于维度得分使用相似度算法进行异性匹配，每周一中午自动为用户推荐最契合的 TA。

### 核心功能

| 功能域 | 说明 |
|--------|------|
| 用户认证 | 注册 / 登录 / 登出 / 会话保持（Session + Cookie）|
| 深度问卷 | 20+ 道心理学风格题目，分页作答，自动暂存，提交后计算五维度得分 |
| 匹配引擎 | 基于欧几里得距离变体的加权相似度算法，贪心匹配，支持手动触发 |
| 匹配结果展示 | 展示匹配度、对方性别、对方维度画像 |
| 管理后台 | 用户统计、用户列表/详情、管理员设置、用户启用/禁用、题目 CRUD、手动触发匹配 |

### 业务流程

```
注册/登录 → 填写问卷 → 提交计算维度得分 → (管理员触发/定时)匹配 → 查看匹配结果
```

---

## 2. 项目整体架构

采用经典的 **前后端分离** 架构，单体后端 + 单页前端（SPA），使用 SQLite 作为轻量级嵌入式数据库。

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 (Browser)                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │          React SPA (Vite Dev Server :5173)              │ │
│  │  react-router-dom 路由 / framer-motion 动画 / Tailwind  │ │
│  └────────────────────────┬────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP + Cookie (credentials: include)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express Backend (:3000)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ auth.js  │  │ survey.js│  │ match.js │  │ admin.js │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │  requireAuth 中间件 (Session 校验)  └────┼──►        │
│       └──────────────┬──────────────────────────┘            │
│                      ▼                                       │
│              match-algo.js (匹配算法核心)                    │
│                      │                                       │
│                      ▼                                       │
│              sqlite3 (database.sqlite)                       │
└─────────────────────────────────────────────────────────────┘
```

### 架构特点

- **会话认证**：基于 `express-session`，登录后将 `userId` 写入 session，通过 Cookie 传递；前端 fetch 全程 `credentials: 'include'`。
- **CORS 白名单**：仅允许 `http://localhost:5173` 跨域携带凭证。
- **数据库直连**：后端直接持有 sqlite3 实例，无 ORM，全部手写 SQL。
- **Docker 化**：提供 `docker-compose.yml`，前端通过 vite proxy 转发 `/api` 到后端容器。

---

## 3. 目录结构

```
e:\lover\
├── client/                         # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── UserDetailModal.jsx # 用户详情弹窗组件
│   │   ├── pages/
│   │   │   ├── Admin.jsx           # 管理后台主页
│   │   │   ├── Home.jsx            # 首页 (落地页)
│   │   │   ├── Login.jsx           # 登录页
│   │   │   ├── MatchResult.jsx     # 匹配结果页
│   │   │   ├── QuestionsManage.jsx # 题目管理页
│   │   │   ├── Register.jsx        # 注册页
│   │   │   └── Survey.jsx          # 问卷作答页
│   │   ├── App.jsx                 # 根组件 + 路由 + 全局用户状态
│   │   ├── main.jsx                # React 入口
│   │   └── index.css               # Tailwind 指令
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js              # 含 /api 代理到 backend:3000
├── server/                         # 后端 (Express)
│   ├── middleware/
│   │   └── requireAuth.js          # 登录校验中间件
│   ├── routes/
│   │   ├── admin.js                # 管理后台接口
│   │   ├── auth.js                 # 认证接口
│   │   ├── match.js                # 匹配接口
│   │   └── survey.js               # 问卷接口
│   ├── db.js                       # SQLite 连接 + 建表
│   ├── dockerfile
│   ├── init-questions.js           # 题库初始化脚本
│   ├── match-algo.js               # 匹配算法核心
│   └── server.js                   # Express 入口
├── database.sqlite                 # SQLite 数据文件
├── docker-compose.yml              # 容器编排
├── package.json                    # 后端依赖 + dev 脚本
├── setup.bat                       # Windows 环境配置脚本
└── start.bat                       # Windows 启动脚本
```

---

## 4. 技术栈与依赖关系

### 4.1 后端依赖（根 `package.json`）

| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^4.19.2 | Web 框架 |
| express-session | ^1.18.0 | Session 会话管理 |
| cors | ^2.8.5 | 跨域处理 |
| sqlite3 | ^5.1.7 | SQLite 驱动 |
| bcryptjs | ^2.4.3 | 密码哈希 |
| concurrently | ^9.0.0 | 并发启动前后端 |

### 4.2 前端依赖（`client/package.json`）

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | ^18.2.0 | UI 库 |
| react-dom | ^18.2.0 | React DOM 渲染 |
| react-router-dom | ^6.22.0 | 路由 |
| framer-motion | ^12.40.0 | 动画库 |
| vite | ^5.2.0 | 构建工具 |
| @vitejs/plugin-react | ^4.2.1 | Vite React 插件 |
| tailwindcss | ^3.4.3 | 原子化 CSS |
| postcss / autoprefixer | ^8.4.38 / ^10.4.19 | CSS 后处理 |

### 4.3 模块依赖关系

```
server.js
 ├── db.js (sqlite3 实例)
 ├── routes/auth.js ────► db.js, bcryptjs
 ├── routes/survey.js ───► db.js, middleware/requireAuth.js
 ├── routes/match.js ────► match-algo.js, middleware/requireAuth.js
 └── routes/admin.js ────► db.js, match-algo.js, middleware/requireAuth.js

match-algo.js ──► db.js

client/src/App.jsx
 ├── pages/Home.jsx      ──► framer-motion, react-router-dom
 ├── pages/Login.jsx     ──► react-router-dom (从 App 导入 API 常量)
 ├── pages/Register.jsx  ──► react-router-dom
 ├── pages/Survey.jsx    ──► react-router-dom
 ├── pages/MatchResult.jsx ─► react-router-dom
 ├── pages/Admin.jsx     ──► components/UserDetailModal
 └── pages/QuestionsManage.jsx
```

> 说明：前端所有页面通过 `import { API } from '../App'` 获取后端基础地址 `http://localhost:3000`。

---

## 5. 数据库设计

数据库为单一 SQLite 文件 `database.sqlite`，由 [server/db.js](file:///e:/lover/server/db.js) 在启动时通过 `CREATE TABLE IF NOT EXISTS` 自动建表。

### 5.1 `users` 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | 主键 |
| email | TEXT UNIQUE NOT NULL | 邮箱（登录账号）|
| password_hash | TEXT NOT NULL | bcrypt 哈希后的密码 |
| name | TEXT | 昵称 |
| gender | TEXT | 性别 (male/female/other) |
| is_admin | INTEGER DEFAULT 0 | 是否管理员 (0/1) |
| is_active | INTEGER DEFAULT 1 | 是否启用 (0/1) |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | 注册时间 |

### 5.2 `questions` 题目表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | 主键 |
| category | TEXT NOT NULL | 维度分类 (values/personality/lifestyle/communication/future) |
| content | TEXT NOT NULL | 题干 |
| options | TEXT NOT NULL | 选项 JSON 数组（含 text/score/dimension）|
| type | TEXT DEFAULT 'single' | 题型 |
| weight | REAL DEFAULT 1.0 | 权重 |
| order_num | INTEGER | 排序序号 |
| is_active | INTEGER DEFAULT 1 | 是否启用 |

### 5.3 `answers` 答案表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | 主键 |
| user_id | INTEGER NOT NULL | 用户 ID (FK → users.id) |
| question_id | INTEGER NOT NULL | 题目 ID (FK → questions.id) |
| answer | TEXT NOT NULL | 所选选项文本 |
| dimension_scores | TEXT | 归一化后的五维度得分 JSON（每条答案冗余存储同一份）|
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | 提交时间 |

### 5.4 `matches` 匹配结果表（运行时被引用）

> 注意：此表在代码中被 [match-algo.js](file:///e:/lover/server/match-algo.js) 与 [routes/admin.js](file:///e:/lover/server/routes/admin.js) 引用，但 **[db.js](file:///e:/lover/server/db.js) 中并未创建该表**（仅留有 `// ⏳ 匹配模块 TODO` 注释）。详见 [第 12 节](#12-已知问题与注意事项)。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| user_a_id / user_b_id | INTEGER | 匹配双方 ID |
| score | REAL | 匹配度 (0-100) |
| round_id | INTEGER | 匹配轮次（时间戳）|
| created_at | DATETIME | 生成时间 |

---

## 6. 后端模块详解

### 6.1 [server.js](file:///e:/lover/server/server.js) — 应用入口

Express 应用主入口，负责中间件装配与路由挂载。

- **端口**：固定 `3000`
- **中间件顺序**：`cors`（允许 5173 携带凭证）→ `express.json()` → `express-session`
- **Session 配置**：secret = `campusdate-dev-secret`，Cookie 有效期 7 天，`httpOnly: true`，本地开发 `secure: false`
- **路由挂载**：
  - `/api/auth` → authRoutes
  - `/api/survey` → surveyRoutes
  - `/api/match` → matchRoutes
  - `/api/admin` → adminRoutes

### 6.2 [db.js](file:///e:/lover/server/db.js) — 数据库连接与初始化

- 使用 `sqlite3.verbose()` 创建数据库实例，路径为项目根 `database.sqlite`
- 通过 `db.serialize()` 顺序执行建表语句（users / questions / answers）
- `module.exports = db` 导出单例供全局复用

### 6.3 [middleware/requireAuth.js](file:///e:/lover/server/middleware/requireAuth.js) — 登录校验

```js
module.exports = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  req.userId = req.session.userId;  // 挂载到 req 供后续使用
  next();
};
```

职责：校验 session 中是否存在 `userId`，校验通过则将其挂载到 `req.userId`。

### 6.4 [routes/auth.js](file:///e:/lover/server/routes/auth.js) — 认证路由

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册：bcrypt 哈希密码后入库，写 session，返回用户信息 |
| POST | `/api/auth/login` | 登录：校验密码，写 session |
| GET | `/api/auth/me` | 获取当前登录用户（含 `isAdmin` 字段）|
| POST | `/api/auth/logout` | 登出：销毁 session |

关键点：密码使用 `bcrypt.hash(password, 10)` 加盐哈希；注册时遇到 `UNIQUE` 约束冲突返回 409。

### 6.5 [routes/survey.js](file:///e:/lover/server/routes/survey.js) — 问卷路由

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/survey/questions` | 否 | 获取所有启用题目，按 `order_num` 排序，`options` JSON 解析后返回 |
| POST | `/api/survey/answers` | 是 | 提交答案并计算五维度归一化得分 |
| GET | `/api/survey/status` | 是 | 查询用户是否已完成问卷及维度得分 |

**提交答案核心逻辑**（`POST /answers`）：

1. 读取所有题目构建 `questionMap`（id → {options, category}）
2. 遍历用户答案，按选项的 `dimension` 与 `score` 累加，同时记录每个维度计数
3. 对每个维度做归一化：`维度得分 = 该维度总得分 / 该维度题数`（保留两位小数）
4. 先 `DELETE` 该用户旧答案，再用 `prepare` 批量插入新答案（每条答案冗余存储同一份 `dimension_scores` JSON）
5. 返回归一化后的五维度得分

五维度：`values`(价值观)、`personality`(性格)、`lifestyle`(生活方式)、`communication`(沟通)、`future`(未来规划)

### 6.6 [routes/match.js](file:///e:/lover/server/routes/match.js) — 匹配路由

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/match/result` | 是 | 获取当前用户最新匹配结果（匹配度、对方信息、对方维度画像）|
| POST | `/api/match/run` | 是 | 手动触发匹配（调用 `runMatching()`）|

### 6.7 [routes/admin.js](file:///e:/lover/server/routes/admin.js) — 管理后台路由

所有接口均经过 `requireAuth` + `requireAdmin`（内部中间件，查询 `users.is_admin`）双重校验。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 仪表盘统计（总用户/今日注册/问卷完成数/完成率）|
| GET | `/api/admin/users` | 用户分页列表（每页 20 条）|
| GET | `/api/admin/users/:id` | 用户详情（基本信息 + 问卷维度得分 + 匹配历史）|
| POST | `/api/admin/users/:id/set-admin` | 设置/取消管理员 |
| POST | `/api/admin/users/:id/toggle-status` | 启用/禁用用户 |
| POST | `/api/admin/trigger-match` | 手动触发匹配（调用 `runMatching()`）|
| GET | `/api/admin/questions` | 获取所有题目 |
| POST | `/api/admin/questions` | 新增题目 |
| PUT | `/api/admin/questions/:id` | 更新题目 |
| DELETE | `/api/admin/questions/:id` | 删除题目 |

### 6.8 [match-algo.js](file:///e:/lover/server/match-algo.js) — 匹配算法核心

导出三个函数：`runMatching`、`getUserMatch`、`calculateSimilarity`。详见 [第 9 节](#9-匹配算法说明)。

### 6.9 [init-questions.js](file:///e:/lover/server/init-questions.js) — 题库初始化脚本

独立运行脚本（`node server/init-questions.js`），内置 20 道心理学风格示例题。

- 先清空 `questions` 表与自增序列
- 用 `prepare` 批量插入题库
- 控制台输出题量与各维度分布统计

题库覆盖五大维度，每题含 4 个选项，每个选项带 `text` / `score`(1-5) / `dimension` 字段。

---

## 7. 前端模块详解

### 7.1 [main.jsx](file:///e:/lover/client/src/main.jsx) — React 入口

挂载根节点，启用 `React.StrictMode`。

### 7.2 [App.jsx](file:///e:/lover/client/src/App.jsx) — 根组件与路由

- **全局状态**：`user`（当前登录用户）+ `loading`
- **初始化**：`useEffect` 调用 `/api/auth/me` 恢复登录态
- **导出常量**：`API = 'http://localhost:3000'` 供所有页面复用
- **路由表**：

| 路径 | 组件 | 鉴权 |
|------|------|------|
| `/` | Home | 公开 |
| `/login` | Login | 公开 |
| `/register` | Register | 公开 |
| `/survey` | Survey | 需登录，否则重定向 `/login` |
| `/match` | MatchResult | 需登录 |
| `/admin` | Admin | 需管理员，否则重定向 `/` |
| `/admin/questions` | QuestionsManage | 需管理员 |

### 7.3 页面组件

| 文件 | 职责 |
|------|------|
| [Home.jsx](file:///e:/lover/client/src/pages/Home.jsx) | 落地首页：Hero 区、故事卡片、关于、关注我们、Footer。使用 framer-motion 实现滚动视差、渐入、悬停动画。含登录态切换导航与登出。 |
| [Login.jsx](file:///e:/lover/client/src/pages/Login.jsx) | 登录表单（邮箱+密码），成功后 `setUser` 并跳转首页。 |
| [Register.jsx](file:///e:/lover/client/src/pages/Register.jsx) | 注册表单（昵称+邮箱+性别+密码），成功后自动登录跳转。 |
| [Survey.jsx](file:///e:/lover/client/src/pages/Survey.jsx) | 问卷作答页：分页（每页 5 题）、进度条、`localStorage` 自动暂存、提交后跳转 `/match`。 |
| [MatchResult.jsx](file:///e:/lover/client/src/pages/MatchResult.jsx) | 匹配结果页：展示匹配度百分比、对方性别、对方五维度画像进度条。未匹配时提示等待。 |
| [Admin.jsx](file:///e:/lover/client/src/pages/Admin.jsx) | 管理后台：统计卡片、匹配管理（手动触发）、问卷管理入口、用户列表（分页+点击查看详情）。 |
| [QuestionsManage.jsx](file:///e:/lover/client/src/pages/QuestionsManage.jsx) | 题目 CRUD：表单（维度/权重/题干/动态选项）+ 题目列表表格。 |

### 7.4 通用组件

| 文件 | 职责 |
|------|------|
| [UserDetailModal.jsx](file:///e:/lover/client/src/components/UserDetailModal.jsx) | 用户详情弹窗：基本信息、问卷维度得分、匹配历史、管理员切换按钮。点击遮罩关闭，阻止冒泡。 |

### 7.5 样式与配置

- [tailwind.config.js](file:///e:/lover/client/tailwind.config.js)：扩展 `primary`(#e11d48 玫瑰红) / `secondary`(#fda4af) 配色，扫描 `index.html` 与 `src/**/*.{js,jsx}`。
- [index.css](file:///e:/lover/client/src/index.css)：Tailwind 三大指令 + 响应式字号修正（移动端表单 16px 防 iOS 缩放）。
- [vite.config.js](file:///e:/lover/client/vite.config.js)：dev server 监听 `0.0.0.0:5173`，`/api` 代理到 `http://backend:3000`（Docker 内服务名）。

---

## 8. API 接口清单

### 8.1 认证 `/api/auth`

| 方法 | 路径 | 鉴权 | 请求体 | 返回 |
|------|------|------|--------|------|
| POST | `/register` | 否 | `{email,password,name,gender}` | `{id,email,name,message}` |
| POST | `/login` | 否 | `{email,password}` | `{id,name,email}` |
| GET | `/me` | 否（读 session）| - | `{id,email,name,gender,isAdmin}` |
| POST | `/logout` | 否 | - | `{id,name,email,isAdmin}` |

### 8.2 问卷 `/api/survey`

| 方法 | 路径 | 鉴权 | 返回 |
|------|------|------|------|
| GET | `/questions` | 否 | `{questions:[{id,category,content,options,type,weight,order_num}]}` |
| POST | `/answers` | 是 | `{success,message,dimensionScores}` |
| GET | `/status` | 是 | `{completed,dimensionScores?}` |

### 8.3 匹配 `/api/match`

| 方法 | 路径 | 鉴权 | 返回 |
|------|------|------|------|
| GET | `/result` | 是 | `{hasMatch,match?{score,partner,createdAt},message?}` |
| POST | `/run` | 是 | `{message,matched,roundId?,pairs?}` |

### 8.4 管理后台 `/api/admin`（均需 `requireAuth` + `requireAdmin`）

统计、用户列表/详情、管理员切换、用户启停、触发匹配、题目 CRUD（详见 6.7）。

---

## 9. 匹配算法说明

### 9.1 `calculateSimilarity(scoresA, scoresB)`

基于欧几里得距离变体的**加权相似度**计算。

1. 遍历五个维度，计算两人该维度得分差值 `diff = |scoreA - scoreB|`
2. 单维度相似度：`similarity = (5 - diff) / 5`（差异 0 得满分，差异 5 得 0 分）
3. 按维度权重加权累加：

   | 维度 | 权重 | 说明 |
   |------|------|------|
   | values（价值观）| 1.5 | 最重要 |
   | communication（沟通）| 1.3 | 次之 |
   | personality（性格）| 1.2 | - |
   | future（未来规划）| 1.0 | - |
   | lifestyle（生活方式）| 0.8 | 相对灵活 |

4. 归一化到 0-100：`score = (加权总分 / 总权重) * 100`，保留 1 位小数

### 9.2 `runMatching()` — 全局匹配

采用**贪心算法**，Promise 封装：

1. 查询所有完成问卷的活跃用户及其 `dimension_scores`
2. 不足 2 人则返回提示
3. 两两计算相似度，**仅匹配异性**（`u1.gender !== u2.gender`）
4. 按相似度降序排序
5. 贪心遍历：若双方均未被匹配，则配对成功并加入 `matched` 集合
6. 用 `Date.now()` 作为 `round_id`，先尝试删除同轮旧数据，再批量 `INSERT` 到 `matches` 表
7. 返回匹配对数与明细

### 9.3 `getUserMatch(userId)`

查询某用户最新一条匹配记录，通过双向 `JOIN`（`user_a_id` 或 `user_b_id` 匹配）找到对方，返回匹配度、对方姓名/性别/维度画像与创建时间。

---

## 10. 认证与权限机制

### 10.1 认证流程

```
登录/注册成功
   ↓
req.session.userId = user.id    （服务端写 session）
   ↓
Set-Cookie: connect.sid=...     （响应头自动下发）
   ↓
后续请求 fetch(credentials:'include')  （前端携带 Cookie）
   ↓
requireAuth 中间件读取 req.session.userId → req.userId
```

### 10.2 权限分层

- **公开**：注册、登录、首页、获取题目
- **登录用户**：提交问卷、查询问卷状态、查看匹配结果、触发匹配
- **管理员**：管理后台所有接口（`requireAdmin` 中间件查 `users.is_admin`）

### 10.3 前端路由守卫

在 [App.jsx](file:///e:/lover/client/src/App.jsx) 中通过条件渲染 `Navigate` 实现软守卫：

```jsx
<Route path="/survey" element={user ? <Survey /> : <Navigate to="/login" />} />
<Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/" />} />
```

> 注意：前端守卫仅为体验优化，真正的安全边界在后端中间件。

---

## 11. 项目运行方式

### 11.1 方式一：本地开发（Windows，推荐新手）

1. **环境配置**（首次）：双击 `setup.bat`
   - 检查 Node.js
   - 配置 npm 国内镜像
   - 安装根目录与 `client/` 依赖
   - 初始化数据库（`node server/db.js`）
2. **启动开发服务器**：双击 `start.bat`（实际执行 `npm run dev`）

`npm run dev` 通过 `concurrently` 并发执行：
- 后端：`node server/server.js`（:3000）
- 前端：`cd client && npx vite`（:5173）

### 11.2 方式二：手动命令行

```bash
# 1. 安装后端依赖
npm install

# 2. 安装前端依赖
cd client && npm install && cd ..

# 3. 初始化数据库
npm run init-db          # 即 node server/db.js

# 4. (可选) 初始化题库
node server/init-questions.js

# 5. 启动（前后端并发）
npm run dev
```

访问：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000

### 11.3 方式三：Docker Compose

```bash
docker-compose up --build
```

- `backend` 容器：构建 `./server`，映射 3000 端口，挂载数据库与源码，启动命令 `node db.js && node server.js`
- `frontend` 容器：构建 `./client`，映射 5173 端口，依赖 `backend`
- 前端容器内通过 vite proxy 将 `/api` 转发到 `http://backend:3000`

### 11.4 NPM Scripts（根 `package.json`）

| 脚本 | 作用 |
|------|------|
| `npm run dev` | 并发启动前后端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run dev:client` | 仅启动前端 |
| `npm run init-db` | 初始化数据库表结构 |

---

## 12. 已知问题与注意事项

> 以下为代码审查中发现的待修复点，供维护参考。

### 12.1 `matches` 表未建表

[db.js](file:///e:/lover/server/db.js) 仅创建 `users` / `questions` / `answers` 三张表，但 [match-algo.js](file:///e:/lover/server/match-algo.js) 与 [admin.js](file:///e:/lover/server/routes/admin.js) 均对 `matches` 表进行读写。运行匹配前需手动补建表，例如：

```sql
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id INTEGER NOT NULL,
  user_b_id INTEGER NOT NULL,
  score REAL,
  round_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a_id) REFERENCES users(id),
  FOREIGN KEY (user_b_id) REFERENCES users(id)
);
```

### 12.2 `routes/auth.js` 登出接口 Bug

[auth.js#L61-L64](file:///e:/lover/server/routes/auth.js) 的 `/logout` 在 `req.session.destroy()` 后引用了作用域内不存在的 `user` 变量，会导致运行时 `ReferenceError`。应改为返回静态 JSON。

### 12.3 `routes/match.js` 重复路由

[match.js](file:///e:/lover/server/routes/match.js) 文件末尾重复定义了 `router.get('/result', ...)` 与 `module.exports = router`，后者会覆盖前者，导致真实生效的是返回假数据的占位实现，而非调用 `getUserMatch` 的版本。应删除文件末尾的占位代码。

### 12.4 Session Secret 硬编码

`server.js` 中 `secret: 'campusdate-dev-secret'` 与 `docker-compose.yml` 中环境变量均为硬编码明文，生产环境应改为环境变量并使用强随机串。

### 12.5 前端 API 地址硬编码

[App.jsx](file:///e:/lover/client/src/App.jsx) 中 `const API = 'http://localhost:3000'` 硬编码，Docker 环境下虽可通过 vite proxy 规避，但本地直连场景下部署地址变更需手动修改。

### 12.6 答案表维度得分冗余存储

每条 `answers` 记录都存储同一份 `dimension_scores` JSON，存在数据冗余。查询时 `LIMIT 1` 取任一条即可，但写入开销与一致性维护成本较高。

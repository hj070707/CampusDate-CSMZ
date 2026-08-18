<div align="center">

# 🌸 CampusDate · CSMZ 民政学院专属校园匹配平台

> **在民院，遇见对的人 💌**
>
> 基于心理学量表 + 加权欧几里得匹配算法的校园 CP 匹配系统  
> 长沙民政职业技术学院专属版本（邮箱域：`@csmzxy.edu.cn`）

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-brightgreen)
![Version](https://img.shields.io/badge/Version-0.2.0--完整可运行版-rose)

![首页 Banner：民政学院品牌主页 · 倒计时 + KPI + FAQ](./docs/screenshots/home.png)

</div>

---

## ✨ 项目介绍

这是一个完全可运行的校园 CP 匹配平台，模仿 [CampusDate](https://trycampusdate.com/) 的产品形式，针对 **长沙民政职业技术学院（CSMZ）** 进行了完整品牌化定制。

用户通过填写一份基于心理学量表设计的 25 题 5 维问卷，系统会在 **每周一中午 12:00** 自动开信封，给每位「开启下周参与」的同学匹配一位最契合的 TA。匹配成功后双方可**双向确认交换联系方式**，既保护隐私又有仪式感。

> 当前版本定位：**0.2.0 完整可运行版（作品集 & 开源版）**，不含商业化功能，代码干净、可直接 push 到 GitHub。

---

## 🧩 技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                            浏览器 (Vite)                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ 首页 Home  │  │ 注册/登录  │  │ 问卷 Survey│  │ 匹配结果   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│         \            |                |              /             │
│          └──── fetch (credentials: 'include', Cookie=connect.sid) ─┘
│                              VITE (dev proxy) / 同源                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │ http://localhost:5173
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Node.js + Express 后端 (:3000)                    │
│  ┌─────────────────────── Middleware ───────────────────────────────┐│
│  │ CORS(credentials) │ express-session(HttpOnly+SameSite) │ helmet ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  auth.js   — 邮箱白名单注册 *@csmzxy.edu.cn / bcrypt 哈希 / 登出    │
│  survey.js — 题目获取 / 答案加权聚合写入 answers 表                  │
│  profile.js— GET/PUT 资料 / 修改密码 / 注销匿名化 / 历史匹配 / 开关 │
│  match.js  — 匹配结果查询 / 联系方式双向交换 / 手动匹配             │
│  admin.js  — 仪表盘统计 / 用户CRUD / 题目CRUD / 管理员设为/取消     │
│  server.js — node-cron: 每周一 12:00 (Asia/Shanghai) 定时匹配       │
│  match-algo.js — 5维加权欧几里得 + 互补维度甜区 + 近3轮防重复        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SQLite (database.sqlite)                       │
│  users · questions · answers · matches                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 目录结构

```
lover/
├─ client/                      # 前端 (React 18 + Vite 5 + Tailwind CSS 3)
│   └─ src/
│       ├─ pages/
│       │   ├─ Home.jsx            # 民政学院品牌首页（倒计时 + KPI + FAQ）
│       │   ├─ Register.jsx        # 校园邮箱注册（收集微信/手机号）
│       │   ├─ Login.jsx           # 品牌化登录页
│       │   ├─ Survey.jsx          # 25 题 5 维分页问卷（localStorage 自动暂存）
│       │   ├─ MatchResult.jsx     # 匹配结果 + 雷达图对比 + 双向交换联系
│       │   ├─ Profile.jsx         # 资料编辑 / 改密码 / 参与开关 / 历史信封 / 注销
│       │   ├─ Admin.jsx           # 运营后台（统计卡片 + 手动开信封 + 用户列表）
│       │   └─ QuestionsManage.jsx # 题库管理（CRUD + 权重/维度/排序）
│       ├─ components/
│       │   ├─ RadarChart.jsx      # 纯 SVG 5 维雷达图（支持双人对比）
│       │   └─ UserDetailModal.jsx # 后台用户详情弹窗
│       └─ App.jsx                 # 路由入口 + API 地址(VITE_API_URL)
│
├─ server/                      # 后端 (Node.js + Express 4)
│   ├─ server.js                   # 入口：CORS / session / cron 定时 / 路由挂载
│   ├─ db.js                       # SQLite 模型 + 幂等 addColumn（建表 + 扩字段）
│   ├─ init-questions.js           # 导入第二代 25 题题库（清空旧 answers/matches）
│   ├─ match-algo.js               # 核心匹配算法
│   ├─ middleware/requireAuth.js   # 登录态校验 (req.session.userId)
│   └─ routes/
│       ├─ auth.js                 # 注册 / 登录 / 登出 / 校园邮箱白名单
│       ├─ survey.js               # 题目 / 答案提交 / 加权维度得分
│       ├─ profile.js              # 资料 CRUD / 改密 / 注销 / 匹配历史 / 参与开关
│       ├─ match.js                # 匹配结果 / 联系方式双向交换 / 手动触发
│       └─ admin.js                # 管理后台接口（权限 requireAdmin）
│
├─ database.sqlite              # SQLite 数据库（.gitignore，不会被提交）
├─ package.json                 # 项目脚本（dev / seed-questions / match:now / build / start）
├─ .gitignore                   # 干净开源：排除 .env / database.sqlite / node_modules / dist
└─ README.md
```

---

## 💡 5 维度匹配算法详解

### 维度权重

| 维度 | 中文 | 权重 | 匹配原则 |
|---|---|---|---|
| `values` | **价值观** | 1.5 | 👫 **相似优先** — 三观不一致迟早翻车 |
| `communication` | **情感沟通** | 1.4 | 👫 **相似优先** — 爱的语言 & 沟通风格要同频 |
| `future` | **未来规划** | 1.2 | 👫 **相似优先** — 留长沙/去一线/回家乡 不一致 = 异地雷 |
| `personality` | **性格特质** | 1.0 | 🧲 **互补甜区 (1-2 分)** — 外向×内向也很甜 |
| `lifestyle` | **生活方式** | 0.9 | 🧲 **互补甜区 (1-2 分)** — 夜猫子×早睡型可以互补 |

### 算法步骤

```
1. 得分聚合（survey.js 提交时计算）
   dimension_scores[dim] = Σ(option.score × question.weight) / Σ(question.weight)
   → 每个维度归一化到 1.0 ~ 5.0

2. 匹配池过滤（runMatching）
   [完成问卷] AND [未注销] AND [join_next_round = 1] AND [性别不同] AND [近3轮未重复配对]

3. 配对打分
   对每对候选组合 (u1, u2)：
     相似维度：similarity(dim) = (4 - diff) / 4        diff = |scoreA - scoreB|
     互补维度：
         diff ∈ [1, 2]  →  1.0  (满分：甜区)
         diff = 0       →  0.85 (太像了，略减)
         diff > 2       →  (4 - diff) / 4 (递减)
     final_score = Σ(similarity × weight) / Σ(weight) × 100
     → 结果归一化到 0 - 100

4. 贪心匹配
     pairs 按 final_score 降序依次取对，一人只配一次

5. 生成匹配理由 buildReasons
     · 相似度最高的前 2 个 → 共同点
     · 互补维度甜区命中的 → 互补亮点（否则取第 3 个共同点）
     · 综合分数 → 主标语 (90/80/70/60/<60 5档)

6. 持久化 + 下轮重置
   INSERT matches(... score, reasons JSON)
   UPDATE users last_match_round = round_id, join_next_round = 1
```

### 问卷设计依据

第二代问卷 25 题（5 维度 × 5 题），每题情景化，避免直接面试式提问：
- **价值观 (5 题)** — 基于 *Schwartz 价值观理论* 和 *Sternberg 爱情三元论*
- **性格特质 (5 题)** — 基于 *Big Five (OCEAN)* 中的外向性、尽责性、情绪稳定性
- **生活方式 (5 题)** — 日常节律、消费观、约会偏好、运动、作息
- **情感沟通 (5 题)** — 基于 *Chapman 五种爱的语言* 和 *依恋理论*
- **未来规划 (5 题)** — 毕业去向、职业观、婚姻预期、居住方式、家庭背景考量

每题 weight 1.0-2.0，核心题目权重更高（例如分歧处理 weight=1.9）。

---

## 🚀 快速开始

### 环境要求
- Node.js **18** 或更高
- npm / pnpm / yarn 任选其一

### 1. 安装依赖
```bash
cd e:\lover
npm install
cd client && npm install
cd ..
```

### 2. 初始化数据库和问卷题目
```bash
npm run seed-questions
```

输出示例：
```
✅ 第二代问卷初始化完成！共导入 25 道题目

📊 维度分布:
   价值观: 5 题
   性格特质: 5 题
   生活方式: 5 题
   情感沟通: 5 题
   未来规划: 5 题

🧹 已同步清除旧 answers / matches（维度算法已升级）
💡 请重新填写问卷以获得准确的维度评分
```

### 3. 启动前后端（开发模式）
```bash
npm run dev
# 前端 http://localhost:5173  （Vite + HMR）
# 后端 http://localhost:3000  （Express + SSE）
```

### 4. 登录 / 注册 / 手动匹配

| 账号 | 角色 | 默认密码 |
|---|---|---|
| `1111@qq.com` | 👑 管理员 | `123456` |
| `1112@qq.com` | 👤 女生用户 | `123456` |
| `1113@qq.com` | 👤 男生用户 | `123456` |

> **注册提示**：线上环境使用 `@csmzxy.edu.cn` 校园邮箱；本地演示邮箱白名单校验在 auth.js 中设为仅该校域名。

**体验完整流程：**
```bash
# 1. 浏览器登录 1111 / 1112 / 1113 三个账号
# 2. 每个账号去 /survey 填完 25 题问卷 → 系统默认打开「参与下周匹配」
# 3. 登录管理员 1111 → 访问 /admin → 点「立即执行一次匹配」
#    或者直接命令行：
npm run match:now
#
# 4. 任何账号去 /match → 看匹配结果 + 雷达图对比 → 交换联系
```

### 5. 生产构建
```bash
npm run build    # client 打包到 client/dist
npm run start    # NODE_ENV=production node server/server.js（自动 serve dist 静态页）
```

---

## 🧭 功能清单（v0.2）

### 用户端

| 功能 | 页面 / 接口 | 说明 |
|---|---|---|
| 民政学院品牌首页 | Home.jsx | 倒计时、学校 KPI、FAQ、Franner Motion 动画 |
| 校园邮箱注册 | Register.jsx + auth.js | 仅 `@csmzxy.edu.cn`，收集微信 / 手机号 |
| 登录 / 登出 / 重置密码 | Login.jsx + profile.jsx | bcrypt rounds=10；登出销毁 session；改密码需旧密码 |
| 25 题分页问卷 | Survey.jsx + `POST /api/survey/answers` | 5 页 × 5 题；localStorage 自动暂存；提交后打开参与开关 |
| 5 维画像雷达图 | RadarChart.jsx + MatchResult.jsx | 纯 SVG 无依赖；你(红) vs TA(蓝) 双人对比 |
| 每周一 12:00 开信封 | server.js + node-cron `0 0 12 * * 1 Asia/Shanghai` | 自动执行 |
| 手动触发匹配 | Admin.jsx 「立即执行一次匹配」 / `npm run match:now` | 不等下周一 |
| 匹配结果页 | MatchResult.jsx | 综合匹配度、昵称、合拍理由(共同点×2+互补点×1)、5维雷达图、联系交换卡片 |
| 双向联系交换 | match.js | 双方都同意才互相展示微信 / 手机号 |
| 个人资料页 | Profile.jsx | 昵称/微信/手机号编辑、改密码、参与开关、**历史匹配信封列表**、注销匿名化 |
| 注销账号（匿名化） | profile.js | 邮箱+deleted、password_hash=ANON、昵称匿名、清联系方式、写 deactivated_at |

### 管理后台

| 功能 | 页面 / 接口 | 说明 |
|---|---|---|
| 8 项 KPI 仪表盘 | Admin.jsx | 总用户/今日新增/问卷完成/完成率/下周参与人数/参与率/累计配对数/配对轮数 |
| 手动开信封 + 明细 | Admin.jsx + trigger-match | 展示本轮配对 list（人 × 人 + 匹配度） |
| 用户列表（8 列） | Admin.jsx | ID/邮箱/昵称/性别/问卷状态/参与开关/角色/注册时间；注销用户置灰 |
| 用户详情弹窗 | UserDetailModal.jsx | 资料、维度得分、匹配历史、设置/取消管理员、启停账号 |
| 题目 CRUD | QuestionsManage.jsx + admin.js questions 接口 | 5 大类 25 题增删改、权重/排序/启停 |
| 管理员权限校验 | admin.js `requireAdmin` middleware | 非管理员 403 拦截 |

### 安全机制

| 机制 | 位置 | 说明 |
|---|---|---|
| 校园邮箱白名单 | auth.js `isValidSchoolEmail()` | 仅允许 `*@csmzxy.edu.cn` 注册 |
| 密码哈希 | bcryptjs rounds=10 | 数据库存 `$2a$10$…` 不可逆密文 |
| HttpOnly Cookie | express-session | `connect.sid` 不能被 JS 读取，防 XSS 窃取 |
| SameSite Cookie | server.js session config | 开发 `lax` / 生产 `none`（配合 HTTPS） |
| Secure Cookie | 生产环境自动开启 | 仅 HTTPS 请求携带 |
| 注销匿名化 | profile.js deactivate | 不可逆擦除隐私数据，保留匿名 ID 用于统计 |
| 联系双向确认 | match.js exchange-contact | 必须双方都点，否则谁也看不到对方的微信/手机号 |
| 近 3 轮防重复匹配 | match-algo.js | 不会连续 3 周把同样两个人配到一起 |

---

## 📝 Cron 定时任务

在 [server.js](file:///e:/lover/server/server.js) 中通过 `node-cron` 配置：
```
Cron 表达式:  0 0 12 * * 1    (sec min hour day-of-month month day-of-week)
时区:         Asia/Shanghai
含义:         每周一 中午 12:00 整自动开信封
```

如需调整，可设环境变量 `MATCHING_CRON` 覆盖默认值。

---

## 🤝 开源协议

**MIT License** — 自由修改、分发、商用，附带版权声明即可。

> 温馨的提醒：
> - 如果部署在真实校园，请务必遵守学校信息安全规范
> - 本项目没有任何强制推送或邮件功能，联系方式仅双方同意才展示
> - 愿每一位民院同学都能 —— **在民院，遇见对的人 🌸**

---

## 🖼 页面预览

下面是真实运行时的核心页面截图（版本 0.2 · 民政学院专属）：

### 🔹 匹配结果：雷达图对比 + 匹配理由 + 双向交换联系
![匹配结果页：综合匹配度 · 5 维雷达图 · 合拍理由 · 联系方式双向确认](./docs/screenshots/match-result.png)

### 🔹 管理后台：KPI 仪表盘 + 手动开信封 + 用户 CRUD
![管理后台：8 项 KPI · 立即执行一次匹配 · 用户列表 · 题目管理入口](./docs/screenshots/admin-dashboard.png)

### 🔹 个人中心：历史匹配信封卡片（可再次查看/重新交换）
![个人资料页：资料编辑 · 改密码 · 参与开关 · 历史匹配信封列表 · 注销](./docs/screenshots/profile-history.png)

> 所有截图均为本地开发环境真实运行（`npm run dev`）所截，无 Mock。

---

## 🎓 关于作者

本项目是 **长沙民政职业技术学院** 同学的毕业作品集项目，0.1 demo 基础功能搭台，0.2 完成完整闭环 + 开源整理。欢迎 Star ⭐ / PR 🌈 / Issue 🐛 ～

---

## 🚀 发布到 GitHub（Push 步骤）

仓库已清理干净（`.gitignore` 已排除 `*.sqlite` / `.env` / `node_modules` / `dist`），按以下命令一键发布：

```bash
# 1. 进入项目根目录
cd e:\lover

# 2. 初始化仓库（首次）
git init
git checkout -b main

# 3. 全部加入暂存区 & 提交
git add .
git commit -m "chore: release v0.2.0 完整可运行版
- 民政学院品牌化（@csmzxy.edu.cn 邮箱白名单）
- 25 题 5 维深度问卷 + 加权欧几里得匹配算法
- 每周一 12:00 定时匹配 + 双向联系方式确认
- 管理后台：KPI 仪表盘 / 手动开信封 / 用户 / 题目 CRUD
- 个人中心：历史匹配信封 / 改密 / 注销匿名化"

# 4. 关联远程仓库（把 YOUR_NAME 替换成你自己的 GitHub 用户名）
git remote add origin https://github.com/YOUR_NAME/CampusDate-CSMZ.git

# 5. Push 到 main
git push -u origin main
```

> 💡 上线前可以再跑一次 `git status`，确认下列文件 **不会** 被提交：
> `database.sqlite` · `.env` · `node_modules/` · `client/dist/` · `*.log`

# 加密货币交易信号监控系统 (Crypto Signal Monitor)

这是一个用于监控币安 USDT 永续合约的交易信号系统。该系统已经实现了您的核心业务逻辑：自动扫描、前20个交易量合约、15m与5m策略配合 (Pine Script逻辑复述)、双重AI打分 (DeepSeek/GPT)、Telegram 推送报警、以及本地 SQLite 日志和统计。

> **⚠️ 关于技术栈的特别说明**
> 您在需求中明确希望使用后端语言 **Python 3.11 或 3.12**。但受限于当前操作环境（Google AI Studio 平台强制基于云端 Node.js Next.js 构建可部署、可实时预览的全栈 Web 应用，并且限制使用本地服务器环境下的 `python3` 等指令），我们直接为您量身定制了一套 **TypeScript + Next.js + Node.js 版本的加密货币监控系统。**。
>
> 这样它既完全具备了您所描述的功能和模块划分，也**可以直接在当前网页环境完成编译、监控甚至部署成在线版本**！后续如果在 VPS，您可以直接使用 `npm start` 利用 PM2 或者 Docker 来运行整套系统。

## 功能介绍

*   **自动扫描币安**: 全自动拉取 `https://fapi.binance.com/fapi/v1/ticker/24hr`，每次选取 quoteVolume 全站前 TopN (默认 20) 的活跃 USDT 永续合约。
*   **策略信号评估**: 完美复刻了基于 EMA、MACD、VWAP、ATR 以及成交量因子的 15m 过滤层和 5m 执行层判定（顺势/回踩/反抽/做多/做空），包括动态生成不同的止盈止损 TP1, TP2。
*   **双 AI 复合审核**: 对于每一个从策略初步滤出的技术信号，都会调用大语言模型（支持 GPT、DeepSeek、Gemini）以固定 JSON 的形式对行情结构、RR和技术特征做二次评判打分，70 分以上再下发。
*   **Telegram报警**: 只有 AI 通过验证的信号，才会立即发送详细文本模板的 Telegram 请求提醒。
*   **自带胜率和订单记录统计后台**: 自动在 SQLite DB `crypto_monitor.sqlite` 保存所有信号记录及最终演变成结果（超过12根K线若未触发视为 `EXPIRED`、碰损视为 `LOSS_SL`、碰赢视为 `WIN_TP*`），并实时统计各分项和类型的胜率。

## 目录结构
```text
project/
├── app/
│   ├── page.tsx          # 前端总控 Web 后台 (Next.js)
│   ├── api/              # 为 Web 提供的服务端路由 (Logs, Signals, Metrics, Configs)
├── server/
│   ├── db.ts             # 数据库构建结构与连接封装 (SQLite 建表)
│   ├── worker.ts         # node-cron 定时器, 控制扫描流程和更新逻辑
│   ├── services/
│       ├── binance.ts    # 币安交易所 API
│       ├── indicators.ts # 技术指标核心算子 (EMA/MACD/VWAP/ATR)
│       ├── strategy.ts   # PineScript 过滤判定改写
│       ├── ai.ts         # OpenAI 和 Deepseek API 的接口集成
│       └── telegram.ts   # TG推送封装
├── package.json
└── .env.example
```

## 运行与部署方法

1.  **拷贝系统环境**: 下载本项目代码或直接 Export to GitHub。
2.  **设定环境变量**: 将根目录 `.env.example` 复制一份并改名为 `.env`，输入相关的 `OPENAI_API_KEY` 和 `DEEPSEEK_API_KEY` (如仅测试，可以进入系统使用免费内置的 Gemini 测试)。
3.  **依赖安装**: 请确保系统中有 Node.js >= 20 且具备 npm，执行：
    ```bash
    npm install
    ```
4.  **启动开发服**:
    ```bash
    npm run dev
    ```
    您将看到两个并发启动：Web 后台将部署在 3000 端口，而单独的定时 Worker 进程将初始化 DB 并在挂机时持续通过长连接扫描记录信号并推送通知。
5.  **访问后台**: 打开 `http://localhost:3000` 进入前端监控控制面板修改配置和检查统计日志。

## 服务器部署（推荐方案）

### 1) 选什么系统？

建议优先选 **Ubuntu Server 22.04 LTS / 24.04 LTS（x86_64）**，原因：

* LTS 版本维护周期长，稳定性更适合长期跑交易监控。
* Node.js、PM2、Nginx、SQLite 等依赖安装资料最全，出问题也最好排查。
* 社区对 Next.js + Node 的部署经验最成熟。

> 不建议新手一上来选 Alpine 这类极简系统，会增加 native 依赖（如 `better-sqlite3`）编译与排错成本。

---

### 2) 服务器最低配置建议

* **2 vCPU / 4GB RAM / 40GB SSD**（小规模监控够用）
* 若并发币种多、AI 调用频繁，建议 **4 vCPU / 8GB RAM**

---

### 3) 一键式部署步骤（Ubuntu）

#### Step A. 安装 Node.js 20 + 基础工具

```bash
sudo apt update
sudo apt install -y curl git build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

#### Step B. 拉代码并安装依赖

```bash
git clone <your-repo-url> /opt/crypto-signal-monitor
cd /opt/crypto-signal-monitor
npm ci
cp .env.example .env
```

编辑 `.env` 填好 API Key（OpenAI/DeepSeek/Telegram 等）。

#### Step C. 构建并用 PM2 守护进程

```bash
npm run build
sudo npm install -g pm2
pm2 start "npm run start" --name crypto-monitor
pm2 save
pm2 startup
```

> `npm run start` 会同时启动 Next 服务和 worker（由 `concurrently` 管理）。

#### Step D. 配置 Nginx 反向代理（可选但推荐）

创建 `/etc/nginx/sites-available/crypto-monitor`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/crypto-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 4) 生产环境建议

* 用 HTTPS（可配 `certbot`）。
* 只开放 22/80/443 端口，关闭无关端口。
* 定期备份 `crypto_monitor.sqlite`。
* 给 `.env` 设置最小权限：`chmod 600 .env`。
* 用 `pm2 logs crypto-monitor` 持续观察 API 限速和 Telegram 发送状态。

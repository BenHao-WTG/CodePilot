# CodePilot 运行说明

由于 CodePilot 使用 Next.js API 路由来处理后端逻辑，应用需要 Node.js 运行时支持。

## 运行应用

### 方式1：使用启动脚本（推荐）

**PowerShell 脚本：**
```powershell
.\run.ps1
```

**批处理脚本：**
```cmd
run.bat
```

这些脚本会自动：
1. 检查并安装依賴
2. 构建 Next.js 应用
3. 启动 Next.js 服务器
4. 启动 Tauri 应用

### 方式2：手动运行

1. 安装依赖（首次运行）：
```bash
npm install
```

2. 构建 Next.js：
```bash
npm run build
```

3. 在一个终端启动 Next.js 服务器：
```bash
node .next\standalone\server.js
```

4. 在另一个终端或直接双击运行：
```
src-tauri\target\release\app.exe
```

## 开发模式

使用开发模式无需手动启动服务器：

```bash
npm run tauri:dev
```

## 注意事项

- 应用依赖 Node.js 运行时，请确保已安装 Node.js
- Next.js 服务器默认运行在 http://localhost:3000
- 关闭 Tauri 应用后，请记得停止 Next.js 服务器进程

## 未来改进

计划将 API 路由逐步迁移到 Tauri 命令，以实现完全独立的桌面应用，无需 Node.js 运行时。

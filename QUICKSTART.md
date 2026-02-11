# CodePilot - 快速开始指南

## 问题解决：app.exe 显示 "asset not found: index.html"

这个问题已经解决!CodePilot 使用 Next.js API 路由处理后端逻辑，因此需要运行 Next.js 服务器。

## 运行方式

### 方法1：使用启动脚本（推荐）

```powershell
.\run.ps1
```

或

```cmd
run.bat
```

这个脚本会自动：
1. 检查并安装依赖
2. 构建 Next.js 应用（如果需要）
3. 启动 Next.js 服务器
4. 启动 CodePilot 应用

### 方法2：手动运行（两步）

**步骤1：启动 Next.js 服务器**
```powershell
# 首次运行需要构建
npm run build

# 启动服务器（保持此窗口打开）
$env:PORT=3000; $env:HOSTNAME="localhost"; node .next\standalone\server.js
```

**步骤2：运行应用**
```powershell
# 在新窗口中运行
.\src-tauri\target\release\app.exe
```

## 开发模式

如果你要开发或调试，使用：

```powershell
npm run tauri:dev
```

这会自动启动开发服务器和应用。

## 重新构建应用

如果需要重新构建 Tauri 应用：

```powershell  
.\build.ps1
```

清理构建：

```powershell
.\build.ps1 -Clean
```

## 注意事项

- **需要 Node.js**：应用依赖 Node.js 运行时，请确保已安装
- **端口 3000**：Next.js 服务器默认使用 3000 端口
- **停止服务器**：关闭应用后，按 Ctrl+C 停止服务器进程

## 故障排除

### 端口 3000 被占用

```powershell
# 查找占用进程
$process = Get-NetTCPConnection -LocalPort  3000 | Select-Object -ExpandProperty OwningProcess
# 停止进程
Stop-Process -Id $process -Force
```

### 应用无法加载

1. 确认 Next.js 服务器正在运行（http://localhost:3000 可访问）
2. 检查防火墙设置
3. 查看控制台错误信息

## 技术架构

- **前端**: Next.js 16 + React 19
- **桌面框架**: Tauri 2.0
- **运行模式**: Next.js Standalone + Tauri Webview

当前架构要求 Node.js 运行时。未来计划将 API 路由迁移到 Tauri 命令，实现完全独立的桌面应用。

# CodePilot 发布打包脚本
# 用于创建客户发布包

param(
    [string]$Version = "1.0.0",
    [switch]$Zip = $true,
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "========================================="
Write-ColorOutput Green "  CodePilot 发布打包工具"
Write-ColorOutput Green "========================================="
Write-Output ""

# 获取项目根目录
$RootDir = Split-Path -Parent $PSScriptRoot
$ReleaseDir = Join-Path $RootDir "src-tauri\target\release"
$PublishRoot = Join-Path $RootDir "publish"
$PublishDir = Join-Path $PublishRoot "CodePilot-v$Version"

# 检查必要文件
Write-Output "检查构建文件..."
$AppExe = Join-Path $ReleaseDir "app.exe"
$ResourcesDir = Join-Path $ReleaseDir "resources"

if (-not (Test-Path $AppExe)) {
    Write-ColorOutput Red "错误: 找不到 app.exe"
    Write-Output "请先运行构建: .\build.ps1"
    exit 1
}

if (-not (Test-Path $ResourcesDir)) {
    Write-ColorOutput Red "错误: 找不到 resources 目录"
    exit 1
}

# 清理旧的发布包
if ($Clean -and (Test-Path $PublishRoot)) {
    Write-Output "清理旧的发布包..."
    Remove-Item $PublishRoot -Recurse -Force
}

# 创建发布目录
Write-Output "创建发布目录: $PublishDir"
if (Test-Path $PublishDir) {
    Remove-Item $PublishDir -Recurse -Force
}
New-Item -ItemType Directory -Path $PublishDir -Force | Out-Null

# 复制主程序
Write-Output "复制主程序..."
$TargetExe = Join-Path $PublishDir "CodePilot.exe"
Copy-Item $AppExe $TargetExe -Force
$ExeSize = [math]::Round((Get-Item $TargetExe).Length / 1MB, 2)
Write-ColorOutput Cyan "  ✓ CodePilot.exe ($ExeSize MB)"

# 复制资源目录
Write-Output "复制资源文件..."
$TargetResources = Join-Path $PublishDir "resources"
Copy-Item $ResourcesDir $TargetResources -Recurse -Force

# 计算资源大小
$ResourcesSize = [math]::Round((Get-ChildItem $TargetResources -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-ColorOutput Cyan "  ✓ resources/ ($ResourcesSize MB)"

# 创建 README
$ReadmePath = Join-Path $PublishDir "README.txt"
$ReadmeContent = @"
CodePilot v$Version
===================

感谢使用 CodePilot！

## 运行说明

双击 CodePilot.exe 即可启动应用程序。

## 系统要求

- Windows 10/11 (64-bit)
- 无需额外安装运行时环境

## 目录说明

- CodePilot.exe - 主程序
- resources/ - 应用资源文件（请勿删除）

## 注意事项

- 首次启动可能需要几秒钟初始化
- 请勿删除或移动 resources 目录
- 建议将整个文件夹解压到本地磁盘运行

## 技术支持

如有问题，请访问: https://github.com/op7418/CodePilot

发布日期: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

Set-Content -Path $ReadmePath -Value $ReadmeContent -Encoding UTF8
Write-ColorOutput Cyan "  ✓ README.txt"

# 可选: 复制许可证文件
$LicenseFile = Join-Path $RootDir "LICENSE"
if (Test-Path $LicenseFile) {
    Copy-Item $LicenseFile (Join-Path $PublishDir "LICENSE.txt") -Force
    Write-ColorOutput Cyan "  ✓ LICENSE.txt"
}

# 计算总大小
$TotalSize = [math]::Round((Get-ChildItem $PublishDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Output ""
Write-ColorOutput Green "打包完成!"
Write-Output "发布目录: $PublishDir"
Write-Output "总大小: $TotalSize MB"

# 创建 ZIP 压缩包
if ($Zip) {
    Write-Output ""
    Write-Output "创建 ZIP 压缩包..."
    $ZipPath = Join-Path $PublishRoot "CodePilot-v$Version.zip"
    
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }
    
    # 使用 .NET 压缩
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($PublishDir, $ZipPath)
    
    $ZipSize = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
    Write-ColorOutput Green "  ✓ 压缩包创建成功"
    Write-Output "  位置: $ZipPath"
    Write-Output "  大小: $ZipSize MB"
    
    # 计算压缩率
    $CompressionRatio = [math]::Round((1 - $ZipSize / $TotalSize) * 100, 1)
    Write-Output "  压缩率: $CompressionRatio%"
}

Write-Output ""
Write-ColorOutput Green "========================================="
Write-ColorOutput Green "发布包准备完毕，可以交付给客户"
Write-ColorOutput Green "========================================="
Write-Output ""
Write-Output "文件清单:"
Write-Output "  - CodePilot.exe (主程序)"
Write-Output "  - resources/ (资源目录)"
Write-Output "  - README.txt (使用说明)"
if (Test-Path (Join-Path $PublishDir "LICENSE.txt")) {
    Write-Output "  - LICENSE.txt (许可证)"
}
Write-Output ""

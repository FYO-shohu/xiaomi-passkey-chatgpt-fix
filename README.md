# Xiaomi Passkey ChatGPT Fix

一个无需 root、无需 LSPosed 的临时兼容工具：修复小米 HyperOS 上使用小米密码管理器通行密钥登录 ChatGPT 时，指纹通过后登录页面无响应的问题。

> 本项目是临时 workaround。小米 FIDO 组件未修复前，刷新页面或以后登录时可能复发，重新运行脚本即可。不会删除通行密钥，也不绕过指纹或服务器验证。

## 问题现象

- 小米手机，HyperOS 3 / Android 16
- 通行密钥保存在小米密码管理器
- ChatGPT 网页或 Android App 登录
- 可以选择通行密钥，指纹也通过
- 之后页面一直加载，没有登录结果
- 日志出现小米 FIDO 组件空指针：

~~~text
MiFido_fido2_CredentialRequest:
java.lang.NullPointerException:
Attempt to invoke virtual method 'java.lang.String d3.e.g()'
on a null object reference

cr_ChromiumWebauthn:
CredMan getCredential call failed with
android.credentials.GetCredentialException.TYPE_UNKNOWN
~~~

## 原因

登录页没有给候选凭据有效的 WebAuthn transports。Chrome/Edge 会把空列表扩展成六种连接方式，其中包括 smart-card。

小米旧 FIDO 组件只认识五种，未知的 smart-card 被映射成 null，后续代码直接解引用，导致指纹通过后流程中断。

本工具在 WebAuthn 请求发出前注入一个小包装器，只把 allowCredentials 的 transports 限定为 internal。凭据 ID、challenge、rpId、用户验证和服务器校验都保持不变。

## 特性

- 无需 root
- 无需 LSPosed 或 Xposed
- 不删除通行密钥
- 不改系统 APK
- 自动等待 auth.openai.com 登录页
- 自动处理新开的登录页面
- 退出时自动清理 adb 端口转发
- 无第三方 Node.js 依赖

## 环境要求

- Windows 10/11
- Node.js 22 或更高版本
- Android Platform Tools（adb 在 PATH 中）
- Edge 或 Chrome for Android
- 手机已开启 USB 调试并允许当前电脑
- 建议只连接一台 adb 设备

检查：

~~~powershell
adb devices -l
node -v
~~~

## 快速开始

### 1. 打开登录页

手机打开 ChatGPT，进入登录流程，直到浏览器出现 auth.openai.com 页面并看到“使用密钥继续”。

先不要点击“使用密钥继续”。脚本也可以提前运行，它会自动等待页面。

### 2. 双击脚本

Windows 双击：

~~~text
一键修复小米通行密钥.cmd
~~~

或命令行：

~~~powershell
cd /d 你的项目目录
node xiaomi-passkey-fix.mjs
~~~

macOS / Linux 也可以直接运行：

~~~bash
node xiaomi-passkey-fix.mjs
~~~

### 3. 完成登录

窗口出现下面内容后，在手机上点击“使用密钥继续”并完成指纹：

~~~text
[OK] 已注入：https://auth.openai.com/...
现在在手机上点“使用密钥继续”，再按指纹。
~~~

登录页离开 8 秒后脚本会自动退出，并移除 adb 端口转发。

## 使用说明

详细中文操作步骤见：

- [小米通行密钥-ChatGPT登录修复操作.md](./小米通行密钥-ChatGPT登录修复操作.md)

## 故障排查

### 找不到 adb

安装 Android Platform Tools，并把 platform-tools 加入 PATH：

~~~powershell
adb devices -l
~~~

### 设备 unauthorized

解锁手机，在“允许 USB 调试”弹窗中点允许。

### 端口 9222 被占用

~~~powershell
adb forward --remove tcp:9222
~~~

再重新运行脚本。

### 一直等待 auth.openai.com

确认登录页在 Edge 或 Chrome 中打开，而不是在 ChatGPT App 的内嵌 WebView 中。刷新登录页，保持脚本运行。

检查浏览器是否暴露 DevTools socket：

~~~powershell
adb shell "cat /proc/net/unix | grep devtools"
~~~

应看到包含 **@chrome_devtools_remote** 的行。

### 已注入但仍然失败

1. 确认注入发生在点击“使用密钥继续”之前。
2. 如果页面刷新过，关闭登录页重新打开。
3. 重新运行脚本，等 [OK] 后再按指纹。

不要删除通行密钥。问题通常不是密钥丢失。

## 安全与隐私

本工具：

- 只通过本机 adb 和浏览器 DevTools 协议工作
- 只在 auth.openai.com 页面修改 WebAuthn transports
- 不读取或保存密码、通行密钥、challenge、cookie 或指纹数据
- 不连接第三方服务器
- 仍需手机指纹确认和 OpenAI 服务器验证

完整 auth.openai.com 登录链接可能包含认证参数，请勿公开发布。不要分享凭据 ID、恢复码或完整日志。

## 限制

- 这是针对小米 FIDO 组件兼容问题的临时处理
- 不是对 HyperOS 的永久修复
- 页面刷新、浏览器重启或以后登录时可能再次出现
- 仅验证了 Edge / Chrome Android 上的场景
- 外置安全密钥、跨设备认证等场景不在本项目范围内

## 项目结构

~~~text
.
├── 一键修复小米通行密钥.cmd
├── run.cmd
├── xiaomi-passkey-fix.mjs
├── 小米通行密钥-ChatGPT登录修复操作.md
├── package.json
├── README.md
├── LICENSE
└── SECURITY.md
~~~

## 开发

~~~powershell
npm run check
~~~

该命令只做语法检查，不会连接设备。

## 参考

- [小米通行密钥登录排查记录](https://427795.xyz/notes/xiaomi-chatgpt-passkey/)
- [V2EX 讨论](https://www.v2ex.com/t/1247821)
- [W3C WebAuthn transports](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialdescriptor)
- [Chromium 154.0.8037.126 转换代码](https://chromium.googlesource.com/chromium/src/+/refs/tags/154.0.8037.126/third_party/blink/renderer/modules/credentialmanagement/credential_manager_type_converters.cc)

## License

MIT

## English summary

A temporary, root-free workaround for Xiaomi HyperOS passkey login failures on ChatGPT.

On affected devices, Chrome/Edge expands an empty WebAuthn transports list to include smart-card. Xiaomi's older FIDO component maps the unknown transport to null and throws a NullPointerException after fingerprint verification. The script injects a WebAuthn wrapper that limits allowCredentials transports to internal.

Requirements: Node.js 22+, adb, Edge/Chrome for Android, USB debugging. The tool does not delete passkeys or bypass biometric or server verification.

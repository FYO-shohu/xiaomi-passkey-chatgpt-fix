# 小米通行密钥登录 ChatGPT 一键修复操作

> 适用：小米 HyperOS / Android 16，通行密钥在小米密码管理器中，登录 ChatGPT 时“能选密钥、指纹通过、页面无响应”。  
> 性质：临时兼容处理。不删密钥、不需要 root、不需要 LSPosed。刷新页面、重开浏览器或以后登录时可能复发，重新运行脚本即可。

## 文件说明

本目录有三个文件：

1. **一键修复小米通行密钥.cmd**：双击运行。平时只需要用这个。
2. **xiaomi-passkey-fix.mjs**：脚本实现文件，由 cmd 调用，不要直接改。
3. **小米通行密钥-ChatGPT登录修复操作.md**：本说明。

## 修复原理

Chrome/Edge 会把空的 WebAuthn transports 补成六种连接方式，其中包含 smart-card。小米旧 FIDO 组件不认识 smart-card，把它映射成 null，指纹通过后触发空指针，登录流程中断。

脚本在登录页执行前注入一个小包装器，只把候选凭据的 transports 限定为 internal。密钥、challenge、rpId、指纹和服务器验证都不变。

## 使用前提

1. Windows 电脑已安装 adb，且 adb 在 PATH 中。
2. 电脑已安装 Node.js 22 或更高版本。
3. 手机已开启开发者选项和 USB 调试。
4. 数据线连接手机，手机上已允许 USB 调试。
5. 手机默认浏览器是 Edge 或 Chrome。
6. 建议只连接一台 adb 设备。

先检查：

~~~powershell
adb devices -l
node -v
~~~

adb 输出里必须有一行以 device 结尾的设备。Node 版本需要 v22 或更高。

如果连接了多台设备，先设置序列号：

~~~powershell
set ANDROID_SERIAL=你的设备序列号
~~~

## 一键操作步骤

### 1. 打开 ChatGPT 登录页

在手机上打开 ChatGPT，进入登录流程。

一直操作到浏览器出现 auth.openai.com 页面，并看到“使用密钥继续”按钮。

先不要点“使用密钥继续”。

脚本也可以提前运行，它会自动等待这个页面出现。

### 2. 双击脚本

双击：

~~~text
E:\HyperPassKey\一键修复小米通行密钥.cmd
~~~

窗口会依次显示：

~~~text
[1/4] adb 设备：...
[2/4] 已建立 DevTools 转发：127.0.0.1:9222
[3/4] 等待 auth.openai.com 登录页...
~~~

检测到登录页后显示：

~~~text
[OK] 已注入：https://auth.openai.com/...
现在在手机上点“使用密钥继续”，再按指纹。
~~~

### 3. 手机上完成验证

看到 [OK] 后，在手机上点“使用密钥继续”，然后按指纹。

### 4. 等待脚本结束

登录成功、认证页离开后，脚本会自动显示：

~~~text
[4/4] 认证页已离开，登录流程可能已经完成。
已移除 adb 端口转发。
~~~

然后确认 ChatGPT App 已登录。

如果脚本没有自动结束，但手机已经登录成功，在脚本窗口按 Ctrl+C 退出即可。

### 5. 以后再次遇到

重复“打开登录页 → 双击 cmd → 点使用密钥继续 → 指纹”即可。

不需要重新下载或修改脚本。

## 脚本做了什么

1. 自动检查 adb 设备。
2. 自动建立 127.0.0.1:9222 的 DevTools 转发。
3. 轮询浏览器目标，等待 auth.openai.com。
4. 对当前登录页注入 transports 兼容包装器。
5. 对登录过程中新开的 auth.openai.com 页面继续注入。
6. 登录页离开 8 秒后自动退出。
7. 退出时移除 adb 端口转发。

脚本不会读取或保存密码、通行密钥、challenge、指纹数据。

## 常见问题

### 1. 提示找不到 Node.js

安装 Node.js 22 或更高版本，安装后重新双击 cmd。

检查：

~~~powershell
node -v
~~~

### 2. 提示找不到 adb 或没有设备

检查数据线、USB 调试和手机上的授权弹窗。

~~~powershell
adb devices -l
~~~

如果设备状态是 unauthorized，在手机上点“允许 USB 调试”。

### 3. 一直停在“等待 auth.openai.com 登录页”

原因通常是当前页面不是浏览器里的 auth.openai.com，或者登录页还没打开。

处理：

1. 确认页面地址栏是 auth.openai.com。
2. 确认用的是 Edge 或 Chrome，不是其他浏览器。
3. 刷新登录页。
4. 保持脚本运行，重新进入登录流程。
5. 仍不行时，在电脑打开 http://127.0.0.1:9222/json，确认能看到 auth.openai.com 页面。

### 4. 提示端口 9222 被占用或 adb forward 失败

先清理旧转发，再重新双击脚本：

~~~powershell
adb forward --remove tcp:9222
~~~

### 5. 显示 [OK] 但登录仍卡住

1. 确认是在点“使用密钥继续”之前注入的。
2. 如果登录页刷新过或跳到了新页面，重新运行脚本。
3. 关闭当前登录标签页，重新打开 ChatGPT 登录流程。
4. 再双击脚本，等 [OK] 后重新过指纹。

不要删除通行密钥。问题不是密钥丢失。

### 6. 脚本自动退出但没登录成功

可能是认证页被关闭，或者页面提前跳走。重新打开登录页，再运行脚本。

### 7. 有多个 adb 设备

设置目标设备后再运行：

~~~powershell
set ANDROID_SERIAL=设备序列号
E:\HyperPassKey\一键修复小米通行密钥.cmd
~~~

## 手动兜底方案

只有脚本不可用时才用。

### 1. 建立转发

~~~powershell
adb forward tcp:9222 localabstract:chrome_devtools_remote
~~~

### 2. 打开桌面调试工具

手机停在 auth.openai.com 的“使用密钥继续”页面。

电脑打开：

~~~text
edge://inspect/#devices
~~~

或：

~~~text
chrome://inspect/#devices
~~~

找到 auth.openai.com 页面，点击 Inspect。

### 3. 在 Console 粘贴

~~~js
(() => {
  if (location.hostname !== 'auth.openai.com') return 'wrong page';
  if (window.__xiaomiTransportCompat) return 'already injected';

  const original = navigator.credentials.get.bind(navigator.credentials);

  navigator.credentials.get = function(options) {
    const pk = options?.publicKey;
    if (pk?.rpId === 'openai.com' && pk.allowCredentials?.length) {
      options = {
        ...options,
        publicKey: {
          ...pk,
          allowCredentials: pk.allowCredentials.map(c => ({
            ...c,
            transports: ['internal']
          }))
        }
      };
    }
    return original(options);
  };

  window.__xiaomiTransportCompat = true;
  return 'injected';
})();
~~~

返回 injected 后，在手机上点“使用密钥继续”并过指纹。

### 4. 清理

~~~powershell
adb forward --remove tcp:9222
~~~

## 注意

1. 不要删除唯一可用的通行密钥。
2. 不要清空密码管理器。
3. 这是小米 FIDO 组件的临时兼容方案，不是永久系统修复。
4. 仍需指纹和服务器验证，脚本没有绕过安全验证。
5. 不要把完整 auth.openai.com 登录链接、日志、凭据 ID 或恢复码发给别人。

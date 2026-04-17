# Sandbox Chinese IME

一个离线 Chrome 扩展，用 content script 在网页输入框里实现简体中文拼音输入。它不调用远端候选服务，当前只支持页面内的 `input`、`textarea` 和 `contenteditable`，不支持地址栏、Chrome Web Store、其他扩展页。

## 安装

1. 打开 `chrome://extensions/`。
2. 打开右上角“开发者模式”。
3. 选择“加载已解压的扩展程序”。
4. 选择这个目录：`/Users/lvze/拼音`。

## 交互

- 工具栏图标：开关中文输入。
- `Alt+Shift+T`：开关中文输入。
- 直接输入拼音：显示候选窗。
- `Space`：上屏首选中文。
- `1` 到 `9`：选择候选。
- `Enter`：上屏原始英文拼音。
- `Esc`：取消当前拼音。
- `-` / `=` 或 `PageUp` / `PageDown`：候选翻页。

## 实现说明

这个扩展采用页面注入方案，而不是系统输入法 API。桌面 Chrome 扩展不能像 ChromeOS 那样接管系统级 IME，所以扩展只能在网页可编辑区域拦截键盘事件、调用离线解码器、再把结果写回当前输入框。

输入引擎来自 Google Input Tools 开源仓库中的 Chromium OS 离线简体拼音解码器，保留在 `vendor/google-input-tools`。扩展的 UI 和页面写入逻辑在 `src` 下，后续如果要换成 `fcitx5-rime.js`，可以把 `src/pinyin-engine.js` 替换为 Rime/WASM adapter，content script 的交互层不用重写。

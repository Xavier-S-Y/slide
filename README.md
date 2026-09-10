# 土耳其方块 H5

零依赖原生 H5 小游戏，包含普通版和道具版。道具版支持单块移动、单块消除、一行消除和同色消除，并使用 Web Audio 实时合成背景音乐与操作音效。

## 运行

在本目录运行内置零依赖服务器：

```powershell
node server.mjs
```

浏览器打开 `http://127.0.0.1:4173`。不要直接双击 `index.html`，浏览器会限制 ES Modules 的本地文件加载。

## 测试

```powershell
node --test tests/*.test.mjs
```

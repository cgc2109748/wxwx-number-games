# 小程序兼容性修改说明

## 概述

本项目已将所有 `canvas.addEventListener` 相关代码修改为兼容微信小程序真机环境的实现，同时保持了对 Web 环境的兼容性。

## 主要修改内容

### 1. 事件监听器替换

**原代码：**

```javascript
this.canvas.addEventListener("touchstart", this.touchHandler);
this.canvas.addEventListener("touchend", this.touchHandler);
this.canvas.addEventListener("click", this.clickHandler);
```

**修改后：**

```javascript
if (typeof wx !== "undefined") {
  // 小程序环境
  wx.onTouchStart(this.touchHandler);
  wx.onTouchEnd(this.touchHandler);
} else {
  // Web环境（兼容性）
  this.canvas.addEventListener("touchstart", this.touchHandler);
  this.canvas.addEventListener("touchend", this.touchHandler);
  this.canvas.addEventListener("click", this.clickHandler);
}
```

### 2. 事件移除器替换

**原代码：**

```javascript
this.canvas.removeEventListener("touchstart", this.touchHandler);
this.canvas.removeEventListener("touchend", this.touchHandler);
```

**修改后：**

```javascript
if (typeof wx !== "undefined") {
  // 小程序环境
  wx.offTouchStart(this.touchHandler);
  wx.offTouchEnd(this.touchHandler);
} else {
  // Web环境
  this.canvas.removeEventListener("touchstart", this.touchHandler);
  this.canvas.removeEventListener("touchend", this.touchHandler);
}
```

### 3. 坐标处理适配

**原代码：**

```javascript
const rect = this.canvas.getBoundingClientRect();
const x = touch.clientX - rect.left;
const y = touch.clientY - rect.top;
```

**修改后：**

```javascript
let x, y;
if (typeof wx !== "undefined") {
  // 小程序环境
  const touch = e.touches[0];
  x = touch.clientX;
  y = touch.clientY;
} else {
  // Web环境
  const rect = this.canvas.getBoundingClientRect();
  x = touch.clientX - rect.left;
  y = touch.clientY - rect.top;
}
```

### 4. 移除 preventDefault 调用

由于小程序环境中的事件对象没有 `preventDefault` 方法，已移除所有相关调用。

**移除的代码：**

```javascript
e.preventDefault();
e?.preventDefault();
```

## 修改的文件列表

1. **level3-game.js** - 第三关数字消除游戏
2. **start-page.js** - 开始页面
3. **sorting-game.js** - 排序游戏
4. **number-elimination-game.js** - 数字消除游戏
5. **advanced-number-elimination-game.js** - 高级数字消除游戏
6. **guess-number-game.js** - 猜数字游戏
7. **level4-game.js** - 第四关游戏

## 环境检测机制

项目使用 `typeof wx !== "undefined"` 来检测当前运行环境：

- 如果 `wx` 对象存在，则使用小程序 API
- 如果 `wx` 对象不存在，则使用 Web API

## 兼容性保证

- ✅ 微信小程序真机环境
- ✅ 微信开发者工具
- ✅ Web 浏览器环境
- ✅ 其他支持 Canvas 的 JavaScript 环境

## 注意事项

1. **事件处理函数引用**：所有事件处理函数都保存为实例属性，确保可以正确移除事件监听器
2. **坐标系统**：小程序环境直接使用 `clientX/clientY`，Web 环境需要减去 canvas 偏移量
3. **事件对象差异**：小程序环境的事件对象结构与 Web 环境不同，已做相应适配
4. **内存管理**：所有游戏类都正确实现了 `destroy()` 方法，确保事件监听器被正确清理

## 测试建议

1. 在微信开发者工具中测试所有游戏功能
2. 在真机上测试触摸响应
3. 在 Web 浏览器中测试兼容性
4. 检查内存泄漏（确保事件监听器被正确移除）

## 技术细节

### 小程序 API 对应关系

- `canvas.addEventListener` → `wx.onTouchStart`
- `canvas.removeEventListener` → `wx.offTouchStart`
- `e.preventDefault()` → 移除（小程序不支持）

### 坐标系统差异

- **Web 环境**：需要计算相对于 canvas 的偏移量
- **小程序环境**：直接使用触摸坐标

### 事件对象结构

- **Web 环境**：`e.touches[0].clientX`
- **小程序环境**：`e.touches[0].clientX`（结构相同，但对象来源不同）

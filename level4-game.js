// level4-game.js - 第四关：完成游戏页面

// 兼容性工具函数
function getCanvasRect(canvas) {
  if (typeof wx !== "undefined") {
    // 小程序环境：返回相对于屏幕的坐标
    // 在小程序中，canvas通常占满整个屏幕，所以返回 {left: 0, top: 0}
    return { left: 0, top: 0, width: canvas.width, height: canvas.height };
  } else {
    // Web环境：使用原生getBoundingClientRect方法
    return canvas.getBoundingClientRect();
  }
}

class Level4Game {
  constructor(canvas, ctx, gameManager, initialScore = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameManager = gameManager;

    // 创建升级版数字消除游戏实例
    this.game = new AdvancedNumberEliminationGame(
      canvas,
      ctx,
      gameManager,
      initialScore
    );
  }

  render() {
    // 游戏渲染由AdvancedNumberEliminationGame处理
    if (this.game) {
      this.game.render();
    }

    // 绘制完成按钮
    this.drawCompleteButton();
  }

  drawDecorations() {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 150;
      const x = this.canvas.width / 2 + Math.cos(angle) * radius;
      const y = this.canvas.height / 2 + Math.sin(angle) * radius;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 20, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.fill();
    }
  }

  drawCompleteButton() {
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (this.canvas.width - buttonWidth) / 2;
    const buttonY = this.canvas.height / 2 + 100;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(buttonX + 4, buttonY + 4, buttonWidth, buttonHeight);

    const buttonGradient = this.ctx.createLinearGradient(
      buttonX,
      buttonY,
      buttonX,
      buttonY + buttonHeight
    );
    buttonGradient.addColorStop(0, "#FF6B35");
    buttonGradient.addColorStop(1, "#F7931E");
    this.ctx.fillStyle = buttonGradient;
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    this.ctx.strokeStyle = "#FFFFFF";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    // 绘制按钮文字
    this.ctx.fillStyle = "#FFFFFF";
    const buttonFontSize = Math.min(20, this.canvas.width / 20);
    this.ctx.font = `bold ${buttonFontSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(
      "完成游戏",
      this.canvas.width / 2,
      buttonY + buttonHeight / 2
    );

    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;

    this.bindEvents(buttonX, buttonY, buttonWidth, buttonHeight);
  }

  bindEvents(buttonX, buttonY, buttonWidth, buttonHeight) {
    const touchHandler = (e) => {
      let x, y;
      if (typeof wx !== "undefined") {
        // 小程序环境
        const touch = e.touches[0];
        x = touch.clientX;
        y = touch.clientY;
      } else {
        // Web环境
        const touch = e.touches[0];
        const rect = getCanvasRect(this.canvas);
        x = touch.clientX - rect.left;
        y = touch.clientY - rect.top;
      }

      if (
        x >= buttonX &&
        x <= buttonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.unbindEvents(touchHandler);
        this.gameManager.gameComplete();
      }
    };

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(touchHandler);
    } else {
      // Web环境（兼容性）
      this.canvas.addEventListener("touchstart", touchHandler);
    }
  }

  unbindEvents(touchHandler) {
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.offTouchStart(touchHandler);
    } else {
      // Web环境
      this.canvas.removeEventListener("touchstart", touchHandler);
    }
  }

  destroy() {
    // 清理升级版数字消除游戏资源
    if (this.game) {
      this.game.destroy();
    }
  }
}

// 将Level4Game类暴露到全局作用域
if (typeof global !== "undefined") {
  global.Level4Game = Level4Game;
} else if (typeof window !== "undefined") {
  window.Level4Game = Level4Game;
} else {
  // 微信小游戏环境
  this.Level4Game = Level4Game;
}

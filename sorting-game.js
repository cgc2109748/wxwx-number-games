// sorting-game.js - 第一关数字排序游戏

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

class SortingGame {
  constructor(canvas, ctx, gameManager) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameManager = gameManager;

    // 游戏配置参数
    this.config = {
      initialTime: 60, // 初始倒计时时间（秒）
      initialScore: 1000, // 初始分数
      swapPenalty: 10, // 交换数字扣分
      shufflePenalty: 200, // 打乱扣分
      addTimePenalty: 100, // 加时扣分
      timeBonus: 10, // 剩余时间奖励倍数
      addTimeAmount: 10, // 加时秒数
    };

    // 游戏状态
    this.level = 1;
    this.score = this.config.initialScore;
    this.timeLeft = this.config.initialTime;
    this.isGameActive = true;
    this.isModalVisible = false;
    this.gameResult = null; // 存储游戏结果：true为胜利，false为失败

    // 九宫格数据
    this.grid = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    this.targetGrid = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    // UI布局
    this.gridSize = 3;
    this.cellSize = Math.min(this.canvas.width, this.canvas.height) * 0.15;
    this.gridStartX = (this.canvas.width - this.cellSize * 3) / 2;
    this.gridStartY = this.canvas.height * 0.3;

    // 按钮布局
    this.buttonWidth = this.canvas.width * 0.25;
    this.buttonHeight = 50;
    this.buttonY = this.canvas.height * 0.75;

    // 选中的格子
    this.selectedCell = null;

    this.init();
  }

  init() {
    this.shuffleGrid();
    this.bindEvents();
    this.startTimer();
    this.render();
  }

  shuffleGrid() {
    // 打乱九宫格，确保有解
    do {
      for (let i = this.grid.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.grid[i], this.grid[j]] = [this.grid[j], this.grid[i]];
      }
    } while (this.isGridSolved() || !this.isSolvable());
  }

  isSolvable() {
    // 检查九宫格是否有解（逆序对数量为偶数）
    let inversions = 0;
    for (let i = 0; i < this.grid.length - 1; i++) {
      for (let j = i + 1; j < this.grid.length; j++) {
        if (this.grid[i] > this.grid[j]) {
          inversions++;
        }
      }
    }
    return inversions % 2 === 0;
  }

  startTimer() {
    this.timer = setInterval(() => {
      if (this.isGameActive && !this.isModalVisible) {
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.gameOver(false);
        }
        this.render();
      }
    }, 1000);
  }

  bindEvents() {
    this.touchHandler = (e) => {
      if (!this.isGameActive || this.isModalVisible) return;

      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;

      // 检查九宫格点击
      const cellIndex = this.getCellIndex(x, y);
      if (cellIndex !== -1) {
        this.handleCellClick(cellIndex);
        return;
      }

      // 检查按钮点击
      this.handleButtonClick(x, y);
    };

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(this.touchHandler);
    } else {
      // Web环境（兼容性）
      this.canvas.addEventListener("touchstart", this.touchHandler);
    }
  }

  getCellIndex(x, y) {
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cellX = this.gridStartX + col * this.cellSize;
      const cellY = this.gridStartY + row * this.cellSize;

      if (
        x >= cellX &&
        x <= cellX + this.cellSize &&
        y >= cellY &&
        y <= cellY + this.cellSize
      ) {
        return i;
      }
    }
    return -1;
  }

  handleCellClick(index) {
    if (this.selectedCell === null) {
      this.selectedCell = index;
    } else if (this.selectedCell === index) {
      this.selectedCell = null;
    } else {
      // 检查是否相邻
      if (this.areAdjacent(this.selectedCell, index)) {
        this.swapCells(this.selectedCell, index);
        this.score -= this.config.swapPenalty;

        if (this.isGridSolved()) {
          this.gameOver(true);
        }
      }
      this.selectedCell = null;
    }
    this.render();
  }

  areAdjacent(index1, index2) {
    const row1 = Math.floor(index1 / 3);
    const col1 = index1 % 3;
    const row2 = Math.floor(index2 / 3);
    const col2 = index2 % 3;

    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);

    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  swapCells(index1, index2) {
    [this.grid[index1], this.grid[index2]] = [
      this.grid[index2],
      this.grid[index1],
    ];
  }

  isGridSolved() {
    return this.grid.every((num, index) => num === this.targetGrid[index]);
  }

  handleButtonClick(x, y) {
    const buttonSpacing = this.canvas.width / 3;

    // 打乱按钮
    if (
      x >= buttonSpacing * 0 + 20 &&
      x <= buttonSpacing * 1 - 20 &&
      y >= this.buttonY &&
      y <= this.buttonY + this.buttonHeight
    ) {
      this.shuffleGrid();
      this.score -= this.config.shufflePenalty;
      this.render();
    }

    // 加时按钮
    if (
      x >= buttonSpacing * 1 + 20 &&
      x <= buttonSpacing * 2 - 20 &&
      y >= this.buttonY &&
      y <= this.buttonY + this.buttonHeight
    ) {
      this.timeLeft += this.config.addTimeAmount;
      this.score -= this.config.addTimePenalty;
      this.render();
    }

    // 跳关按钮
    if (
      x >= buttonSpacing * 2 + 20 &&
      x <= buttonSpacing * 3 - 20 &&
      y >= this.buttonY &&
      y <= this.buttonY + this.buttonHeight
    ) {
      this.calculateFinalScore();
      this.gameManager.nextLevel(this.score);
    }
  }

  gameOver(isWin) {
    this.isGameActive = false;
    this.isModalVisible = true;
    this.gameResult = isWin; // 存储游戏结果
    clearInterval(this.timer);

    if (isWin) {
      this.calculateFinalScore();
    }

    this.showModal(isWin);
  }

  calculateFinalScore() {
    // 计算最终分数：当前分数 + 剩余时间 * 时间奖励倍数
    this.score += this.timeLeft * this.config.timeBonus;
  }

  showModal(isWin) {
    // 重新渲染整个画面，包括模态框
    this.render();

    // 绑定模态框事件
    const modalWidth = this.canvas.width * 0.8;
    const modalHeight = this.canvas.height * 0.4;
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;
    this.bindModalEvents(modalX, modalY, modalWidth, modalHeight, isWin);
  }

  drawModal(isWin) {
    // 绘制模态框背景
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制模态框
    const modalWidth = this.canvas.width * 0.8;
    const modalHeight = this.canvas.height * 0.4;
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    // 绘制模态框阴影
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.roundRect(modalX + 8, modalY + 8, modalWidth, modalHeight, 15);
    this.ctx.fill();

    // 绘制模态框背景
    this.ctx.fillStyle = "#FFFFFF";
    this.roundRect(modalX, modalY, modalWidth, modalHeight, 15);
    this.ctx.fill();

    // 绘制模态框边框
    this.ctx.strokeStyle = "#E0E0E0";
    this.ctx.lineWidth = 2;
    this.roundRect(modalX, modalY, modalWidth, modalHeight, 15);
    this.ctx.stroke();

    // 绘制文本
    this.ctx.fillStyle = "#000000";
    // 根据模态框大小调整字体大小
    const titleFontSize = Math.min(36, modalWidth / 10);
    this.ctx.font = `bold ${titleFontSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      isWin ? "闯关成功！" : "闯关失败！",
      this.canvas.width / 2,
      modalY + modalHeight * 0.3
    );

    const scoreFontSize = Math.min(20, modalWidth / 18);
    this.ctx.font = `${scoreFontSize}px Arial`;

    if (isWin) {
      // 显示详细的分数计算
      const baseScore = this.score - this.timeLeft * this.config.timeBonus;
      const timeBonus = this.timeLeft * this.config.timeBonus;

      this.ctx.fillText(
        `基础分数: ${baseScore}`,
        this.canvas.width / 2,
        modalY + modalHeight * 0.45
      );

      this.ctx.fillText(
        `时间奖励: ${this.timeLeft} × 10 = ${timeBonus}`,
        this.canvas.width / 2,
        modalY + modalHeight * 0.55
      );

      this.ctx.font = `bold ${Math.min(24, modalWidth / 15)}px Arial`;
      this.ctx.fillText(
        `总分: ${this.score}`,
        this.canvas.width / 2,
        modalY + modalHeight * 0.65
      );
    } else {
      this.ctx.fillText(
        `得分: ${this.score}`,
        this.canvas.width / 2,
        modalY + modalHeight * 0.5
      );
    }

    // 绘制按钮
    this.drawModalButtons(modalX, modalY, modalWidth, modalHeight, isWin);
  }

  drawModalButtons(modalX, modalY, modalWidth, modalHeight, isWin) {
    const buttonY = modalY + modalHeight * 0.75;
    const buttonHeight = 40;

    if (isWin) {
      // 下一关按钮
      const buttonWidth = modalWidth * 0.6;
      const buttonX = modalX + (modalWidth - buttonWidth) / 2;

      // 绘制按钮阴影
      this.ctx.fillStyle = "rgba(76, 175, 80, 0.3)";
      this.roundRect(buttonX + 3, buttonY + 3, buttonWidth, buttonHeight, 8);
      this.ctx.fill();

      // 绘制按钮背景
      this.ctx.fillStyle = "#4CAF50";
      this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
      this.ctx.fill();

      // 绘制按钮文字
      this.ctx.fillStyle = "#FFFFFF";
      // 根据按钮大小调整字体大小
      const nextButtonFontSize = Math.min(20, buttonWidth / 8);
      this.ctx.font = `bold ${nextButtonFontSize}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        "下一关",
        buttonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    } else {
      // 重新挑战和继续按钮
      const buttonWidth = modalWidth * 0.35;
      const spacing = modalWidth * 0.1;

      // 重新挑战按钮
      const retryButtonX = modalX + spacing;

      // 绘制按钮阴影
      this.ctx.fillStyle = "rgba(255, 87, 34, 0.3)";
      this.roundRect(
        retryButtonX + 3,
        buttonY + 3,
        buttonWidth,
        buttonHeight,
        8
      );
      this.ctx.fill();

      // 绘制按钮背景
      this.ctx.fillStyle = "#FF5722";
      this.roundRect(retryButtonX, buttonY, buttonWidth, buttonHeight, 8);
      this.ctx.fill();

      // 绘制按钮文字
      this.ctx.fillStyle = "#FFFFFF";
      // 根据按钮大小调整字体大小
      const modalButtonFontSize = Math.min(18, buttonWidth / 8);
      this.ctx.font = `bold ${modalButtonFontSize}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        "重新挑战",
        retryButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );

      // 继续按钮
      const continueButtonX = modalX + modalWidth - buttonWidth - spacing;

      // 绘制按钮阴影
      this.ctx.fillStyle = "rgba(33, 150, 243, 0.3)";
      this.roundRect(
        continueButtonX + 3,
        buttonY + 3,
        buttonWidth,
        buttonHeight,
        8
      );
      this.ctx.fill();

      // 绘制按钮背景
      this.ctx.fillStyle = "#2196F3";
      this.roundRect(continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
      this.ctx.fill();

      // 绘制按钮文字
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillText(
        "继续",
        continueButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    }
  }

  bindModalEvents(modalX, modalY, modalWidth, modalHeight, isWin) {
    const modalTouchHandler = (e) => {
      const touch = e.touches[0];
      let x, y;

      if (typeof wx !== "undefined") {
        // 小程序环境：直接使用触摸坐标
        x = touch.clientX;
        y = touch.clientY;
      } else {
        // Web环境：需要计算偏移
        const rect = getCanvasRect(this.canvas);
        x = touch.clientX - rect.left;
        y = touch.clientY - rect.top;
      }

      const buttonY = modalY + modalHeight * 0.7;
      const buttonHeight = 40;

      if (isWin) {
        // 下一关按钮
        const buttonWidth = modalWidth * 0.6;
        const buttonX = modalX + (modalWidth - buttonWidth) / 2;

        if (
          x >= buttonX &&
          x <= buttonX + buttonWidth &&
          y >= buttonY &&
          y <= buttonY + buttonHeight
        ) {
          this.canvas.removeEventListener("touchstart", modalTouchHandler);
          this.gameManager.nextLevel(this.score);
        }
      } else {
        const buttonWidth = modalWidth * 0.35;
        const spacing = modalWidth * 0.1;

        // 重新挑战按钮
        const retryButtonX = modalX + spacing;
        if (
          x >= retryButtonX &&
          x <= retryButtonX + buttonWidth &&
          y >= buttonY &&
          y <= buttonY + buttonHeight
        ) {
          this.unbindModalEvents(modalTouchHandler);
          this.restart();
        }

        // 继续按钮
        const continueButtonX = modalX + modalWidth - buttonWidth - spacing;
        if (
          x >= continueButtonX &&
          x <= continueButtonX + buttonWidth &&
          y >= buttonY &&
          y <= buttonY + buttonHeight
        ) {
          this.unbindModalEvents(modalTouchHandler);
          this.continueGame();
        }
      }
    };

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(modalTouchHandler);
    } else {
      // Web环境（兼容性）
      this.canvas.addEventListener("touchstart", modalTouchHandler);
    }
  }

  unbindModalEvents(modalTouchHandler) {
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.offTouchStart(modalTouchHandler);
    } else {
      // Web环境
      this.canvas.removeEventListener("touchstart", modalTouchHandler);
    }
  }

  restart() {
    // 回到开始页面
    this.gameManager.restart();
  }

  continueGame() {
    this.timeLeft += this.config.addTimeAmount;
    this.isGameActive = true;
    this.isModalVisible = false;
    this.gameResult = null;
    this.startTimer();
    this.render();
  }

  render() {
    // 绘制渐变背景
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(0.5, "#764ba2");
    gradient.addColorStop(1, "#f093fb");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制装饰性圆点
    this.drawDecorations();

    // 绘制标题信息
    this.drawHeader();

    // 绘制九宫格
    this.drawGrid();

    // 绘制操作按钮
    this.drawButtons();

    // 当模态框可见时，绘制模态框
    if (this.isModalVisible && this.gameResult !== null) {
      this.drawModal(this.gameResult);
    }
  }

  drawDecorations() {
    // 绘制装饰性圆点
    const dots = [
      {
        x: this.canvas.width * 0.1,
        y: this.canvas.height * 0.15,
        size: 8,
        alpha: 0.3,
      },
      {
        x: this.canvas.width * 0.9,
        y: this.canvas.height * 0.2,
        size: 12,
        alpha: 0.2,
      },
      {
        x: this.canvas.width * 0.15,
        y: this.canvas.height * 0.8,
        size: 6,
        alpha: 0.4,
      },
      {
        x: this.canvas.width * 0.85,
        y: this.canvas.height * 0.85,
        size: 10,
        alpha: 0.25,
      },
      {
        x: this.canvas.width * 0.05,
        y: this.canvas.height * 0.5,
        size: 4,
        alpha: 0.5,
      },
      {
        x: this.canvas.width * 0.95,
        y: this.canvas.height * 0.6,
        size: 7,
        alpha: 0.35,
      },
    ];

    dots.forEach((dot) => {
      this.ctx.globalAlpha = dot.alpha;
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  drawHeader() {
    // 绘制半透明背景条
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    this.ctx.fillRect(0, 10, this.canvas.width, 80);

    // 添加文字阴影效果
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = "#FFFFFF";
    // 根据屏幕宽度调整字体大小
    const fontSize = Math.min(24, this.canvas.width / 15);
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.textAlign = "left";

    // 关卡
    this.ctx.fillText(`关卡：${this.level}`, 15, 50);

    // 分数
    this.ctx.textAlign = "center";
    this.ctx.fillText(`分数：${this.score}`, this.canvas.width / 2, 50);

    // 时间
    this.ctx.textAlign = "right";
    this.ctx.fillStyle = this.timeLeft <= 10 ? "#FFD700" : "#FFFFFF";
    if (this.timeLeft <= 10) {
      // 时间紧急时添加闪烁效果
      this.ctx.shadowColor = "#FF4444";
      this.ctx.shadowBlur = 8;
    }
    this.ctx.fillText(`时间：${this.timeLeft}s`, this.canvas.width - 15, 50);

    // 重置阴影
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  drawGrid() {
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = this.gridStartX + col * this.cellSize;
      const y = this.gridStartY + row * this.cellSize;

      // 绘制格子阴影
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      this.roundRect(x + 4, y + 4, this.cellSize, this.cellSize, 12);
      this.ctx.fill();

      // 绘制格子背景
      if (this.selectedCell === i) {
        // 选中状态 - 金色渐变
        const gradient = this.ctx.createLinearGradient(
          x,
          y,
          x,
          y + this.cellSize
        );
        gradient.addColorStop(0, "#FFD700");
        gradient.addColorStop(1, "#FFA500");
        this.ctx.fillStyle = gradient;
      } else {
        // 根据数字设置不同颜色
        const number = this.grid[i];
        const gradient = this.ctx.createLinearGradient(
          x,
          y,
          x,
          y + this.cellSize
        );

        if (number === 0) {
          // 空格子 - 半透明白色
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
          gradient.addColorStop(1, "rgba(240, 240, 240, 0.3)");
        } else {
          // 根据数字设置不同的颜色
          const colors = this.getNumberColors(number);
          gradient.addColorStop(0, colors.light);
          gradient.addColorStop(1, colors.dark);
        }
        this.ctx.fillStyle = gradient;
      }

      this.roundRect(x, y, this.cellSize, this.cellSize, 12);
      this.ctx.fill();

      // 绘制边框
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      this.ctx.lineWidth = 3;
      this.roundRect(x, y, this.cellSize, this.cellSize, 12);
      this.ctx.stroke();

      // 绘制数字
      if (this.grid[i] !== 0) {
        // 数字阴影
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        this.ctx.fillStyle = "#2C3E50";
        // 根据格子大小调整字体大小
        const numberFontSize = Math.min(32, this.cellSize * 0.4);
        this.ctx.font = `bold ${numberFontSize}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        this.ctx.fillText(
          this.grid[i].toString(),
          x + this.cellSize / 2,
          y + this.cellSize / 2
        );
      }

      // 重置阴影
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
  }

  // 添加圆角矩形绘制方法
  roundRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  drawButtons() {
    const buttonSpacing = this.canvas.width / 3;
    const buttons = [
      { text: "打乱", color: "#FF9800" },
      { text: "加时", color: "#4CAF50" },
      { text: "跳关", color: "#2196F3" },
    ];

    buttons.forEach((button, index) => {
      const x = buttonSpacing * index + 20;
      const width = buttonSpacing - 40;

      // 绘制按钮阴影
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      this.roundRect(x + 3, this.buttonY + 3, width, this.buttonHeight, 8);
      this.ctx.fill();

      // 绘制按钮背景渐变
      const gradient = this.ctx.createLinearGradient(
        x,
        this.buttonY,
        x,
        this.buttonY + this.buttonHeight
      );
      if (this.isGameActive) {
        gradient.addColorStop(0, button.color);
        gradient.addColorStop(1, this.darkenColor(button.color, 0.2));
      } else {
        gradient.addColorStop(0, "#CCCCCC");
        gradient.addColorStop(1, "#999999");
      }
      this.ctx.fillStyle = gradient;
      this.roundRect(x, this.buttonY, width, this.buttonHeight, 8);
      this.ctx.fill();

      // 绘制按钮边框
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.lineWidth = 2;
      this.roundRect(x, this.buttonY, width, this.buttonHeight, 8);
      this.ctx.stroke();

      // 绘制按钮文字阴影
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.ctx.shadowBlur = 2;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      // 绘制按钮文字
      this.ctx.fillStyle = "#FFFFFF";
      // 根据按钮大小调整字体大小
      const buttonFontSize = Math.min(18, width / 6);
      this.ctx.font = `bold ${buttonFontSize}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        button.text,
        x + width / 2,
        this.buttonY + this.buttonHeight / 2
      );

      // 重置阴影
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    });
  }

  // 获取数字对应的颜色
  getNumberColors(number) {
    const colorMap = {
      1: { light: "#FFE5E5", dark: "#FF9999" }, // 粉红色
      2: { light: "#E5F3FF", dark: "#99CCFF" }, // 蓝色
      3: { light: "#E5FFE5", dark: "#99FF99" }, // 绿色
      4: { light: "#FFF3E5", dark: "#FFCC99" }, // 橙色
      5: { light: "#F3E5FF", dark: "#CC99FF" }, // 紫色
      6: { light: "#FFFFE5", dark: "#FFFF99" }, // 黄色
      7: { light: "#E5FFFF", dark: "#99FFFF" }, // 青色
      8: { light: "#FFE5F3", dark: "#FF99CC" }, // 玫瑰色
    };
    return colorMap[number] || { light: "#FFFFFF", dark: "#F0F0F0" };
  }

  // 添加颜色加深方法
  darkenColor(color, amount) {
    const hex = color.replace("#", "");
    const r = Math.max(
      0,
      parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount)
    );
    const g = Math.max(
      0,
      parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount)
    );
    const b = Math.max(
      0,
      parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount)
    );
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      if (this.touchHandler) {
        wx.offTouchStart(this.touchHandler);
      }
    } else {
      // Web环境
      if (this.touchHandler) {
        this.canvas.removeEventListener("touchstart", this.touchHandler);
      }
    }
  }
}

// 将SortingGame类暴露到全局作用域
if (typeof global !== "undefined") {
  global.SortingGame = SortingGame;
} else if (typeof window !== "undefined") {
  window.SortingGame = SortingGame;
} else {
  // 微信小游戏环境
  this.SortingGame = SortingGame;
}

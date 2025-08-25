// number-elimination-game.js - 第三关：数字消除游戏

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

class NumberEliminationGame {
  constructor(canvas, ctx, gameManager) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameManager = gameManager;

    // 游戏配置参数
    this.config = {
      initialTime: 90, // 初始时间120秒
      gridSize: 10, // 10x10网格
      eliminateScore: 10, // 消除数字得分
      shuffleCost: 200, // 打乱扣分
      addTimeCost: 100, // 加时扣分
      timeBonus: 10, // 时间奖励倍数
      addTimeSeconds: 10, // 加时秒数
      continueCost: 200, // 继续游戏扣分
      continueTime: 20, // 继续游戏加时
    };

    // 游戏状态
    this.score = 0;
    this.timeLeft = this.config.initialTime;
    this.grid = [];
    this.selectedCells = [];
    this.isGameActive = false;
    this.isModalVisible = false;
    this.gameResult = null;
    this.timer = null;

    // 防抖相关
    this.nextLevelDebounceTimer = null;
    this.isNextLevelProcessing = false;

    // 界面布局
    this.layout = {
      headerHeight: 80,
      gridStartY: 120,
      cellSize: 0,
      gridPadding: 10,
      buttonHeight: 50,
      buttonMargin: 10,
    };

    this.init();
  }

  init() {
    this.score = this.gameManager.getScore() || 0;
    this.timeLeft = this.config.initialTime;
    this.selectedCells = [];
    this.isGameActive = true;
    this.isModalVisible = false;
    this.gameResult = null;

    // 重置防抖状态
    this.nextLevelDebounceTimer = null;
    this.isNextLevelProcessing = false;

    this.calculateLayout();
    this.generateGrid();
    this.bindEvents();
    this.startTimer();
    this.render();
  }

  calculateLayout() {
    const availableWidth = this.canvas.width - this.layout.gridPadding * 2;
    const availableHeight = this.canvas.height - this.layout.gridStartY - 100; // 预留按钮空间
    const maxSize = Math.min(availableWidth, availableHeight);
    this.layout.cellSize = Math.floor(maxSize / this.config.gridSize) - 2;

    // 计算网格居中位置
    const gridWidth = this.config.gridSize * (this.layout.cellSize + 2);
    this.layout.gridStartX = (this.canvas.width - gridWidth) / 2;
  }

  generateGrid() {
    // 生成可完全消除的数字网格
    this.grid = [];
    const pairs = [];

    // 生成50对相加为10的数字对
    for (let i = 0; i < 50; i++) {
      const num1 = Math.floor(Math.random() * 9) + 1;
      const num2 = 10 - num1;
      pairs.push(num1, num2);
    }

    // 打乱数组
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    // 填充到10x10网格
    let index = 0;
    for (let row = 0; row < this.config.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.config.gridSize; col++) {
        this.grid[row][col] = {
          value: pairs[index++],
          visible: true,
          selected: false,
        };
      }
    }
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
    // 移除之前的事件监听器
    if (this.clickHandler) {
      this.canvas.removeEventListener("click", this.clickHandler);
    }
    if (this.touchHandler) {
      this.canvas.removeEventListener("touchstart", this.touchHandler);
    }

    // 绑定点击事件监听器
    this.clickHandler = (e) => {
      let x, y;

      if (typeof wx !== "undefined") {
        // 小程序环境：直接使用触摸坐标
        const touch = e.touches[0];
        x = touch.clientX;
        y = touch.clientY;
      } else {
        // Web环境：需要计算缩放和偏移
        const rect = getCanvasRect(this.canvas);
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        if (e.type === "touchstart") {
          const touch = e.touches[0];
          x = (touch.clientX - rect.left) * scaleX;
          y = (touch.clientY - rect.top) * scaleY;
        } else {
          x = (e.clientX - rect.left) * scaleX;
          y = (e.clientY - rect.top) * scaleY;
        }
      }

      this.handleTouch(x, y);
    };

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(this.clickHandler);
    } else {
      // Web环境（兼容性）
      // 优先使用touchstart事件，如果不支持则使用click事件
      if ("ontouchstart" in window) {
        this.touchHandler = this.clickHandler;
        this.canvas.addEventListener("touchstart", this.touchHandler, {
          passive: false,
        });
      } else {
        this.canvas.addEventListener("click", this.clickHandler);
      }
    }
  }

  handleTouch(x, y) {
    if (this.isModalVisible) {
      this.handleModalTouch(x, y);
      return;
    }

    if (!this.isGameActive) return;

    // 检查网格点击
    const gridX = this.layout.gridStartX;
    const gridY = this.layout.gridStartY;
    const cellSize = this.layout.cellSize;

    if (x >= gridX && y >= gridY) {
      const col = Math.floor((x - gridX) / (cellSize + 2));
      const row = Math.floor((y - gridY) / (cellSize + 2));

      if (
        row >= 0 &&
        row < this.config.gridSize &&
        col >= 0 &&
        col < this.config.gridSize
      ) {
        this.handleCellClick(row, col);
        return;
      }
    }

    // 检查按钮点击
    this.handleButtonClick(x, y);
  }

  handleCellClick(row, col) {
    const cell = this.grid[row][col];
    if (!cell.visible) return;

    // 如果已选中，取消选中
    if (cell.selected) {
      cell.selected = false;
      this.selectedCells = this.selectedCells.filter(
        (c) => !(c.row === row && c.col === col)
      );
      this.render();
      return;
    }

    // 如果已有两个选中，清除之前的选择
    if (this.selectedCells.length >= 2) {
      this.clearSelection();
    }

    // 选中当前格子
    cell.selected = true;
    this.selectedCells.push({ row, col, value: cell.value });

    // 如果选中了两个格子，检查是否可以消除
    if (this.selectedCells.length === 2) {
      this.checkElimination();
    }

    this.render();
  }

  clearSelection() {
    this.selectedCells.forEach((cell) => {
      this.grid[cell.row][cell.col].selected = false;
    });
    this.selectedCells = [];
  }

  checkElimination() {
    const [cell1, cell2] = this.selectedCells;

    // 检查数字是否相加为10
    if (cell1.value + cell2.value === 10) {
      // 消除数字
      this.grid[cell1.row][cell1.col].visible = false;
      this.grid[cell2.row][cell2.col].visible = false;
      this.score += this.config.eliminateScore;

      // 检查是否获胜
      if (this.checkWin()) {
        this.gameOver(true);
      }
    }

    // 清除选择
    this.clearSelection();
  }

  checkWin() {
    for (let row = 0; row < this.config.gridSize; row++) {
      for (let col = 0; col < this.config.gridSize; col++) {
        if (this.grid[row][col].visible) {
          return false;
        }
      }
    }
    return true;
  }

  handleButtonClick(x, y) {
    const buttonY = this.canvas.height - 70;
    const buttonWidth = 80;
    const buttonHeight = this.layout.buttonHeight;
    const spacing = (this.canvas.width - buttonWidth * 3) / 4;

    // 打乱按钮
    const shuffleX = spacing;
    if (
      x >= shuffleX &&
      x <= shuffleX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      this.shuffleGrid();
      return;
    }

    // 加时按钮
    const addTimeX = spacing * 2 + buttonWidth;
    if (
      x >= addTimeX &&
      x <= addTimeX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      this.addTime();
      return;
    }

    // 跳关按钮
    const skipX = spacing * 3 + buttonWidth * 2;
    if (
      x >= skipX &&
      x <= skipX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      this.skipLevel();
      return;
    }
  }

  shuffleGrid() {
    if (!this.isGameActive) return;

    // 收集所有可见的数字
    const visibleNumbers = [];
    for (let row = 0; row < this.config.gridSize; row++) {
      for (let col = 0; col < this.config.gridSize; col++) {
        if (this.grid[row][col].visible) {
          visibleNumbers.push(this.grid[row][col].value);
        }
      }
    }

    // 打乱数组
    for (let i = visibleNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [visibleNumbers[i], visibleNumbers[j]] = [
        visibleNumbers[j],
        visibleNumbers[i],
      ];
    }

    // 重新分配到网格
    let index = 0;
    for (let row = 0; row < this.config.gridSize; row++) {
      for (let col = 0; col < this.config.gridSize; col++) {
        if (this.grid[row][col].visible) {
          this.grid[row][col].value = visibleNumbers[index++];
        }
      }
    }

    this.score -= this.config.shuffleCost;
    this.clearSelection();
    this.render();
  }

  addTime() {
    if (!this.isGameActive) return;

    this.timeLeft += this.config.addTimeSeconds;
    this.score -= this.config.addTimeCost;
    this.render();
  }

  skipLevel() {
    if (!this.isGameActive) return;

    this.gameOver(true);
  }

  gameOver(isWin) {
    this.isGameActive = false;
    this.clearInterval();
    this.gameResult = isWin;

    if (isWin) {
      // 计算时间奖励
      this.score += this.timeLeft * this.config.timeBonus;
    }

    this.showModal(isWin);
  }

  showModal(isWin) {
    this.isModalVisible = true;
    this.render();
    // 在渲染完成后立即绑定模态框事件
    setTimeout(() => {
      this.bindModalEvents(isWin);
    }, 0);
  }

  handleModalTouch(x, y) {
    const modalWidth = Math.min(300, this.canvas.width * 0.8);
    const modalHeight = 200;
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    const buttonWidth = 80;
    const buttonHeight = 40;
    const buttonY = modalY + modalHeight - 60;

    if (this.gameResult) {
      // 成功：下一关按钮
      const nextButtonX = modalX + (modalWidth - buttonWidth) / 2;
      if (
        x >= nextButtonX &&
        x <= nextButtonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.nextLevel();
      }
    } else {
      // 失败：重新挑战和继续按钮
      const restartButtonX = modalX + modalWidth / 4 - buttonWidth / 2;
      const continueButtonX = modalX + (modalWidth * 3) / 4 - buttonWidth / 2;

      if (
        x >= restartButtonX &&
        x <= restartButtonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.restart();
      } else if (
        x >= continueButtonX &&
        x <= continueButtonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.continueGame();
      }
    }
  }

  bindModalEvents(isWin) {
    // Modal事件已在handleModalTouch中处理
  }

  nextLevel() {
    this.handleNextLevelClick();
  }

  // 防抖处理下一关按钮点击
  handleNextLevelClick() {
    // 如果正在处理中，直接返回
    if (this.isNextLevelProcessing) {
      return;
    }

    // 设置处理状态
    this.isNextLevelProcessing = true;

    // 清除之前的定时器
    if (this.nextLevelDebounceTimer) {
      clearTimeout(this.nextLevelDebounceTimer);
    }

    // 设置防抖延迟（500ms）
    this.nextLevelDebounceTimer = setTimeout(() => {
      // 执行下一关逻辑
      this.gameManager.setScore(this.score);
      this.gameManager.nextLevel();
      // 重置处理状态
      this.isNextLevelProcessing = false;
    }, 500);
  }

  restart() {
    this.gameManager.restart();
  }

  continueGame() {
    this.timeLeft += this.config.continueTime;
    this.score -= this.config.continueCost;
    this.isGameActive = true;
    this.isModalVisible = false;
    this.gameResult = null;
    this.startTimer();
    this.render();
  }

  clearInterval() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  render() {
    this.drawBackground();
    this.drawHeader();
    this.drawGrid();
    this.drawButtons();

    if (this.isModalVisible) {
      this.drawModal();
    }
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(1, "#764ba2");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawHeader() {
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "bold 24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // 关卡信息
    this.ctx.fillText("关卡：3", this.canvas.width / 2, 30);

    // 分数和时间
    this.ctx.font = "18px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`分数：${this.score}`, 20, 60);

    this.ctx.textAlign = "right";
    this.ctx.fillText(`时间：${this.timeLeft}s`, this.canvas.width - 20, 60);
  }

  drawGrid() {
    const startX = this.layout.gridStartX;
    const startY = this.layout.gridStartY;
    const cellSize = this.layout.cellSize;

    for (let row = 0; row < this.config.gridSize; row++) {
      for (let col = 0; col < this.config.gridSize; col++) {
        const cell = this.grid[row][col];
        if (!cell.visible) continue;

        const x = startX + col * (cellSize + 2);
        const y = startY + row * (cellSize + 2);

        // 绘制格子背景
        if (cell.selected) {
          this.ctx.fillStyle = "#FFD700";
        } else {
          this.ctx.fillStyle = "#FFFFFF";
        }

        this.roundRect(x, y, cellSize, cellSize, 5);
        this.ctx.fill();

        // 绘制边框
        this.ctx.strokeStyle = "#333333";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 绘制数字
        this.ctx.fillStyle = "#333333";
        this.ctx.font = `bold ${cellSize * 0.5}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(cell.value, x + cellSize / 2, y + cellSize / 2);
      }
    }
  }

  drawButtons() {
    if (!this.isGameActive) return;

    const buttonY = this.canvas.height - 70;
    const buttonWidth = 80;
    const buttonHeight = this.layout.buttonHeight;
    const spacing = (this.canvas.width - buttonWidth * 3) / 4;

    const buttons = [
      { text: "打乱", x: spacing },
      { text: "加时", x: spacing * 2 + buttonWidth },
      { text: "跳关", x: spacing * 3 + buttonWidth * 2 },
    ];

    buttons.forEach((button) => {
      // 绘制按钮背景
      this.ctx.fillStyle = "#4CAF50";
      this.roundRect(button.x, buttonY, buttonWidth, buttonHeight, 8);
      this.ctx.fill();

      // 绘制按钮文字
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "bold 16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        button.text,
        button.x + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    });
  }

  drawModal() {
    // 绘制遮罩
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制模态框
    const modalWidth = Math.min(300, this.canvas.width * 0.8);
    const modalHeight = 200;
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    this.ctx.fillStyle = "#FFFFFF";
    this.roundRect(modalX, modalY, modalWidth, modalHeight, 10);
    this.ctx.fill();

    // 绘制标题
    this.ctx.fillStyle = "#333333";
    this.ctx.font = "bold 24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const title = this.gameResult ? "闯关成功！" : "闯关失败！";
    this.ctx.fillText(title, modalX + modalWidth / 2, modalY + 40);

    // 绘制分数
    this.ctx.font = "18px Arial";
    this.ctx.fillText(
      `总分：${this.score}`,
      modalX + modalWidth / 2,
      modalY + 80
    );

    // 绘制按钮
    const buttonWidth = 80;
    const buttonHeight = 40;
    const buttonY = modalY + modalHeight - 60;

    if (this.gameResult) {
      // 成功：下一关按钮
      const nextButtonX = modalX + (modalWidth - buttonWidth) / 2;
      this.ctx.fillStyle = "#4CAF50";
      this.roundRect(nextButtonX, buttonY, buttonWidth, buttonHeight, 5);
      this.ctx.fill();

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "bold 16px Arial";
      this.ctx.fillText(
        "下一关",
        nextButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    } else {
      // 失败：重新挑战和继续按钮
      const restartButtonX = modalX + modalWidth / 4 - buttonWidth / 2;
      const continueButtonX = modalX + (modalWidth * 3) / 4 - buttonWidth / 2;

      // 重新挑战按钮
      this.ctx.fillStyle = "#FF5722";
      this.roundRect(restartButtonX, buttonY, buttonWidth, buttonHeight, 5);
      this.ctx.fill();

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "bold 14px Arial";
      this.ctx.fillText(
        "重新挑战",
        restartButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );

      // 继续按钮
      this.ctx.fillStyle = "#2196F3";
      this.roundRect(continueButtonX, buttonY, buttonWidth, buttonHeight, 5);
      this.ctx.fill();

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillText(
        "继续",
        continueButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    }
  }

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

  destroy() {
    this.clearInterval();

    // 清理防抖定时器
    if (this.nextLevelDebounceTimer) {
      clearTimeout(this.nextLevelDebounceTimer);
    }

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      if (this.clickHandler) {
        wx.offTouchStart(this.clickHandler);
      }
    } else {
      // Web环境
      if (this.touchHandler) {
        this.canvas.removeEventListener("touchstart", this.touchHandler);
      }
      if (this.clickHandler) {
        this.canvas.removeEventListener("click", this.clickHandler);
      }
    }
  }
}

// 导出类
if (typeof global !== "undefined") {
  global.NumberEliminationGame = NumberEliminationGame;
} else if (typeof window !== "undefined") {
  window.NumberEliminationGame = NumberEliminationGame;
} else {
  this.NumberEliminationGame = NumberEliminationGame;
}

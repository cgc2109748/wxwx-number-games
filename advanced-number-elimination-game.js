// 升级版数字消除游戏 - 第四关
class AdvancedNumberEliminationGame {
  constructor(canvas, ctx, gameManager, initialScore = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameManager = gameManager;

    // 游戏配置参数
    this.config = {
      rows: 16,
      cols: 10,
      totalCells: 160,
      initialTime: 120, // 初始倒计时120秒
      bonusTime: 10, // 加时按钮增加的时间
      continueTime: 20, // 继续按钮增加的时间
      eliminateScore: 10, // 每次消除得分
      shufflePenalty: 200, // 打乱按钮扣分
      addTimePenalty: 100, // 加时按钮扣分
      continuePenalty: 200, // 继续按钮扣分
      cellPenalty: 10, // 每个剩余格子扣分
      timeBonus: 10, // 每秒剩余时间奖励
      // 权重系数数组，用于确定剩余格子数
      weightFactors: [2, 4, 5, 8, 10, 16, 20, 40, 80, 160],
      // 数字1-9出现的概率
      numberProbabilities: [0.01, 0.12, 0.25, 0.3, 0.1, 0.1, 0.05, 0.05, 0.02],
      // 多余格子填充数字
      fillNumbers: [7, 8, 9],
    };

    this.score = initialScore;
    this.timeLeft = this.config.initialTime;
    this.grid = [];
    this.selectedCells = [];
    this.gameRunning = false;
    this.gameOver = false;
    this.timer = null;
    this.showModal = false;
    this.modalType = ""; // 'win', 'lose'
    this.isSelecting = false;
    this.startCell = null;
    this.currentCell = null;

    // 数字移动相关状态
    this.isMovingMode = false;
    this.selectedForMove = null;

    // 计算布局
    this.calculateLayout();
    this.init();
  }

  calculateLayout() {
    const padding = 20;
    const headerHeight = 80;
    const buttonHeight = 60;
    const buttonAreaHeight = 80;

    // 可用区域
    this.availableWidth = this.canvas.width - padding * 2;
    this.availableHeight =
      this.canvas.height - headerHeight - buttonAreaHeight - padding * 3;

    // 网格尺寸
    this.cellSize =
      Math.min(
        this.availableWidth / this.config.cols,
        this.availableHeight / this.config.rows
      ) - 2;

    // 网格起始位置
    this.gridStartX =
      (this.canvas.width - (this.cellSize + 2) * this.config.cols) / 2;
    this.gridStartY = headerHeight + padding;

    // 按钮区域
    this.buttonY =
      this.gridStartY + (this.cellSize + 2) * this.config.rows + padding;
    this.buttonWidth = 100;
    this.buttonHeight = 40;
    this.buttonSpacing = 20;

    // 两个按钮的X坐标
    const totalButtonWidth = this.buttonWidth * 2 + this.buttonSpacing;
    const buttonStartX = (this.canvas.width - totalButtonWidth) / 2;

    this.shuffleButtonX = buttonStartX;
    this.addTimeButtonX = buttonStartX + this.buttonWidth + this.buttonSpacing;
  }

  init() {
    this.generateGrid();
    this.bindEvents();
    this.startTimer();
    this.gameRunning = true;
    this.render();
  }

  generateGrid() {
    // 选择权重系数
    const weightFactor =
      this.config.weightFactors[
        Math.floor(Math.random() * this.config.weightFactors.length)
      ];
    const remainingCells = Math.floor(this.config.totalCells / weightFactor);
    const filledCells = this.config.totalCells - remainingCells;

    // 初始化网格
    this.grid = [];
    for (let row = 0; row < this.config.rows; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.config.cols; col++) {
        this.grid[row][col] = 0;
      }
    }

    // 随机填充数字
    let filled = 0;
    while (filled < filledCells) {
      const row = Math.floor(Math.random() * this.config.rows);
      const col = Math.floor(Math.random() * this.config.cols);

      if (this.grid[row][col] === 0) {
        this.grid[row][col] = this.generateRandomNumber();
        filled++;
      }
    }

    // 用7,8,9填充剩余的空格子
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (this.grid[row][col] === 0) {
          const fillNumber =
            this.config.fillNumbers[
              Math.floor(Math.random() * this.config.fillNumbers.length)
            ];
          this.grid[row][col] = fillNumber;
        }
      }
    }
  }

  generateRandomNumber() {
    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < this.config.numberProbabilities.length; i++) {
      cumulative += this.config.numberProbabilities[i];
      if (rand <= cumulative) {
        return i + 1; // 返回1-9的数字
      }
    }

    return 9; // 默认返回9
  }

  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      if (this.gameRunning && !this.showModal) {
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.endGame(false);
        }
        this.render();
      }
    }, 1000);
  }

  bindEvents() {
    // 保存事件处理函数引用，以便后续移除
    this.touchStartHandler = (e) => this.handleTouchStart(e);
    this.touchMoveHandler = (e) => this.handleTouchMove(e);
    this.touchEndHandler = (e) => this.handleTouchEnd(e);
    this.mouseDownHandler = (e) => this.handleMouseDown(e);
    this.mouseMoveHandler = (e) => this.handleMouseMove(e);
    this.mouseUpHandler = (e) => this.handleMouseUp(e);

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(this.touchStartHandler);
      wx.onTouchMove(this.touchMoveHandler);
      wx.onTouchEnd(this.touchEndHandler);
    } else {
      // Web环境（兼容性）
      // 触摸事件
      this.canvas.addEventListener("touchstart", this.touchStartHandler);
      this.canvas.addEventListener("touchmove", this.touchMoveHandler);
      this.canvas.addEventListener("touchend", this.touchEndHandler);

      // 鼠标事件（包含点击处理）
      this.canvas.addEventListener("mousedown", this.mouseDownHandler);
      this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
      this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    }
  }

  handleTouchStart(e) {
    if (!this.gameRunning || this.showModal) return;

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.handleStart(x, y);
  }

  handleTouchMove(e) {
    if (!this.gameRunning || this.showModal || !this.isSelecting) return;

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.handleMove(x, y);
  }

  handleTouchEnd(e) {
    // 如果模态框显示，处理模态框点击
    if (this.showModal) {
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.handleClick(x, y);
      return;
    }

    this.handleEnd();
  }

  handleMouseDown(e) {
    if (!this.gameRunning || this.showModal) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.handleStart(x, y);
  }

  handleMouseMove(e) {
    if (!this.gameRunning || this.showModal || !this.isSelecting) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.handleMove(x, y);
  }

  handleMouseUp(e) {
    // 如果模态框显示，处理模态框点击
    if (this.showModal) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleClick(x, y);
      return;
    }

    this.handleEnd();
  }

  handleCanvasClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.handleClick(x, y);
  }

  handleClick(x, y) {
    // 优先处理模态框点击
    if (this.showModal) {
      if (this.handleModalClick(x, y)) {
        return;
      }
      // 如果显示模态框但没有点击按钮，则阻止其他操作
      return;
    }

    if (!this.gameRunning) return;

    // 检查是否点击了按钮
    if (this.isButtonClicked(x, y)) {
      return;
    }

    // 检查是否点击了网格
    const gridPos = this.getGridPosition(x, y);
    if (gridPos) {
      if (this.isMovingMode && this.selectedForMove) {
        // 移动模式：将选中的数字移动到空白格子
        if (
          this.grid[gridPos.row][gridPos.col] === 0 &&
          this.canMoveTo(this.selectedForMove, gridPos)
        ) {
          this.grid[gridPos.row][gridPos.col] =
            this.grid[this.selectedForMove.row][this.selectedForMove.col];
          this.grid[this.selectedForMove.row][this.selectedForMove.col] = 0;
          this.isMovingMode = false;
          this.selectedForMove = null;
          this.render();
        } else {
          // 点击了非空格子或无法移动，取消移动模式
          this.isMovingMode = false;
          this.selectedForMove = null;
          this.render();
        }
      } else if (this.grid[gridPos.row][gridPos.col] > 0) {
        // 选择数字进入移动模式
        this.isMovingMode = true;
        this.selectedForMove = {
          row: gridPos.row,
          col: gridPos.col,
          value: this.grid[gridPos.row][gridPos.col],
        };
        this.selectedCells = [];
        this.render();
      }
    }
  }

  handleStart(x, y) {
    // 检查是否点击了按钮
    if (this.isButtonClicked(x, y)) {
      return;
    }

    // 检查是否点击了网格
    const gridPos = this.getGridPosition(x, y);
    if (gridPos) {
      if (this.isMovingMode && this.selectedForMove) {
        // 移动模式：将选中的数字移动到空白格子
        if (this.grid[gridPos.row][gridPos.col] === 0) {
          this.grid[gridPos.row][gridPos.col] =
            this.grid[this.selectedForMove.row][this.selectedForMove.col];
          this.grid[this.selectedForMove.row][this.selectedForMove.col] = 0;
          this.isMovingMode = false;
          this.selectedForMove = null;
          this.render();
        } else {
          // 点击了非空格子，取消移动模式
          this.isMovingMode = false;
          this.selectedForMove = null;
          this.render();
        }
      } else if (this.grid[gridPos.row][gridPos.col] > 0) {
        // 普通选择模式
        this.isSelecting = true;
        this.startCell = gridPos;
        this.currentCell = gridPos;
        this.selectedCells = [
          {
            row: gridPos.row,
            col: gridPos.col,
            value: this.grid[gridPos.row][gridPos.col],
          },
        ];
        this.render();
      }
    }
  }

  handleMove(x, y) {
    const gridPos = this.getGridPosition(x, y);
    if (gridPos && this.grid[gridPos.row][gridPos.col] > 0) {
      // 检查是否是新的格子
      if (
        !this.currentCell ||
        gridPos.row !== this.currentCell.row ||
        gridPos.col !== this.currentCell.col
      ) {
        this.currentCell = gridPos;

        // 检查是否已经在选中列表中
        const existingIndex = this.selectedCells.findIndex(
          (cell) => cell.row === gridPos.row && cell.col === gridPos.col
        );

        if (existingIndex === -1) {
          // 检查是否与已选择的格子相邻或距离小于3
          if (this.isValidAddition(gridPos) && this.selectedCells.length < 4) {
            this.selectedCells.push({
              row: gridPos.row,
              col: gridPos.col,
              value: this.grid[gridPos.row][gridPos.col],
            });
          }
        }

        this.render();
      }
    }
  }

  handleEnd() {
    if (this.isSelecting) {
      this.isSelecting = false;

      // 检查是否可以消除
      if (this.selectedCells.length >= 2) {
        this.checkElimination();
      } else if (this.selectedCells.length === 1) {
        // 单个格子被选中，进入移动模式
        this.isMovingMode = true;
        this.selectedForMove = this.selectedCells[0];
        this.selectedCells = [];
        this.render();
      } else {
        this.selectedCells = [];
        this.render();
      }

      this.startCell = null;
      this.currentCell = null;
    }
  }

  isValidAddition(newPos) {
    if (this.selectedCells.length === 0) return true;

    // 检查与最后一个选中的格子是否相邻或距离小于3
    const lastCell = this.selectedCells[this.selectedCells.length - 1];
    const distance =
      Math.abs(lastCell.row - newPos.row) + Math.abs(lastCell.col - newPos.col);

    return distance <= 1 || distance < 3;
  }

  canMoveTo(fromCell, toCell) {
    // 检查两个格子间是否有直线路径且没有其他格子阻挡
    const rowDiff = toCell.row - fromCell.row;
    const colDiff = toCell.col - fromCell.col;

    // 只允许水平、垂直或对角线移动
    if (
      rowDiff !== 0 &&
      colDiff !== 0 &&
      Math.abs(rowDiff) !== Math.abs(colDiff)
    ) {
      return false;
    }

    // 计算移动方向
    const rowStep = rowDiff === 0 ? 0 : rowDiff > 0 ? 1 : -1;
    const colStep = colDiff === 0 ? 0 : colDiff > 0 ? 1 : -1;

    // 检查路径上是否有阻挡
    let currentRow = fromCell.row + rowStep;
    let currentCol = fromCell.col + colStep;

    while (currentRow !== toCell.row || currentCol !== toCell.col) {
      if (this.grid[currentRow][currentCol] !== 0) {
        return false; // 路径被阻挡
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }

  isButtonClicked(x, y) {
    if (!this.gameRunning || this.showModal) {
      return false;
    }

    // 使用已有的按钮位置属性
    if (y >= this.buttonY && y <= this.buttonY + this.buttonHeight) {
      // 打乱按钮
      if (
        x >= this.shuffleButtonX &&
        x <= this.shuffleButtonX + this.buttonWidth
      ) {
        this.shuffleGrid();
        return true;
      }

      // 加时按钮
      if (
        x >= this.addTimeButtonX &&
        x <= this.addTimeButtonX + this.buttonWidth
      ) {
        this.addTime();
        return true;
      }
    }

    return false;
  }

  getGridPosition(x, y) {
    const col = Math.floor((x - this.gridStartX) / (this.cellSize + 2));
    const row = Math.floor((y - this.gridStartY) / (this.cellSize + 2));

    if (
      row >= 0 &&
      row < this.config.rows &&
      col >= 0 &&
      col < this.config.cols
    ) {
      return { row, col };
    }

    return null;
  }

  checkElimination() {
    if (this.selectedCells.length < 2 || this.selectedCells.length > 4) {
      return;
    }

    // 检查是否相邻或距离小于3
    if (!this.areValidSelection(this.selectedCells)) {
      return;
    }

    // 检查和是否为10
    const sum = this.selectedCells.reduce(
      (total, cell) => total + cell.value,
      0
    );
    if (sum === 10) {
      // 消除选中的格子
      this.selectedCells.forEach((cell) => {
        this.grid[cell.row][cell.col] = 0;
      });

      this.score += this.config.eliminateScore;
      this.selectedCells = [];

      // 检查是否获胜
      if (this.checkWin()) {
        this.endGame(true);
      }
    }
  }

  areValidSelection(cells) {
    if (cells.length === 1) return true;

    // 检查所有格子是否相邻或距离小于3
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const cell1 = cells[i];
        const cell2 = cells[j];
        const distance =
          Math.abs(cell1.row - cell2.row) + Math.abs(cell1.col - cell2.col);

        // 如果不相邻且距离>=3，则无效
        if (distance > 1 && distance >= 3) {
          return false;
        }
      }
    }

    return true;
  }

  shuffleGrid() {
    // 收集所有非零数字及其位置
    const positions = [];
    const numbers = [];

    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (this.grid[row][col] > 0) {
          positions.push({ row, col });
          numbers.push(this.grid[row][col]);
        }
      }
    }

    // 打乱数字数组
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // 将打乱后的数字放回原来的位置
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      this.grid[pos.row][pos.col] = numbers[i];
    }

    this.score -= this.config.shufflePenalty;
    this.selectedCells = [];
    this.render();
  }

  addTime() {
    this.timeLeft += this.config.bonusTime;
    this.score -= this.config.addTimePenalty;
    this.render();
  }

  checkWin() {
    // 检查是否还有可消除的数字组合
    const numbers = [];
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (this.grid[row][col] > 0) {
          numbers.push({ row, col, value: this.grid[row][col] });
        }
      }
    }

    // 检查是否存在可消除的组合
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const cells = [numbers[i], numbers[j]];
        if (this.areValidSelection(cells)) {
          const sum = cells.reduce((total, cell) => total + cell.value, 0);
          if (sum === 10) {
            return false; // 还有可消除的组合
          }
        }

        // 检查3个数字的组合
        for (let k = j + 1; k < numbers.length; k++) {
          const cells3 = [numbers[i], numbers[j], numbers[k]];
          if (this.areValidSelection(cells3)) {
            const sum = cells3.reduce((total, cell) => total + cell.value, 0);
            if (sum === 10) {
              return false;
            }
          }

          // 检查4个数字的组合
          for (let l = k + 1; l < numbers.length; l++) {
            const cells4 = [numbers[i], numbers[j], numbers[k], numbers[l]];
            if (this.areValidSelection(cells4)) {
              const sum = cells4.reduce((total, cell) => total + cell.value, 0);
              if (sum === 10) {
                return false;
              }
            }
          }
        }
      }
    }

    return true; // 没有可消除的组合
  }

  endGame(won) {
    this.gameRunning = false;
    this.gameOver = true;

    if (this.timer) {
      clearInterval(this.timer);
    }

    if (won) {
      this.calculateFinalScore();
      this.showModal = true;
      this.modalType = "win";
    } else {
      this.showModal = true;
      this.modalType = "lose";
    }

    this.render();
  }

  calculateFinalScore() {
    // 计算剩余格子数
    let remainingCells = 0;
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (this.grid[row][col] > 0) {
          remainingCells++;
        }
      }
    }

    // 扣除剩余格子分数
    this.score -= remainingCells * this.config.cellPenalty;

    // 加上剩余时间奖励
    this.score += this.timeLeft * this.config.timeBonus;

    // 确保分数不为负
    this.score = Math.max(0, this.score);
  }

  handleModalClick(x, y) {
    if (!this.showModal) return false;

    const modalWidth = 300;
    const modalHeight = 200;
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    const buttonWidth = 80;
    const buttonHeight = 40;
    const buttonY = modalY + modalHeight - 60;

    if (this.modalType === "win") {
      // 重新挑战按钮（居中）
      const restartButtonX = modalX + (modalWidth - buttonWidth) / 2;
      if (
        x >= restartButtonX &&
        x <= restartButtonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.restart();
        return true;
      }
    } else if (this.modalType === "lose") {
      // 重新挑战按钮（左侧）
      const restartButtonX = modalX + 30;
      if (
        x >= restartButtonX &&
        x <= restartButtonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.restart();
        return true;
      }

      // 继续按钮（中间）
      const continueButtonX = modalX + (modalWidth - buttonWidth) / 2;
      if (
        x >= continueButtonX &&
        x <= continueButtonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        // 增加时间20秒，扣分200分
        this.timeLeft += this.config.continueTime;
        this.score -= this.config.continuePenalty;
        this.score = Math.max(0, this.score);

        // 关闭弹窗，恢复游戏状态
        this.showModal = false;
        this.modalType = "";
        this.gameRunning = true;
        this.gameOver = false;
        this.isSelecting = false;
        this.isMovingMode = false;
        this.selectedForMove = null;
        this.selectedCells = [];

        // 重新启动计时器
        this.startTimer();
        this.render();
        return true;
      }

      // 结束按钮（右侧）
      const endButtonX = modalX + modalWidth - 110;
      if (
        x >= endButtonX &&
        x <= endButtonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.gameManager.gameComplete();
        return true;
      }
    }

    return false;
  }

  restart() {
    // 重置游戏状态
    this.showModal = false;
    this.modalType = "";
    this.gameRunning = false;
    this.gameOver = false;
    this.selectedCells = [];
    this.isSelecting = false;
    this.isMovingMode = false;
    this.selectedForMove = null;
    this.startCell = null;
    this.currentCell = null;

    if (this.timer) {
      clearInterval(this.timer);
    }

    // 重新开始游戏
    this.gameManager.restartFromLevel1();
  }

  continueGame() {
    this.timeLeft += this.config.continueTime;
    this.score -= this.config.continuePenalty;
    this.score = Math.max(0, this.score);

    this.showModal = false;
    this.gameRunning = true;
    this.gameOver = false;

    this.startTimer();
    this.render();
  }

  render() {
    // 绘制渐变背景，保持与前三关一致的风格
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(0.5, "#764ba2");
    gradient.addColorStop(1, "#f093fb");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制头部信息
    this.drawHeader();

    // 绘制网格
    this.drawGrid();

    // 绘制按钮
    this.drawButtons();

    // 绘制模态框
    if (this.showModal) {
      this.drawModal();
    }
  }

  drawHeader() {
    // 添加阴影效果，保持与前三关一致
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "bold 18px Arial"; // 调小字体适配移动端
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    // 关卡信息
    this.ctx.fillText("关卡：4", 15, 15);

    // 分数
    this.ctx.fillText(`分数：${this.score}`, 15, 40);

    // 时间
    this.ctx.textAlign = "right";
    this.ctx.fillStyle = this.timeLeft <= 10 ? "#ff4444" : "#FFFFFF";
    this.ctx.fillText(`时间：${this.timeLeft}秒`, this.canvas.width - 15, 15);

    // 重置阴影
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  drawGrid() {
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        const x = this.gridStartX + col * (this.cellSize + 2);
        const y = this.gridStartY + row * (this.cellSize + 2);
        const value = this.grid[row][col];

        // 检查是否被选中
        const isSelected = this.selectedCells.some(
          (cell) => cell.row === row && cell.col === col
        );

        // 添加阴影效果
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        // 检查是否是移动模式下选中的格子
        const isSelectedForMove =
          this.isMovingMode &&
          this.selectedForMove &&
          this.selectedForMove.row === row &&
          this.selectedForMove.col === col;

        // 绘制格子背景
        if (value === 0) {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        } else if (isSelected) {
          // 选中状态的渐变背景
          const gradient = this.ctx.createRadialGradient(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            0,
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            this.cellSize / 2
          );
          gradient.addColorStop(0, "#ffeb3b");
          gradient.addColorStop(1, "#ffc107");
          this.ctx.fillStyle = gradient;
        } else if (isSelectedForMove) {
          // 移动模式下选中的格子
          const gradient = this.ctx.createRadialGradient(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            0,
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            this.cellSize / 2
          );
          gradient.addColorStop(0, "#e91e63");
          gradient.addColorStop(1, "#c2185b");
          this.ctx.fillStyle = gradient;
        } else {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        }

        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // 重置阴影
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // 绘制格子边框
        if (isSelected) {
          this.ctx.strokeStyle = "#ff9800";
          this.ctx.lineWidth = 2;
        } else if (isSelectedForMove) {
          this.ctx.strokeStyle = "#e91e63";
          this.ctx.lineWidth = 3;
        } else {
          this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          this.ctx.lineWidth = 1;
        }
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // 绘制数字
        if (value > 0) {
          if (isSelected) {
            this.ctx.fillStyle = "#333";
          } else if (isSelectedForMove) {
            this.ctx.fillStyle = "#fff";
          } else {
            this.ctx.fillStyle = "#2c3e50";
          }
          this.ctx.font = `bold ${Math.floor(this.cellSize * 0.6)}px Arial`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(
            value,
            x + this.cellSize / 2,
            y + this.cellSize / 2
          );
        }
      }
    }
  }

  drawButtons() {
    const buttons = [
      { x: this.shuffleButtonX, text: "打乱" },
      { x: this.addTimeButtonX, text: "加时" },
    ];

    buttons.forEach((button) => {
      // 添加阴影效果
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;

      // 按钮背景渐变
      const gradient = this.ctx.createLinearGradient(
        button.x,
        this.buttonY,
        button.x,
        this.buttonY + this.buttonHeight
      );
      if (this.gameRunning && !this.showModal) {
        gradient.addColorStop(0, "#4CAF50");
        gradient.addColorStop(1, "#45a049");
      } else {
        gradient.addColorStop(0, "#cccccc");
        gradient.addColorStop(1, "#999999");
      }
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        button.x,
        this.buttonY,
        this.buttonWidth,
        this.buttonHeight
      );

      // 重置阴影
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      // 按钮边框
      this.ctx.strokeStyle =
        this.gameRunning && !this.showModal ? "#2e7d32" : "#999";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        button.x,
        this.buttonY,
        this.buttonWidth,
        this.buttonHeight
      );

      // 按钮文字
      this.ctx.fillStyle =
        this.gameRunning && !this.showModal ? "#FFFFFF" : "#666";
      this.ctx.font = "bold 16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        button.text,
        button.x + this.buttonWidth / 2,
        this.buttonY + this.buttonHeight / 2
      );
    });
  }

  drawModal() {
    const modalWidth = 300;
    const modalHeight = 200;
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    // 半透明背景
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 添加阴影效果
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 5;

    // 模态框背景渐变
    const gradient = this.ctx.createLinearGradient(
      modalX,
      modalY,
      modalX,
      modalY + modalHeight
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#f8f9fa");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(modalX, modalY, modalWidth, modalHeight);

    // 重置阴影
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // 模态框边框
    this.ctx.strokeStyle = "#dee2e6";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);

    // 标题和内容
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.font = "bold 24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    if (this.modalType === "win") {
      this.ctx.fillText("闯关成功！", modalX + modalWidth / 2, modalY + 50);
      this.ctx.fillStyle = "#495057";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(
        `总得分：${this.score}`,
        modalX + modalWidth / 2,
        modalY + 80
      );

      // 重新挑战按钮
      const buttonWidth = 100;
      const buttonHeight = 40;
      const buttonX = modalX + (modalWidth - buttonWidth) / 2;
      const buttonY = modalY + modalHeight - 60;

      // 按钮阴影
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      this.ctx.shadowBlur = 3;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      // 按钮背景渐变
      const btnGradient = this.ctx.createLinearGradient(
        buttonX,
        buttonY,
        buttonX,
        buttonY + buttonHeight
      );
      btnGradient.addColorStop(0, "#28a745");
      btnGradient.addColorStop(1, "#218838");
      this.ctx.fillStyle = btnGradient;
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // 重置阴影
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      this.ctx.strokeStyle = "#1e7e34";
      this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 16px Arial";
      this.ctx.fillText(
        "重新挑战",
        buttonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    } else if (this.modalType === "lose") {
      this.ctx.fillText("闯关失败！", modalX + modalWidth / 2, modalY + 50);

      // 按钮配置
      const buttonWidth = 80;
      const buttonHeight = 40;
      const buttonY = modalY + modalHeight - 60;

      // 重新挑战按钮（左侧）
      const restartButtonX = modalX + 30;

      // 重新挑战按钮阴影
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      this.ctx.shadowBlur = 3;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      // 重新挑战按钮背景渐变
      const restartGradient = this.ctx.createLinearGradient(
        restartButtonX,
        buttonY,
        restartButtonX,
        buttonY + buttonHeight
      );
      restartGradient.addColorStop(0, "#dc3545");
      restartGradient.addColorStop(1, "#c82333");
      this.ctx.fillStyle = restartGradient;
      this.ctx.fillRect(restartButtonX, buttonY, buttonWidth, buttonHeight);

      // 重置阴影
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      this.ctx.strokeStyle = "#bd2130";
      this.ctx.strokeRect(restartButtonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 16px Arial";
      this.ctx.fillText(
        "重新挑战",
        restartButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );

      // 继续按钮（中间）
      const continueButtonX = modalX + (modalWidth - buttonWidth) / 2;

      // 继续按钮阴影
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      this.ctx.shadowBlur = 3;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      // 继续按钮背景渐变
      const continueGradient = this.ctx.createLinearGradient(
        continueButtonX,
        buttonY,
        continueButtonX,
        buttonY + buttonHeight
      );
      continueGradient.addColorStop(0, "#007bff");
      continueGradient.addColorStop(1, "#0056b3");
      this.ctx.fillStyle = continueGradient;
      this.ctx.fillRect(continueButtonX, buttonY, buttonWidth, buttonHeight);

      // 重置阴影
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      this.ctx.strokeStyle = "#004085";
      this.ctx.strokeRect(continueButtonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText(
        "继续",
        continueButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );

      // 结束按钮（右侧）
      const endButtonX = modalX + modalWidth - 110;

      // 结束按钮阴影
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      this.ctx.shadowBlur = 3;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      // 结束按钮背景渐变
      const endGradient = this.ctx.createLinearGradient(
        endButtonX,
        buttonY,
        endButtonX,
        buttonY + buttonHeight
      );
      endGradient.addColorStop(0, "#6c757d");
      endGradient.addColorStop(1, "#5a6268");
      this.ctx.fillStyle = endGradient;
      this.ctx.fillRect(endButtonX, buttonY, buttonWidth, buttonHeight);

      // 重置阴影
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      this.ctx.strokeStyle = "#545b62";
      this.ctx.strokeRect(endButtonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText(
        "结束",
        endButtonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    }
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      if (this.touchStartHandler) {
        wx.offTouchStart(this.touchStartHandler);
      }
      if (this.touchMoveHandler) {
        wx.offTouchMove(this.touchMoveHandler);
      }
      if (this.touchEndHandler) {
        wx.offTouchEnd(this.touchEndHandler);
      }
    } else {
      // Web环境
      // 清理事件监听器
      if (this.touchStartHandler) {
        this.canvas.removeEventListener("touchstart", this.touchStartHandler);
      }
      if (this.touchMoveHandler) {
        this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
      }
      if (this.touchEndHandler) {
        this.canvas.removeEventListener("touchend", this.touchEndHandler);
      }
      if (this.mouseDownHandler) {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
      }
      if (this.mouseMoveHandler) {
        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
      }
      if (this.mouseUpHandler) {
        this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
      }
    }
  }
}

// 导出类
if (typeof global !== "undefined") {
  global.AdvancedNumberEliminationGame = AdvancedNumberEliminationGame;
} else if (typeof window !== "undefined") {
  window.AdvancedNumberEliminationGame = AdvancedNumberEliminationGame;
} else {
  this.AdvancedNumberEliminationGame = AdvancedNumberEliminationGame;
}

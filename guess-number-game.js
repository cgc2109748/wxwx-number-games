// 第二关：四位数猜测游戏

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

class GuessNumberGame {
  constructor(canvas, ctx, gameManager) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameManager = gameManager;

    // 游戏配置
    this.config = {
      initialTime: 120, // 初始时间120秒
      maxGuesses: 10, // 最大猜测次数
      hintCost: 100, // 提示扣分
      timeAddCost: 10, // 加时扣分
      submitCost: 10, // 提交扣分
      timeBonus: 10, // 时间奖励倍数
      timeAdd: 10, // 加时秒数
      continueCost: 200, // 继续游戏扣分
      continueTime: 20, // 继续游戏加时
      continueGuesses: 5, // 继续游戏增加次数
    };

    // 游戏状态
    this.score = 0;
    this.timeLeft = this.config.initialTime;
    this.guessesLeft = this.config.maxGuesses;
    this.targetNumber = "";
    this.currentInput = ["", "", "", ""];
    this.currentInputIndex = 0;
    this.guessHistory = [];
    this.hints = [];
    this.hintsUsed = 0;

    // 游戏控制
    this.isGameActive = false;
    this.isModalVisible = false;
    this.gameResult = null;
    this.timer = null;

    // 历史记录滚动
    this.historyScrollOffset = 0;
    this.maxHistoryVisible = 10;
    this.isHistoryScrolling = false;
    this.lastTouchY = 0;

    // 防抖相关
    this.nextLevelDebounceTimer = null;
    this.isNextLevelProcessing = false;

    this.init();
  }

  init() {
    this.score = this.gameManager.getScore() || 0;
    this.timeLeft = this.config.initialTime;
    this.guessesLeft = this.config.maxGuesses;
    this.generateTargetNumber();
    this.currentInput = ["", "", "", ""];
    this.currentInputIndex = 0;
    this.guessHistory = [];
    this.hints = [];
    this.hintsUsed = 0;
    this.isGameActive = true;
    this.isModalVisible = false;
    this.gameResult = null;

    // 重置历史记录滚动状态
    this.historyScrollOffset = 0;
    this.isHistoryScrolling = false;

    // 重置防抖状态
    this.nextLevelDebounceTimer = null;
    this.isNextLevelProcessing = false;

    this.bindEvents();
    this.startTimer();
    this.render();
  }

  generateTargetNumber() {
    // 生成四位数（不重复）
    const digits = [];
    while (digits.length < 4) {
      const digit = Math.floor(Math.random() * 10);
      if (!digits.includes(digit)) {
        digits.push(digit);
      }
    }
    this.targetNumber = digits.join("");
    console.log(this.targetNumber);
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
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
    }
    if (this.touchHandler) {
      this.canvas.removeEventListener("touchstart", this.touchHandler);
    }
    if (this.touchMoveHandler) {
      this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
    }
    if (this.touchEndHandler) {
      this.canvas.removeEventListener("touchend", this.touchEndHandler);
    }

    // 键盘事件
    this.keydownHandler = (e) => {
      if (!this.isGameActive || this.isModalVisible) return;

      if (e.key >= "0" && e.key <= "9") {
        this.handleNumberInput(e.key);
      } else if (e.key === "Backspace") {
        this.handleBackspace();
      } else if (e.key === "Enter") {
        this.submitGuess();
      }
    };

    // 触摸事件
    this.touchHandler = (e) => {
      // console.log("🚀 ~ GuessNumberGame ~ bindEvents ~ e:", e);
      if (!this.isGameActive || this.isModalVisible) return;

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

      this.handleTouch(x, y);
    };

    // 触摸移动事件
    this.touchMoveHandler = (e) => {
      if (this.isHistoryScrolling) {
        let y;
        if (typeof wx !== "undefined") {
          // 小程序环境：直接使用触摸坐标
          y = e.touches[0].clientY;
        } else {
          // Web环境：需要计算偏移
          const rect = getCanvasRect(this.canvas);
          y = e.touches[0].clientY - rect.top;
        }
        const deltaY = this.lastTouchY - y;

        // 计算滚动
        const historyAreaHeight = this.canvas.height * 0.15;
        const lineHeight = 20;
        const maxVisible = Math.floor((historyAreaHeight - 30) / lineHeight);
        const maxScroll = Math.max(0, this.guessHistory.length - maxVisible);

        this.historyScrollOffset = Math.max(
          0,
          Math.min(
            maxScroll,
            this.historyScrollOffset + Math.floor(deltaY / 10)
          )
        );
        this.lastTouchY = y;
        this.render();
      }
    };

    // 触摸结束事件
    this.touchEndHandler = (e) => {
      this.isHistoryScrolling = false;
    };

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(this.touchHandler);
      wx.onTouchMove(this.touchMoveHandler);
      wx.onTouchEnd(this.touchEndHandler);
    } else {
      // Web环境（兼容性）
      document.addEventListener("keydown", this.keydownHandler);
      this.canvas.addEventListener("touchstart", this.touchHandler);
      this.canvas.addEventListener("touchmove", this.touchMoveHandler);
      this.canvas.addEventListener("touchend", this.touchEndHandler);
    }
  }

  handleNumberInput(digit) {
    if (
      this.currentInputIndex < 4 &&
      this.isGameActive &&
      !this.isModalVisible
    ) {
      this.currentInput[this.currentInputIndex] = digit;
      this.currentInputIndex++;
      this.render();
    }
  }

  handleBackspace() {
    if (this.currentInputIndex > 0) {
      this.currentInputIndex--;
      this.currentInput[this.currentInputIndex] = "";
      this.render();
    }
  }

  handleTouch(x, y) {
    // 检查历史记录区域滚动
    const historyAreaY = this.canvas.height * 0.85;
    const historyAreaHeight = this.canvas.height * 0.12;

    if (
      y >= historyAreaY &&
      y <= historyAreaY + historyAreaHeight &&
      this.guessHistory.length > 0
    ) {
      this.isHistoryScrolling = true;
      this.lastTouchY = y;
      return;
    }

    // 检查虚拟键盘点击（九宫格布局）- 优先级最高
    const keyboardStartY = this.canvas.height * 0.4;
    const keyWidth = 45;
    const keyHeight = 45;
    const keySpacing = 8;
    const keysPerRow = 3;
    const keyboardTotalWidth =
      keysPerRow * keyWidth + (keysPerRow - 1) * keySpacing;
    const keyboardStartX = (this.canvas.width - keyboardTotalWidth) / 2;

    // 九宫格布局：1-9，底部一行：0和删除键
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["0", "", "←"],
    ];

    let keyboardClicked = false;
    keys.forEach((row, rowIndex) => {
      row.forEach((key, colIndex) => {
        if (key === "" || keyboardClicked) return; // 跳过空位或已点击

        let keyX, keyY;
        if (rowIndex === 3) {
          // 底部行特殊处理：0键居左，删除键居右
          if (key === "0") {
            keyX = keyboardStartX;
          } else if (key === "←") {
            keyX = keyboardStartX + 2 * (keyWidth + keySpacing);
          }
        } else {
          keyX = keyboardStartX + colIndex * (keyWidth + keySpacing);
        }
        keyY = keyboardStartY + rowIndex * (keyHeight + keySpacing);

        if (
          x >= keyX &&
          x <= keyX + keyWidth &&
          y >= keyY &&
          y <= keyY + keyHeight
        ) {
          keyboardClicked = true;
          if (key === "←") {
            this.handleBackspace();
          } else {
            this.handleNumberInput(key);
          }
        }
      });
    });

    // 如果虚拟键盘被点击，直接返回，不检查其他区域
    if (keyboardClicked) {
      return;
    }

    // 检查输入框点击
    const inputY = this.canvas.height * 0.25;
    const inputHeight = 50;
    const inputWidth = 50;
    const inputSpacing = 10;
    const inputTotalWidth = 4 * inputWidth + 3 * inputSpacing;
    const inputStartX = (this.canvas.width - inputTotalWidth) / 2;

    if (y >= inputY && y <= inputY + inputHeight) {
      for (let i = 0; i < 4; i++) {
        const inputX = inputStartX + i * (inputWidth + inputSpacing);
        if (x >= inputX && x <= inputX + inputWidth) {
          this.currentInputIndex = i;
          this.render();
          return;
        }
      }
    }

    // 检查按钮点击 - 优先级最低
    const buttonY = this.canvas.height * 0.75;
    const buttonHeight = 40;
    const buttonWidth = 80;
    const spacing = 20;
    const totalWidth = 4 * buttonWidth + 3 * spacing;
    const startX = (this.canvas.width - totalWidth) / 2;

    if (y >= buttonY && y <= buttonY + buttonHeight) {
      // 提示按钮
      if (x >= startX && x <= startX + buttonWidth) {
        this.showHint();
      }
      // 加时按钮
      else if (
        x >= startX + buttonWidth + spacing &&
        x <= startX + 2 * buttonWidth + spacing
      ) {
        this.addTime();
      }
      // 提交按钮
      else if (
        x >= startX + 2 * (buttonWidth + spacing) &&
        x <= startX + 3 * buttonWidth + 2 * spacing
      ) {
        this.submitGuess();
      }
      // 跳关按钮
      else if (
        x >= startX + 3 * (buttonWidth + spacing) &&
        x <= startX + 4 * buttonWidth + 3 * spacing
      ) {
        this.skipLevel();
      }
    }
  }

  showHint() {
    if (this.hintsUsed >= 4) return;

    const digit = this.targetNumber[this.hintsUsed];
    this.hints.push(`包含数字${digit}`);
    this.hintsUsed++;
    this.score -= this.config.hintCost;
    this.render();
  }

  addTime() {
    this.timeLeft += this.config.timeAdd;
    this.score -= this.config.timeAddCost;
    this.render();
  }

  submitGuess() {
    console.log('submitGuess~~~~333333333');

    // 防止重复提交
    if (this.isModalVisible || !this.isGameActive) {
      return;
    }

    const guess = this.currentInput.join("");
    if (guess.length !== 4) return;

    // 立即设置状态，防止重复提交
    this.isGameActive = false;

    this.score -= this.config.submitCost;
    this.guessesLeft--;

    const correctCount = this.checkGuess(guess);
    this.guessHistory.push({
      guess: guess,
      correct: correctCount,
    });

    if (correctCount === 4) {
      this.gameOver(true);
    } else if (this.guessesLeft <= 0) {
      this.gameOver(false);
    } else {
      // 如果游戏继续，重新激活游戏状态
      this.isGameActive = true;
      this.currentInput = ["", "", "", ""];
      this.currentInputIndex = 0;
      this.render();
    }
  }

  checkGuess(guess) {
    let correctCount = 0;
    for (let i = 0; i < 4; i++) {
      if (guess[i] === this.targetNumber[i]) {
        correctCount++;
      }
    }
    return correctCount;
  }

  skipLevel() {
    this.gameManager.nextLevel(this.score);
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
      this.gameManager.nextLevel(this.score);
      // 重置处理状态
      this.isNextLevelProcessing = false;
    }, 500);
  }

  gameOver(isWin) {
    // 防止重复调用
    if (this.isModalVisible) {
      return;
    }

    this.isGameActive = false;
    this.isModalVisible = true;
    this.gameResult = isWin;
    clearInterval(this.timer);

    if (isWin) {
      this.calculateFinalScore();
    }

    this.showModal(isWin);
  }

  calculateFinalScore() {
    this.score += this.timeLeft * this.config.timeBonus;
  }

  showModal(isWin) {
    this.render();
    // 在渲染完成后立即绑定模态框事件
    setTimeout(() => {
      // 防止重复绑定事件
      if (this.isModalVisible && this.gameResult !== null) {
        this.bindModalEvents(isWin);
      }
    }, 0);
  }

  drawModal(isWin) {
    console.log('drawModal~~~~')
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 模态框尺寸和位置
    const modalWidth = Math.min(300, this.canvas.width * 0.8);
    const modalHeight = Math.min(250, this.canvas.height * 0.6);
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    // 绘制模态框
    this.ctx.fillStyle = "#ffffff";
    // this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    // this.ctx.shadowBlur = 10;
    // this.ctx.shadowOffsetX = 0;
    // this.ctx.shadowOffsetY = 5;
    this.roundRect(modalX, modalY, modalWidth, modalHeight, 10);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // 绘制边框
    this.ctx.strokeStyle = "#e0e0e0";
    this.ctx.lineWidth = 2;
    this.roundRect(modalX, modalY, modalWidth, modalHeight, 10);
    // this.ctx.stroke();

    // 绘制标题
    this.ctx.fillStyle = isWin ? "#4CAF50" : "#f44336";
    this.ctx.font = `bold ${Math.min(28, modalWidth / 10)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      isWin ? "闯关成功！" : "闯关失败！",
      this.canvas.width / 2,
      modalY + modalHeight * 0.3
    );

    // 绘制分数信息
    const scoreFontSize = Math.min(20, modalWidth / 18);
    this.ctx.font = `${scoreFontSize}px Arial`;
    this.ctx.fillStyle = "#333333";

    if (isWin) {
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
      // 只显示下一关按钮
      const buttonWidth = 120;
      const buttonX = (this.canvas.width - buttonWidth) / 2;

      this.ctx.fillStyle = "#4CAF50";
      this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 5);
      this.ctx.fill();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "下一关",
        buttonX + buttonWidth / 2,
        buttonY + buttonHeight / 2 + 6
      );
    } else {
      // 显示重新挑战和继续按钮
      const buttonWidth = 100;
      const spacing = 20;
      const totalWidth = 2 * buttonWidth + spacing;
      const startX = (this.canvas.width - totalWidth) / 2;

      // 重新挑战按钮
      this.ctx.fillStyle = "#ff9800";
      this.roundRect(startX, buttonY, buttonWidth, buttonHeight, 5);
      this.ctx.fill();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "重新挑战",
        startX + buttonWidth / 2,
        buttonY + buttonHeight / 2 + 6
      );

      // 继续按钮
      this.ctx.fillStyle = "#2196F3";
      this.roundRect(
        startX + buttonWidth + spacing,
        buttonY,
        buttonWidth,
        buttonHeight,
        5
      );
      this.ctx.fill();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText(
        "继续",
        startX + buttonWidth + spacing + buttonWidth / 2,
        buttonY + buttonHeight / 2 + 6
      );
    }
  }

  bindModalEvents(isWin) {
    // 先移除之前的模态框事件监听器
    this.unbindModalEvents();

    const modalWidth = Math.min(300, this.canvas.width * 0.8);
    const modalHeight = Math.min(250, this.canvas.height * 0.6);
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    this.modalTouchHandler = (e) => {
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

      const buttonY = modalY + modalHeight * 0.75;
      const buttonHeight = 40;

      if (y >= buttonY && y <= buttonY + buttonHeight) {
        if (isWin) {
          const buttonWidth = 120;
          const buttonX = (this.canvas.width - buttonWidth) / 2;
          if (x >= buttonX && x <= buttonX + buttonWidth) {
            this.nextLevel();
          }
        } else {
          const buttonWidth = 100;
          const spacing = 20;
          const totalWidth = 2 * buttonWidth + spacing;
          const startX = (this.canvas.width - totalWidth) / 2;

          if (x >= startX && x <= startX + buttonWidth) {
            this.restart();
          } else if (
            x >= startX + buttonWidth + spacing &&
            x <= startX + 2 * buttonWidth + spacing
          ) {
            this.continueGame();
          }
        }
      }
    };

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(this.modalTouchHandler);
    } else {
      // Web环境（兼容性）
      this.canvas.addEventListener("touchstart", this.modalTouchHandler);
    }
  }

  nextLevel() {
    this.handleNextLevelClick();
  }

  restart() {
    this.unbindModalEvents();
    this.gameManager.restart();
  }

  continueGame() {
    this.unbindModalEvents();
    this.score -= this.config.continueCost;
    this.timeLeft += this.config.continueTime;
    this.guessesLeft += this.config.continueGuesses;
    this.isModalVisible = false;
    this.gameResult = null;
    this.isGameActive = true;

    // 重新绑定事件监听器
    this.bindEvents();

    // 重新启动计时器
    this.startTimer();
    this.render();
  }

  unbindModalEvents() {
    if (typeof wx !== "undefined") {
      // 小程序环境
      if (this.modalTouchHandler) {
        wx.offTouchStart(this.modalTouchHandler);
      }
    } else {
      // Web环境
      if (this.modalTouchHandler) {
        this.canvas.removeEventListener("touchstart", this.modalTouchHandler);
      }
    }
  }

  render() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制背景
    this.drawBackground();

    // 绘制游戏界面
    this.drawHeader();
    this.drawGameInfo();
    this.drawInputBoxes();
    this.drawHints();
    this.drawButtons();
    this.drawVirtualKeyboard();
    this.drawHistory();

    // 如果模态框可见，在最上层绘制模态框
    if (this.isModalVisible && this.gameResult !== null) {
      this.drawModal(this.gameResult);
    }
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#e3f2fd");
    gradient.addColorStop(1, "#bbdefb");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawHeader() {
    this.ctx.fillStyle = "#1976d2";
    this.ctx.font = "bold 24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("关卡：2", this.canvas.width / 2, 40);
  }

  drawGameInfo() {
    const y = 80;
    this.ctx.fillStyle = "#333333";
    this.ctx.font = "18px Arial";
    this.ctx.textAlign = "left";

    // 分数
    this.ctx.fillText(`分数: ${this.score}`, 20, y);

    // 时间
    this.ctx.textAlign = "center";
    this.ctx.fillText(`时间: ${this.timeLeft}s`, this.canvas.width / 2, y);

    // 剩余次数
    this.ctx.textAlign = "right";
    this.ctx.fillText(`剩余: ${this.guessesLeft}次`, this.canvas.width - 20, y);
  }

  drawInputBoxes() {
    const y = this.canvas.height * 0.25;
    const boxWidth = 50;
    const boxHeight = 50;
    const spacing = 10;
    const totalWidth = 4 * boxWidth + 3 * spacing;
    const startX = (this.canvas.width - totalWidth) / 2;

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (boxWidth + spacing);

      // 绘制输入框
      this.ctx.fillStyle = i === this.currentInputIndex ? "#e3f2fd" : "#ffffff";
      this.ctx.fillRect(x, y, boxWidth, boxHeight);

      // 绘制边框
      this.ctx.strokeStyle =
        i === this.currentInputIndex ? "#1976d2" : "#cccccc";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, boxWidth, boxHeight);

      // 绘制数字
      if (this.currentInput[i]) {
        this.ctx.fillStyle = "#333333";
        this.ctx.font = "bold 24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
          this.currentInput[i],
          x + boxWidth / 2,
          y + boxHeight / 2 + 8
        );
      }
    }
  }

  drawHints() {
    const startY = this.canvas.height * 0.35;
    this.ctx.fillStyle = "#666666";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "center";

    if (this.hints.length > 0) {
      // 每行显示2个提示，支持换行
      const hintsPerLine = 2;
      for (let i = 0; i < this.hints.length; i++) {
        const lineIndex = Math.floor(i / hintsPerLine);
        const posInLine = i % hintsPerLine;
        const y = startY + lineIndex * 20;

        if (posInLine === 0 && i + 1 < this.hints.length) {
          // 一行显示两个提示
          const hintText = `${this.hints[i]}，${this.hints[i + 1]}`;
          this.ctx.fillText(hintText, this.canvas.width / 2, y);
          i++; // 跳过下一个，因为已经显示了
        } else if (posInLine === 0) {
          // 只有一个提示
          this.ctx.fillText(this.hints[i], this.canvas.width / 2, y);
        }
      }
    } else {
      this.ctx.fillText(
        "点击提示按钮获取数字提示",
        this.canvas.width / 2,
        startY
      );
    }
  }

  drawButtons() {
    const y = this.canvas.height * 0.75;
    const buttonWidth = 80;
    const buttonHeight = 40;
    const spacing = 20;
    const totalWidth = 4 * buttonWidth + 3 * spacing;
    const startX = (this.canvas.width - totalWidth) / 2;

    const buttons = [
      { text: "提示", color: "#ff9800", disabled: this.hintsUsed >= 4 },
      { text: "加时", color: "#4caf50", disabled: false },
      {
        text: "提交",
        color: "#2196f3",
        disabled: this.currentInput.join("").length !== 4,
      },
      { text: "跳关", color: "#9c27b0", disabled: false },
    ];

    buttons.forEach((button, index) => {
      const x = startX + index * (buttonWidth + spacing);

      this.ctx.fillStyle = button.disabled ? "#cccccc" : button.color;
      this.roundRect(x, y, buttonWidth, buttonHeight, 5);
      this.ctx.fill();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        button.text,
        x + buttonWidth / 2,
        y + buttonHeight / 2 + 6
      );
    });
  }

  drawVirtualKeyboard() {
    if (this.isModalVisible) return;

    const startY = this.canvas.height * 0.4;
    const keyWidth = 45;
    const keyHeight = 45;
    const spacing = 8;
    const keysPerRow = 3;
    const totalWidth = keysPerRow * keyWidth + (keysPerRow - 1) * spacing;
    const startX = (this.canvas.width - totalWidth) / 2;

    // 九宫格布局：1-9，底部一行：0和删除键
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["0", "", "←"],
    ];

    keys.forEach((row, rowIndex) => {
      row.forEach((key, colIndex) => {
        if (key === "") return; // 跳过空位

        let x, y;
        if (rowIndex === 3) {
          // 底部行特殊处理：0键居左，删除键居右
          if (key === "0") {
            x = startX;
          } else if (key === "←") {
            x = startX + 2 * (keyWidth + spacing);
          }
        } else {
          x = startX + colIndex * (keyWidth + spacing);
        }
        y = startY + rowIndex * (keyHeight + spacing);

        // 绘制按键背景
        this.ctx.fillStyle = key === "←" ? "#f44336" : "#e0e0e0";
        this.roundRect(x, y, keyWidth, keyHeight, 5);
        this.ctx.fill();

        // 绘制按键边框
        this.ctx.strokeStyle = "#cccccc";
        this.ctx.lineWidth = 1;
        this.roundRect(x, y, keyWidth, keyHeight, 5);
        this.ctx.stroke();

        // 绘制按键文字
        this.ctx.fillStyle = key === "←" ? "#ffffff" : "#333333";
        this.ctx.font = "bold 18px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(key, x + keyWidth / 2, y + keyHeight / 2 + 6);
      });
    });
  }

  drawHistory() {
    if (this.guessHistory.length === 0) return;

    // 历史记录区域设置
    const historyAreaY = this.canvas.height * 0.85;
    const historyAreaHeight = this.canvas.height * 0.12;
    const lineHeight = 20;
    const padding = 10;

    // 绘制历史记录背景
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    this.ctx.fillRect(0, historyAreaY, this.canvas.width, historyAreaHeight);

    // 绘制边框
    this.ctx.strokeStyle = "#cccccc";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, historyAreaY, this.canvas.width, historyAreaHeight);

    // 标题
    this.ctx.fillStyle = "#333333";
    this.ctx.font = "bold 14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("猜测记录", this.canvas.width / 2, historyAreaY + 20);

    // 计算可见记录范围
    const maxVisible = Math.floor((historyAreaHeight - 30) / lineHeight);
    const totalRecords = this.guessHistory.length;
    const startIndex = Math.max(
      0,
      Math.min(this.historyScrollOffset, totalRecords - maxVisible)
    );
    const endIndex = Math.min(totalRecords, startIndex + maxVisible);

    // 绘制历史记录
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";

    for (let i = startIndex; i < endIndex; i++) {
      const record = this.guessHistory[i];
      const y = historyAreaY + 35 + (i - startIndex) * lineHeight;

      // 交替背景色
      if ((i - startIndex) % 2 === 1) {
        this.ctx.fillStyle = "rgba(240, 240, 240, 0.5)";
        this.ctx.fillRect(0, y - lineHeight / 2, this.canvas.width, lineHeight);
      }

      this.ctx.fillStyle = "#333333";
      this.ctx.fillText(
        `第${i + 1}次: ${record.guess} - ${record.correct}位正确`,
        this.canvas.width / 2,
        y
      );
    }

    // 绘制滚动指示器
    if (totalRecords > maxVisible) {
      const scrollBarHeight = historyAreaHeight - 30;
      const scrollBarY = historyAreaY + 25;
      const scrollBarX = this.canvas.width - 10;

      // 滚动条背景
      this.ctx.fillStyle = "#e0e0e0";
      this.ctx.fillRect(scrollBarX, scrollBarY, 5, scrollBarHeight);

      // 滚动条滑块
      const thumbHeight = Math.max(
        20,
        (maxVisible / totalRecords) * scrollBarHeight
      );
      const thumbY =
        scrollBarY +
        (startIndex / (totalRecords - maxVisible)) *
          (scrollBarHeight - thumbHeight);

      this.ctx.fillStyle = "#999999";
      this.ctx.fillRect(scrollBarX, thumbY, 5, thumbHeight);
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
    clearInterval(this.timer);

    // 清理防抖定时器
    if (this.nextLevelDebounceTimer) {
      clearTimeout(this.nextLevelDebounceTimer);
    }

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      if (this.touchHandler) {
        wx.offTouchStart(this.touchHandler);
      }
      if (this.touchMoveHandler) {
        wx.offTouchMove(this.touchMoveHandler);
      }
      if (this.touchEndHandler) {
        wx.offTouchEnd(this.touchEndHandler);
      }
      if (this.modalTouchHandler) {
        wx.offTouchStart(this.modalTouchHandler);
      }
    } else {
      // Web环境
      document.removeEventListener("keydown", this.keydownHandler);
      this.canvas.removeEventListener("touchstart", this.touchHandler);
      if (this.touchMoveHandler) {
        this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
      }
      if (this.touchEndHandler) {
        this.canvas.removeEventListener("touchend", this.touchEndHandler);
      }
      if (this.modalTouchHandler) {
        this.canvas.removeEventListener("touchstart", this.modalTouchHandler);
      }
    }
  }
}

// 导出类
if (typeof global !== "undefined") {
  global.GuessNumberGame = GuessNumberGame;
} else if (typeof window !== "undefined") {
  window.GuessNumberGame = GuessNumberGame;
} else {
  this.GuessNumberGame = GuessNumberGame;
}

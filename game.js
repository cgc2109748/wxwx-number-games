// game.js - 微信小游戏主入口文件

// 获取画布
const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");

// 获取屏幕尺寸
const { windowWidth, windowHeight } = wx.getSystemInfoSync();
canvas.width = windowWidth;
canvas.height = windowHeight;

// 引入游戏模块
require("./start-page.js");
require("./sorting-game.js");
require("./guess-number-game.js");
require("./number-elimination-game.js");
require("./advanced-number-elimination-game.js");
require("./level4-game.js");

// 游戏状态管理
class GameManager {
  constructor() {
    this.currentLevel = 1;
    this.totalLevels = 4;
    this.currentGame = null;
    this.totalScore = 0;
    this.showStartPage = true;
    this.isGameComplete = false;
    this.gameCompleteStartTime = 0;
    // 延迟初始化，确保所有类都已加载
    setTimeout(() => {
      this.init();
    }, 100);
  }

  showStartScreen() {
    // 清除当前游戏
    if (this.currentGame) {
      this.currentGame.destroy();
    }

    // 显示开始页面
    this.currentGame = new StartPage(canvas, ctx, this);
    this.showStartPage = false; // 标记已显示过开始页面
  }

  init() {
    // 检查所有游戏类是否已定义
    if (
      typeof StartPage === "undefined" ||
      typeof SortingGame === "undefined" ||
      typeof GuessNumberGame === "undefined" ||
      typeof NumberEliminationGame === "undefined" ||
      typeof AdvancedNumberEliminationGame === "undefined" ||
      typeof Level4Game === "undefined"
    ) {
      console.log("等待游戏类加载...");
      setTimeout(() => {
        this.init();
      }, 50);
      return;
    }
    console.log("所有游戏类已加载完成");
    if (this.showStartPage) {
      this.showStartScreen();
    } else {
      this.loadLevel(this.currentLevel);
    }
  }

  loadLevel(level) {
    // 清除当前游戏
    if (this.currentGame) {
      this.currentGame.destroy();
    }

    // 根据关卡加载对应游戏
    switch (level) {
      case 1:
        this.currentGame = new SortingGame(canvas, ctx, this);
        break;
      case 2:
        this.currentGame = new GuessNumberGame(canvas, ctx, this);
        break;
      case 3:
        this.currentGame = new NumberEliminationGame(canvas, ctx, this);
        break;
      case 4:
        this.currentGame = new Level4Game(canvas, ctx, this, this.totalScore);
        break;
      default:
        this.gameComplete();
        break;
    }
  }

  nextLevel(score = 0) {
    // 累计分数
    this.totalScore += score;
    this.currentLevel++;
    if (this.currentLevel <= this.totalLevels) {
      this.loadLevel(this.currentLevel);
    } else {
      this.gameComplete();
    }
  }

  getScore() {
    return this.totalScore;
  }

  setScore(score) {
    this.totalScore = score;
  }

  restart() {
    this.currentLevel = 1;
    this.totalScore = 0;
    this.showStartPage = true;
    this.showStartScreen();
  }

  restartFromLevel1() {
    this.restart();
  }

  completeGame() {
    this.gameComplete();
  }

  gameComplete() {
    // 清除当前游戏
    if (this.currentGame) {
      this.currentGame.destroy();
    }

    // 设置游戏完成状态
    this.isGameComplete = true;
    this.gameCompleteStartTime = Date.now();

    // 开始游戏完成动画循环
    this.gameCompleteAnimation();

    // 5秒后返回排行榜页面
    setTimeout(() => {
      this.isGameComplete = false;
      this.showStartScreen();
    }, 5000);
  }

  gameCompleteAnimation() {
    if (!this.isGameComplete) return;

    // 绘制庆祝背景
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width
    );
    gradient.addColorStop(0, "#FFD700");
    gradient.addColorStop(0.3, "#FF6B6B");
    gradient.addColorStop(0.6, "#4ECDC4");
    gradient.addColorStop(1, "#45B7D1");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制庆祝装饰
    this.drawCelebrationDecorations();

    // 绘制恭喜文字
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.fillStyle = "#FFFFFF";
    // 根据屏幕宽度调整字体大小
    const congratsFontSize = Math.min(56, canvas.width / 7);
    ctx.font = `bold ${congratsFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎉 游戏结束！ 🎉", canvas.width / 2, canvas.height / 2 - 80);

    // 绘制总分数
    const scoreFontSize = Math.min(40, canvas.width / 10);
    ctx.font = `bold ${scoreFontSize}px Arial`;
    ctx.fillStyle = "#FFD700";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.strokeText(
      `总分数：${this.totalScore}`,
      canvas.width / 2,
      canvas.height / 2 + 20
    );
    ctx.fillText(
      `总分数：${this.totalScore}`,
      canvas.width / 2,
      canvas.height / 2 + 20
    );

    // 绘制评价
    const ratingFontSize = Math.min(28, canvas.width / 14);
    ctx.font = `bold ${ratingFontSize}px Arial`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    const rating = this.getScoreRating(this.totalScore);
    ctx.fillText(rating, canvas.width / 2, canvas.height / 2 + 80);

    // 绘制倒计时提示
    const elapsedTime = Date.now() - this.gameCompleteStartTime;
    const remainingTime = Math.max(0, 5000 - elapsedTime);
    const countdownText = `返回排行榜 (${Math.ceil(remainingTime / 1000)}s)`;

    const countdownFontSize = Math.min(24, canvas.width / 16);
    ctx.font = `${countdownFontSize}px Arial`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText(countdownText, canvas.width / 2, canvas.height / 2 + 140);

    // 重置阴影
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 继续动画循环
    requestAnimationFrame(() => this.gameCompleteAnimation());
  }

  drawCelebrationDecorations() {
    // 绘制飘落的星星
    const time = Date.now() * 0.002;
    for (let i = 0; i < 20; i++) {
      const x = (canvas.width / 21) * (i + 1) + Math.sin(time + i) * 30;
      const y = 50 + Math.cos(time * 0.8 + i) * 40;
      const size = 8 + Math.sin(time * 2 + i) * 4;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + Math.sin(time + i) * 0.3})`;
      this.drawStar(x, y, size);
    }
  }

  drawStar(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        Math.cos(((18 + i * 72) / 180) * Math.PI) * size,
        -Math.sin(((18 + i * 72) / 180) * Math.PI) * size
      );
      ctx.lineTo(
        Math.cos(((54 + i * 72) / 180) * Math.PI) * size * 0.5,
        -Math.sin(((54 + i * 72) / 180) * Math.PI) * size * 0.5
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  getScoreRating(score) {
    if (score >= 900) return "🏆 完美大师！";
    if (score >= 700) return "⭐ 优秀表现！";
    if (score >= 500) return "👍 不错哦！";
    if (score >= 300) return "😊 继续努力！";
    return "💪 再接再厉！";
  }
}

// 启动游戏管理器
const gameManager = new GameManager();

console.log("四关游戏合集启动成功！");

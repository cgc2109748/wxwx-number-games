// start-page.js - 游戏开始页面

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

class StartPage {
  constructor(canvas, ctx, gameManager) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameManager = gameManager;
    this.width = canvas.width;
    this.height = canvas.height;

    // 模拟省份排名数据
    this.provinceData = this.generateMockData();

    this.bindEvents();
    this.render();
  }

  generateMockData() {
    const provinces = [
      "广东",
      "江苏",
      "山东",
      "浙江",
      "河南",
      "四川",
      "湖北",
      "福建",
      "湖南",
      "安徽",
      "河北",
      "北京",
      "陕西",
      "江西",
      "重庆",
      "辽宁",
      "云南",
      "山西",
      "广西",
      "贵州",
      "吉林",
      "上海",
      "新疆",
      "天津",
      "内蒙古",
      "黑龙江",
      "甘肃",
      "海南",
      "宁夏",
      "青海",
      "西藏",
    ];

    const data = provinces.map((province, index) => {
      const participants = Math.floor(Math.random() * 50000) + 10000; // 1万到6万参与人数
      const avgScore = Math.floor(Math.random() * 500) + 300; // 300-800平均分
      const totalScore = participants * avgScore;

      return {
        province,
        participants,
        avgScore,
        totalScore,
      };
    });

    // 按总分排序
    return data.sort((a, b) => b.totalScore - a.totalScore);
  }

  bindEvents() {
    this.handleClick = this.handleClick.bind(this);

    // 使用微信小游戏的触摸事件API
    if (typeof wx !== "undefined") {
      // 小程序环境
      wx.onTouchStart(this.handleClick);
    } else {
      // Web环境（兼容性）
      this.canvas.addEventListener("click", this.handleClick);
    }
  }

  handleClick(event) {
    let x, y;
    if (typeof wx !== "undefined") {
      // 小程序环境
      const touch = event.touches[0];
      x = touch.clientX;
      y = touch.clientY;
    } else {
      // Web环境
      const rect = getCanvasRect(this.canvas);
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    // 检查是否点击了开始挑战按钮
    const buttonY = this.height * 0.85;
    const buttonHeight = this.height * 0.08;
    const buttonWidth = this.width * 0.6;
    const buttonX = (this.width - buttonWidth) / 2;

    if (
      x >= buttonX &&
      x <= buttonX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      this.startGame();
    }
  }

  startGame() {
    // 移除事件监听器
    this.unbindEvents();
    // 开始第一关游戏
    this.gameManager.loadLevel(1);
  }

  unbindEvents() {
    if (typeof wx !== "undefined") {
      // 小程序环境
      if (this.handleClick) {
        wx.offTouchStart(this.handleClick);
      }
    } else {
      // Web环境
      if (this.handleClick) {
        this.canvas.removeEventListener("click", this.handleClick);
      }
    }
  }

  render() {
    // 清空画布
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 绘制背景渐变
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 绘制游戏标题
    this.drawTitle();

    // 绘制排名区域
    this.drawRankings();

    // 绘制开始按钮
    this.drawStartButton();
  }

  drawTitle() {
    const titleY = this.height * 0.08;

    // 设置标题样式
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // 绘制标题阴影
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.font = `bold ${this.width * 0.12}px Arial, sans-serif`;
    this.ctx.fillText("数你最型", this.width / 2 + 3, titleY + 3);

    // 绘制标题渐变
    const titleGradient = this.ctx.createLinearGradient(
      0,
      titleY - 30,
      0,
      titleY + 30
    );
    titleGradient.addColorStop(0, "#ffd700");
    titleGradient.addColorStop(0.5, "#ffed4e");
    titleGradient.addColorStop(1, "#ff6b35");

    this.ctx.fillStyle = titleGradient;
    this.ctx.fillText("数你最型", this.width / 2, titleY);

    // 绘制标题描边
    this.ctx.strokeStyle = "#ff4757";
    this.ctx.lineWidth = 2;
    this.ctx.strokeText("数你最型", this.width / 2, titleY);
  }

  drawRankings() {
    const rankingStartY = this.height * 0.18;
    const rankingHeight = this.height * 0.6; // 五分之三的页面高度
    const rankingWidth = this.width * 0.9;
    const rankingX = (this.width - rankingWidth) / 2;

    // 绘制排名背景
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.fillRect(rankingX, rankingStartY, rankingWidth, rankingHeight);

    // 绘制排名边框
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(rankingX, rankingStartY, rankingWidth, rankingHeight);

    // 绘制标题
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = `bold ${this.width * 0.05}px Arial, sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "全国省份排行榜",
      this.width / 2,
      rankingStartY + this.height * 0.04
    );

    // 绘制表头
    const headerY = rankingStartY + this.height * 0.08;
    this.ctx.font = `${this.width * 0.035}px Arial, sans-serif`;
    this.ctx.fillStyle = "#ffd700";
    this.ctx.textAlign = "left";

    const col1X = rankingX + rankingWidth * 0.05;
    const col2X = rankingX + rankingWidth * 0.25;
    const col3X = rankingX + rankingWidth * 0.55;
    const col4X = rankingX + rankingWidth * 0.8;

    this.ctx.fillText("排名", col1X, headerY);
    this.ctx.fillText("省份", col2X, headerY);
    this.ctx.fillText("参与人数", col3X, headerY);
    this.ctx.fillText("总分", col4X, headerY);

    // 绘制分割线
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(
      rankingX + rankingWidth * 0.02,
      headerY + this.height * 0.02
    );
    this.ctx.lineTo(
      rankingX + rankingWidth * 0.98,
      headerY + this.height * 0.02
    );
    this.ctx.stroke();

    // 绘制排名数据（显示前10名）
    const itemHeight = this.height * 0.04;
    const startDataY = headerY + this.height * 0.04;

    for (let i = 0; i < Math.min(10, this.provinceData.length); i++) {
      const data = this.provinceData[i];
      const y = startDataY + i * itemHeight;

      // 设置排名颜色
      if (i < 3) {
        this.ctx.fillStyle = ["#ffd700", "#c0c0c0", "#cd7f32"][i]; // 金银铜
      } else {
        this.ctx.fillStyle = "#ffffff";
      }

      this.ctx.font = `${this.width * 0.03}px Arial, sans-serif`;

      // 绘制排名
      this.ctx.textAlign = "center";
      this.ctx.fillText((i + 1).toString(), col1X + rankingWidth * 0.05, y);

      // 绘制省份名
      this.ctx.textAlign = "left";
      this.ctx.fillText(data.province, col2X, y);

      // 绘制参与人数
      this.ctx.fillText(this.formatNumber(data.participants), col3X, y);

      // 绘制总分
      this.ctx.fillText(this.formatNumber(data.totalScore), col4X, y);
    }
  }

  drawStartButton() {
    const buttonY = this.height * 0.85;
    const buttonHeight = this.height * 0.08;
    const buttonWidth = this.width * 0.6;
    const buttonX = (this.width - buttonWidth) / 2;

    // 绘制按钮背景渐变
    const buttonGradient = this.ctx.createLinearGradient(
      0,
      buttonY,
      0,
      buttonY + buttonHeight
    );
    buttonGradient.addColorStop(0, "#ff6b35");
    buttonGradient.addColorStop(1, "#f7931e");

    this.ctx.fillStyle = buttonGradient;
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // 绘制按钮边框
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // 绘制按钮文字
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = `bold ${this.width * 0.05}px Arial, sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("开始挑战", this.width / 2, buttonY + buttonHeight / 2);

    // 绘制按钮文字阴影
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillText(
      "开始挑战",
      this.width / 2 + 2,
      buttonY + buttonHeight / 2 + 2
    );
  }

  formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "万";
    }
    return num.toString();
  }

  destroy() {
    this.unbindEvents();
  }
}

// 导出类
if (typeof global !== "undefined") {
  global.StartPage = StartPage;
} else if (typeof window !== "undefined") {
  window.StartPage = StartPage;
} else {
  this.StartPage = StartPage;
}

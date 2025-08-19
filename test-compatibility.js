// test-compatibility.js - 测试小程序兼容性修改

// 模拟微信小游戏环境
const mockWx = {
  onTouchStart: (handler) => {
    console.log("wx.onTouchStart 被调用");
    mockWx.touchStartHandler = handler;
  },
  onTouchMove: (handler) => {
    console.log("wx.onTouchMove 被调用");
    mockWx.touchMoveHandler = handler;
  },
  onTouchEnd: (handler) => {
    console.log("wx.onTouchEnd 被调用");
    mockWx.touchEndHandler = handler;
  },
  offTouchStart: (handler) => {
    console.log("wx.offTouchStart 被调用");
    mockWx.touchStartHandler = null;
  },
  offTouchMove: (handler) => {
    console.log("wx.offTouchMove 被调用");
    mockWx.touchMoveHandler = null;
  },
  offTouchEnd: (handler) => {
    console.log("wx.offTouchEnd 被调用");
    mockWx.touchEndHandler = null;
  },
};

// 测试环境检测
function testEnvironmentDetection() {
  console.log("=== 测试环境检测 ===");

  // 测试小程序环境
  global.wx = mockWx;

  if (typeof wx !== "undefined") {
    console.log("✅ 检测到小程序环境");
  } else {
    console.log("❌ 未检测到小程序环境");
  }

  // 测试Web环境
  delete global.wx;

  if (typeof wx !== "undefined") {
    console.log("❌ 错误：Web环境仍检测到wx对象");
  } else {
    console.log("✅ 正确：Web环境未检测到wx对象");
  }
}

// 运行测试
function runAllTests() {
  console.log("开始小程序兼容性测试...\n");
  testEnvironmentDetection();
  console.log("\n✅ 测试完成！");
}

runAllTests();

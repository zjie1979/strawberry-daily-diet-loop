const STORAGE_KEY = "strawberryDailyDietLoop.v1";
const ADVANCE_DELAY = 900;

const days = [
  {
    name: "第 1 天 · 基础稳餐",
    summary: "蛋奶、米饭、蔬菜和优质蛋白，适合长期循环。",
    meals: [
      ["早", "鸡蛋 2 个 + 牛奶 100ml + 核桃 2 个或巴旦木 4 个。", "必打卡"],
      ["加餐", "饿了再加半根玉米或 1 个番茄。", "可跳过"],
      ["中", "米饭 150g + 炒蔬菜 200g + 牛肉 100g、去皮鸡腿 1 个或三文鱼 100g。", "必打卡"],
      ["晚", "番茄蛋类清淡晚餐，可加木耳、娃娃菜、香菇、丝瓜等蔬菜。", "必打卡"],
      ["水", "全天水约 1.5L。", "必打卡"]
    ]
  },
  {
    name: "第 2 天 · 轻盈掉秤",
    summary: "主食不完全断掉，晚餐简单。",
    meals: [
      ["早", "鸡蛋 2 个，或豆浆 + 牛奶 200ml。", "必打卡"],
      ["中", "蔬菜 250g + 米饭 100g + 鸡肉或牛肉 100-150g。", "必打卡"],
      ["下午", "鸡蛋 1 个或苹果 1 个。", "可跳过"],
      ["晚", "牛肉 100g + 无糖酸奶 100g。", "必打卡"],
      ["水", "温水为主，可搭配无糖茶。", "必打卡"]
    ]
  },
  {
    name: "第 3 天 · 红薯蛋白",
    summary: "粗粮和蛋白质清楚，适合不想复杂做饭。",
    meals: [
      ["早", "鸡蛋 2 个 + 咖啡 1 杯。", "必打卡"],
      ["中", "红薯、紫薯或玉米 1 根 + 鸡胸/牛肉 100g + 蔬菜。", "必打卡"],
      ["晚", "牛肉或虾 100g + 红薯或玉米 1 根。", "必打卡"],
      ["水", "全天水约 1.5-2L。", "必打卡"]
    ]
  },
  {
    name: "第 4 天 · 吐司均衡",
    summary: "有吐司、米饭或水饺选择，更像正常吃饭。",
    meals: [
      ["早", "全麦吐司 1 片抹花生酱 + 鸡蛋 1 个 + 豆浆或牛奶 1 杯。", "必打卡"],
      ["中", "蔬菜 1 盘 + 牛肉、去皮鸡腿或虾 150g + 米饭/红薯/南瓜/水饺 7 个。", "必打卡"],
      ["晚", "蔬菜 150-250g，吃到 8 分饱。", "必打卡"],
      ["水果", "上午或下午可吃低糖水果 100g，如苹果、蓝莓、梨。", "可跳过"]
    ]
  },
  {
    name: "第 5 天 · 快速三餐",
    summary: "餐次少、选择少，适合想简单执行的一天。",
    meals: [
      ["早", "鸡蛋 1 个 + 奶咖 1 杯。", "必打卡"],
      ["中", "烤鸡腿 2 只 + 黄瓜或番茄 1 份。", "必打卡"],
      ["晚", "红薯或紫薯 100-150g。", "必打卡"],
      ["水", "全天水约 1.5L。", "必打卡"]
    ]
  }
];

const state = loadState();
let advanceTimer = null;

const cycleTitle = document.querySelector("#cycleTitle");
const cycleSub = document.querySelector("#cycleSub");
const percentText = document.querySelector("#percentText");
const dayName = document.querySelector("#dayName");
const slotCount = document.querySelector("#slotCount");
const mealList = document.querySelector("#mealList");
const previewList = document.querySelector("#previewList");
const historyList = document.querySelector("#historyList");
const historyCount = document.querySelector("#historyCount");
const autoNote = document.querySelector("#autoNote");

function loadState() {
  const fallback = { dayIndex: 0, round: 1, checked: [], history: [] };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentDay() {
  return days[state.dayIndex] || days[0];
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function percent() {
  const total = currentDay().meals.length;
  return total ? Math.round((state.checked.length / total) * 100) : 0;
}

function renderMeals() {
  const day = currentDay();
  dayName.textContent = day.name;
  slotCount.textContent = `${state.checked.length}/${day.meals.length}`;
  mealList.innerHTML = day.meals.map(([name, food, tag], index) => `
    <button class="meal-button ${state.checked.includes(index) ? "done" : ""}" type="button" data-meal="${index}">
      <span class="box" aria-hidden="true"></span>
      <span>
        <span class="meal-name">${name}<span class="chip">${tag}</span></span>
        <span class="meal-food">${food}</span>
      </span>
    </button>
  `).join("");
}

function renderProgress() {
  const p = percent();
  cycleTitle.textContent = `第 ${state.round} 轮 · 第 ${state.dayIndex + 1} 天`;
  cycleSub.textContent = currentDay().summary;
  percentText.textContent = `${p}%`;
  document.documentElement.style.setProperty("--progress", `${p}%`);
  autoNote.classList.toggle("done", p === 100);
  autoNote.textContent = p === 100
    ? "今日完成，马上进入下一天。"
    : "打完所有餐次后，会短暂停留并自动进入下一天。";
}

function renderPreview() {
  previewList.innerHTML = days.map((day, index) => `
    <div class="preview-item ${index === state.dayIndex ? "active" : ""}">
      <strong>${day.name}</strong>
      <span>${day.summary}</span>
    </div>
  `).join("");
}

function renderHistory() {
  historyCount.textContent = `${state.history.length} 天`;
  if (!state.history.length) {
    historyList.innerHTML = `<p class="empty">还没有完成记录。</p>`;
    return;
  }
  historyList.innerHTML = state.history.slice(0, 10).map((item) => `
    <div class="history-item">
      <strong>${item.dayName}</strong>
      <span>${item.date} · 第 ${item.round} 轮完成</span>
    </div>
  `).join("");
}

function render() {
  renderProgress();
  renderMeals();
  renderPreview();
  renderHistory();
}

function advanceDay() {
  const finishedDay = currentDay();
  state.history.unshift({
    date: todayStamp(),
    round: state.round,
    dayIndex: state.dayIndex,
    dayName: finishedDay.name
  });
  state.history = state.history.slice(0, 60);
  state.dayIndex += 1;
  if (state.dayIndex >= days.length) {
    state.dayIndex = 0;
    state.round += 1;
  }
  state.checked = [];
  saveState();
  render();
}

mealList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-meal]");
  if (!button) return;
  const index = Number(button.dataset.meal);
  if (state.checked.includes(index)) {
    state.checked = state.checked.filter((item) => item !== index);
  } else {
    state.checked = [...state.checked, index].sort((a, b) => a - b);
  }
  saveState();
  render();

  clearTimeout(advanceTimer);
  if (state.checked.length === currentDay().meals.length) {
    advanceTimer = setTimeout(advanceDay, ADVANCE_DELAY);
  }
});

document.querySelector("#undoBtn").addEventListener("click", () => {
  const last = state.history.shift();
  if (!last) return;
  state.round = last.round;
  state.dayIndex = last.dayIndex;
  state.checked = [];
  saveState();
  render();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  state.dayIndex = 0;
  state.round = 1;
  state.checked = [];
  state.history = [];
  saveState();
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

render();

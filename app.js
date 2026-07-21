const STORAGE_KEY = "strawberryDailyDietCheckin.v1";
const LEGACY_STORAGE_KEY = "strawberryDailyDietLoop.v1";

const days = [
  {
    name: "第 1 天 · 基础稳餐",
    summary: "蛋奶、米饭、蔬菜和优质蛋白，适合普通控饮食日。",
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

const mealPlans = days.map((day, index) => ({
  id: "day-" + (index + 1),
  title: day.name,
  series: "平常饮食",
  source: "草莓饮食",
  summary: day.summary,
  fit: day.summary,
  meals: day.meals.map(([slot, food, tag]) => ({ slot, food, tag })),
  rules: ["普通饮食日使用，当天手动保存记录。"]
}));

(function dailyRuntime() {
  const pendingItems = typeof pendingNotes !== "undefined"
    ? pendingNotes
    : (typeof pendingPlans !== "undefined" ? pendingPlans : []);
  const categories = ["全部", ...Array.from(new Set(mealPlans.map((plan) => plan.series || "其他")))];
  const planById = new Map(mealPlans.map((plan) => [plan.id, plan]));
  const nodes = {
    activePlanName: document.querySelector("#activePlanName"),
    activePlanDesc: document.querySelector("#activePlanDesc"),
    progressText: document.querySelector("#progressText"),
    planCount: document.querySelector("#planCount"),
    filterBar: document.querySelector("#filterBar"),
    detailPanel: document.querySelector("#detailPanel"),
    planList: document.querySelector("#planList"),
    stepList: document.querySelector("#stepList"),
    stepCount: document.querySelector("#stepCount"),
    completeBtn: document.querySelector("#completeBtn"),
    autoNote: document.querySelector("#autoNote"),
    historyList: document.querySelector("#historyList"),
    historyCount: document.querySelector("#historyCount"),
    pendingList: document.querySelector("#pendingList"),
    pendingCount: document.querySelector("#pendingCount")
  };

  const state = loadState();

  function defaultState() {
    const firstId = mealPlans[0]?.id || "";
    return {
      activePlanId: firstId,
      detailId: firstId,
      filter: "全部",
      checked: {},
      history: []
    };
  }

  function loadState() {
    const base = defaultState();
    try {
      const storedRaw = localStorage.getItem(STORAGE_KEY);
      const stored = storedRaw ? JSON.parse(storedRaw) : {};
      let legacy = {};
      if (!storedRaw && typeof LEGACY_STORAGE_KEY !== "undefined") {
        legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "{}");
      }

      const legacyActiveId = getLegacyActiveId(legacy);
      const activePlanId = validPlanId(stored.activePlanId || stored.activeId)
        || validPlanId(legacyActiveId)
        || base.activePlanId;
      const detailId = validPlanId(stored.detailId) || activePlanId;
      const next = {
        activePlanId,
        detailId,
        filter: categories.includes(stored.filter) ? stored.filter : "全部",
        checked: stored.checked && typeof stored.checked === "object" && !Array.isArray(stored.checked) ? stored.checked : {},
        history: normalizeHistory(Array.isArray(stored.history) ? stored.history : legacy.history)
      };

      const legacyChecked = Array.isArray(stored.completedMeals)
        ? stored.completedMeals
        : (Array.isArray(legacy.checked) ? legacy.checked : []);
      if (legacyChecked.length) {
        const plan = planById.get(activePlanId);
        const indexes = normalizeCheckedIndexes(legacyChecked, plan);
        if (indexes.length) {
          const date = todayKey();
          next.checked[date] ||= {};
          next.checked[date][activePlanId] ||= indexes;
        }
      }
      return next;
    } catch {
      return base;
    }
  }

  function getLegacyActiveId(legacy) {
    if (Array.isArray(legacy.cycleIds)) {
      return legacy.cycleIds[Number.isInteger(legacy.activeIndex) ? legacy.activeIndex : 0];
    }
    if (Array.isArray(legacy.selectedIds)) {
      return legacy.selectedIds[Number.isInteger(legacy.currentIndex) ? legacy.currentIndex : 0];
    }
    if (Number.isInteger(legacy.dayIndex)) {
      return "day-" + (legacy.dayIndex + 1);
    }
    return "";
  }

  function normalizeCheckedIndexes(values, plan) {
    if (!plan) return [];
    return values.map((value) => {
      if (Number.isInteger(value)) return value;
      return plan.meals.findIndex((meal) => meal.slot === value);
    }).filter((index, pos, arr) => index >= 0 && index < plan.meals.length && arr.indexOf(index) === pos);
  }

  function normalizeHistory(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const planId = validPlanId(item.planId || item.id || (Number.isInteger(item.dayIndex) ? "day-" + (item.dayIndex + 1) : ""));
      const plan = planById.get(planId);
      const planName = item.planName || item.title || item.dayName || plan?.title || "";
      if (!planId && !planName) return null;
      return {
        date: String(item.date || todayKey()),
        planId: planId || plan?.id || "",
        planName: String(planName || "餐单"),
        steps: Number(item.steps || plan?.meals?.length || 0)
      };
    }).filter(Boolean).slice(0, 80);
  }

  function validPlanId(id) {
    return planById.has(id) ? id : "";
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function todayKey() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function getActivePlan() {
    if (!planById.has(state.activePlanId)) state.activePlanId = mealPlans[0]?.id || "";
    return planById.get(state.activePlanId);
  }

  function getDetailPlan() {
    return planById.get(state.detailId) || getActivePlan() || mealPlans[0];
  }

  function getCheckedSet() {
    const plan = getActivePlan();
    if (!plan) return new Set();
    const key = todayKey();
    state.checked[key] ||= {};
    state.checked[key][plan.id] ||= [];
    const indexes = normalizeCheckedIndexes(state.checked[key][plan.id], plan);
    state.checked[key][plan.id] = indexes;
    return new Set(indexes);
  }

  function setCheckedSet(set) {
    const plan = getActivePlan();
    if (!plan) return;
    const key = todayKey();
    state.checked[key] ||= {};
    state.checked[key][plan.id] = [...set].sort((a, b) => a - b);
    saveState();
  }

  function getProgress() {
    const plan = getActivePlan();
    if (!plan) return { done: 0, total: 0, percent: 0 };
    const checked = getCheckedSet();
    const done = checked.size;
    const total = plan.meals.length;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function isRecorded(plan) {
    const date = todayKey();
    return state.history.some((item) => item.date === date && item.planId === plan.id);
  }

  function renderStatus() {
    const plan = getActivePlan();
    const progress = getProgress();
    nodes.activePlanName.textContent = plan ? plan.title : "未选择餐单";
    nodes.activePlanDesc.textContent = plan ? `${plan.series || "餐单"} · ${plan.summary || ""}` : "先从餐单库选择今天要执行的一份。";
    nodes.progressText.textContent = `${progress.percent}%`;
    document.documentElement.style.setProperty("--progress", `${progress.percent}%`);
  }

  function renderFilters() {
    if (!nodes.filterBar) return;
    nodes.filterBar.innerHTML = categories.map((category) => `
      <button class="filter-chip ${state.filter === category ? "active" : ""}" type="button" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>
    `).join("");
  }

  function renderDetail() {
    const plan = getDetailPlan();
    if (!plan) {
      nodes.detailPanel.innerHTML = `<p class="empty">还没有餐单。</p>`;
      return;
    }
    const selected = state.activePlanId === plan.id;
    nodes.detailPanel.innerHTML = `
      <span class="detail-label">详情预览</span>
      <h2>${escapeHtml(plan.title)}</h2>
      <p>${escapeHtml(plan.fit || plan.summary || "")}</p>
      <div class="meta-row">
        <span>${escapeHtml(plan.series || "餐单")}</span>
        <span>${plan.meals.length} 餐次</span>
        <span>${escapeHtml(plan.source || "整理版")}</span>
        <span>${selected ? "今日餐单" : "未选择"}</span>
      </div>
      <div class="detail-meals">
        ${plan.meals.map((meal) => `
          <div>
            <strong>${escapeHtml(meal.slot)}${meal.tag ? " · " + escapeHtml(meal.tag) : ""}</strong>
            <span>${escapeHtml(meal.food)}</span>
          </div>
        `).join("")}
      </div>
      <ul class="detail-rules">
        ${(plan.rules || []).map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}
      </ul>
      <div class="detail-actions">
        <button class="primary-button" type="button" data-set-current="${escapeHtml(plan.id)}">${selected ? "今天已选" : "设为今天"}</button>
        <a class="secondary-link" href="#todayPanel">去打卡</a>
      </div>
    `;
  }

  function renderPlans() {
    const visible = state.filter === "全部" ? mealPlans : mealPlans.filter((plan) => plan.series === state.filter);
    nodes.planCount.textContent = `${visible.length}/${mealPlans.length} 个`;
    nodes.planList.innerHTML = visible.map((plan) => {
      const selected = plan.id === state.activePlanId;
      return `
        <article class="plan-card ${state.detailId === plan.id ? "active" : ""}">
          <button class="plan-main" type="button" data-detail="${escapeHtml(plan.id)}">
            <span class="badge ${selected ? "strong" : ""}">${escapeHtml(plan.series || "餐单")}</span>
            <strong>${escapeHtml(plan.title)}</strong>
            <em>${escapeHtml(plan.summary || "")}</em>
            <small>${plan.meals.length} 餐次 · ${escapeHtml(plan.source || "整理版")}</small>
          </button>
          <button class="small-action ${selected ? "selected" : ""}" type="button" data-set-current="${escapeHtml(plan.id)}">${selected ? "今日" : "选今天"}</button>
        </article>
      `;
    }).join("");
  }

  function renderSteps() {
    const plan = getActivePlan();
    const progress = getProgress();
    const checked = getCheckedSet();
    const recorded = plan ? isRecorded(plan) : false;
    nodes.stepCount.textContent = `${progress.done}/${progress.total}`;
    if (!plan) {
      nodes.stepList.innerHTML = `<p class="empty">先从餐单库选择今天要打卡的餐单。</p>`;
      nodes.completeBtn.disabled = true;
      return;
    }
    nodes.stepList.innerHTML = plan.meals.map((meal, index) => `
      <button class="check-row ${checked.has(index) ? "done" : ""}" type="button" data-step="${index}">
        <span class="box" aria-hidden="true"></span>
        <span>
          <span class="step-name">${escapeHtml(meal.slot)}${meal.tag ? `<span class="chip">${escapeHtml(meal.tag)}</span>` : ""}</span>
          <span class="step-food">${escapeHtml(meal.food)}</span>
        </span>
      </button>
    `).join("");
    nodes.completeBtn.disabled = progress.done !== progress.total || recorded;
    nodes.completeBtn.textContent = recorded ? "今天已保存" : "完成今天";
    nodes.autoNote.textContent = recorded
      ? "今天记录已保存；明天重新选择想吃的餐单。"
      : (progress.done === progress.total ? "已打完，点“完成今天”保存记录。" : "不会自动进入下一份；明天重新选择。");
    nodes.autoNote.classList.toggle("done", recorded || progress.done === progress.total);
  }

  function renderHistory() {
    if (nodes.historyCount) nodes.historyCount.textContent = `${state.history.length} 天`;
    const items = state.history.slice(0, 12);
    if (!items.length) {
      nodes.historyList.innerHTML = `<p class="empty">还没有完成记录。</p>`;
      return;
    }
    nodes.historyList.innerHTML = items.map((item) => `
      <article class="history-item">
        <strong>${escapeHtml(item.planName)}</strong>
        <span>${escapeHtml(item.date)} 完成 · ${Number(item.steps) || 0} 项</span>
      </article>
    `).join("");
  }

  function renderPending() {
    if (!nodes.pendingList || !nodes.pendingCount) return;
    nodes.pendingCount.textContent = `${pendingItems.length} 个`;
    nodes.pendingList.innerHTML = pendingItems.length
      ? pendingItems.map((item) => `
        <article class="pending-item">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.reason)}</span>
        </article>
      `).join("")
      : `<p class="empty">暂无待补说明。</p>`;
  }

  function render() {
    renderStatus();
    renderFilters();
    renderDetail();
    renderPlans();
    renderSteps();
    renderHistory();
    renderPending();
  }

  function setCurrent(planId, scroll) {
    if (!planById.has(planId)) return;
    state.activePlanId = planId;
    state.detailId = planId;
    saveState();
    render();
    if (scroll) document.querySelector("#todayPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function completeToday() {
    const plan = getActivePlan();
    if (!plan) return;
    const progress = getProgress();
    if (progress.done !== progress.total) return;
    const date = todayKey();
    state.history = state.history.filter((item) => !(item.date === date && item.planId === plan.id));
    state.history.unshift({
      date,
      planId: plan.id,
      planName: plan.title,
      steps: plan.meals.length
    });
    state.history = state.history.slice(0, 80);
    saveState();
    render();
  }

  function resetToday() {
    const plan = getActivePlan();
    if (!plan) return;
    const date = todayKey();
    if (state.checked[date]) state.checked[date][plan.id] = [];
    state.history = state.history.filter((item) => !(item.date === date && item.planId === plan.id));
    saveState();
    render();
  }

  function clearHistory() {
    state.history = [];
    saveState();
    render();
  }

  function resetAll() {
    if (!window.confirm("确认清空全部打卡数据？")) return;
    Object.assign(state, defaultState());
    saveState();
    render();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-detail]");
    const setButton = event.target.closest("[data-set-current]");
    const filterButton = event.target.closest("[data-filter]");
    const stepButton = event.target.closest("[data-step]");
    if (detailButton) {
      state.detailId = detailButton.dataset.detail;
      saveState();
      render();
    }
    if (setButton) setCurrent(setButton.dataset.setCurrent, true);
    if (filterButton) {
      state.filter = filterButton.dataset.filter;
      saveState();
      render();
    }
    if (stepButton) {
      const index = Number(stepButton.dataset.step);
      const checked = getCheckedSet();
      if (checked.has(index)) checked.delete(index);
      else checked.add(index);
      setCheckedSet(checked);
      render();
    }
  });

  document.querySelector("#completeBtn")?.addEventListener("click", completeToday);
  document.querySelector("#resetTodayBtn")?.addEventListener("click", resetToday);
  document.querySelector("#clearHistoryBtn")?.addEventListener("click", clearHistory);
  document.querySelector("#resetAllBtn")?.addEventListener("click", resetAll);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=20260722d1");
    });
  }

  render();
})();

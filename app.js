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

const APP_SOURCE_TEXT = [
  "草莓饮食平常餐单整理版，仅作为个人打卡工具。数据保存在当前浏览器，不含账号、服务端和第三方接口。",
  "餐单适合普通控饮食日；身体不舒服、低血糖、经期明显不适、备孕/孕期/哺乳期、疾病或用药期间不要硬跟。"
];

(function tabbedRuntime() {
  const pendingItems = typeof pendingNotes !== "undefined"
    ? pendingNotes
    : (typeof pendingPlans !== "undefined" ? pendingPlans : []);
  const seriesNames = Array.from(new Set(mealPlans.map((plan) => plan.series || "其他")));
  const planById = new Map(mealPlans.map((plan) => [plan.id, plan]));
  const sourceLines = APP_SOURCE_TEXT;
  const nodes = {
    todayDate: document.querySelector("#todayDate"),
    activePlanName: document.querySelector("#activePlanName"),
    activePlanDesc: document.querySelector("#activePlanDesc"),
    progressText: document.querySelector("#progressText"),
    stepList: document.querySelector("#stepList"),
    completeBtn: document.querySelector("#completeBtn"),
    autoNote: document.querySelector("#autoNote"),
    libraryTitle: document.querySelector("#libraryTitle"),
    librarySub: document.querySelector("#librarySub"),
    libraryContent: document.querySelector("#libraryContent"),
    recordsContent: document.querySelector("#recordsContent")
  };

  const state = loadState();

  function defaultState() {
    const firstId = mealPlans[0]?.id || "";
    return {
      tab: "today",
      activePlanId: firstId,
      selectedSeries: "",
      detailId: "",
      recordSeries: "",
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
      const activePlanId = validPlanId(stored.activePlanId || stored.activeId || getLegacyActiveId(legacy)) || base.activePlanId;
      const selectedSeries = seriesNames.includes(stored.selectedSeries) ? stored.selectedSeries : "";
      const detailId = validPlanId(stored.detailId) || "";
      const recordSeries = seriesNames.includes(stored.recordSeries) ? stored.recordSeries : "";
      const checked = stored.checked && typeof stored.checked === "object" && !Array.isArray(stored.checked) ? stored.checked : {};
      const history = normalizeHistory(Array.isArray(stored.history) ? stored.history : legacy.history);
      const legacyChecked = Array.isArray(stored.completedMeals)
        ? stored.completedMeals
        : (Array.isArray(legacy.checked) ? legacy.checked : []);
      if (legacyChecked.length) {
        const plan = planById.get(activePlanId);
        const indexes = normalizeCheckedIndexes(legacyChecked, plan);
        if (indexes.length) {
          const date = todayKey();
          checked[date] ||= {};
          checked[date][activePlanId] ||= indexes;
        }
      }
      return {
        tab: ["today", "library", "records"].includes(stored.tab) ? stored.tab : "today",
        activePlanId,
        selectedSeries,
        detailId,
        recordSeries,
        checked,
        history
      };
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
    if (Number.isInteger(legacy.dayIndex)) return "day-" + (legacy.dayIndex + 1);
    return "";
  }

  function validPlanId(id) {
    return planById.has(id) ? id : "";
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
    }).filter(Boolean).slice(0, 120);
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

  function todayLabel() {
    const date = new Date();
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function getActivePlan() {
    if (!planById.has(state.activePlanId)) state.activePlanId = mealPlans[0]?.id || "";
    return planById.get(state.activePlanId);
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

  function progressForActive() {
    const plan = getActivePlan();
    if (!plan) return { done: 0, total: 0, percent: 0 };
    const done = getCheckedSet().size;
    const total = plan.meals.length;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function countByPlan() {
    const counts = new Map(mealPlans.map((plan) => [plan.id, 0]));
    state.history.forEach((item) => counts.set(item.planId, (counts.get(item.planId) || 0) + 1));
    return counts;
  }

  function seriesStats(series) {
    const counts = countByPlan();
    const plans = mealPlans.filter((plan) => plan.series === series);
    const done = plans.reduce((sum, plan) => sum + (counts.get(plan.id) || 0), 0);
    return { plans, done };
  }

  function isRecorded(plan) {
    const date = todayKey();
    return state.history.some((item) => item.date === date && item.planId === plan.id);
  }

  function setTab(tab) {
    state.tab = tab;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderTabs() {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
    document.querySelector(`#view${state.tab[0].toUpperCase()}${state.tab.slice(1)}`)?.classList.add("is-active");
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === state.tab);
    });
  }

  function renderToday() {
    const plan = getActivePlan();
    const progress = progressForActive();
    const checked = getCheckedSet();
    const recorded = plan ? isRecorded(plan) : false;
    nodes.todayDate.textContent = todayLabel();
    nodes.activePlanName.textContent = plan ? plan.title : "未选择餐单";
    nodes.activePlanDesc.textContent = plan ? `${plan.series || "餐单"} · ${plan.summary || ""}` : "去餐单库选一份作为今天的打卡内容。";
    nodes.progressText.textContent = `${progress.percent}%`;
    document.documentElement.style.setProperty("--progress", `${progress.percent}%`);
    if (!plan) {
      nodes.stepList.innerHTML = `<p class="empty">先去餐单库选择今天要打卡的餐单。</p>`;
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

  function renderLibrary() {
    if (state.detailId && planById.has(state.detailId)) {
      renderPlanDetail(planById.get(state.detailId));
      return;
    }
    if (state.selectedSeries) {
      renderSeriesPlans(state.selectedSeries);
      return;
    }
    nodes.libraryTitle.textContent = "餐单库";
    nodes.librarySub.textContent = "先选系列，再看这个系列里的每天可选餐单。";
    nodes.libraryContent.innerHTML = `
      <div class="series-grid">
        ${seriesNames.map((series) => {
          const stats = seriesStats(series);
          return `
            <button class="series-card" type="button" data-series="${escapeHtml(series)}">
              <strong>${escapeHtml(series)}</strong>
              <span class="muted">${stats.plans.length} 个可选餐单</span>
              <span class="series-meta">
                <span class="count-pill">已打卡 ${stats.done} 次</span>
                <span class="count-pill">点进系列</span>
              </span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSeriesPlans(series) {
    const stats = seriesStats(series);
    nodes.libraryTitle.textContent = series;
    nodes.librarySub.textContent = `${stats.plans.length} 个可选餐单，先看详情再设为今天。`;
    nodes.libraryContent.innerHTML = `
      <div class="library-tools">
        <button class="plain-button" type="button" data-back-series>全部系列</button>
        <span class="pill">已打卡 ${stats.done} 次</span>
      </div>
      <div class="plan-list">
        ${stats.plans.map((plan) => {
          const active = state.activePlanId === plan.id;
          return `
            <article class="plan-card ${active ? "active" : ""}">
              <div class="plan-title">
                <span class="badge">${escapeHtml(plan.series || "餐单")}</span>
                <strong>${escapeHtml(plan.title)}</strong>
                <em>${escapeHtml(plan.summary || "")}</em>
                <small>${plan.meals.length} 餐次 · 已打卡 ${countByPlan().get(plan.id) || 0} 次</small>
              </div>
              <div class="row-actions">
                <button class="secondary-button" type="button" data-plan-detail="${escapeHtml(plan.id)}">看详情</button>
                <button class="primary-button" type="button" data-set-current="${escapeHtml(plan.id)}">${active ? "今天已选" : "设为今天"}</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderPlanDetail(plan) {
    nodes.libraryTitle.textContent = "餐单详情";
    nodes.librarySub.textContent = plan.series || "餐单";
    const active = state.activePlanId === plan.id;
    nodes.libraryContent.innerHTML = `
      <div class="library-tools">
        <button class="plain-button" type="button" data-close-detail>返回${escapeHtml(plan.series || "系列")}</button>
        <span class="pill">已打卡 ${countByPlan().get(plan.id) || 0} 次</span>
      </div>
      <article class="panel-card">
        <div class="detail-head">
          <span class="badge">${escapeHtml(plan.series || "餐单")}</span>
          <h2>${escapeHtml(plan.title)}</h2>
          <p class="muted">${escapeHtml(plan.fit || plan.summary || "")}</p>
        </div>
        <div class="meta-row">
          <span class="count-pill">${plan.meals.length} 餐次</span>
          <span class="count-pill">${escapeHtml(plan.source || "整理版")}</span>
          <span class="count-pill">${active ? "今日餐单" : "未选择"}</span>
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
        <div class="row-actions">
          <button class="secondary-button" type="button" data-close-detail>返回列表</button>
          <button class="primary-button" type="button" data-set-current="${escapeHtml(plan.id)}">${active ? "今天已选" : "设为今天"}</button>
        </div>
      </article>
    `;
  }

  function renderRecords() {
    const counts = countByPlan();
    const completedPlans = [...counts.values()].filter((value) => value > 0).length;
    if (state.recordSeries) {
      renderRecordSeries(state.recordSeries, counts);
      return;
    }
    const topPlans = mealPlans
      .map((plan) => ({ plan, count: counts.get(plan.id) || 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.plan.title.localeCompare(b.plan.title, "zh-Hans"))
      .slice(0, 5);
    nodes.recordsContent.innerHTML = `
      <div class="stat-grid">
        <div><span>完成次数</span><strong>${state.history.length}</strong></div>
        <div><span>打卡过餐单</span><strong>${completedPlans}</strong></div>
        <div><span>餐单总数</span><strong>${mealPlans.length}</strong></div>
      </div>
      <section class="panel-card">
        <h3>按系列看次数</h3>
        <div class="series-grid" style="margin-top:10px">
          ${seriesNames.map((series) => {
            const stats = seriesStats(series);
            return `
              <button class="series-card" type="button" data-record-series="${escapeHtml(series)}">
                <strong>${escapeHtml(series)}</strong>
                <span class="muted">${stats.plans.length} 个餐单</span>
                <span class="series-meta"><span class="count-pill">已打卡 ${stats.done} 次</span></span>
              </button>
            `;
          }).join("")}
        </div>
      </section>
      <section class="panel-card">
        <h3>常用餐单</h3>
        <div class="record-list" style="margin-top:10px">
          ${topPlans.length ? topPlans.map(({ plan, count }) => recordPlanRow(plan, count)).join("") : `<p class="empty">还没有完成记录。</p>`}
        </div>
      </section>
      <section class="panel-card">
        <div class="record-tools">
          <h3>最近记录</h3>
          <button class="plain-button" type="button" data-clear-history>清空</button>
        </div>
        <div class="recent-list">
          ${state.history.length ? state.history.slice(0, 8).map((item) => `
            <article class="recent-item">
              <strong>${escapeHtml(item.planName)}</strong>
              <span>${escapeHtml(item.date)} 完成 · ${Number(item.steps) || 0} 项</span>
            </article>
          `).join("") : `<p class="empty">还没有完成记录。</p>`}
        </div>
      </section>
      <section class="source-panel">
        <details>
          <summary><span>来源与边界</span><em>非官方整理</em></summary>
          ${sourceLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
          <button class="plain-button" type="button" data-reset-all>重置全部打卡数据</button>
        </details>
      </section>
    `;
  }

  function renderRecordSeries(series, counts) {
    const stats = seriesStats(series);
    nodes.recordsContent.innerHTML = `
      <div class="record-tools">
        <button class="plain-button" type="button" data-record-back>全部系列</button>
        <span class="pill">${escapeHtml(series)} · ${stats.done} 次</span>
      </div>
      <div class="record-list">
        ${stats.plans.map((plan) => recordPlanRow(plan, counts.get(plan.id) || 0)).join("")}
      </div>
    `;
  }

  function recordPlanRow(plan, count) {
    return `
      <article class="record-item">
        <strong>${escapeHtml(plan.title)}</strong>
        <span>${escapeHtml(plan.series || "餐单")} · 累计打卡 ${count} 次</span>
        <div class="row-actions">
          <button class="secondary-button" type="button" data-plan-detail="${escapeHtml(plan.id)}">看详情</button>
          <button class="primary-button" type="button" data-set-current="${escapeHtml(plan.id)}">设为今天</button>
        </div>
      </article>
    `;
  }

  function render() {
    renderTabs();
    renderToday();
    renderLibrary();
    renderRecords();
    saveState();
  }

  function setCurrent(planId) {
    if (!planById.has(planId)) return;
    const plan = planById.get(planId);
    state.activePlanId = planId;
    state.selectedSeries = plan.series || "";
    state.detailId = "";
    state.tab = "today";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeToday() {
    const plan = getActivePlan();
    if (!plan) return;
    const progress = progressForActive();
    if (progress.done !== progress.total) return;
    const date = todayKey();
    state.history = state.history.filter((item) => !(item.date === date && item.planId === plan.id));
    state.history.unshift({ date, planId: plan.id, planName: plan.title, steps: plan.meals.length });
    state.history = state.history.slice(0, 120);
    render();
  }

  function resetToday() {
    const plan = getActivePlan();
    if (!plan) return;
    const date = todayKey();
    if (state.checked[date]) state.checked[date][plan.id] = [];
    state.history = state.history.filter((item) => !(item.date === date && item.planId === plan.id));
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
    const tabButton = event.target.closest("[data-tab]");
    const seriesButton = event.target.closest("[data-series]");
    const backSeries = event.target.closest("[data-back-series]");
    const detailButton = event.target.closest("[data-plan-detail]");
    const closeDetail = event.target.closest("[data-close-detail]");
    const setButton = event.target.closest("[data-set-current]");
    const stepButton = event.target.closest("[data-step]");
    const recordSeries = event.target.closest("[data-record-series]");
    const recordBack = event.target.closest("[data-record-back]");
    const clearHistory = event.target.closest("[data-clear-history]");
    const resetAll = event.target.closest("[data-reset-all]");
    if (tabButton) setTab(tabButton.dataset.tab);
    if (seriesButton) {
      state.selectedSeries = seriesButton.dataset.series;
      state.detailId = "";
      state.tab = "library";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (backSeries) {
      state.selectedSeries = "";
      state.detailId = "";
      render();
    }
    if (detailButton) {
      const plan = planById.get(detailButton.dataset.planDetail);
      if (plan) {
        state.detailId = plan.id;
        state.selectedSeries = plan.series || "";
        state.tab = "library";
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    if (closeDetail) {
      state.detailId = "";
      render();
    }
    if (setButton) setCurrent(setButton.dataset.setCurrent);
    if (stepButton) {
      const index = Number(stepButton.dataset.step);
      const checked = getCheckedSet();
      if (checked.has(index)) checked.delete(index);
      else checked.add(index);
      setCheckedSet(checked);
      render();
    }
    if (recordSeries) {
      state.recordSeries = recordSeries.dataset.recordSeries;
      state.tab = "records";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (recordBack) {
      state.recordSeries = "";
      render();
    }
    if (clearHistory) {
      state.history = [];
      render();
    }
    if (resetAll) {
      if (!window.confirm("确认清空全部打卡数据？")) return;
      Object.assign(state, defaultState());
      render();
    }
  });

  document.querySelector("#completeBtn")?.addEventListener("click", completeToday);
  document.querySelector("#resetTodayBtn")?.addEventListener("click", resetToday);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=20260722t1");
    });
  }

  render();
})();

const STORAGE_KEY = "vibe-wallet-transactions-v2";
const BUDGET_KEY = "vibe-wallet-budgets-v2";
const GOAL_KEY = "vibe-wallet-goal-v2";
const CLEAN_START_KEY = "vibe-wallet-clean-start-v1";
const DEFAULT_BUDGETS = {
  Hrana: 250,
  Restorani: 120,
  "Računi": 500,
  Prevoz: 150,
  Kupovina: 100,
  Zabava: 80,
};
const moneyFormatter = new Intl.NumberFormat("sr-ME", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const compactMoneyFormatter = new Intl.NumberFormat("sr-ME", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const categoryMeta = {
  Hrana: { icon: "◇", color: "#f3c75f" },
  Restorani: { icon: "⌁", color: "#f3342f" },
  "Računi": { icon: "▤", color: "#8fa9ff" },
  Prevoz: { icon: "↗", color: "#9bd7cd" },
  Kupovina: { icon: "□", color: "#c59cf4" },
  Zabava: { icon: "✦", color: "#f29bc2" },
  Plata: { icon: "+", color: "#63d39d" },
  Ostalo: { icon: "·", color: "#aaaaaa" },
};

function clearLegacyDemoData() {
  if (localStorage.getItem(CLEAN_START_KEY)) return;
  ["vibe-wallet-transactions-v1", "vibe-wallet-budgets-v1", "vibe-wallet-goal-v1"].forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(CLEAN_START_KEY, "done");
}

clearLegacyDemoData();

const state = {
  page: "ai",
  period: "month",
  anchorDate: localDate(),
  private: false,
  editingId: null,
  transactions: loadTransactions(),
  budgets: loadBudgets(),
  goal: loadGoal(),
  installPrompt: null,
};

const elements = {
  dateLabel: document.querySelector("#dateLabel"),
  balanceValue: document.querySelector("#balanceValue"),
  balanceContext: document.querySelector("#balanceContext"),
  incomeValue: document.querySelector("#incomeValue"),
  expenseValue: document.querySelector("#expenseValue"),
  budgetProgress: document.querySelector("#budgetProgress"),
  categoryList: document.querySelector("#categoryList"),
  homeBalance: document.querySelector("#homeBalance"),
  homeSpent: document.querySelector("#homeSpent"),
  homeSaving: document.querySelector("#homeSaving"),
  chatMessages: document.querySelector("#chatMessages"),
  aiVoiceButton: document.querySelector("#aiVoiceButton"),
  transactionSheet: document.querySelector("#transactionSheet"),
  transactionForm: document.querySelector("#transactionForm"),
  amountInput: document.querySelector("#amountInput"),
  categoryInput: document.querySelector("#categoryInput"),
  dateInput: document.querySelector("#dateInput"),
  noteInput: document.querySelector("#noteInput"),
  transactionFormEyebrow: document.querySelector("#transactionFormEyebrow"),
  transactionFormTitle: document.querySelector("#transactionFormTitle"),
  transactionSubmitLabel: document.querySelector("#transactionSubmitLabel"),
  voiceButton: document.querySelector("#voiceButton"),
  voiceHint: document.querySelector("#voiceHint"),
  aiPlanMessage: document.querySelector("#aiPlanMessage"),
  aiSteps: document.querySelector("#aiSteps"),
  aiQuestion: document.querySelector("#aiQuestion"),
  aiInsight: document.querySelector("#aiInsight"),
  monthlySaving: document.querySelector("#monthlySaving"),
  yearlySaving: document.querySelector("#yearlySaving"),
  installButton: document.querySelector("#installButton"),
  budgetSheet: document.querySelector("#budgetSheet"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetFields: document.querySelector("#budgetFields"),
  goalSheet: document.querySelector("#goalSheet"),
  goalForm: document.querySelector("#goalForm"),
  goalNameInput: document.querySelector("#goalNameInput"),
  goalTargetInput: document.querySelector("#goalTargetInput"),
  goalSavedInput: document.querySelector("#goalSavedInput"),
  goalDeadlineInput: document.querySelector("#goalDeadlineInput"),
  goalName: document.querySelector("#goalName"),
  goalPercent: document.querySelector("#goalPercent"),
  goalProgress: document.querySelector("#goalProgress"),
  goalSaved: document.querySelector("#goalSaved"),
  goalTarget: document.querySelector("#goalTarget"),
  goalMonthly: document.querySelector("#goalMonthly"),
  goalDeadline: document.querySelector("#goalDeadline"),
  managedTransactions: document.querySelector("#managedTransactions"),
  transactionManagerSummary: document.querySelector("#transactionManagerSummary"),
  dataSheet: document.querySelector("#dataSheet"),
  importDataInput: document.querySelector("#importDataInput"),
  previousPeriod: document.querySelector("#previousPeriod"),
  nextPeriod: document.querySelector("#nextPeriod"),
  toast: document.querySelector("#toast"),
};

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (error) {
    console.warn("Sačuvani podaci nijesu dostupni.", error);
  }
  return [];
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function loadBudgets() {
  try {
    const saved = JSON.parse(localStorage.getItem(BUDGET_KEY));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) return { ...DEFAULT_BUDGETS, ...saved };
  } catch (error) {
    console.warn("Sačuvani limiti nijesu dostupni.", error);
  }
  return { ...DEFAULT_BUDGETS };
}

function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
}

function defaultGoal() {
  return { name: "", target: 0, saved: 0, deadline: "" };
}

function loadGoal() {
  try {
    const saved = JSON.parse(localStorage.getItem(GOAL_KEY));
    if (saved && typeof saved.name === "string" && Number(saved.target) > 0 && typeof saved.deadline === "string") {
      return { ...saved, target: Number(saved.target), saved: Number(saved.saved || 0) };
    }
  } catch (error) {
    console.warn("Sačuvani cilj nije dostupan.", error);
  }
  return defaultGoal();
}

function saveGoal() {
  localStorage.setItem(GOAL_KEY, JSON.stringify(state.goal));
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function periodBounds(period = state.period, anchorDate = state.anchorDate) {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  let start;
  let end;
  if (period === "day") {
    start = new Date(anchor);
    end = new Date(anchor);
  } else if (period === "week") {
    start = startOfWeek(anchor);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function inCurrentPeriod(transaction, period = state.period, anchorDate = state.anchorDate) {
  const { start, end } = periodBounds(period, anchorDate);
  const date = new Date(`${transaction.date}T12:00:00`);
  return date >= start && date <= end;
}

function totals(transactions) {
  return transactions.reduce(
    (sum, transaction) => {
      sum[transaction.type] += Number(transaction.amount);
      return sum;
    },
    { income: 0, expense: 0 }
  );
}

function formatMoney(value, compact = false) {
  return (compact ? compactMoneyFormatter : moneyFormatter).format(value).replace("EUR", "€");
}

function signedMoney(value, type) {
  return `${type === "income" ? "+" : "−"}${formatMoney(value)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function periodCopy() {
  const anchor = new Date(`${state.anchorDate}T12:00:00`);
  const { start, end } = periodBounds();
  const today = localDate();
  const month = new Intl.DateTimeFormat("sr-Latn-ME", { month: "long", year: "numeric" }).format(anchor).toUpperCase();
  if (state.period === "day") {
    const label = state.anchorDate === today
      ? "DANAS"
      : new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "short", year: "numeric" }).format(anchor).toUpperCase();
    return { label, context: "prihoda izabranog dana" };
  }
  if (state.period === "week") {
    const label = `${new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "short" }).format(start)} — ${new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "short" }).format(end)}`.toUpperCase();
    return { label, context: "prihoda izabrane neđelje" };
  }
  return { label: month, context: "prihoda izabranog mjeseca" };
}

function movePeriod(direction) {
  const anchor = new Date(`${state.anchorDate}T12:00:00`);
  if (state.period === "day") anchor.setDate(anchor.getDate() + direction);
  if (state.period === "week") anchor.setDate(anchor.getDate() + (direction * 7));
  if (state.period === "month") {
    const desiredDay = anchor.getDate();
    anchor.setDate(1);
    anchor.setMonth(anchor.getMonth() + direction);
    const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    anchor.setDate(Math.min(desiredDay, lastDay));
  }
  if (anchor > new Date()) anchor.setTime(new Date().getTime());
  state.anchorDate = localDate(anchor);
  renderDashboard();
}

function renderDashboard() {
  const filtered = state.transactions.filter((item) => inCurrentPeriod(item));
  const summary = totals(filtered);
  const balance = summary.income - summary.expense;
  const currentMonth = state.transactions.filter((item) => inCurrentPeriod(item, "month", localDate()));
  const currentMonthSummary = totals(currentMonth);
  const copy = periodCopy();
  elements.dateLabel.textContent = copy.label;
  const currentBounds = periodBounds(state.period, localDate());
  const selectedBounds = periodBounds();
  elements.nextPeriod.disabled = selectedBounds.end >= currentBounds.end;
  elements.balanceValue.textContent = formatMoney(balance);
  elements.balanceContext.textContent = `${formatMoney(summary.income)} prihoda u periodu`;
  elements.incomeValue.textContent = signedMoney(summary.income, "income");
  elements.expenseValue.textContent = signedMoney(summary.expense, "expense");
  elements.homeBalance.textContent = formatMoney(currentMonthSummary.income - currentMonthSummary.expense);
  elements.homeSpent.textContent = formatMoney(currentMonthSummary.expense, true);
  const used = summary.income ? Math.min(100, (summary.expense / summary.income) * 100) : 0;
  elements.budgetProgress.style.width = `${used}%`;
  elements.budgetProgress.style.background = used > 85 ? "#f3342f" : used > 65 ? "#f3c75f" : "#63d39d";
  renderCategories(filtered, summary.expense);
  renderGoal();
  renderTransactionManager();
  renderAiInsight();
  applyPrivacy();
}

function renderCategories(transactions, totalExpense) {
  const categories = transactions
    .filter((item) => item.type === "expense")
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + Number(item.amount);
      return result;
    }, {});
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!sorted.length) {
    elements.categoryList.innerHTML = `<div class="empty-state">Još nema troškova za ovaj period.</div>`;
    return;
  }
  elements.categoryList.innerHTML = sorted.map(([category, amount]) => {
    const meta = categoryMeta[category] || categoryMeta.Ostalo;
    const percent = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;
    const limit = Number(state.budgets[category] || 0);
    const budgetPercent = limit ? Math.round((amount / limit) * 100) : 0;
    const showsBudget = state.period === "month" && limit > 0;
    return `
      <article class="category-item">
        <div class="category-icon" style="color:${meta.color}">${meta.icon}</div>
        <div class="category-copy"><strong>${escapeHtml(category)}</strong><span>${showsBudget ? `Limit ${formatMoney(limit, true)}` : `${percent}% troškova`}</span></div>
        <div class="category-amount"><strong class="private-value">${formatMoney(amount)}</strong></div>
        ${showsBudget ? `<div class="category-progress ${budgetPercent > 100 ? "over" : ""}"><span style="width:${Math.min(100, budgetPercent)}%"></span></div>` : ""}
      </article>
    `;
  }).join("");
}

function monthlyRestaurantSpend() {
  return state.transactions
    .filter((item) => item.type === "expense" && item.category === "Restorani" && inCurrentPeriod(item, "month", localDate()))
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function goalMetrics() {
  if (!state.goal || !Number(state.goal.target)) {
    return { target: 0, saved: 0, remaining: 0, months: 0, monthly: 0, percent: 0, deadline: null };
  }
  const target = Math.max(0, Number(state.goal.target));
  const saved = Math.max(0, Number(state.goal.saved));
  const remaining = Math.max(0, target - saved);
  const deadline = new Date(`${state.goal.deadline}T23:59:59`);
  const millisecondsPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
  const months = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / millisecondsPerMonth));
  return {
    target,
    saved,
    remaining,
    months,
    monthly: remaining / months,
    percent: target ? Math.min(100, Math.round((saved / target) * 100)) : 0,
    deadline,
  };
}

function renderGoal() {
  const metrics = goalMetrics();
  const hasGoal = Boolean(state.goal.name && metrics.target);
  elements.goalName.textContent = hasGoal ? state.goal.name : "Postavi svoj prvi cilj";
  elements.goalPercent.textContent = `${metrics.percent}%`;
  elements.goalProgress.style.width = `${metrics.percent}%`;
  elements.goalSaved.textContent = hasGoal ? formatMoney(metrics.saved, true) : "—";
  elements.goalTarget.textContent = hasGoal ? formatMoney(metrics.target, true) : "—";
  elements.goalMonthly.textContent = hasGoal ? formatMoney(metrics.monthly, true) : "—";
  elements.goalDeadline.textContent = hasGoal
    ? `Rok: ${new Intl.DateTimeFormat("sr-Latn-ME", { month: "long", year: "numeric" }).format(metrics.deadline)} · još ${metrics.months} mj.`
    : "Dodaj cilj da vidiš svoj mjesečni plan.";
}

function renderAiInsight() {
  const restaurantSpend = monthlyRestaurantSpend();
  const restaurantLimit = Number(state.budgets.Restorani || 120);
  const saving = Math.max(0, restaurantSpend - restaurantLimit);
  const yearly = saving * 12;
  if (saving > 0) {
    elements.aiInsight.textContent = `Restorani su ${formatMoney(saving, true)} iznad limita od ${formatMoney(restaurantLimit, true)}.`;
  } else {
    elements.aiInsight.textContent = "Potrošnja je trenutno u okviru tvojih limita.";
  }
  elements.monthlySaving.textContent = formatMoney(saving, true);
  elements.yearlySaving.textContent = formatMoney(yearly, true);
  elements.homeSaving.textContent = `${formatMoney(saving, true)}/mj.`;
}

function buildAiPlan(customAnswer = "") {
  const spend = monthlyRestaurantSpend();
  const restaurantLimit = Number(state.budgets.Restorani || 120);
  const saving = Math.max(0, spend - restaurantLimit);
  const annual = saving * 12;
  const summary = totals(state.transactions.filter((item) => inCurrentPeriod(item, "month", localDate())));
  const goal = goalMetrics();
  elements.aiPlanMessage.textContent = customAnswer || (saving
    ? `Najlakša prilika je kategorija Restorani. Sa limita od ${formatMoney(restaurantLimit, true)} zadržavaš isti stil života, a oslobađaš oko ${formatMoney(saving, true)} mjesečno i ${formatMoney(annual, true)} godišnje.`
    : `Trenutno si u okviru predloženog limita za restorane. Sljedeći plan mogu napraviti kada dodamo još tvojih stvarnih troškova.`);
  elements.aiSteps.innerHTML = `
    <div class="ai-step"><span class="ai-step-index">01</span><div><strong>Limit za restorane</strong><small>Prati se automatski svakog mjeseca</small></div><span class="ai-step-amount">${formatMoney(restaurantLimit, true)}</span></div>
    <div class="ai-step"><span class="ai-step-index">02</span><div><strong>Nedjeljni okvir</strong><small>Podijeljeno na četiri realne cjeline</small></div><span class="ai-step-amount">${formatMoney(restaurantLimit / 4, true)}</span></div>
    <div class="ai-step"><span class="ai-step-index">03</span><div><strong>Trenutno preostalo</strong><small>Prihodi minus evidentirani troškovi</small></div><span class="ai-step-amount">${formatMoney(summary.income - summary.expense, true)}</span></div>
    <div class="ai-step"><span class="ai-step-index">04</span><div><strong>${escapeHtml(state.goal.name || "Cilj štednje")}</strong><small>Potrebno mjesečno do izabranog roka</small></div><span class="ai-step-amount">${goal.monthly ? `${formatMoney(goal.monthly, true)}/mj.` : "—"}</span></div>
  `;
}

function openGoalSheet() {
  elements.goalNameInput.value = state.goal.name;
  elements.goalTargetInput.value = state.goal.target ? String(state.goal.target).replace(".", ",") : "";
  elements.goalSavedInput.value = state.goal.saved ? String(state.goal.saved).replace(".", ",") : "";
  elements.goalDeadlineInput.value = state.goal.deadline;
  elements.goalDeadlineInput.min = localDate();
  elements.goalSheet.showModal();
}

function handleGoalSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    elements.goalSheet.close();
    return;
  }
  const data = new FormData(elements.goalForm);
  const target = Number(String(data.get("target")).replace(",", "."));
  const saved = Number(String(data.get("saved")).replace(",", "."));
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) {
    showToast("Provjeri iznose cilja i dosadašnje štednje.");
    return;
  }
  state.goal = {
    name: String(data.get("name")).trim(),
    target,
    saved,
    deadline: String(data.get("deadline")),
  };
  saveGoal();
  elements.goalSheet.close();
  renderDashboard();
  showToast("Cilj štednje je sačuvan.");
}

function openBudgetSheet() {
  elements.budgetFields.innerHTML = Object.keys(DEFAULT_BUDGETS).map((category) => {
    const meta = categoryMeta[category] || categoryMeta.Ostalo;
    return `
      <div class="budget-field">
        <span class="category-icon" style="color:${meta.color}">${meta.icon}</span>
        <label for="budget-${escapeHtml(category)}">${escapeHtml(category)}<small>Mjesečni maksimum</small></label>
        <span class="budget-input"><input id="budget-${escapeHtml(category)}" name="${escapeHtml(category)}" inputmode="decimal" value="${Number(state.budgets[category] || 0)}" aria-label="Limit za ${escapeHtml(category)}" /><span>€</span></span>
      </div>
    `;
  }).join("");
  elements.budgetSheet.showModal();
}

function handleBudgetSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    elements.budgetSheet.close();
    return;
  }
  const data = new FormData(elements.budgetForm);
  Object.keys(DEFAULT_BUDGETS).forEach((category) => {
    const value = Number(String(data.get(category) || "0").replace(",", "."));
    state.budgets[category] = Number.isFinite(value) && value >= 0 ? value : 0;
  });
  saveBudgets();
  elements.budgetSheet.close();
  renderDashboard();
  showToast("Mjesečni limiti su sačuvani.");
}

function renderTransactionManager() {
  const filtered = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  const summary = totals(filtered);
  elements.transactionManagerSummary.textContent = `${filtered.length} unosa · ${formatMoney(summary.income)} prihoda · ${formatMoney(summary.expense)} troškova`;
  if (!filtered.length) {
    elements.managedTransactions.innerHTML = `<div class="empty-state">Još nema unosa.</div>`;
    return;
  }
  elements.managedTransactions.innerHTML = filtered.map((item) => {
    const meta = categoryMeta[item.category] || categoryMeta.Ostalo;
    const date = new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${item.date}T12:00:00`));
    return `
      <article class="managed-item">
        <span class="transaction-icon" style="color:${meta.color}">${meta.icon}</span>
        <span class="managed-item-copy"><strong>${escapeHtml(item.note || item.category)}</strong><span>${escapeHtml(item.category)} · ${date}</span></span>
        <span class="managed-item-amount private-value ${item.type}">${signedMoney(item.amount, item.type)}</span>
        <button class="edit-button" type="button" data-edit-id="${escapeHtml(item.id)}" aria-label="Uredi ${escapeHtml(item.note || item.category)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.9-10.9-3.2-3.2L5 15.8 4 20Zm10.3-13.5 3.2 3.2M14.8 6l2-2a1.4 1.4 0 0 1 2 0l1.2 1.2a1.4 1.4 0 0 1 0 2l-2 2" /></svg>
        </button>
        <button class="delete-button" type="button" data-delete-id="${escapeHtml(item.id)}" aria-label="Obriši ${escapeHtml(item.note || item.category)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>
        </button>
      </article>
    `;
  }).join("");
  applyPrivacy();
}

function deleteTransaction(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  const description = transaction.note || transaction.category;
  if (!window.confirm(`Obrisati unos „${description}“ od ${formatMoney(transaction.amount)}?`)) return;
  state.transactions = state.transactions.filter((item) => item.id !== id);
  saveTransactions();
  renderDashboard();
  renderTransactionManager();
  showToast("Unos je obrisan.");
}

function downloadBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    budgets: state.budgets,
    goal: state.goal,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vibe-wallet-backup-${localDate()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Backup je preuzet.");
}

async function importBackup(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const validTransactions = Array.isArray(backup.transactions) && backup.transactions.every((item) =>
      item && typeof item.id === "string" && ["income", "expense"].includes(item.type) && Number.isFinite(Number(item.amount)) && typeof item.date === "string"
    );
    const validBudgets = backup.budgets && typeof backup.budgets === "object" && !Array.isArray(backup.budgets);
    const validGoal = !backup.goal || (typeof backup.goal.name === "string" && Number(backup.goal.target) > 0 && typeof backup.goal.deadline === "string");
    if (!validTransactions || !validBudgets || !validGoal) throw new Error("Neispravan format");
    if (!window.confirm(`Uvesti ${backup.transactions.length} transakcija? Trenutni lokalni podaci biće zamijenjeni.`)) return;
    state.transactions = backup.transactions.map((item) => ({ ...item, amount: Number(item.amount) }));
    state.budgets = { ...DEFAULT_BUDGETS, ...backup.budgets };
    state.goal = backup.goal
      ? { ...backup.goal, target: Number(backup.goal.target), saved: Number(backup.goal.saved || 0) }
      : defaultGoal();
    saveTransactions();
    saveBudgets();
    saveGoal();
    state.anchorDate = localDate();
    renderDashboard();
    elements.dataSheet.close();
    showToast("Backup je uspješno uvezen.");
  } catch (error) {
    showToast("Fajl nije validan Vibe Wallet backup.");
  } finally {
    event.target.value = "";
  }
}

function openTransactionSheet(transaction = null) {
  elements.transactionForm.reset();
  state.editingId = transaction?.id || null;
  elements.transactionFormEyebrow.textContent = transaction ? "UREĐIVANJE" : "NOVI UNOS";
  elements.transactionFormTitle.textContent = transaction ? "Uredi transakciju" : "Dodaj transakciju";
  elements.transactionSubmitLabel.textContent = transaction ? "SAČUVAJ IZMJENE" : "SAČUVAJ UNOS";
  elements.dateInput.value = transaction?.date || localDate();
  if (transaction) {
    elements.amountInput.value = String(transaction.amount).replace(".", ",");
    elements.categoryInput.value = transaction.category;
    elements.noteInput.value = transaction.note || "";
    document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
  }
  elements.transactionSheet.showModal();
  window.setTimeout(() => elements.amountInput.focus(), 180);
}

function handleTransactionSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    elements.transactionSheet.close();
    return;
  }
  const formData = new FormData(elements.transactionForm);
  const amount = Number(String(formData.get("amount")).replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Unesi ispravan iznos.");
    elements.amountInput.focus();
    return;
  }
  const nextTransaction = {
    id: state.editingId || crypto.randomUUID(),
    type: formData.get("type"),
    amount,
    category: formData.get("category"),
    date: formData.get("date"),
    note: String(formData.get("note") || "").trim(),
  };
  if (state.editingId) {
    state.transactions = state.transactions.map((item) => item.id === state.editingId ? nextTransaction : item);
  } else {
    state.transactions.push(nextTransaction);
  }
  const wasEditing = Boolean(state.editingId);
  state.editingId = null;
  saveTransactions();
  elements.transactionForm.reset();
  elements.transactionSheet.close();
  renderDashboard();
  showToast(wasEditing ? "Izmjene su sačuvane." : "Transakcija je sačuvana.");
}

function parseVoiceInput(transcript) {
  const normalized = transcript.toLocaleLowerCase("sr").replaceAll("evra", "eura");
  const amountMatch = normalized.match(/(\d+(?:[.,]\d{1,2})?)/);
  const incomeWords = ["primio", "primila", "zaradio", "zaradila", "plata", "prihod"];
  const type = incomeWords.some((word) => normalized.includes(word)) ? "income" : "expense";
  const categoryMatchers = [
    ["gorivo", "taksi", "prevoz", "autobus"],
    ["restoran", "ručak", "vecera", "večera", "kafa", "dorucak", "doručak"],
    ["market", "hrana", "namirnice"],
    ["kirija", "struja", "voda", "internet", "telefon", "račun", "racun"],
    ["plata", "honorar"],
    ["kupio", "kupila", "kupovina"],
  ];
  const categories = ["Prevoz", "Restorani", "Hrana", "Računi", "Plata", "Kupovina"];
  const matchIndex = categoryMatchers.findIndex((keywords) => keywords.some((word) => normalized.includes(word)));
  return {
    amount: amountMatch ? amountMatch[1].replace(".", ",") : "",
    type,
    category: matchIndex >= 0 ? categories[matchIndex] : type === "income" ? "Plata" : "Ostalo",
    note: transcript.charAt(0).toUpperCase() + transcript.slice(1),
  };
}

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Glasovni unos nije podržan u ovom browseru.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "sr-RS";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  elements.voiceButton.classList.add("listening");
  elements.voiceHint.textContent = "Slušam… reci iznos i kategoriju";
  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    const result = parseVoiceInput(transcript);
    elements.amountInput.value = result.amount;
    elements.categoryInput.value = result.category;
    elements.noteInput.value = result.note;
    document.querySelector(`input[name="type"][value="${result.type}"]`).checked = true;
    showToast("Glas je prepoznat — provjeri i potvrdi unos.");
  });
  recognition.addEventListener("error", () => showToast("Nijesam jasno čuo. Pokušaj ponovo."));
  recognition.addEventListener("end", () => {
    elements.voiceButton.classList.remove("listening");
    elements.voiceHint.textContent = "„18 eura za gorivo danas“";
  });
  recognition.start();
}

function appendChatMessage(role, message) {
  const item = document.createElement("div");
  item.className = `chat-message ${role}`;
  if (role === "assistant") {
    const avatar = document.createElement("span");
    avatar.className = "chat-avatar";
    avatar.textContent = "✦";
    item.appendChild(avatar);
  }
  const text = document.createElement("p");
  text.textContent = message;
  item.appendChild(text);
  elements.chatMessages.appendChild(item);
  item.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function answerAiQuestion(questionOverride = "") {
  const originalQuestion = String(questionOverride || elements.aiQuestion.value).trim();
  const question = originalQuestion.toLocaleLowerCase("sr");
  if (!question) return;
  appendChatMessage("user", originalQuestion);
  const monthTransactions = state.transactions.filter((item) => inCurrentPeriod(item, "month", localDate()));
  const summary = totals(monthTransactions);
  const restaurants = monthlyRestaurantSpend();
  const restaurantLimit = Number(state.budgets.Restorani || 120);
  const saving = Math.max(0, restaurants - restaurantLimit);
  const goal = goalMetrics();
  const categories = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + Number(item.amount);
      return result;
    }, {});
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  let answer;
  if (question.includes("restoran") || question.includes("ručak") || question.includes("rucak")) {
    answer = `Na restorane si ovog mjeseca potrošio ${formatMoney(restaurants)}. Tvoj limit je ${formatMoney(restaurantLimit)}, pa je moguća mjesečna ušteda ${formatMoney(saving)}.`;
  } else if (question.includes("ušted") || question.includes("usted")) {
    answer = `Prema trenutnim unosima, samo smanjenjem restorana možeš sačuvati ${formatMoney(saving)} mjesečno, odnosno ${formatMoney(saving * 12)} godišnje.`;
  } else if (question.includes("ostalo") || question.includes("preostalo") || question.includes("imam")) {
    answer = `Ovog mjeseca ti je nakon evidentiranih troškova preostalo ${formatMoney(summary.income - summary.expense)}.`;
  } else if (question.includes("cilj") || question.includes("rok") || question.includes("fond") || question.includes("plan") || question.includes("šted")) {
    answer = goal.target
      ? `Za cilj „${state.goal.name}“ ostalo ti je još ${formatMoney(goal.remaining)}. Da ga dostigneš do roka, planiraj približno ${formatMoney(goal.monthly)} mjesečno narednih ${goal.months} mjeseci.`
      : "Još nemaš postavljen cilj štednje. Otvori ekran Plan i dodaj prvi cilj.";
  } else if (question.includes("najviše") || question.includes("najvise") || question.includes("gdje")) {
    answer = topCategory
      ? `Najviše trošiš u kategoriji ${topCategory[0]}: ${formatMoney(topCategory[1])} ovog mjeseca.`
      : "Još nema dovoljno troškova za poređenje kategorija.";
  } else {
    answer = `Za ovaj mjesec vidim ${formatMoney(summary.income)} prihoda i ${formatMoney(summary.expense)} troškova. Pitaj me koliko ti je ostalo, koliko možeš uštedjeti ili da li stižeš do cilja.`;
  }
  buildAiPlan(answer);
  elements.aiQuestion.value = "";
  window.setTimeout(() => appendChatMessage("assistant", answer), 220);
}

function startAiVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Glasovni unos nije podržan u ovom browseru.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "sr-RS";
  recognition.interimResults = false;
  elements.aiVoiceButton.classList.add("listening");
  recognition.addEventListener("result", (event) => {
    elements.aiQuestion.value = event.results[0][0].transcript;
    answerAiQuestion();
  });
  recognition.addEventListener("error", () => showToast("Nijesam jasno čuo. Pokušaj ponovo."));
  recognition.addEventListener("end", () => elements.aiVoiceButton.classList.remove("listening"));
  recognition.start();
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function applyPrivacy() {
  document.querySelectorAll(".private-value").forEach((element) => element.classList.toggle("is-hidden-value", state.private));
  document.querySelector("#privacyToggle").classList.toggle("is-private", state.private);
  document.querySelector("#privacyToggle").setAttribute("aria-label", state.private ? "Prikaži iznose" : "Sakrij iznose");
}

function navigateToPage(pageName, updateHash = true) {
  const validPages = ["ai", "overview", "entries", "plan"];
  const nextPage = validPages.includes(pageName) ? pageName : "ai";
  state.page = nextPage;
  document.querySelectorAll(".app-page").forEach((page) => {
    const active = page.dataset.page === nextPage;
    page.hidden = !active;
    page.classList.toggle("active", active);
  });
  document.querySelectorAll("[data-nav]").forEach((button) => button.classList.toggle("active", button.dataset.nav === nextPage));
  if (nextPage === "entries") renderTransactionManager();
  if (nextPage === "plan") buildAiPlan();
  window.scrollTo({ top: 0, behavior: updateHash ? "smooth" : "auto" });
  if (updateHash) history.replaceState(null, "", `#${nextPage}`);
}

document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    state.period = button.dataset.period;
    state.anchorDate = localDate();
    document.querySelectorAll("[data-period]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderDashboard();
  });
});

elements.previousPeriod.addEventListener("click", () => movePeriod(-1));
elements.nextPeriod.addEventListener("click", () => movePeriod(1));

document.querySelector("#privacyToggle").addEventListener("click", () => {
  state.private = !state.private;
  applyPrivacy();
});

document.querySelector("#addButton").addEventListener("click", () => openTransactionSheet());
document.querySelector("#addFromEntriesButton").addEventListener("click", () => openTransactionSheet());
elements.transactionForm.addEventListener("submit", handleTransactionSubmit);
elements.voiceButton.addEventListener("click", startVoiceInput);

document.querySelector("#openAiButton").addEventListener("click", () => {
  navigateToPage("ai");
  answerAiQuestion("Kako da ostvarim svoj plan štednje?");
});
document.querySelector("#askAiButton").addEventListener("click", () => answerAiQuestion());
elements.aiQuestion.addEventListener("keydown", (event) => {
  if (event.key === "Enter") answerAiQuestion();
});
elements.aiVoiceButton.addEventListener("click", startAiVoiceInput);
document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => answerAiQuestion(button.dataset.question));
});

document.querySelector("#openBudgetButton").addEventListener("click", openBudgetSheet);
document.querySelector("#planBudgetButton").addEventListener("click", openBudgetSheet);
elements.budgetForm.addEventListener("submit", handleBudgetSubmit);
document.querySelector("#openGoalButton").addEventListener("click", openGoalSheet);
elements.goalForm.addEventListener("submit", handleGoalSubmit);

elements.managedTransactions.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-id]");
  if (editButton) {
    const transaction = state.transactions.find((item) => item.id === editButton.dataset.editId);
    if (transaction) {
      openTransactionSheet(transaction);
    }
    return;
  }
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) deleteTransaction(deleteButton.dataset.deleteId);
});

document.querySelector("#closeDataButton").addEventListener("click", () => elements.dataSheet.close());
document.querySelector("#profileButton").addEventListener("click", () => elements.dataSheet.showModal());
document.querySelector("#exportDataButton").addEventListener("click", downloadBackup);
elements.importDataInput.addEventListener("change", importBackup);
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  navigateToPage("ai");
});

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => navigateToPage(button.dataset.nav));
});

function enableSwipeToDismiss(sheet) {
  const card = sheet.querySelector(".sheet-card");
  if (!card) return;
  let startY = null;
  let dragging = false;
  const resetCard = () => {
    card.style.transition = "transform .2s ease";
    card.style.transform = "translateY(0)";
    window.setTimeout(() => { card.style.transition = ""; card.style.transform = ""; }, 220);
    startY = null;
    dragging = false;
  };
  card.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || card.scrollTop > 0) return;
    startY = event.clientY;
    dragging = true;
    card.setPointerCapture?.(event.pointerId);
  });
  card.addEventListener("pointermove", (event) => {
    if (!dragging || startY === null) return;
    const distance = event.clientY - startY;
    if (distance <= 0) return;
    card.style.transition = "none";
    card.style.transform = `translateY(${Math.min(distance, 180)}px)`;
  });
  card.addEventListener("pointerup", (event) => {
    if (!dragging || startY === null) return;
    const distance = event.clientY - startY;
    if (distance > 90) {
      card.style.transition = "transform .18s ease";
      card.style.transform = "translateY(100%)";
      window.setTimeout(() => {
        if (sheet.open) sheet.close("cancel");
        resetCard();
      }, 180);
    } else {
      resetCard();
    }
  });
  card.addEventListener("pointercancel", resetCard);
  sheet.addEventListener("close", resetCard);
}

document.querySelectorAll("dialog.sheet").forEach(enableSwipeToDismiss);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  elements.installButton.hidden = true;
});

window.addEventListener("appinstalled", () => showToast("Vibe Wallet je dodat na početni ekran."));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}

renderDashboard();
navigateToPage(location.hash.slice(1) || "ai", false);

const STORAGE_KEY = "vibe-wallet-transactions-v2";
const BUDGET_KEY = "vibe-wallet-budgets-v2";
const GOAL_KEY = "vibe-wallet-goal-v2";
const ACCOUNT_KEY = "vibe-wallet-account-v1";
const CATEGORIES_KEY = "vibe-wallet-categories-v1";
const RECOVERY_SUFFIX = "-recovery";
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
const VALID_TRANSACTION_TYPES = new Set(["income", "expense"]);
const BUILT_IN_CATEGORIES = Object.keys(categoryMeta);
const CUSTOM_CATEGORY_COLORS = ["#f9a66c", "#7fd1e8", "#b8e07a", "#e08ad6", "#ffd26f", "#8ed6b0", "#a9b4ff", "#f28c8c"];
const MAX_CUSTOM_CATEGORIES = 24;
const MAX_CATEGORY_NAME = 40;
const NEW_CATEGORY_OPTION = "__new__";

function clearLegacyDemoData() {
  if (localStorage.getItem(CLEAN_START_KEY)) return;
  ["vibe-wallet-transactions-v1", "vibe-wallet-budgets-v1", "vibe-wallet-goal-v1"].forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(CLEAN_START_KEY, "done");
}

clearLegacyDemoData();

const loadedTransactions = loadTransactions();

const state = {
  page: "ai",
  period: "month",
  anchorDate: localDate(),
  private: false,
  editingId: null,
  transactions: loadedTransactions,
  categories: loadCategories(loadedTransactions),
  budgets: loadBudgets(),
  goal: loadGoal(),
  account: loadAccount(),
  installPrompt: null,
  aiPending: false,
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
  homeBalanceLabel: document.querySelector("#homeBalanceLabel"),
  homeBalanceHint: document.querySelector("#homeBalanceHint"),
  overviewAccount: document.querySelector("#overviewAccount"),
  accountSheet: document.querySelector("#accountSheet"),
  accountForm: document.querySelector("#accountForm"),
  accountBalanceInput: document.querySelector("#accountBalanceInput"),
  accountDateInput: document.querySelector("#accountDateInput"),
  allocationSummary: document.querySelector("#allocationSummary"),
  allocationList: document.querySelector("#allocationList"),
  budgetSummary: document.querySelector("#budgetSummary"),
  newCategoryInput: document.querySelector("#newCategoryInput"),
  addCategoryButton: document.querySelector("#addCategoryButton"),
  homeSpent: document.querySelector("#homeSpent"),
  homeFree: document.querySelector("#homeFree"),
  newCategoryField: document.querySelector("#newCategoryField"),
  newCategoryInline: document.querySelector("#newCategoryInline"),
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
  askAiButton: document.querySelector("#askAiButton"),
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

function readStorage(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    // Never overwrite unreadable data silently: keep a copy so it can still be recovered.
    try { localStorage.setItem(`${key}${RECOVERY_SUFFIX}`, raw); } catch {}
    console.warn(`Sačuvani podaci pod ključem ${key} nijesu čitljivi.`, error);
    return null;
  }
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

// Accepts "12,50", "12.50", "1.500", "1 500,00", "1,500.00" and "20 €".
function parseAmount(raw) {
  let text = String(raw ?? "").toLocaleLowerCase("sr").replace(/€|eura|eur|evra/g, "").replace(/\s/g, "");
  if (!text) return NaN;
  const negative = text.startsWith("-");
  text = text.replace(/^[-+]/, "");
  if (!/^\d[\d.,]*$/.test(text)) return NaN;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    normalized = text.replace(new RegExp(`\\${decimal === "," ? "." : ","}`, "g"), "").replace(decimal, ".");
  } else if (lastComma >= 0) {
    normalized = (text.match(/,/g) || []).length > 1 ? text.replace(/,/g, "") : text.replace(",", ".");
  } else if (lastDot >= 0) {
    const dots = (text.match(/\./g) || []).length;
    const thousands = dots > 1 || /^\d{1,3}\.\d{3}$/.test(text);
    normalized = thousands ? text.replace(/\./g, "") : text;
  } else {
    normalized = text;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? (negative ? -value : value) : NaN;
}

function loadTransactions() {
  const saved = readStorage(STORAGE_KEY);
  if (Array.isArray(saved)) return saved.map(normalizeTransaction).filter(Boolean);
  return [];
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function loadBudgets() {
  const saved = readStorage(BUDGET_KEY);
  if (saved && typeof saved === "object" && !Array.isArray(saved) && !isUntouchedDefaultBudgets(saved)) return normalizeBudgets(saved);
  return {};
}

function normalizeCategoryName(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY_NAME);
}

function colorForIndex(index) {
  return CUSTOM_CATEGORY_COLORS[index % CUSTOM_CATEGORY_COLORS.length];
}

function normalizeCategoryList(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const result = [];
  input.forEach((item) => {
    const name = normalizeCategoryName(typeof item === "string" ? item : item?.name);
    const key = name.toLocaleLowerCase("sr");
    if (!name || seen.has(key) || result.length >= MAX_CUSTOM_CATEGORIES + BUILT_IN_CATEGORIES.length) return;
    seen.add(key);
    const stored = typeof item?.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "";
    result.push({ name, color: stored || categoryMeta[name]?.color || colorForIndex(result.length) });
  });
  return result;
}

function withFallbackCategory(list) {
  const withoutFallback = list.filter((item) => item.name !== "Ostalo");
  return [...withoutFallback, { name: "Ostalo", color: categoryMeta.Ostalo.color }];
}

// The category list belongs to the user: it starts from what their entries already use and they add/remove freely.
function loadCategories(transactions) {
  const saved = readStorage(CATEGORIES_KEY);
  if (saved && typeof saved === "object" && !Array.isArray(saved) && Array.isArray(saved.items)) {
    return withFallbackCategory(normalizeCategoryList(saved.items));
  }
  const legacyCustom = Array.isArray(saved) ? normalizeCategoryList(saved) : [];
  const used = [...new Set(transactions.map((item) => item.category))];
  const seeded = normalizeCategoryList([
    ...BUILT_IN_CATEGORIES.filter((name) => used.includes(name)),
    ...legacyCustom,
    ...used,
  ]);
  const list = withFallbackCategory(seeded);
  try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify({ version: 2, items: list })); } catch {}
  return list;
}

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify({ version: 2, items: state.categories }));
}

function allCategoryNames() {
  return state.categories.map((item) => item.name);
}

function allocatableCategories() {
  return allCategoryNames();
}

function categoryInfo(name) {
  const stored = state.categories.find((item) => item.name === name);
  const builtIn = categoryMeta[name];
  if (builtIn) return { icon: builtIn.icon, color: stored?.color || builtIn.color };
  if (stored) return { icon: stored.name.charAt(0).toLocaleUpperCase("sr"), color: stored.color };
  return { icon: name ? name.charAt(0).toLocaleUpperCase("sr") : categoryMeta.Ostalo.icon, color: categoryMeta.Ostalo.color };
}

function categoryStem(name) {
  const lower = name.toLocaleLowerCase("sr");
  return lower.length > 3 ? lower.slice(0, -1) : lower;
}

// Matches a category mentioned in free text, tolerating Serbian case endings ("hranu", "teretanu", "račune").
function matchCategoryInText(text) {
  return matchCategoriesInText(text)[0]?.name || "";
}

function matchCategoriesInText(text) {
  const normalized = text.toLocaleLowerCase("sr");
  return allCategoryNames()
    .map((name) => ({ name, index: normalized.indexOf(categoryStem(name)) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index || b.name.length - a.name.length)
    .filter((item, position, list) => !list.slice(0, position).some((other) => Math.abs(other.index - item.index) < 2));
}

function findCategoryByName(value) {
  const key = normalizeCategoryName(value).toLocaleLowerCase("sr");
  return allCategoryNames().find((name) => name.toLocaleLowerCase("sr") === key) || "";
}

function addCategory(rawName) {
  const name = normalizeCategoryName(rawName);
  if (!name) return { error: "Upiši naziv kategorije." };
  const existing = findCategoryByName(name);
  if (existing) return { error: `Kategorija „${existing}“ već postoji.` };
  if (state.categories.length >= MAX_CUSTOM_CATEGORIES + BUILT_IN_CATEGORIES.length) return { error: "Dostigao si najveći broj kategorija." };
  const color = categoryMeta[name]?.color || colorForIndex(state.categories.length);
  state.categories = withFallbackCategory([...state.categories, { name, color }]);
  saveCategories();
  renderCategoryOptions();
  return { name };
}

function removeCategory(name) {
  if (name === "Ostalo" || !state.categories.some((item) => item.name === name)) return;
  state.categories = withFallbackCategory(state.categories.filter((item) => item.name !== name));
  state.transactions = state.transactions.map((item) => item.category === name ? { ...item, category: "Ostalo" } : item);
  delete state.budgets[name];
  saveCategories();
  saveTransactions();
  saveBudgets();
  renderCategoryOptions();
}

function moveAllocation(from, to, amount) {
  const value = round2(amount);
  if (!Number.isFinite(value) || value <= 0) return { error: "Upiši iznos koji želiš prebaciti." };
  if (from) {
    const available = Number(state.budgets[from] || 0);
    if (available < value) return { error: `U kategoriji ${from} je odvojeno samo ${formatMoney(available)}.` };
    state.budgets[from] = round2(available - value);
  }
  if (to) state.budgets[to] = round2(Number(state.budgets[to] || 0) + value);
  saveBudgets();
  return { from, to, amount: value };
}

function renderCategoryOptions(selected = "") {
  const current = selected || elements.categoryInput.value;
  const names = allCategoryNames();
  if (current && current !== NEW_CATEGORY_OPTION && !names.includes(current)) names.splice(names.length - 1, 0, current);
  elements.categoryInput.innerHTML = [
    ...names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
    `<option value="${NEW_CATEGORY_OPTION}">+ Nova kategorija…</option>`,
  ].join("");
  elements.categoryInput.value = names.includes(current) ? current : names[0];
  toggleNewCategoryField();
}

function toggleNewCategoryField() {
  const wantsNew = elements.categoryInput.value === NEW_CATEGORY_OPTION;
  elements.newCategoryField.hidden = !wantsNew;
  if (wantsNew) window.setTimeout(() => elements.newCategoryInline.focus(), 50);
}

function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
}

function defaultGoal() {
  return { name: "", target: 0, saved: 0, deadline: "" };
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}

function normalizeTransaction(item) {
  const amount = Number(item?.amount);
  if (!item || typeof item.id !== "string" || !item.id || !VALID_TRANSACTION_TYPES.has(item.type) || !Number.isFinite(amount) || amount <= 0 || !isValidDate(item.date)) return null;
  const createdAt = typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : "";
  return {
    id: item.id.slice(0, 120),
    type: item.type,
    amount: round2(amount),
    category: normalizeCategoryName(item.category) || "Ostalo",
    date: item.date,
    note: typeof item.note === "string" ? item.note.trim().slice(0, 160) : "",
    createdAt,
  };
}

function normalizeBudgets(input) {
  const result = {};
  if (input && typeof input === "object") {
    Object.entries(input).forEach(([rawName, rawValue]) => {
      const name = normalizeCategoryName(rawName);
      const value = Number(rawValue);
      if (!name || !Number.isFinite(value) || value < 0) return;
      result[name] = round2(value);
    });
  }
  return result;
}

// Older versions pre-filled limits the user never chose; drop them if they are still untouched.
function isUntouchedDefaultBudgets(input) {
  const keys = Object.keys(input || {});
  return keys.length === Object.keys(DEFAULT_BUDGETS).length && keys.every((key) => Number(input[key]) === DEFAULT_BUDGETS[key]);
}

function defaultAccount() {
  return { isSet: false, balance: 0, date: "", setAt: "" };
}

function normalizeAccount(input) {
  const balance = Number(input?.balance);
  if (!input || !Number.isFinite(balance) || !isValidDate(input.date)) return defaultAccount();
  const setAt = typeof input.setAt === "string" && !Number.isNaN(Date.parse(input.setAt)) ? input.setAt : `${input.date}T00:00:00.000Z`;
  return { isSet: true, balance: round2(balance), date: input.date, setAt };
}

function loadAccount() {
  return normalizeAccount(readStorage(ACCOUNT_KEY));
}

function saveAccount() {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(state.account));
}

function setAccountBalance(balance, date = localDate()) {
  const next = normalizeAccount({ balance, date, setAt: new Date().toISOString() });
  if (!next.isSet) return false;
  state.account = next;
  saveAccount();
  return true;
}

function transactionAffectsAccount(item) {
  if (!state.account.isSet) return false;
  if (item.date > state.account.date) return true;
  if (item.date < state.account.date) return false;
  return Boolean(item.createdAt) && item.createdAt >= state.account.setAt;
}

function accountBalance() {
  if (!state.account.isSet) return null;
  return round2(state.transactions
    .filter(transactionAffectsAccount)
    .reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), state.account.balance));
}

function allocationTotals() {
  const allocated = allocatableCategories().reduce((sum, name) => sum + Number(state.budgets[name] || 0), 0);
  const balance = accountBalance();
  return { allocated: round2(allocated), balance, free: balance === null ? null : round2(balance - allocated) };
}

function normalizeGoal(input) {
  const target = Number(input?.target);
  const saved = Number(input?.saved || 0);
  if (!input || typeof input.name !== "string" || !input.name.trim() || !Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0 || !isValidDate(input.deadline)) return defaultGoal();
  return {
    name: input.name.trim().slice(0, 80),
    target: Math.round(target * 100) / 100,
    saved: Math.round(saved * 100) / 100,
    deadline: input.deadline,
  };
}

function loadGoal() {
  return normalizeGoal(readStorage(GOAL_KEY));
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
  renderAccount(currentMonthSummary);
  elements.homeSpent.textContent = formatMoney(currentMonthSummary.expense, true);
  const used = summary.income ? Math.min(100, (summary.expense / summary.income) * 100) : 0;
  elements.budgetProgress.style.width = `${used}%`;
  elements.budgetProgress.style.background = used > 85 ? "#f3342f" : used > 65 ? "#f3c75f" : "#63d39d";
  renderCategories(filtered, summary.expense);
  renderAllocation();
  renderGoal();
  renderTransactionManager();
  renderAiInsight();
  applyPrivacy();
}

function renderAccount(currentMonthSummary) {
  const balance = accountBalance();
  if (balance === null) {
    elements.homeBalanceLabel.textContent = "Stanje računa";
    elements.homeBalance.textContent = "—";
    elements.homeBalanceHint.textContent = "Unesi koliko trenutno imaš na računu. Svaki novi unos poslije toga automatski mijenja stanje.";
    elements.overviewAccount.textContent = "Račun nije unesen";
    elements.homeFree.textContent = "—";
    return;
  }
  const allocation = allocationTotals();
  elements.homeFree.textContent = formatMoney(allocation.free, true);
  elements.homeFree.classList.toggle("over", allocation.free < 0);
  const since = new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "short" }).format(new Date(`${state.account.date}T12:00:00`));
  elements.homeBalanceLabel.textContent = "Stanje računa";
  elements.homeBalance.textContent = formatMoney(balance);
  elements.homeBalanceHint.textContent = `Stanje ${formatMoney(state.account.balance)} uneseno ${since} · ovog mjeseca potrošeno ${formatMoney(currentMonthSummary.expense)}`;
  elements.overviewAccount.textContent = `Račun: ${formatMoney(balance)}`;
}

function allocationSummaryText(totals = allocationTotals()) {
  if (totals.balance === null) return `Raspoređeno ${formatMoney(totals.allocated)}. Unesi stanje računa da vidiš koliko ti ostaje slobodno.`;
  const free = totals.free;
  const freeLabel = free < 0 ? `prekoračeno ${formatMoney(Math.abs(free))}` : `slobodno ${formatMoney(free)}`;
  return `Stanje ${formatMoney(totals.balance)} · raspoređeno ${formatMoney(totals.allocated)} · ${freeLabel}`;
}

function renderAllocation() {
  const monthTransactions = state.transactions.filter((item) => item.type === "expense" && inCurrentPeriod(item, "month", localDate()));
  const spentBy = monthTransactions.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + Number(item.amount);
    return result;
  }, {});
  const rows = allocatableCategories()
    .map((name) => ({ name, limit: Number(state.budgets[name] || 0), spent: spentBy[name] || 0 }))
    .filter((row) => row.limit > 0 || row.spent > 0);
  elements.allocationSummary.textContent = allocationSummaryText();
  if (!rows.length) {
    elements.allocationList.innerHTML = `<div class="empty-state">Rasporedi novac po kategorijama: dodirni „Uredi“ i upiši koliko želiš odvojiti za svaku.</div>`;
    return;
  }
  elements.allocationList.innerHTML = rows.map((row) => {
    const meta = categoryInfo(row.name);
    const remaining = row.limit - row.spent;
    const percent = row.limit ? Math.round((row.spent / row.limit) * 100) : 100;
    return `
      <article class="category-item">
        <div class="category-icon" style="color:${meta.color}">${meta.icon}</div>
        <div class="category-copy"><strong>${escapeHtml(row.name)}</strong><span>${row.limit ? `Potrošeno ${formatMoney(row.spent)} od ${formatMoney(row.limit, true)}` : `Potrošeno ${formatMoney(row.spent)} · nije raspoređeno`}</span></div>
        <div class="category-amount"><strong class="private-value ${remaining < 0 ? "over" : ""}">${row.limit ? formatMoney(remaining) : "—"}</strong><span>${row.limit ? "ostalo" : ""}</span></div>
        <div class="category-progress ${percent > 100 ? "over" : ""}"><span style="width:${Math.min(100, percent)}%"></span></div>
      </article>
    `;
  }).join("");
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
    const meta = categoryInfo(category);
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

function monthlyCategorySpend(category) {
  return state.transactions
    .filter((item) => item.type === "expense" && item.category === category && inCurrentPeriod(item, "month", localDate()))
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

// The category that is furthest over what the user set aside for it this month.
function overspendInsight() {
  const rows = allocatableCategories()
    .map((name) => ({ name, limit: Number(state.budgets[name] || 0), spent: monthlyCategorySpend(name) }))
    .filter((row) => row.limit > 0)
    .map((row) => ({ ...row, saving: Math.max(0, row.spent - row.limit) }))
    .sort((a, b) => b.saving - a.saving);
  return rows[0] || { name: "", limit: 0, spent: 0, saving: 0 };
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
  const insight = overspendInsight();
  const saving = insight.saving;
  if (saving > 0) {
    elements.aiInsight.textContent = `${insight.name} je ${formatMoney(saving, true)} iznad odvojenih ${formatMoney(insight.limit, true)}.`;
  } else if (insight.name) {
    elements.aiInsight.textContent = "Potrošnja je u okviru iznosa koje si odvojio.";
  } else {
    elements.aiInsight.textContent = "Odvoji novac po kategorijama na ekranu Plan da pratim gdje prelaziš.";
  }
  elements.monthlySaving.textContent = formatMoney(saving, true);
  elements.yearlySaving.textContent = formatMoney(saving * 12, true);
}

function buildAiPlan(customAnswer = "") {
  const insight = overspendInsight();
  const saving = insight.saving;
  const annual = saving * 12;
  const summary = totals(state.transactions.filter((item) => inCurrentPeriod(item, "month", localDate())));
  const goal = goalMetrics();
  const allocation = allocationTotals();
  elements.aiPlanMessage.textContent = customAnswer || (saving
    ? `Najlakša prilika je kategorija ${insight.name}. Ako ostaneš na odvojenih ${formatMoney(insight.limit, true)}, oslobađaš oko ${formatMoney(saving, true)} mjesečno i ${formatMoney(annual, true)} godišnje.`
    : insight.name
      ? "Trenutno si u okviru iznosa koje si odvojio. Sljedeći plan mogu napraviti kada dodamo još tvojih stvarnih troškova."
      : "Odvoji novac po kategorijama pa ću ti reći gdje najlakše štediš.");
  elements.aiSteps.innerHTML = `
    <div class="ai-step"><span class="ai-step-index">01</span><div><strong>${escapeHtml(insight.name ? `Odvojeno za ${insight.name}` : "Raspodjela")}</strong><small>${insight.name ? "Prati se automatski svakog mjeseca" : "Još ništa nije odvojeno"}</small></div><span class="ai-step-amount">${insight.name ? formatMoney(insight.limit, true) : "—"}</span></div>
    <div class="ai-step"><span class="ai-step-index">02</span><div><strong>Slobodno na računu</strong><small>Stanje minus sve što je odvojeno</small></div><span class="ai-step-amount">${allocation.free === null ? "—" : formatMoney(allocation.free, true)}</span></div>
    <div class="ai-step"><span class="ai-step-index">03</span><div><strong>Bilans mjeseca</strong><small>Prihodi minus evidentirani troškovi</small></div><span class="ai-step-amount">${formatMoney(summary.income - summary.expense, true)}</span></div>
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
  const target = parseAmount(data.get("target"));
  const saved = parseAmount(data.get("saved"));
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) {
    showToast("Provjeri iznose cilja i dosadašnje štednje.");
    return;
  }
  const nextGoal = normalizeGoal({
    name: String(data.get("name")).trim(),
    target,
    saved,
    deadline: String(data.get("deadline")),
  });
  if (!nextGoal.target) {
    showToast("Provjeri naziv i rok cilja.");
    return;
  }
  state.goal = nextGoal;
  saveGoal();
  elements.goalSheet.close();
  renderDashboard();
  showToast("Cilj štednje je sačuvan.");
}

function budgetInputName(category) {
  return `budget:${category}`;
}

function draftBudgetsFromForm() {
  const draft = {};
  elements.budgetFields.querySelectorAll("input[data-category]").forEach((input) => {
    const value = input.value.trim() ? parseAmount(input.value) : 0;
    draft[input.dataset.category] = Number.isFinite(value) && value >= 0 ? round2(value) : 0;
  });
  return draft;
}

function renderBudgetFields(draft = state.budgets) {
  elements.budgetFields.innerHTML = allocatableCategories().map((category) => {
    const meta = categoryInfo(category);
    const removable = category !== "Ostalo";
    const value = Number(draft[category] || 0);
    const spent = monthlyCategorySpend(category);
    return `
      <div class="budget-field ${removable ? "custom" : ""}">
        <span class="category-icon" style="color:${meta.color}">${meta.icon}</span>
        <label for="budget-${escapeHtml(category)}">${escapeHtml(category)}<small>${spent ? `Potrošeno ${formatMoney(spent)} ovog mjeseca` : "Koliko odvajaš"}</small></label>
        <span class="budget-input"><input id="budget-${escapeHtml(category)}" name="${escapeHtml(budgetInputName(category))}" data-category="${escapeHtml(category)}" inputmode="decimal" value="${value ? String(value).replace(".", ",") : ""}" placeholder="0" aria-label="Iznos za ${escapeHtml(category)}" /><span>€</span></span>
        ${removable ? `<button class="remove-category" type="button" data-remove-category="${escapeHtml(category)}" aria-label="Ukloni kategoriju ${escapeHtml(category)}">×</button>` : ""}
      </div>
    `;
  }).join("");
  renderBudgetSummary();
}

function renderBudgetSummary() {
  const draft = draftBudgetsFromForm();
  const allocated = round2(allocatableCategories().reduce((sum, name) => sum + Number(draft[name] || 0), 0));
  const balance = accountBalance();
  elements.budgetSummary.textContent = allocationSummaryText({ allocated, balance, free: balance === null ? null : round2(balance - allocated) });
}

function openBudgetSheet() {
  renderBudgetFields();
  elements.newCategoryInput.value = "";
  elements.budgetSheet.showModal();
}

function handleAddCategory() {
  const draft = draftBudgetsFromForm();
  const result = addCategory(elements.newCategoryInput.value);
  if (result.error) {
    showToast(result.error);
    elements.newCategoryInput.focus();
    return;
  }
  elements.newCategoryInput.value = "";
  renderBudgetFields(draft);
  const input = elements.budgetFields.querySelector(`input[data-category="${CSS.escape(result.name)}"]`);
  input?.focus();
  showToast(`Kategorija „${result.name}“ je dodata.`);
}

function handleRemoveCategory(name) {
  const count = state.transactions.filter((item) => item.category === name).length;
  const detail = count ? ` ${count} unosa prelazi u „Ostalo“.` : "";
  if (!window.confirm(`Ukloniti kategoriju „${name}“?${detail}`)) return;
  const draft = draftBudgetsFromForm();
  delete draft[name];
  removeCategory(name);
  renderBudgetFields(draft);
  renderDashboard();
  showToast(`Kategorija „${name}“ je uklonjena.`);
}

function handleBudgetSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    elements.budgetSheet.close();
    return;
  }
  state.budgets = normalizeBudgets(draftBudgetsFromForm());
  saveBudgets();
  elements.budgetSheet.close();
  renderDashboard();
  showToast("Raspodjela po kategorijama je sačuvana.");
}

function openAccountSheet() {
  elements.accountForm.reset();
  elements.accountBalanceInput.value = state.account.isSet ? String(accountBalance()).replace(".", ",") : "";
  elements.accountDateInput.value = localDate();
  elements.accountDateInput.max = localDate();
  elements.accountSheet.showModal();
  window.setTimeout(() => elements.accountBalanceInput.focus(), 180);
}

function handleAccountSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    elements.accountSheet.close();
    return;
  }
  const data = new FormData(elements.accountForm);
  const balance = parseAmount(data.get("balance"));
  const date = String(data.get("date") || localDate());
  if (!Number.isFinite(balance)) {
    showToast("Unesi ispravan iznos stanja.");
    elements.accountBalanceInput.focus();
    return;
  }
  if (!isValidDate(date) || date > localDate()) {
    showToast("Datum stanja ne može biti u budućnosti.");
    return;
  }
  setAccountBalance(balance, date);
  elements.accountSheet.close();
  renderDashboard();
  showToast(`Stanje računa je sačuvano: ${formatMoney(balance)}.`);
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
    const meta = categoryInfo(item.category);
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
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    budgets: state.budgets,
    goal: state.goal,
    account: state.account.isSet ? state.account : null,
    categories: state.categories,
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
    if (file.size > 2_000_000) throw new Error("Backup is too large");
    const backup = JSON.parse(await file.text());
    const validTransactions = Array.isArray(backup.transactions);
    const validBudgets = backup.budgets && typeof backup.budgets === "object" && !Array.isArray(backup.budgets);
    const importedTransactions = validTransactions ? backup.transactions.map(normalizeTransaction).filter(Boolean) : [];
    const importedGoal = backup.goal ? normalizeGoal(backup.goal) : defaultGoal();
    if (![1, 2].includes(backup.version) || !validTransactions || importedTransactions.length !== backup.transactions.length || !validBudgets || (backup.goal && !importedGoal.target)) throw new Error("Neispravan format");
    if (!window.confirm(`Uvesti ${backup.transactions.length} transakcija? Trenutni lokalni podaci biće zamijenjeni.`)) return;
    state.transactions = importedTransactions;
    state.categories = withFallbackCategory(normalizeCategoryList([
      ...(Array.isArray(backup.categories) ? backup.categories : []),
      ...(backup.version === 1 ? BUILT_IN_CATEGORIES : []),
      ...new Set(importedTransactions.map((item) => item.category)),
    ]));
    state.budgets = normalizeBudgets(backup.budgets);
    state.goal = importedGoal;
    state.account = normalizeAccount(backup.account);
    saveCategories();
    saveTransactions();
    saveBudgets();
    saveGoal();
    saveAccount();
    renderCategoryOptions();
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

function openTransactionSheet(transaction = null, presetType = "") {
  elements.transactionForm.reset();
  elements.newCategoryInline.value = "";
  if (presetType) document.querySelector(`input[name="type"][value="${presetType}"]`).checked = true;
  state.editingId = transaction?.id || null;
  elements.transactionFormEyebrow.textContent = transaction ? "UREĐIVANJE" : "NOVI UNOS";
  elements.transactionFormTitle.textContent = transaction ? "Uredi transakciju" : "Dodaj transakciju";
  elements.transactionSubmitLabel.textContent = transaction ? "SAČUVAJ IZMJENE" : "SAČUVAJ UNOS";
  elements.dateInput.value = transaction?.date || localDate();
  renderCategoryOptions(transaction?.category || allCategoryNames()[0]);
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
  const amount = parseAmount(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Unesi ispravan iznos.");
    elements.amountInput.focus();
    return;
  }
  let category = String(formData.get("category") || "");
  if (category === NEW_CATEGORY_OPTION) {
    const added = addCategory(elements.newCategoryInline.value);
    if (added.error) {
      showToast(added.error);
      elements.newCategoryInline.focus();
      return;
    }
    category = added.name;
    renderCategoryOptions(category);
  }
  const existing = state.editingId ? state.transactions.find((item) => item.id === state.editingId) : null;
  const nextTransaction = normalizeTransaction({
    id: state.editingId || crypto.randomUUID(),
    type: formData.get("type"),
    amount,
    category,
    date: formData.get("date"),
    note: String(formData.get("note") || "").trim(),
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
  });
  if (!nextTransaction) {
    showToast("Provjeri datum i podatke unosa.");
    return;
  }
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
  const amountMatch = normalized.match(/(\d[\d.,]*)/);
  const incomeWords = ["primio", "primila", "zaradio", "zaradila", "plata", "prihod", "uplat", "sjelo", "leglo"];
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
  const mentioned = matchCategoryInText(transcript);
  const keywordCategory = matchIndex >= 0 && allCategoryNames().includes(categories[matchIndex]) ? categories[matchIndex] : "";
  const incomeCategory = allCategoryNames().includes("Plata") ? "Plata" : "Ostalo";
  const parsedAmount = amountMatch ? parseAmount(amountMatch[1]) : NaN;
  return {
    amount: Number.isFinite(parsedAmount) ? String(parsedAmount).replace(".", ",") : "",
    type,
    category: mentioned || keywordCategory || (type === "income" ? incomeCategory : "Ostalo"),
    note: transcript.charAt(0).toUpperCase() + transcript.slice(1),
  };
}

function amountFromText(text) {
  const match = text.toLocaleLowerCase("sr").match(/(-?\d[\d.,]*)/);
  if (!match) return null;
  const amount = parseAmount(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

function isMoveCommand(text) {
  const normalized = text.toLocaleLowerCase("sr");
  return ["prebaci", "premjesti", "premesti", "prenesi", "pomjeri", "pomeri", "vrati"].some((word) => normalized.includes(word));
}

// "prebaci 50 iz hrane u prevoz", "vrati 20 iz zabave" (back to free money), "prebaci 30 u hranu" (from free money).
function moveFromChat(text) {
  if (!isMoveCommand(text)) return null;
  const amount = amountFromText(text);
  if (amount === null || amount <= 0) return { needsAmount: true };
  const normalized = text.toLocaleLowerCase("sr");
  const mentioned = matchCategoriesInText(text);
  let from = null;
  let to = null;
  if (mentioned.length >= 2) {
    [from, to] = [mentioned[0].name, mentioned[1].name];
  } else if (mentioned.length === 1) {
    const before = normalized.slice(0, mentioned[0].index);
    const fromWords = /(\b(iz|sa|s)\s*$)/.test(before) || normalized.includes("vrati");
    if (fromWords) from = mentioned[0].name;
    else to = mentioned[0].name;
  } else {
    return { needsCategory: true };
  }
  const result = moveAllocation(from, to, amount);
  if (result.error) return { error: result.error };
  renderDashboard();
  return result;
}

function isBalanceCommand(text) {
  const normalized = text.toLocaleLowerCase("sr");
  return normalized.includes("stanje") || normalized.includes("na računu") || normalized.includes("na racunu");
}

function setBalanceFromChat(text) {
  if (!isBalanceCommand(text)) return null;
  const amount = amountFromText(text);
  if (amount === null) return { needsAmount: true };
  setAccountBalance(amount, localDate());
  renderDashboard();
  return { balance: amount };
}

function isAllocationCommand(text) {
  const normalized = text.toLocaleLowerCase("sr");
  return ["odvoji", "rasporedi", "limit", "budžet", "budzet", "namijeni", "nameni"].some((word) => normalized.includes(word));
}

function allocateFromChat(text) {
  if (!isAllocationCommand(text)) return null;
  const amount = amountFromText(text);
  if (amount === null || amount < 0) return { needsAmount: true };
  const category = matchCategoryInText(text);
  if (!category) return { needsCategory: true };
  state.budgets[category] = round2(amount);
  saveBudgets();
  renderDashboard();
  return { category, amount: round2(amount) };
}

function isTransactionCommand(text) {
  const normalized = text.toLocaleLowerCase("sr");
  return ["dodaj", "unesi", "upiši", "upisi", "stavi", "evidentiraj", "zabilježi", "zabiljezi", "zapiši", "zapisi", "uplati", "uplata", "potrošio", "potrosio", "platio", "kupio"]
    .some((word) => normalized.includes(word));
}

function transactionDateFromText(text) {
  const normalized = text.toLocaleLowerCase("sr");
  if (normalized.includes("juče") || normalized.includes("juce")) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return localDate(yesterday);
  }
  return localDate();
}

function addTransactionFromChat(text) {
  if (!isTransactionCommand(text)) return { transaction: null, needsAmount: false };
  const parsed = parseVoiceInput(text);
  const amount = parseAmount(parsed.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { transaction: null, needsAmount: true };
  const transaction = normalizeTransaction({
    id: crypto.randomUUID(),
    type: parsed.type,
    amount,
    category: parsed.category,
    date: transactionDateFromText(text),
    createdAt: new Date().toISOString(),
    note: parsed.category === "Prevoz" && text.toLocaleLowerCase("sr").includes("gorivo") ? "Gorivo" : parsed.note,
  });
  if (!transaction) return { transaction: null, needsAmount: true };
  state.transactions.push(transaction);
  saveTransactions();
  renderDashboard();
  return { transaction, needsAmount: false };
}

function legacyStartVoiceInput() {
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

function appendThinkingMessage() {
  const item = document.createElement("div");
  item.className = "chat-message assistant is-thinking";
  const avatar = document.createElement("span");
  avatar.className = "chat-avatar";
  avatar.textContent = "✦";
  const dots = document.createElement("p");
  dots.className = "typing-dots";
  dots.setAttribute("aria-label", "Asistent piše");
  dots.innerHTML = "<span></span><span></span><span></span>";
  item.append(avatar, dots);
  elements.chatMessages.appendChild(item);
  item.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return item;
}

function appendTypedAssistantMessage(message) {
  return new Promise((resolve) => {
    const item = document.createElement("div");
    item.className = "chat-message assistant";
    const avatar = document.createElement("span");
    avatar.className = "chat-avatar";
    avatar.textContent = "✦";
    const text = document.createElement("p");
    item.append(avatar, text);
    elements.chatMessages.appendChild(item);
    const value = String(message || "");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !value) {
      text.textContent = value;
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      resolve();
      return;
    }
    let position = 0;
    const step = Math.max(1, Math.ceil(value.length / 72));
    const typeNext = () => {
      position = Math.min(value.length, position + step);
      text.textContent = value.slice(0, position);
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
      if (position < value.length) window.setTimeout(typeNext, 18);
      else resolve();
    };
    typeNext();
  });
}

function finishAiReply() {
  state.aiPending = false;
  elements.askAiButton.disabled = false;
}

async function answerAiQuestion(questionOverride = "") {
  const originalQuestion = String(questionOverride || elements.aiQuestion.value).trim();
  const question = originalQuestion.toLocaleLowerCase("sr");
  if (!question) return;
  if (state.aiPending) {
    showToast("Sačekaj da završim prethodni odgovor.");
    return;
  }
  state.aiPending = true;
  elements.askAiButton.disabled = true;
  appendChatMessage("user", originalQuestion);
  elements.aiQuestion.value = "";
  const balanceCommand = setBalanceFromChat(originalQuestion);
  if (balanceCommand) {
    const reply = balanceCommand.needsAmount
      ? "Napiši mi iznos stanja, na primjer: „Stanje računa je 850 €“."
      : `Zabilježio sam stanje računa: ${formatMoney(balanceCommand.balance)}. Od sada svaki novi prihod i trošak automatski mijenja stanje.`;
    if (!balanceCommand.needsAmount) buildAiPlan(reply);
    await appendTypedAssistantMessage(reply);
    finishAiReply();
    return;
  }
  const moveCommand = moveFromChat(originalQuestion);
  if (moveCommand) {
    let reply;
    if (moveCommand.needsAmount) reply = "Napiši iznos, na primjer: „Prebaci 50 € iz hrane u prevoz“.";
    else if (moveCommand.needsCategory) reply = `Iz koje u koju kategoriju? Imaš: ${allocatableCategories().join(", ")}.`;
    else if (moveCommand.error) reply = moveCommand.error;
    else {
      const fromLabel = moveCommand.from ? `iz ${moveCommand.from}` : "iz slobodnog novca";
      const toLabel = moveCommand.to ? `u ${moveCommand.to}` : "u slobodan novac";
      reply = `Prebacio sam ${formatMoney(moveCommand.amount)} ${fromLabel} ${toLabel}. ${allocationSummaryText()}.`;
      buildAiPlan(reply);
    }
    await appendTypedAssistantMessage(reply);
    finishAiReply();
    return;
  }
  const allocationCommand = allocateFromChat(originalQuestion);
  if (allocationCommand) {
    let reply;
    if (allocationCommand.needsAmount) reply = "Napiši koliko želiš odvojiti, na primjer: „Odvoji 200 € za hranu“.";
    else if (allocationCommand.needsCategory) reply = `Za koju kategoriju? Imaš: ${allocatableCategories().join(", ")}. Novu kategoriju dodaješ na ekranu Plan.`;
    else reply = `Odvojio sam ${formatMoney(allocationCommand.amount)} za ${allocationCommand.category}. ${allocationSummaryText()}.`;
    if (!allocationCommand.needsAmount && !allocationCommand.needsCategory) buildAiPlan(reply);
    await appendTypedAssistantMessage(reply);
    finishAiReply();
    return;
  }
  const chatTransaction = addTransactionFromChat(originalQuestion);
  if (chatTransaction.needsAmount) {
    await appendTypedAssistantMessage("Mogu. Samo mi napiši iznos, na primjer: „Dodaj danas 20 € za gorivo“.");
    finishAiReply();
    return;
  }
  if (chatTransaction.transaction) {
    const item = chatTransaction.transaction;
    const kind = item.type === "income" ? "prihod" : "trošak";
    const dateLabel = item.date === localDate() ? "za danas" : "za juče";
    const confirmation = `Dodao sam ${kind} od ${formatMoney(item.amount)} za ${item.category} ${dateLabel}.`;
    buildAiPlan(confirmation);
    await appendTypedAssistantMessage(confirmation);
    finishAiReply();
    return;
  }
  const monthTransactions = state.transactions.filter((item) => inCurrentPeriod(item, "month", localDate()));
  const summary = totals(monthTransactions);
  const insight = overspendInsight();
  const saving = insight.saving;
  const askedCategory = matchCategoryInText(originalQuestion);
  const goal = goalMetrics();
  const categories = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + Number(item.amount);
      return result;
    }, {});
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  let answer;
  if (askedCategory && (question.includes("koliko") || question.includes("potroš") || question.includes("potros") || question.includes("ostalo"))) {
    const spent = monthlyCategorySpend(askedCategory);
    const limit = Number(state.budgets[askedCategory] || 0);
    answer = limit
      ? `Za ${askedCategory} si ovog mjeseca potrošio ${formatMoney(spent)} od odvojenih ${formatMoney(limit)}. Ostalo ti je ${formatMoney(limit - spent)}.`
      : `Za ${askedCategory} si ovog mjeseca potrošio ${formatMoney(spent)}. Nijesi odvojio iznos za tu kategoriju.`;
  } else if (question.includes("ušted") || question.includes("usted")) {
    answer = saving
      ? `Prema trenutnim unosima, ako ${insight.name} vratiš na odvojenih ${formatMoney(insight.limit)}, štediš ${formatMoney(saving)} mjesečno, odnosno ${formatMoney(saving * 12)} godišnje.`
      : "Trenutno si u okviru iznosa koje si odvojio. Odvoji novac po kategorijama pa ću ti pokazati gdje najlakše štediš.";
  } else if (question.includes("ostalo") || question.includes("preostalo") || question.includes("imam")) {
    const currentBalance = accountBalance();
    answer = currentBalance === null
      ? `Ovog mjeseca ti je nakon evidentiranih troškova preostalo ${formatMoney(summary.income - summary.expense)}. Unesi stanje računa da ti kažem tačno koliko imaš.`
      : `Na računu trenutno imaš ${formatMoney(currentBalance)}. Ovog mjeseca si potrošio ${formatMoney(summary.expense)}. ${allocationSummaryText()}.`;
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
  if ((question.includes("koji si") || question.includes("ko si") || question.includes("agent")) && answer.startsWith("Za ovaj mjesec")) {
    answer = "Ja sam Vibe Wallet, tvoj finansijski asistent. Pomažem ti da pratiš troškove, prihode, limite i ciljeve štednje.";
  }
  const localAnswer = answer;
  const thinking = appendThinkingMessage();
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: originalQuestion,
        month: localDate().slice(0, 7),
        summary: { income: summary.income, expense: summary.expense, balance: summary.income - summary.expense },
        account: accountBalance() === null ? null : { balance: accountBalance(), since: state.account.date, allocated: allocationTotals().allocated, free: allocationTotals().free },
        categories: allCategoryNames(),
        budgets: state.budgets,
        goal: state.goal,
        transactions: monthTransactions.slice(-100).map((item) => ({ date: item.date, type: item.type, amount: item.amount, category: item.category }))
      })
    });
    if (response.ok) {
      const result = await response.json();
      if (result.answer) answer = result.answer;
    }
  } catch (error) {
    // Keep the local answer when the API is unavailable or not configured.
  } finally {
    thinking.remove();
  }
  buildAiPlan(answer);
  await appendTypedAssistantMessage(answer || localAnswer);
  finishAiReply();
}

function legacyStartAiVoiceInput() {
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
    const transcript = event.results[0][0].transcript;
    elements.aiQuestion.value = transcript;
    elements.aiQuestion.focus();
    elements.aiQuestion.setSelectionRange(transcript.length, transcript.length);
  });
  recognition.addEventListener("error", () => showToast("Nijesam jasno čuo. Pokušaj ponovo."));
  recognition.addEventListener("end", () => elements.aiVoiceButton.classList.remove("listening"));
  recognition.start();
}

let activeVoiceSession = null;

function voiceMimeType() {
  if (!window.MediaRecorder) return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function audioToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result).split(",")[1] || ""));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

async function transcribeVoice(blob, mimeType) {
  const audio = await audioToBase64(blob);
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio, mimeType })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.transcript) throw new Error(result.error || "Voice transcription failed");
  return result.transcript;
}

async function toggleVoiceCapture({ button, onTranscript, onStart, onStop }) {
  if (activeVoiceSession) {
    if (activeVoiceSession.button === button && activeVoiceSession.recorder.state === "recording") activeVoiceSession.recorder.stop();
    else showToast("Prvo završi trenutno snimanje.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      if (button === elements.voiceButton) legacyStartVoiceInput();
      else legacyStartAiVoiceInput();
      return;
    }
    showToast("Ovaj browser ne podržava snimanje glasa.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const mimeType = voiceMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    const stopTimer = window.setTimeout(() => recorder.stop(), 25000);
    activeVoiceSession = { recorder, button };
    button.classList.add("listening");
    button.setAttribute("aria-pressed", "true");
    onStart?.();
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      window.clearTimeout(stopTimer);
      stream.getTracks().forEach((track) => track.stop());
      activeVoiceSession = null;
      button.classList.remove("listening");
      button.setAttribute("aria-pressed", "false");
      onStop?.();
      if (!chunks.length) return showToast("Nijesam čuo snimak. Pokušaj ponovo.");
      button.disabled = true;
      try {
        const actualMimeType = recorder.mimeType || mimeType || "audio/webm";
        const transcript = await transcribeVoice(new Blob(chunks, { type: actualMimeType }), actualMimeType);
        onTranscript(transcript);
      } catch (error) {
        showToast(error.message.includes("configured") ? "Gemini ključ nije aktivan na Vercelu." : "Nijesam uspio prepoznati glas. Pokušaj ponovo.");
      } finally {
        button.disabled = false;
      }
    }, { once: true });
    recorder.start();
  } catch (error) {
    showToast(error.name === "NotAllowedError" ? "Dozvoli mikrofon za Wallet u postavkama telefona." : "Mikrofon trenutno nije dostupan.");
  }
}

function startVoiceInput() {
  toggleVoiceCapture({
    button: elements.voiceButton,
    onStart: () => { elements.voiceHint.textContent = "Snimam… dodirni ponovo kada završiš"; },
    onStop: () => { elements.voiceHint.textContent = "Prepisujem glas…"; },
    onTranscript: (transcript) => {
      const result = parseVoiceInput(transcript);
      elements.amountInput.value = result.amount;
      elements.categoryInput.value = result.category;
      elements.noteInput.value = result.note;
      document.querySelector(`input[name="type"][value="${result.type}"]`).checked = true;
      elements.voiceHint.textContent = "Prepoznato — provjeri i potvrdi unos.";
    }
  });
}

function startAiVoiceInput() {
  toggleVoiceCapture({
    button: elements.aiVoiceButton,
    onTranscript: (transcript) => {
      elements.aiQuestion.value = transcript;
      elements.aiQuestion.focus();
      elements.aiQuestion.setSelectionRange(transcript.length, transcript.length);
    }
  });
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
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const active = button.dataset.nav === nextPage;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (nextPage === "entries") renderTransactionManager();
  if (nextPage === "plan") buildAiPlan();
  window.scrollTo({ top: 0, behavior: updateHash ? "smooth" : "auto" });
  if (updateHash && location.hash !== `#${nextPage}`) history.pushState(null, "", `#${nextPage}`);
}

window.addEventListener("hashchange", () => navigateToPage(location.hash.slice(1) || "ai", false));

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
document.querySelector("#openAllocationButton").addEventListener("click", openBudgetSheet);
elements.budgetForm.addEventListener("submit", handleBudgetSubmit);
elements.budgetFields.addEventListener("input", renderBudgetSummary);
elements.budgetFields.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-category]");
  if (button) handleRemoveCategory(button.dataset.removeCategory);
});
elements.addCategoryButton.addEventListener("click", handleAddCategory);
elements.newCategoryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleAddCategory();
  }
});
document.querySelector("#openAccountButton").addEventListener("click", openAccountSheet);
document.querySelector("#addIncomeButton").addEventListener("click", () => openTransactionSheet(null, "income"));
document.querySelector("#homeAllocateButton").addEventListener("click", openBudgetSheet);
elements.categoryInput.addEventListener("change", toggleNewCategoryField);
document.querySelector("#homeBalanceCard").addEventListener("click", (event) => {
  if (!event.target.closest("button")) openAccountSheet();
});
elements.accountForm.addEventListener("submit", handleAccountSubmit);
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
document.querySelector("#profileButton").addEventListener("click", () => {
  const button = document.querySelector("#profileButton");
  if (elements.dataSheet.open) elements.dataSheet.close();
  else elements.dataSheet.showModal();
  button.setAttribute("aria-expanded", String(elements.dataSheet.open));
});
elements.dataSheet.addEventListener("close", () => document.querySelector("#profileButton").setAttribute("aria-expanded", "false"));
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
    if (event.pointerType !== "mouse" || card.scrollTop > 0) return;
    startY = event.clientY;
    dragging = true;
    card.setPointerCapture?.(event.pointerId);
  });
  card.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !dragging || startY === null) return;
    const distance = event.clientY - startY;
    if (distance <= 0) return;
    card.style.transition = "none";
    card.style.transform = `translateY(${Math.min(distance, 180)}px)`;
  });
  card.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "mouse" || !dragging || startY === null) return;
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
  card.addEventListener("pointercancel", (event) => {
    if (event.pointerType === "mouse") resetCard();
  });
  card.addEventListener("touchstart", (event) => {
    if (card.scrollTop > 0 || !event.touches[0]) return;
    startY = event.touches[0].clientY;
    dragging = true;
  }, { passive: true });
  card.addEventListener("touchmove", (event) => {
    if (!dragging || startY === null || !event.touches[0]) return;
    const distance = event.touches[0].clientY - startY;
    if (distance <= 0) return;
    card.style.transition = "none";
    card.style.transform = `translateY(${Math.min(distance, 180)}px)`;
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  card.addEventListener("touchend", (event) => {
    if (!dragging || startY === null) return;
    const distance = (event.changedTouches[0]?.clientY || startY) - startY;
    if (distance > 90) {
      card.style.transition = "transform .18s ease";
      card.style.transform = "translateY(100%)";
      window.setTimeout(() => {
        if (sheet.open) sheet.close("cancel");
        resetCard();
      }, 180);
    } else resetCard();
  }, { passive: true });
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

// Ask the browser not to evict this origin's storage under pressure (Chrome/Android honours it for installed PWAs).
navigator.storage?.persist?.().catch(() => {});

renderCategoryOptions(allCategoryNames()[0]);
renderDashboard();
navigateToPage(location.hash.slice(1) || "ai", false);

const STORAGE_KEY = "vibe-wallet-transactions-v1";
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

const state = {
  period: "month",
  private: false,
  transactions: loadTransactions(),
  installPrompt: null,
};

const elements = {
  dateLabel: document.querySelector("#dateLabel"),
  balanceValue: document.querySelector("#balanceValue"),
  balanceContext: document.querySelector("#balanceContext"),
  incomeValue: document.querySelector("#incomeValue"),
  expenseValue: document.querySelector("#expenseValue"),
  budgetProgress: document.querySelector("#budgetProgress"),
  weekSpent: document.querySelector("#weekSpent"),
  trendPill: document.querySelector("#trendPill"),
  barChart: document.querySelector("#barChart"),
  categoryList: document.querySelector("#categoryList"),
  transactionList: document.querySelector("#transactionList"),
  transactionSheet: document.querySelector("#transactionSheet"),
  transactionForm: document.querySelector("#transactionForm"),
  amountInput: document.querySelector("#amountInput"),
  categoryInput: document.querySelector("#categoryInput"),
  dateInput: document.querySelector("#dateInput"),
  noteInput: document.querySelector("#noteInput"),
  voiceButton: document.querySelector("#voiceButton"),
  voiceHint: document.querySelector("#voiceHint"),
  aiSheet: document.querySelector("#aiSheet"),
  aiPlanMessage: document.querySelector("#aiPlanMessage"),
  aiSteps: document.querySelector("#aiSteps"),
  aiQuestion: document.querySelector("#aiQuestion"),
  aiInsight: document.querySelector("#aiInsight"),
  monthlySaving: document.querySelector("#monthlySaving"),
  yearlySaving: document.querySelector("#yearlySaving"),
  installButton: document.querySelector("#installButton"),
  toast: document.querySelector("#toast"),
};

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function seedTransactions() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();
  const atDay = (daysAgo) => localDate(new Date(y, m, Math.max(1, day - daysAgo)));
  return [
    { id: crypto.randomUUID(), type: "income", amount: 1450, category: "Plata", note: "Mjesečna plata", date: atDay(20) },
    { id: crypto.randomUUID(), type: "expense", amount: 400, category: "Računi", note: "Kirija", date: atDay(19) },
    { id: crypto.randomUUID(), type: "expense", amount: 70, category: "Restorani", note: "Večera", date: atDay(16) },
    { id: crypto.randomUUID(), type: "expense", amount: 85, category: "Hrana", note: "Sedmična kupovina", date: atDay(13) },
    { id: crypto.randomUUID(), type: "expense", amount: 58, category: "Restorani", note: "Ručak", date: atDay(10) },
    { id: crypto.randomUUID(), type: "expense", amount: 60, category: "Računi", note: "Internet i telefon", date: atDay(8) },
    { id: crypto.randomUUID(), type: "expense", amount: 48, category: "Prevoz", note: "Gorivo", date: atDay(6) },
    { id: crypto.randomUUID(), type: "expense", amount: 45, category: "Restorani", note: "Ručak sa ekipom", date: atDay(5) },
    { id: crypto.randomUUID(), type: "expense", amount: 62, category: "Hrana", note: "Market", date: atDay(4) },
    { id: crypto.randomUUID(), type: "expense", amount: 30, category: "Kupovina", note: "Sitnice za kuću", date: atDay(3) },
    { id: crypto.randomUUID(), type: "expense", amount: 37, category: "Restorani", note: "Kafa i doručak", date: atDay(1) },
    { id: crypto.randomUUID(), type: "expense", amount: 25, category: "Prevoz", note: "Taksi", date: atDay(0) },
  ];
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (error) {
    console.warn("Sačuvani podaci nijesu dostupni.", error);
  }
  const seeded = seedTransactions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function inCurrentPeriod(transaction, period = state.period) {
  const now = new Date();
  const date = new Date(`${transaction.date}T12:00:00`);
  if (period === "day") return localDate(date) === localDate(now);
  if (period === "week") return date >= startOfWeek(now) && date <= now;
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
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
  const now = new Date();
  const month = new Intl.DateTimeFormat("sr-Latn-ME", { month: "long", year: "numeric" }).format(now).toUpperCase();
  if (state.period === "day") return { label: "DANAS", context: "današnjih prihoda" };
  if (state.period === "week") return { label: "OVA NEĐELJA", context: "prihoda ove neđelje" };
  return { label: month, context: "prihoda ovog mjeseca" };
}

function renderDashboard() {
  const filtered = state.transactions.filter(inCurrentPeriod);
  const summary = totals(filtered);
  const balance = summary.income - summary.expense;
  const copy = periodCopy();
  elements.dateLabel.textContent = copy.label;
  elements.balanceValue.textContent = formatMoney(balance);
  elements.balanceContext.textContent = `od ${formatMoney(summary.income)} ${copy.context}`;
  elements.incomeValue.textContent = signedMoney(summary.income, "income");
  elements.expenseValue.textContent = signedMoney(summary.expense, "expense");
  const used = summary.income ? Math.min(100, (summary.expense / summary.income) * 100) : 0;
  elements.budgetProgress.style.width = `${used}%`;
  elements.budgetProgress.style.background = used > 85 ? "#f3342f" : used > 65 ? "#f3c75f" : "#63d39d";
  renderWeekChart();
  renderCategories(filtered, summary.expense);
  renderTransactions(filtered);
  renderAiInsight();
  applyPrivacy();
}

function renderWeekChart() {
  const now = new Date();
  const labels = ["NED", "PON", "UTO", "SRI", "ČET", "PET", "SUB"];
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = localDate(date);
    const spent = state.transactions
      .filter((item) => item.type === "expense" && item.date === key)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    days.push({ key, label: labels[date.getDay()], spent, today: i === 0 });
  }
  const currentSpent = days.reduce((sum, day) => sum + day.spent, 0);
  const previousStart = new Date(now);
  previousStart.setDate(now.getDate() - 13);
  previousStart.setHours(0, 0, 0, 0);
  const previousEnd = new Date(now);
  previousEnd.setDate(now.getDate() - 7);
  previousEnd.setHours(23, 59, 59, 999);
  const previousSpent = state.transactions
    .filter((item) => {
      const date = new Date(`${item.date}T12:00:00`);
      return item.type === "expense" && date >= previousStart && date <= previousEnd;
    })
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const max = Math.max(...days.map((day) => day.spent), 1);
  elements.weekSpent.textContent = formatMoney(currentSpent);
  elements.barChart.innerHTML = days.map((day) => `
    <div class="bar-column ${day.today ? "today" : ""}" title="${escapeHtml(day.label)}: ${formatMoney(day.spent)}">
      <i style="height:${Math.max(4, (day.spent / max) * 105)}px"></i>
      <span>${day.label}</span>
    </div>
  `).join("");
  if (!previousSpent) {
    elements.trendPill.innerHTML = `NOVA <span>neđelja</span>`;
    elements.trendPill.classList.remove("up");
  } else {
    const difference = Math.round(((currentSpent - previousSpent) / previousSpent) * 100);
    elements.trendPill.innerHTML = `${difference > 0 ? "+" : ""}${difference}% <span>vs. prije</span>`;
    elements.trendPill.classList.toggle("up", difference > 0);
  }
}

function renderCategories(transactions, totalExpense) {
  const categories = transactions
    .filter((item) => item.type === "expense")
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + Number(item.amount);
      return result;
    }, {});
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!sorted.length) {
    elements.categoryList.innerHTML = `<div class="empty-state">Još nema troškova za ovaj period.</div>`;
    return;
  }
  elements.categoryList.innerHTML = sorted.map(([category, amount]) => {
    const meta = categoryMeta[category] || categoryMeta.Ostalo;
    const percent = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;
    return `
      <article class="category-item">
        <div class="category-icon" style="color:${meta.color}">${meta.icon}</div>
        <div class="category-copy"><strong>${escapeHtml(category)}</strong><span>${percent}% svih troškova</span></div>
        <div class="category-amount"><strong class="private-value">${formatMoney(amount)}</strong><span>${percent}%</span></div>
      </article>
    `;
  }).join("");
}

function renderTransactions(transactions) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  if (!sorted.length) {
    elements.transactionList.innerHTML = `<div class="empty-state">Nema unosa. Dodaj prvi preko crvenog + dugmeta.</div>`;
    return;
  }
  elements.transactionList.innerHTML = sorted.map((item) => {
    const meta = categoryMeta[item.category] || categoryMeta.Ostalo;
    const date = new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "short" }).format(new Date(`${item.date}T12:00:00`));
    return `
      <article class="transaction-item">
        <div class="transaction-icon" style="color:${meta.color}">${meta.icon}</div>
        <div class="transaction-copy"><strong>${escapeHtml(item.note || item.category)}</strong><span>${escapeHtml(item.category)} · ${date}</span></div>
        <div class="transaction-amount private-value ${item.type}">${signedMoney(item.amount, item.type)}</div>
      </article>
    `;
  }).join("");
}

function monthlyRestaurantSpend() {
  return state.transactions
    .filter((item) => item.type === "expense" && item.category === "Restorani" && inCurrentPeriod(item, "month"))
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function renderAiInsight() {
  const restaurantSpend = monthlyRestaurantSpend();
  const restaurantLimit = 120;
  const saving = Math.max(0, restaurantSpend - restaurantLimit);
  const yearly = saving * 12;
  if (saving > 0) {
    elements.aiInsight.textContent = `Ovog mjeseca si potrošio ${formatMoney(restaurantSpend)} na restorane. Ako potrošnju ograničiš na ${formatMoney(restaurantLimit, true)}, možeš uštedjeti:`;
  } else {
    elements.aiInsight.textContent = `Potrošnja na restorane je trenutno unutar predloženog limita od ${formatMoney(restaurantLimit, true)}. Nastavi ovim tempom.`;
  }
  elements.monthlySaving.textContent = formatMoney(saving, true);
  elements.yearlySaving.textContent = formatMoney(yearly, true);
}

function buildAiPlan(customAnswer = "") {
  const spend = monthlyRestaurantSpend();
  const saving = Math.max(0, spend - 120);
  const annual = saving * 12;
  const summary = totals(state.transactions.filter((item) => inCurrentPeriod(item, "month")));
  elements.aiPlanMessage.textContent = customAnswer || (saving
    ? `Najlakša prilika je kategorija Restorani. Sa limita od 120 € zadržavaš isti stil života, a oslobađaš oko ${formatMoney(saving, true)} mjesečno i ${formatMoney(annual, true)} godišnje.`
    : `Trenutno si u okviru predloženog limita za restorane. Sljedeći plan mogu napraviti kada dodamo još tvojih stvarnih troškova.`);
  elements.aiSteps.innerHTML = `
    <div class="ai-step"><span class="ai-step-index">01</span><div><strong>Limit za restorane</strong><small>Prati se automatski svakog mjeseca</small></div><span class="ai-step-amount">120 €</span></div>
    <div class="ai-step"><span class="ai-step-index">02</span><div><strong>Nedjeljni okvir</strong><small>Podijeljeno na četiri realne cjeline</small></div><span class="ai-step-amount">30 €</span></div>
    <div class="ai-step"><span class="ai-step-index">03</span><div><strong>Trenutno preostalo</strong><small>Prihodi minus evidentirani troškovi</small></div><span class="ai-step-amount">${formatMoney(summary.income - summary.expense, true)}</span></div>
  `;
}

function openTransactionSheet() {
  elements.dateInput.value = localDate();
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
  state.transactions.push({
    id: crypto.randomUUID(),
    type: formData.get("type"),
    amount,
    category: formData.get("category"),
    date: formData.get("date"),
    note: String(formData.get("note") || "").trim(),
  });
  saveTransactions();
  elements.transactionForm.reset();
  elements.transactionSheet.close();
  renderDashboard();
  showToast("Transakcija je sačuvana.");
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

function answerAiQuestion() {
  const question = elements.aiQuestion.value.trim().toLocaleLowerCase("sr");
  if (!question) return;
  const monthTransactions = state.transactions.filter((item) => inCurrentPeriod(item, "month"));
  const summary = totals(monthTransactions);
  const restaurants = monthlyRestaurantSpend();
  const saving = Math.max(0, restaurants - 120);
  let answer;
  if (question.includes("restoran") || question.includes("ručak") || question.includes("rucak")) {
    answer = `Na restorane si ovog mjeseca potrošio ${formatMoney(restaurants)}. Predloženi limit je 120 €, pa je moguća mjesečna ušteda ${formatMoney(saving)}.`;
  } else if (question.includes("ušted") || question.includes("usted")) {
    answer = `Prema trenutnim unosima, samo smanjenjem restorana možeš sačuvati ${formatMoney(saving)} mjesečno, odnosno ${formatMoney(saving * 12)} godišnje.`;
  } else if (question.includes("ostalo") || question.includes("preostalo") || question.includes("imam")) {
    answer = `Ovog mjeseca ti je nakon evidentiranih troškova preostalo ${formatMoney(summary.income - summary.expense)}.`;
  } else {
    answer = `Za ovaj mjesec vidim ${formatMoney(summary.income)} prihoda i ${formatMoney(summary.expense)} troškova. Pitaj me koliko ti je ostalo, koliko trošiš na restorane ili koliko možeš uštedjeti.`;
  }
  buildAiPlan(answer);
  elements.aiQuestion.value = "";
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

document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    state.period = button.dataset.period;
    document.querySelectorAll("[data-period]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderDashboard();
  });
});

document.querySelector("#privacyToggle").addEventListener("click", () => {
  state.private = !state.private;
  applyPrivacy();
});

document.querySelector("#addButton").addEventListener("click", openTransactionSheet);
elements.transactionForm.addEventListener("submit", handleTransactionSubmit);
elements.voiceButton.addEventListener("click", startVoiceInput);

document.querySelector("#openAiButton").addEventListener("click", () => {
  buildAiPlan();
  elements.aiSheet.showModal();
});
document.querySelector("#closeAiButton").addEventListener("click", () => elements.aiSheet.close());
document.querySelector("#askAiButton").addEventListener("click", answerAiQuestion);
elements.aiQuestion.addEventListener("keydown", (event) => {
  if (event.key === "Enter") answerAiQuestion();
});

document.querySelector("[data-action='all-transactions']").addEventListener("click", () => {
  document.querySelector(".transactions-section").scrollIntoView({ behavior: "smooth" });
});

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-nav]").forEach((item) => item.classList.toggle("active", item === button));
    if (button.dataset.nav === "home") window.scrollTo({ top: 0, behavior: "smooth" });
    if (button.dataset.nav === "transactions") document.querySelector(".transactions-section").scrollIntoView({ behavior: "smooth" });
    if (button.dataset.nav === "plan") {
      buildAiPlan();
      elements.aiSheet.showModal();
    }
    if (button.dataset.nav === "more") showToast("Podešavanja i izvoz podataka dolaze u sljedećoj verziji.");
  });
});

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

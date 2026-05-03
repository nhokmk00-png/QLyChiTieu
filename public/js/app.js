const CATEGORIES = [
  { name: "Ăn uống", icon: "🍜", color: "#0e8f7d" },
  { name: "Di chuyển", icon: "🚌", color: "#3765d8" },
  { name: "Mua sắm", icon: "🛍️", color: "#f2754b" },
  { name: "Học tập", icon: "📚", color: "#855ac7" },
  { name: "Giải trí", icon: "🎬", color: "#d94f8c" },
  { name: "Hóa đơn", icon: "🧾", color: "#b66a00" },
  { name: "Sức khỏe", icon: "💊", color: "#1a9cb0" },
  { name: "Khác", icon: "✨", color: "#687686" },
];

class Expense {
  constructor({ id, amount, category, date, note = "", method = "" }) {
    this.id = id || Expense.createId();
    this.amount = Number(amount);
    this.category = category;
    this.date = date;
    this.note = note.trim();
    this.method = method;
  }

  static createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

class ExpenseStore {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.keys = {
      expenses: "qlct.expenses",
      profile: "qlct.profile",
      settings: "qlct.settings",
      onboarded: "qlct.onboarded",
    };
    this.ensureSeedData();
  }

  ensureSeedData() {
    if (!this.storage.getItem(this.keys.expenses)) {
      const today = new Date();
      const localDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const dateOffset = (days) => {
        const d = new Date(today);
        d.setDate(today.getDate() - days);
        return localDateKey(d);
      };
      this.saveExpenses([
        new Expense({ amount: 30000, category: "Ăn uống", date: dateOffset(0), note: "Ăn sáng" }),
        new Expense({ amount: 45000, category: "Di chuyển", date: dateOffset(1), note: "Grab đi học" }),
        new Expense({ amount: 120000, category: "Học tập", date: dateOffset(2), note: "Mua sách" }),
        new Expense({ amount: 90000, category: "Giải trí", date: dateOffset(3), note: "Xem phim" }),
        new Expense({ amount: 100000, category: "Hóa đơn", date: dateOffset(4), note: "Tiền điện thoại" }),
      ]);
    }

    if (!this.storage.getItem(this.keys.profile)) {
      this.saveProfile({
        name: "Người dùng demo",
        email: "demo@chitieu.vn",
        monthlyBudget: 3000000,
        savingGoal: 500000,
      });
    }

    if (!this.storage.getItem(this.keys.settings)) {
      this.saveSettings({
        notifications: true,
        theme: "light",
        language: "vi",
      });
    }
  }

  getExpenses() {
    return JSON.parse(this.storage.getItem(this.keys.expenses) || "[]")
      .map((expense) => new Expense(expense))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveExpenses(expenses) {
    this.storage.setItem(this.keys.expenses, JSON.stringify(expenses));
  }

  addExpense(expense) {
    const expenses = [new Expense(expense), ...this.getExpenses()];
    this.saveExpenses(expenses);
  }

  updateExpense(id, nextExpense) {
    const expenses = this.getExpenses().map((expense) =>
      expense.id === id ? new Expense({ ...expense, ...nextExpense, id }) : expense
    );
    this.saveExpenses(expenses);
  }

  deleteExpense(id) {
    this.saveExpenses(this.getExpenses().filter((expense) => expense.id !== id));
  }

  clearExpenses() {
    this.saveExpenses([]);
  }

  resetDemoData() {
    this.storage.removeItem(this.keys.expenses);
    this.ensureSeedData();
  }

  getProfile() {
    return JSON.parse(this.storage.getItem(this.keys.profile));
  }

  saveProfile(profile) {
    this.storage.setItem(this.keys.profile, JSON.stringify({
      name: profile.name || "Người dùng",
      email: profile.email || "",
      monthlyBudget: Number(profile.monthlyBudget) || 0,
      savingGoal: Number(profile.savingGoal) || 0,
    }));
  }

  getSettings() {
    return JSON.parse(this.storage.getItem(this.keys.settings));
  }

  saveSettings(settings) {
    this.storage.setItem(this.keys.settings, JSON.stringify(settings));
  }

  setOnboarded(value) {
    this.storage.setItem(this.keys.onboarded, value ? "true" : "false");
  }

  isOnboarded() {
    return this.storage.getItem(this.keys.onboarded) === "true";
  }
}

class FinanceSummary {
  constructor(expenses, profile) {
    this.expenses = expenses;
    this.profile = profile;
  }

  get currentMonthKey() {
    return new Date().toISOString().slice(0, 7);
  }

  monthExpenses(monthKey = this.currentMonthKey) {
    return this.expenses.filter((expense) => expense.date.slice(0, 7) === monthKey);
  }

  total(expenses = this.expenses) {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  }

  totalThisMonth() {
    return this.total(this.monthExpenses());
  }

  remainingBudget() {
    return Number(this.profile.monthlyBudget) - this.totalThisMonth();
  }

  categoryTotals(expenses = this.expenses) {
    return CATEGORIES.map((category) => ({
      ...category,
      total: this.total(expenses.filter((expense) => expense.category === category.name)),
    })).filter((item) => item.total > 0);
  }

  topCategory(expenses = this.expenses) {
    return this.categoryTotals(expenses).sort((a, b) => b.total - a.total)[0] || null;
  }
}

class ExpenseApp {
  constructor(root, store) {
    this.root = root;
    this.toast = document.querySelector("#toast");
    this.modalRoot = document.querySelector("#modal-root");
    this.store = store;
    this.state = {
      screen: store.isOnboarded() ? "home" : "start",
      editingId: null,
      reportFilter: "month",
      customStart: "",
      customEnd: "",
      listSearch: "",
      listCategory: "Tất cả",
      listMonth: "",
    };
    this.applyTheme();
    this.render();
  }

  get expenses() {
    return this.store.getExpenses();
  }

  get profile() {
    return this.store.getProfile();
  }

  get settings() {
    return this.store.getSettings();
  }

  setScreen(screen, extra = {}) {
    this.state = { ...this.state, screen, ...extra };
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(dateString) {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
      new Date(`${dateString}T00:00:00`)
    );
  }

  localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  categoryMeta(categoryName) {
    return CATEGORIES.find((category) => category.name === categoryName) || CATEGORIES.at(-1);
  }

  applyTheme() {
    document.documentElement.dataset.theme = this.settings.theme;
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.remove("show"), 2400);
  }

  render() {
    const screens = {
      start: () => this.renderStart(),
      home: () => this.renderHome(),
      add: () => this.renderExpenseForm(),
      reports: () => this.renderReports(),
      list: () => this.renderExpenseList(),
      profile: () => this.renderProfile(),
      settings: () => this.renderSettings(),
    };

    this.root.innerHTML = screens[this.state.screen]();
    this.bindEvents();

    if (this.state.screen === "reports") {
      requestAnimationFrame(() => this.drawReportCharts());
    }
  }

  renderStart() {
    return `
      <main class="start-screen">
        <section class="start-panel">
          <div class="brand-mark">₫</div>
          <h1>Quản lý chi tiêu</h1>
          <p>Theo dõi chi tiêu, kiểm soát ngân sách dễ dàng</p>
          <div class="field">
            <label for="start-email">Email</label>
            <input id="start-email" type="email" placeholder="email@example.com" autocomplete="email" />
          </div>
          <div class="hero-actions">
            <button class="button primary" data-action="start">Bắt đầu</button>
            <button class="button secondary" data-action="demo">Bỏ qua đăng nhập và vào demo</button>
          </div>
        </section>
      </main>
    `;
  }

  renderHome() {
    const summary = new FinanceSummary(this.expenses, this.profile);
    const totalMonth = summary.totalThisMonth();
    const remaining = summary.remainingBudget();
    const isOverBudget = remaining < 0;
    const budget = Number(this.profile.monthlyBudget) || 1;
    const progress = Math.min(100, Math.max(0, (totalMonth / budget) * 100));
    const recent = this.expenses.slice(0, 5);

    return `
      <main class="screen with-nav">
        <div class="top-bar">
          <div>
            <p class="eyebrow">Xin chào, ${this.escapeHtml(this.profile.name)}</p>
            <h1>Hôm nay mình tiêu thế nào?</h1>
          </div>
          <button class="button primary desktop-add" data-screen="add">+ Thêm khoản chi</button>
        </div>

        <section class="summary-grid" aria-label="Tổng quan tài chính">
          <article class="summary-card emphasis">
            <div class="label"><span class="small-icon">₫</span>Tổng chi trong tháng</div>
            <p class="value">${this.formatCurrency(totalMonth)}</p>
            <div class="progress" aria-label="Đã dùng ${Math.round(progress)}% ngân sách">
              <span style="width:${progress}%"></span>
            </div>
            <p class="hint">Đã dùng ${Math.round(progress)}% ngân sách tháng</p>
          </article>
          <article class="summary-card ${isOverBudget ? "alert" : ""}">
            <div class="label"><span class="small-icon">${isOverBudget ? "!" : "✓"}</span>Ngân sách còn lại</div>
            <p class="value">${this.formatCurrency(remaining)}</p>
            <p class="hint">${isOverBudget ? "Bạn đã vượt ngân sách. Hãy giảm bớt các khoản không cần thiết." : "Vẫn trong mức kiểm soát."}</p>
          </article>
          <article class="summary-card">
            <div class="label"><span class="small-icon">◆</span>Mục tiêu tiết kiệm</div>
            <p class="value">${this.formatCurrency(this.profile.savingGoal)}</p>
            <p class="hint">${remaining >= this.profile.savingGoal ? "Bạn đang đi đúng hướng." : "Cần giữ lại thêm để đạt mục tiêu."}</p>
          </article>
        </section>

        <div class="home-layout">
          <section class="panel">
            <div class="panel-header">
              <h2>Khoản chi gần đây</h2>
              <button class="text-button small" data-screen="list">Xem tất cả</button>
            </div>
            <div class="recent-list">
              ${recent.length ? recent.map((expense) => this.expenseRow(expense)).join("") : this.emptyState("Chưa có khoản chi nào.")}
            </div>
          </section>

          <section class="quick-grid" aria-label="Lối tắt">
            ${this.quickLink("reports", "📊", "Báo cáo", "Xem xu hướng chi tiêu")}
            ${this.quickLink("list", "🧾", "Danh sách", "Tìm và chỉnh sửa khoản chi")}
            ${this.quickLink("profile", "👤", "Hồ sơ", "Ngân sách và mục tiêu")}
            ${this.quickLink("settings", "⚙️", "Cài đặt", "Giao diện và dữ liệu")}
          </section>
        </div>

        <button class="fab" aria-label="Thêm khoản chi" data-screen="add">+</button>
        ${this.renderBottomNav("home")}
      </main>
    `;
  }

  quickLink(screen, icon, title, desc) {
    return `
      <button class="quick-link" data-screen="${screen}">
        <span class="small-icon">${icon}</span>
        <strong>${title}</strong>
        <span>${desc}</span>
      </button>
    `;
  }

  expenseRow(expense, withActions = false) {
    const category = this.categoryMeta(expense.category);
    const note = expense.note || expense.category;
    return `
      <article class="expense-row" data-expense-id="${expense.id}">
        <span class="cat-icon" style="background:${this.hexToSoft(category.color)}">${category.icon}</span>
        <div class="expense-main">
          <strong>${this.escapeHtml(note)}</strong>
          <span>${expense.category} · ${this.formatDate(expense.date)}${expense.method ? ` · ${this.escapeHtml(expense.method)}` : ""}</span>
        </div>
        ${withActions ? `
          <div class="row-actions">
            <button class="icon-button small" title="Sửa" aria-label="Sửa khoản chi" data-action="edit-expense" data-id="${expense.id}">✎</button>
            <button class="icon-button small" title="Xóa" aria-label="Xóa khoản chi" data-action="confirm-delete" data-id="${expense.id}">×</button>
          </div>
        ` : `<strong class="expense-amount">-${this.formatCurrency(expense.amount)}</strong>`}
      </article>
    `;
  }

  renderExpenseForm() {
    const editing = this.expenses.find((expense) => expense.id === this.state.editingId);
    const today = this.localDateKey();
    const values = editing || { amount: "", category: "", date: today, note: "", method: "" };

    return `
      <main class="screen with-nav">
        <div class="top-bar">
          <button class="icon-button" aria-label="Quay lại" data-screen="${editing ? "list" : "home"}">←</button>
          <h1 class="compact-title">${editing ? "Sửa khoản chi" : "Thêm khoản chi"}</h1>
          <span></span>
        </div>

        <section class="panel form-card">
          <div class="field">
            <label for="amount">Số tiền</label>
            <input id="amount" name="amount" type="number" min="0" inputmode="numeric" placeholder="Ví dụ: 50000" value="${values.amount}" />
            <span class="error" data-error-for="amount"></span>
          </div>

          <div class="field">
            <label>Danh mục chi tiêu</label>
            <div class="category-grid">
              ${CATEGORIES.map((category) => `
                <label class="category-choice ${values.category === category.name ? "selected" : ""}">
                  <input type="radio" name="category" value="${category.name}" ${values.category === category.name ? "checked" : ""} />
                  <span class="cat-icon" style="background:${this.hexToSoft(category.color)}">${category.icon}</span>
                  <span>${category.name}</span>
                </label>
              `).join("")}
            </div>
            <span class="error" data-error-for="category"></span>
          </div>

          <div class="field">
            <label for="date">Ngày chi tiêu</label>
            <input id="date" name="date" type="date" value="${values.date}" />
          </div>

          <div class="field">
            <label for="note">Ghi chú</label>
            <textarea id="note" name="note" placeholder="Ví dụ: cà phê với bạn bè">${this.escapeHtml(values.note || "")}</textarea>
          </div>

          <div class="field">
            <label for="method">Phương thức thanh toán</label>
            <select id="method" name="method">
              ${["", "Tiền mặt", "Thẻ ngân hàng", "Ví điện tử", "Chuyển khoản"].map((method) => `
                <option value="${method}" ${values.method === method ? "selected" : ""}>${method || "Không chọn"}</option>
              `).join("")}
            </select>
          </div>

          <div class="form-actions">
            <button class="button primary" data-action="save-expense">${editing ? "Lưu thay đổi" : "Lưu khoản chi"}</button>
            <button class="button secondary" data-screen="${editing ? "list" : "home"}">Hủy</button>
          </div>
        </section>

        ${this.renderBottomNav("add")}
      </main>
    `;
  }

  renderReports() {
    const expenses = this.filteredReportExpenses();
    const summary = new FinanceSummary(this.expenses, this.profile);
    const reportSummary = new FinanceSummary(expenses, this.profile);
    const todayKey = this.localDateKey();
    const todayTotal = summary.total(this.expenses.filter((expense) => expense.date === todayKey));
    const monthTotal = summary.totalThisMonth();
    const topCategory = reportSummary.topCategory(expenses);

    return `
      <main class="screen with-nav">
        <div class="top-bar">
          <div>
            <p class="eyebrow">Báo cáo</p>
            <h1>Nhìn nhanh thói quen chi tiêu</h1>
          </div>
          <button class="button primary desktop-add" data-screen="add">+ Thêm khoản chi</button>
        </div>

        <section class="panel filters">
          <div class="segmented">
            ${[
              ["today", "Hôm nay"],
              ["week", "Tuần này"],
              ["month", "Tháng này"],
              ["custom", "Tùy chọn"],
            ].map(([key, label]) => `<button class="segment ${this.state.reportFilter === key ? "active" : ""}" data-report-filter="${key}">${label}</button>`).join("")}
          </div>
          ${this.state.reportFilter === "custom" ? `
            <div class="custom-range">
              <div class="field">
                <label for="custom-start">Từ ngày</label>
                <input id="custom-start" type="date" value="${this.state.customStart}" />
              </div>
              <div class="field">
                <label for="custom-end">Đến ngày</label>
                <input id="custom-end" type="date" value="${this.state.customEnd}" />
              </div>
            </div>
          ` : ""}
        </section>

        <section class="summary-grid">
          <article class="summary-card">
            <div class="label"><span class="small-icon">○</span>Tổng chi hôm nay</div>
            <p class="value">${this.formatCurrency(todayTotal)}</p>
            <p class="hint">Theo ngày hiện tại</p>
          </article>
          <article class="summary-card emphasis">
            <div class="label"><span class="small-icon">◇</span>Tổng chi tháng này</div>
            <p class="value">${this.formatCurrency(monthTotal)}</p>
            <p class="hint">So với ngân sách ${this.formatCurrency(this.profile.monthlyBudget)}</p>
          </article>
          <article class="summary-card">
            <div class="label"><span class="small-icon">★</span>Chi nhiều nhất</div>
            <p class="value">${topCategory ? topCategory.name : "Chưa có"}</p>
            <p class="hint">${topCategory ? this.formatCurrency(topCategory.total) : "Thêm khoản chi để xem thống kê."}</p>
          </article>
        </section>

        <section class="report-grid">
          <article class="panel chart-card">
            <div class="panel-header">
              <h2>Tỷ lệ theo danh mục</h2>
            </div>
            <canvas id="pie-chart" width="420" height="260" aria-label="Biểu đồ tròn theo danh mục"></canvas>
          </article>
          <article class="panel chart-card">
            <div class="panel-header">
              <h2>Chi tiêu theo thời gian</h2>
            </div>
            <canvas id="bar-chart" width="420" height="260" aria-label="Biểu đồ cột theo thời gian"></canvas>
          </article>
        </section>

        <article class="insight-card">
          <span class="small-icon">i</span>
          <div>
            <strong>Nhận xét nhanh</strong>
            <span>${topCategory ? `Bạn đang chi nhiều nhất cho ${topCategory.name}. Hãy xem các khoản nhỏ lặp lại để tiết kiệm dễ hơn.` : "Chưa có đủ dữ liệu để đưa ra gợi ý."}</span>
          </div>
        </article>

        <button class="fab" aria-label="Thêm khoản chi" data-screen="add">+</button>
        ${this.renderBottomNav("reports")}
      </main>
    `;
  }

  renderExpenseList() {
    const filtered = this.filteredListExpenses();

    return `
      <main class="screen with-nav">
        <div class="top-bar">
          <div>
            <p class="eyebrow">Danh sách</p>
            <h1>Toàn bộ khoản chi</h1>
          </div>
          <button class="button primary desktop-add" data-screen="add">+ Thêm khoản chi</button>
        </div>

        <section class="panel toolbar">
          <div class="toolbar-row">
            <div class="field">
              <label for="search">Tìm kiếm</label>
              <input id="search" type="search" placeholder="Nhập ghi chú hoặc danh mục" value="${this.escapeHtml(this.state.listSearch)}" />
            </div>
            <div class="field">
              <label for="category-filter">Danh mục</label>
              <select id="category-filter">
                ${["Tất cả", ...CATEGORIES.map((category) => category.name)].map((category) => `
                  <option value="${category}" ${this.state.listCategory === category ? "selected" : ""}>${category}</option>
                `).join("")}
              </select>
            </div>
            <div class="field">
              <label for="month-filter">Tháng</label>
              <input id="month-filter" type="month" value="${this.state.listMonth}" />
            </div>
          </div>
        </section>

        <section class="expense-list">
          ${filtered.length ? filtered.map((expense) => `
            <article class="expense-row" data-expense-id="${expense.id}">
              <span class="cat-icon" style="background:${this.hexToSoft(this.categoryMeta(expense.category).color)}">${this.categoryMeta(expense.category).icon}</span>
              <div class="expense-main">
                <strong>${this.escapeHtml(expense.note || expense.category)}</strong>
                <span>${expense.category} · ${this.formatDate(expense.date)}${expense.method ? ` · ${this.escapeHtml(expense.method)}` : ""}</span>
                <span class="expense-amount">-${this.formatCurrency(expense.amount)}</span>
              </div>
              <div class="row-actions">
                <button class="icon-button small" title="Sửa" aria-label="Sửa khoản chi" data-action="edit-expense" data-id="${expense.id}">✎</button>
                <button class="icon-button small" title="Xóa" aria-label="Xóa khoản chi" data-action="confirm-delete" data-id="${expense.id}">×</button>
              </div>
            </article>
          `).join("") : this.emptyState("Không tìm thấy khoản chi phù hợp.")}
        </section>

        <button class="fab" aria-label="Thêm khoản chi" data-screen="add">+</button>
        ${this.renderBottomNav("list")}
      </main>
    `;
  }

  renderProfile() {
    const totalExpenses = this.expenses.length;
    const summary = new FinanceSummary(this.expenses, this.profile);

    return `
      <main class="screen with-nav">
        <div class="top-bar">
          <div>
            <p class="eyebrow">Hồ sơ</p>
            <h1>Thông tin cá nhân</h1>
          </div>
        </div>

        <section class="profile-grid">
          <article class="panel">
            <div class="stat-line">
              <span>Tổng khoản chi đã ghi nhận</span>
              <strong>${totalExpenses}</strong>
            </div>
            <div class="stat-line">
              <span>Tổng chi tháng này</span>
              <strong>${this.formatCurrency(summary.totalThisMonth())}</strong>
            </div>
            <div class="stat-line">
              <span>Ngân sách còn lại</span>
              <strong>${this.formatCurrency(summary.remainingBudget())}</strong>
            </div>
          </article>

          <article class="panel form-card">
            <div class="field">
              <label for="profile-name">Tên người dùng</label>
              <input id="profile-name" value="${this.escapeHtml(this.profile.name)}" />
            </div>
            <div class="field">
              <label for="profile-email">Email</label>
              <input id="profile-email" type="email" value="${this.escapeHtml(this.profile.email)}" />
            </div>
            <div class="field">
              <label for="profile-budget">Ngân sách tháng</label>
              <input id="profile-budget" type="number" min="0" value="${this.profile.monthlyBudget}" />
            </div>
            <div class="field">
              <label for="profile-saving">Mục tiêu tiết kiệm</label>
              <input id="profile-saving" type="number" min="0" value="${this.profile.savingGoal}" />
            </div>
            <button class="button primary" data-action="save-profile">Lưu hồ sơ</button>
          </article>
        </section>

        ${this.renderBottomNav("profile")}
      </main>
    `;
  }

  renderSettings() {
    return `
      <main class="screen with-nav">
        <div class="top-bar">
          <div>
            <p class="eyebrow">Cài đặt</p>
            <h1>Tùy chỉnh ứng dụng</h1>
          </div>
        </div>

        <section class="screen">
          <article class="setting-row">
            <div>
              <strong>Nhắc nhập chi tiêu</strong>
              <span>Bật để nhận nhắc nhở trong ứng dụng demo</span>
            </div>
            <label class="switch">
              <input id="toggle-notifications" type="checkbox" ${this.settings.notifications ? "checked" : ""} />
              <span class="slider"></span>
            </label>
          </article>

          <article class="setting-row">
            <div>
              <strong>Giao diện tối</strong>
              <span>Đổi màu nền để dùng dễ hơn vào buổi tối</span>
            </div>
            <label class="switch">
              <input id="toggle-theme" type="checkbox" ${this.settings.theme === "dark" ? "checked" : ""} />
              <span class="slider"></span>
            </label>
          </article>

          <article class="setting-row">
            <div>
              <strong>Ngôn ngữ</strong>
              <span>Ứng dụng demo ưu tiên tiếng Việt</span>
            </div>
            <select id="language-select">
              <option value="vi" ${this.settings.language === "vi" ? "selected" : ""}>Tiếng Việt</option>
              <option value="en" ${this.settings.language === "en" ? "selected" : ""}>English</option>
            </select>
          </article>

          <button class="danger-button" data-action="clear-demo">Xóa dữ liệu demo</button>
          <button class="button secondary" data-action="restore-demo">Khôi phục dữ liệu mẫu</button>
          <button class="button ghost" data-action="logout">Đăng xuất</button>
        </section>

        ${this.renderBottomNav("settings")}
      </main>
    `;
  }

  renderBottomNav(active) {
    const items = [
      ["home", "⌂", "Trang chủ"],
      ["reports", "◔", "Báo cáo"],
      ["add", "+", "Thêm"],
      ["list", "☰", "Danh sách"],
      ["settings", "⚙", "Cài đặt"],
    ];
    return `
      <nav class="bottom-nav" aria-label="Điều hướng chính">
        ${items.map(([screen, icon, label]) => `
          <button class="nav-item ${active === screen ? "active" : ""}" data-screen="${screen}">
            <span class="nav-icon">${icon}</span>
            <span>${label}</span>
          </button>
        `).join("")}
      </nav>
    `;
  }

  bindEvents() {
    this.root.querySelectorAll("[data-screen]").forEach((button) => {
      button.addEventListener("click", () => this.setScreen(button.dataset.screen, { editingId: null }));
    });

    this.root.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => this.handleAction(button.dataset.action, button.dataset));
    });

    this.root.querySelectorAll("[data-report-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.state.reportFilter = button.dataset.reportFilter;
        this.render();
      });
    });

    this.root.querySelectorAll(".category-choice input").forEach((input) => {
      input.addEventListener("change", () => {
        this.root.querySelectorAll(".category-choice").forEach((label) => label.classList.remove("selected"));
        input.closest(".category-choice").classList.add("selected");
      });
    });

    const customStart = this.root.querySelector("#custom-start");
    const customEnd = this.root.querySelector("#custom-end");
    if (customStart) customStart.addEventListener("change", (event) => {
      this.state.customStart = event.target.value;
      this.render();
    });
    if (customEnd) customEnd.addEventListener("change", (event) => {
      this.state.customEnd = event.target.value;
      this.render();
    });

    const search = this.root.querySelector("#search");
    const categoryFilter = this.root.querySelector("#category-filter");
    const monthFilter = this.root.querySelector("#month-filter");
    if (search) search.addEventListener("input", (event) => {
      this.state.listSearch = event.target.value;
      this.render();
    });
    if (categoryFilter) categoryFilter.addEventListener("change", (event) => {
      this.state.listCategory = event.target.value;
      this.render();
    });
    if (monthFilter) monthFilter.addEventListener("change", (event) => {
      this.state.listMonth = event.target.value;
      this.render();
    });

    const notifications = this.root.querySelector("#toggle-notifications");
    if (notifications) notifications.addEventListener("change", (event) => {
      this.store.saveSettings({ ...this.settings, notifications: event.target.checked });
      this.showToast(event.target.checked ? "Đã bật nhắc nhập chi tiêu" : "Đã tắt nhắc nhập chi tiêu");
    });

    const theme = this.root.querySelector("#toggle-theme");
    if (theme) theme.addEventListener("change", (event) => {
      this.store.saveSettings({ ...this.settings, theme: event.target.checked ? "dark" : "light" });
      this.applyTheme();
      this.render();
    });

    const language = this.root.querySelector("#language-select");
    if (language) language.addEventListener("change", (event) => {
      this.store.saveSettings({ ...this.settings, language: event.target.value });
      this.showToast("Đã lưu lựa chọn ngôn ngữ");
    });
  }

  handleAction(action, dataset) {
    const actions = {
      start: () => this.startApp(false),
      demo: () => this.startApp(true),
      "save-expense": () => this.saveExpense(),
      "edit-expense": () => this.setScreen("add", { editingId: dataset.id }),
      "confirm-delete": () => this.confirmDelete(dataset.id),
      "save-profile": () => this.saveProfile(),
      "clear-demo": () => this.confirmClearData(),
      "restore-demo": () => {
        this.store.resetDemoData();
        this.showToast("Đã khôi phục dữ liệu mẫu");
        this.render();
      },
      logout: () => {
        this.store.setOnboarded(false);
        this.setScreen("start");
      },
    };
    actions[action]?.();
  }

  startApp(isDemo) {
    const email = this.root.querySelector("#start-email")?.value.trim();
    if (email && !isDemo) {
      this.store.saveProfile({ ...this.profile, email });
    }
    this.store.setOnboarded(true);
    this.setScreen("home");
    this.showToast(isDemo ? "Đã vào chế độ demo" : "Chào mừng bạn đến với Quản lý chi tiêu");
  }

  saveExpense() {
    const amountInput = this.root.querySelector("#amount");
    const categoryInput = this.root.querySelector("input[name='category']:checked");
    const dateInput = this.root.querySelector("#date");
    const noteInput = this.root.querySelector("#note");
    const methodInput = this.root.querySelector("#method");
    const amount = Number(amountInput.value);
    let isValid = true;

    this.setFieldError("amount", "");
    this.setFieldError("category", "");

    if (!amountInput.value || amount <= 0) {
      this.setFieldError("amount", "Vui lòng nhập số tiền lớn hơn 0.");
      isValid = false;
    }

    if (!categoryInput) {
      this.setFieldError("category", "Vui lòng chọn một danh mục chi tiêu.");
      isValid = false;
    }

    if (!isValid) return;

    const payload = {
      amount,
      category: categoryInput.value,
      date: dateInput.value || this.localDateKey(),
      note: noteInput.value,
      method: methodInput.value,
    };

    if (this.state.editingId) {
      this.store.updateExpense(this.state.editingId, payload);
      this.showToast("Đã cập nhật khoản chi thành công");
      this.setScreen("list", { editingId: null });
      return;
    }

    this.store.addExpense(payload);
    this.showToast("Đã lưu khoản chi thành công");
    this.setScreen("home");
  }

  setFieldError(fieldName, message) {
    const error = this.root.querySelector(`[data-error-for="${fieldName}"]`);
    if (error) error.textContent = message;
  }

  saveProfile() {
    const profile = {
      name: this.root.querySelector("#profile-name").value.trim(),
      email: this.root.querySelector("#profile-email").value.trim(),
      monthlyBudget: Number(this.root.querySelector("#profile-budget").value),
      savingGoal: Number(this.root.querySelector("#profile-saving").value),
    };
    this.store.saveProfile(profile);
    this.showToast("Đã lưu hồ sơ");
    this.render();
  }

  confirmDelete(id) {
    this.showConfirm({
      title: "Xóa khoản chi?",
      message: "Khoản chi này sẽ bị xóa khỏi danh sách của bạn.",
      confirmLabel: "Xóa",
      onConfirm: () => {
        this.store.deleteExpense(id);
        this.showToast("Đã xóa khoản chi");
        this.render();
      },
    });
  }

  confirmClearData() {
    this.showConfirm({
      title: "Xóa toàn bộ dữ liệu demo?",
      message: "Danh sách khoản chi hiện tại sẽ được làm trống. Hồ sơ và cài đặt vẫn được giữ lại.",
      confirmLabel: "Xóa dữ liệu",
      onConfirm: () => {
        this.store.clearExpenses();
        this.showToast("Đã xóa dữ liệu demo");
        this.render();
      },
    });
  }

  showConfirm({ title, message, confirmLabel, onConfirm }) {
    this.modalRoot.innerHTML = `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="modal">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="modal-actions">
            <button class="button secondary" data-modal-cancel>Hủy</button>
            <button class="danger-button" data-modal-confirm>${confirmLabel}</button>
          </div>
        </section>
      </div>
    `;

    this.modalRoot.querySelector("[data-modal-cancel]").addEventListener("click", () => {
      this.modalRoot.innerHTML = "";
    });
    this.modalRoot.querySelector("[data-modal-confirm]").addEventListener("click", () => {
      this.modalRoot.innerHTML = "";
      onConfirm();
    });
  }

  filteredListExpenses() {
    const keyword = this.state.listSearch.trim().toLowerCase();
    return this.expenses.filter((expense) => {
      const matchesKeyword = !keyword || `${expense.note} ${expense.category} ${expense.method}`.toLowerCase().includes(keyword);
      const matchesCategory = this.state.listCategory === "Tất cả" || expense.category === this.state.listCategory;
      const matchesMonth = !this.state.listMonth || expense.date.slice(0, 7) === this.state.listMonth;
      return matchesKeyword && matchesCategory && matchesMonth;
    });
  }

  filteredReportExpenses() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const todayKey = this.localDateKey(today);

    return this.expenses.filter((expense) => {
      const expenseDate = new Date(`${expense.date}T00:00:00`);
      if (this.state.reportFilter === "today") return expense.date === todayKey;
      if (this.state.reportFilter === "week") return expenseDate >= startOfWeek;
      if (this.state.reportFilter === "custom") {
        const start = this.state.customStart ? new Date(`${this.state.customStart}T00:00:00`) : null;
        const end = this.state.customEnd ? new Date(`${this.state.customEnd}T23:59:59`) : null;
        return (!start || expenseDate >= start) && (!end || expenseDate <= end);
      }
      return expense.date.slice(0, 7) === todayKey.slice(0, 7);
    });
  }

  drawReportCharts() {
    const expenses = this.filteredReportExpenses();
    const summary = new FinanceSummary(expenses, this.profile);
    this.drawPieChart(document.querySelector("#pie-chart"), summary.categoryTotals(expenses));
    this.drawBarChart(document.querySelector("#bar-chart"), expenses);
  }

  drawPieChart(canvas, items) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!items.length) {
      this.drawEmptyChart(ctx, width, height, "Chưa có dữ liệu");
      return;
    }

    const total = items.reduce((sum, item) => sum + item.total, 0);
    const radius = 78;
    const cx = 118;
    const cy = 126;
    let startAngle = -Math.PI / 2;

    items.forEach((item) => {
      const slice = (item.total / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      startAngle += slice;
    });

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
    ctx.font = "700 14px system-ui";
    ctx.fillText("Tổng", cx - 20, cy - 5);
    ctx.font = "800 17px system-ui";
    ctx.fillText(this.compactMoney(total), cx - 35, cy + 18);

    const legendX = 230;
    items.slice(0, 6).forEach((item, index) => {
      const y = 48 + index * 31;
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, y - 10, 14, 14);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
      ctx.font = "700 13px system-ui";
      ctx.fillText(item.name, legendX + 22, y);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted");
      ctx.font = "12px system-ui";
      ctx.fillText(this.compactMoney(item.total), legendX + 22, y + 16);
    });
  }

  drawBarChart(canvas, expenses) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!expenses.length) {
      this.drawEmptyChart(ctx, width, height, "Chưa có dữ liệu");
      return;
    }

    const grouped = expenses.reduce((acc, expense) => {
      acc[expense.date] = (acc[expense.date] || 0) + expense.amount;
      return acc;
    }, {});
    const entries = Object.entries(grouped).sort(([a], [b]) => new Date(a) - new Date(b)).slice(-8);
    const max = Math.max(...entries.map(([, total]) => total));
    const chartX = 38;
    const chartY = 22;
    const chartW = width - 58;
    const chartH = height - 70;
    const barGap = 10;
    const barW = Math.max(18, (chartW - barGap * (entries.length - 1)) / entries.length);

    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--border");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    entries.forEach(([date, total], index) => {
      const barH = Math.max(8, (total / max) * (chartH - 8));
      const x = chartX + index * (barW + barGap);
      const y = chartY + chartH - barH;
      const gradient = ctx.createLinearGradient(0, y, 0, chartY + chartH);
      gradient.addColorStop(0, "#0e8f7d");
      gradient.addColorStop(1, "#70d7c7");
      ctx.fillStyle = gradient;
      this.roundedRect(ctx, x, y, barW, barH, 6);
      ctx.fill();

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted");
      ctx.font = "11px system-ui";
      const label = new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      ctx.fillText(label, x - 1, chartY + chartH + 18);
    });

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
    ctx.font = "700 13px system-ui";
    ctx.fillText(`Cao nhất: ${this.compactMoney(max)}`, chartX, 18);
  }

  drawEmptyChart(ctx, width, height, message) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted");
    ctx.font = "700 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(message, width / 2, height / 2);
    ctx.textAlign = "left";
  }

  roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  compactMoney(value) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}tr`;
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return `${value}đ`;
  }

  hexToSoft(hex) {
    return `${hex}22`;
  }

  emptyState(message) {
    return `<div class="empty-state">${message}</div>`;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ExpenseApp(document.querySelector("#app"), new ExpenseStore());
});

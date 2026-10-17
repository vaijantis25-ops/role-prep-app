// dashboard.js
// Tracks practice sessions in the browser (localStorage) and draws the Dashboard tab:
// points, level, streaks, last-14-days activity, difficulty breakdown, recent sessions.
(function () {
  const KEY = 'rolePrepStats_v1';
  const POINTS = { easy: 10, medium: 20, hard: 30 };
  const NO_HINT_BONUS = 5;
  const LEVELS = [
    { name: 'Rookie', min: 0 },
    { name: 'Intern', min: 50 },
    { name: 'Pro', min: 150 },
    { name: 'Expert', min: 300 }
  ];

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.sessions)) return d;
    } catch (e) {}
    return { sessions: [] };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  let data = load();
  let current = null;

  function dayKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayNum(key) {
    const p = key.split('-').map(Number);
    return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function compute() {
    const done = data.sessions.filter(s => s.completed);
    const points = done.reduce((sum, s) => sum + (s.points || 0), 0);
    const days = Array.from(new Set(done.map(s => dayKey(s.completedAt || s.date)))).sort();
    const set = new Set(days.map(dayNum));
    let best = 0, run = 0, prev = null;
    days.forEach(k => {
      const num = dayNum(k);
      run = (prev !== null && num - prev === 1) ? run + 1 : 1;
      if (run > best) best = run;
      prev = num;
    });
    const todayN = dayNum(dayKey(Date.now()));
    let cursor = set.has(todayN) ? todayN : (set.has(todayN - 1) ? todayN - 1 : null);
    let cur = 0;
    while (cursor !== null && set.has(cursor)) { cur++; cursor--; }
    const byDiff = { easy: 0, medium: 0, hard: 0 };
    done.forEach(s => { if (byDiff[s.difficulty] !== undefined) byDiff[s.difficulty]++; });
    return { done, points, set, todayN, current: cur, best, byDiff };
  }

  function levelInfo(points) {
    let idx = 0;
    LEVELS.forEach((l, i) => { if (points >= l.min) idx = i; });
    const cur = LEVELS[idx], next = LEVELS[idx + 1] || null;
    const pct = next ? Math.round(((points - cur.min) / (next.min - cur.min)) * 100) : 100;
    return { cur, next, pct, toNext: next ? next.min - points : 0 };
  }

  function refreshHeader() {
    const el = document.getElementById('headerStats');
    if (!el) return;
    const c = compute();
    el.textContent = '🔥 ' + c.current + ' day streak · ' + c.points + ' pts';
  }

  // Called from script.js while the user practises
  window.Stats = {
    startSession(role, difficulty, total) {
      current = { id: Date.now(), role: role, difficulty: difficulty, total: total, done: 0, hints: [], completed: false, points: 0, date: Date.now() };
      data.sessions.push(current);
      if (data.sessions.length > 200) data.sessions = data.sessions.slice(-200);
      save();
    },
    updateProgress(done) {
      if (!current) return {};
      current.done = done;
      let reward = {};
      if (!current.completed && current.total > 0 && done === current.total) {
        const bonus = current.hints.length === 0 ? NO_HINT_BONUS : 0;
        current.completed = true;
        current.completedAt = Date.now();
        current.points = (POINTS[current.difficulty] || 10) + bonus;
        reward = { points: current.points, bonus: bonus > 0 };
      }
      save();
      refreshHeader();
      return reward;
    },
    hintOpened(i) {
      if (current && !current.hints.includes(i)) { current.hints.push(i); save(); }
    }
  };

  function renderDashboard() {
    const view = document.getElementById('dashboardView');
    const c = compute();
    const lv = levelInfo(c.points);
    const stat = (label, value) => '<div class="stat-card"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';

    let strip = '';
    for (let i = 13; i >= 0; i--) {
      const n = c.todayN - i;
      const label = new Date(n * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
      strip += '<div class="day-cell' + (c.set.has(n) ? ' on' : '') + (i === 0 ? ' today' : '') + '" title="' + label + '"></div>';
    }

    const maxD = Math.max(1, c.byDiff.easy, c.byDiff.medium, c.byDiff.hard);
    const diffRow = (k, label) => '<div class="diff-row"><span class="diff-name">' + label + '</span><div class="bar-track"><div class="bar-fill ' + k + '" style="width:' + (c.byDiff[k] / maxD * 100) + '%"></div></div><span class="diff-count">' + c.byDiff[k] + '</span></div>';

    const recent = data.sessions.slice(-8).reverse().map(s => {
      const when = new Date(s.completedAt || s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      const result = s.completed ? '+' + s.points + ' pts' : s.done + '/' + s.total + ' steps';
      return '<div class="recent-row"><div><div class="recent-role">' + esc(s.role) + '</div><div class="recent-meta">' + when + '</div></div>' +
        '<span class="difficulty-chip ' + esc(s.difficulty) + '">' + esc(s.difficulty) + '</span>' +
        '<span class="recent-result' + (s.completed ? ' ok' : '') + '">' + result + '</span></div>';
    }).join('');

    view.innerHTML =
      '<div class="dash-grid">' +
        stat('Total points', c.points) +
        stat('Current streak 🔥', c.current + (c.current === 1 ? ' day' : ' days')) +
        stat('Best streak', c.best + (c.best === 1 ? ' day' : ' days')) +
        stat('Tasks completed', c.done.length) +
      '</div>' +
      '<div class="card dash-card"><h3>Level</h3>' +
        '<div class="level-row"><span class="level-name">' + lv.cur.name + '</span><span class="stat-label">' + (lv.next ? lv.toNext + ' pts to ' + lv.next.name : 'Top level reached') + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + lv.pct + '%"></div></div></div>' +
      '<div class="card dash-card"><h3>Last 14 days</h3><div class="day-strip">' + strip + '</div>' +
        '<p class="stat-label">Green = at least one task completed that day. Finish a task every day to grow your streak.</p></div>' +
      '<div class="card dash-card"><h3>Completed by difficulty</h3>' + diffRow('easy', 'Easy') + diffRow('medium', 'Medium') + diffRow('hard', 'Hard') +
        '<p class="stat-label">Points: Easy 10, Medium 20, Hard 30, plus 5 bonus if you finish without opening any hint.</p></div>' +
      '<div class="card dash-card"><h3>Recent practice</h3>' + (recent || '<p class="empty">No practice yet. Generate a task in the Practice tab to get started.</p>') + '</div>' +
      '<button class="reset-btn" id="resetStats">Reset my stats</button>';

    document.getElementById('resetStats').addEventListener('click', () => {
      if (confirm('Delete all your saved practice stats? This cannot be undone.')) {
        data = { sessions: [] };
        current = null;
        save();
        refreshHeader();
        renderDashboard();
      }
    });
  }

  const tabP = document.getElementById('tabPractice');
  const tabD = document.getElementById('tabDashboard');
  const pv = document.getElementById('practiceView');
  const dv = document.getElementById('dashboardView');
  function show(which) {
    const dash = which === 'dashboard';
    pv.classList.toggle('hidden', dash);
    dv.classList.toggle('hidden', !dash);
    tabP.classList.toggle('active', !dash);
    tabD.classList.toggle('active', dash);
    if (dash) renderDashboard();
  }
  tabP.addEventListener('click', () => show('practice'));
  tabD.addEventListener('click', () => show('dashboard'));
  refreshHeader();
})();

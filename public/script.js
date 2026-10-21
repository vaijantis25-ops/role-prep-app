const roleInput = document.getElementById('roleInput');
const generateBtn = document.getElementById('generateBtn');
const statusEl = document.getElementById('status');
const workspace = document.getElementById('workspace');
const roleTitle = document.getElementById('roleTitle');
const overviewEl = document.getElementById('overview');
const taskEl = document.getElementById('task');
const dataTable = document.getElementById('dataTable');
const hintsList = document.getElementById('hintsList');
const hintsEmpty = document.getElementById('hintsEmpty');
const beginnerMode = document.getElementById('beginnerMode');
const walkthrough = document.getElementById('walkthrough');
const walkthroughToggle = document.getElementById('walkthroughToggle');
const walkthroughBody = document.getElementById('walkthroughBody');
const walkthroughChevron = document.getElementById('walkthroughChevron');
const stepsProgress = document.getElementById('stepsProgress');
const walkthroughProgressFill = document.getElementById('walkthroughProgressFill');
const celebration = document.getElementById('celebration');
const difficultyPicker = document.getElementById('difficultyPicker');
const difficultyChip = document.getElementById('difficultyChip');

let selectedDifficulty = 'easy';

difficultyPicker.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    difficultyPicker.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.difficulty;
  });
});

walkthroughToggle.addEventListener('click', () => {
  walkthrough.classList.toggle('open');
  walkthroughChevron.textContent = walkthrough.classList.contains('open') ? '−' : '+';
});

document.querySelectorAll('.examples button').forEach(btn => {
  btn.addEventListener('click', () => {
    roleInput.value = btn.dataset.role;
  });
});

generateBtn.addEventListener('click', generate);
roleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generate();
});

async function generate() {
  const role = roleInput.value.trim();
  if (!role) {
    statusEl.textContent = 'Type a role first.';
    return;
  }

  generateBtn.disabled = true;
  workspace.style.display = 'none';
  workspace.classList.remove('visible');
  statusEl.textContent = `Building a ${selectedDifficulty} practice task for "${role}"...`;

  try {
    // Calls OUR OWN backend (server.js), not Anthropic directly.
    // The backend holds the real API key so it never reaches the browser.
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, difficulty: selectedDifficulty })
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const parsed = await response.json();
    renderResult(role, parsed);
    statusEl.textContent = '';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Something went wrong generating this — try again.';
  } finally {
    generateBtn.disabled = false;
  }
}

function renderResult(role, data) {
  roleTitle.textContent = role;
  overviewEl.textContent = data.overview;
  taskEl.textContent = data.task;

  difficultyChip.textContent = selectedDifficulty;
  difficultyChip.className = `difficulty-chip ${selectedDifficulty}`;

  // Build walkthrough steps as a checklist
  walkthroughBody.innerHTML = '';
  const totalSteps = (data.steps || []).length;
  stepsProgress.textContent = `0/${totalSteps}`;
  walkthroughProgressFill.style.width = '0%';
  celebration.classList.remove('show');

  (data.steps || []).forEach((stepText, i) => {
    const row = document.createElement('div');
    row.className = 'step-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `step-${i}`;

    const label = document.createElement('label');
    label.htmlFor = `step-${i}`;
    label.textContent = stepText;

    checkbox.addEventListener('change', () => {
      row.classList.toggle('done', checkbox.checked);
      const doneCount = walkthroughBody.querySelectorAll('input[type="checkbox"]:checked').length;
      stepsProgress.textContent = `${doneCount}/${totalSteps}`;
      const pct = totalSteps ? (doneCount / totalSteps) * 100 : 0;
      walkthroughProgressFill.style.width = `${pct}%`;
      const allDone = totalSteps > 0 && doneCount === totalSteps;
      const reward = window.Stats ? Stats.updateProgress(doneCount) : {};
      if (allDone && reward.points) {
        celebration.textContent = `🎉 All steps done! +${reward.points} points` + (reward.bonus ? ' (includes +5 no-hint bonus)' : '');
      } else if (allDone) {
        celebration.textContent = '🎉 All steps done — nice work!';
      }
      celebration.classList.toggle('show', allDone);
    });

    row.appendChild(checkbox);
    row.appendChild(label);
    walkthroughBody.appendChild(row);
  });

  // Open the walkthrough by default only if "beginner mode" is checked
  if (beginnerMode.checked) {
    walkthrough.classList.add('open');
    walkthroughChevron.textContent = '−';
  } else {
    walkthrough.classList.remove('open');
    walkthroughChevron.textContent = '+';
  }

  // Build table
  dataTable.innerHTML = '';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  data.columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  dataTable.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.rows.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  dataTable.appendChild(tbody);

  // Build hints (progressive reveal, collapsed by default)
  hintsList.innerHTML = '';
  hintsEmpty.style.display = data.hints.length ? 'block' : 'none';
  data.hints.forEach((hintText, i) => {
    const hintDiv = document.createElement('div');
    hintDiv.className = 'hint';

    const toggle = document.createElement('button');
    toggle.className = 'hint-toggle';
    toggle.innerHTML = `<span>Hint ${i + 1}</span><span class="chevron">+</span>`;
    toggle.addEventListener('click', () => {
      hintDiv.classList.toggle('open');
      if (hintDiv.classList.contains('open') && window.Stats) Stats.hintOpened(i);
      toggle.querySelector('.chevron').textContent = hintDiv.classList.contains('open') ? '−' : '+';
    });

    const body = document.createElement('div');
    body.className = 'hint-body';
    body.textContent = hintText;

    hintDiv.appendChild(toggle);
    hintDiv.appendChild(body);
    hintsList.appendChild(hintDiv);
  });

  workspace.style.display = 'grid';
  workspace.classList.add('visible');
  if (window.Stats) Stats.startSession(role, selectedDifficulty, totalSteps);
}

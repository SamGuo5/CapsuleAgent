(() => {
  const state = {
    tasks: [],
    settings: { theme: 'light', compactMode: false, collapsedCompleted: false },
    filter: 'all',
    query: '',
    project: 'all',
    activeTag: '',
    activeDate: '',
    focusMode: false,
    groupByProject: false,
    commandQuery: '',
    editingId: null,
    draggingId: null,
    selectedId: null,
    selectedIds: [],
    lastSelectedId: null,
    stampIds: [],
    newTaskIds: []
  };

  const priorityMeta = {
    low: { label: '低', className: 'low' },
    medium: { label: '中', className: 'medium' },
    high: { label: '高', className: 'high' }
  };

  const repeatLabels = {
    none: '不重复',
    daily: '每天',
    weekly: '每周',
    monthly: '每月'
  };

  const reminderLabels = {
    0: '到期时',
    5: '提前 5 分钟',
    15: '提前 15 分钟',
    30: '提前 30 分钟',
    60: '提前 1 小时',
    1440: '提前 1 天'
  };

  const elements = {
    body: document.body,
    form: document.getElementById('task-form'),
    title: document.getElementById('task-title'),
    list: document.getElementById('task-list'),
    search: document.getElementById('search-input'),
    tabs: document.getElementById('filter-tabs'),
    bulkBar: document.getElementById('bulk-bar'),
    bulkCount: document.getElementById('bulk-count'),
    bulkProjectInput: document.getElementById('bulk-project-input'),
    bulkTagInput: document.getElementById('bulk-tag-input'),
    bulkComplete: document.getElementById('bulk-complete'),
    bulkPostpone: document.getElementById('bulk-postpone'),
    bulkMove: document.getElementById('bulk-move'),
    bulkTag: document.getElementById('bulk-tag'),
    bulkDelete: document.getElementById('bulk-delete'),
    bulkClear: document.getElementById('bulk-clear'),
    pending: document.getElementById('pending-count'),
    today: document.getElementById('today-count'),
    done: document.getElementById('done-count'),
    overdue: document.getElementById('overdue-count'),
    week: document.getElementById('week-count'),
    samguoCard: document.getElementById('samguo-card'),
    samguoTitle: document.getElementById('samguo-title'),
    samguoLine: document.getElementById('samguo-line'),
    samguoBadge: document.getElementById('samguo-badge'),
    timelineCount: document.getElementById('timeline-count'),
    timelineList: document.getElementById('timeline-list'),
    weekStrip: document.getElementById('week-strip'),
    doneTrend: document.getElementById('done-trend'),
    high: document.getElementById('high-count'),
    projectCount: document.getElementById('project-count'),
    tagCount: document.getElementById('tag-count'),
    nextCount: document.getElementById('next-count'),
    priorityList: document.getElementById('priority-list'),
    nextList: document.getElementById('next-list'),
    projectList: document.getElementById('project-list'),
    tagList: document.getElementById('tag-list'),
    projectRenameInput: document.getElementById('project-rename-input'),
    projectColorInput: document.getElementById('project-color-input'),
    projectRename: document.getElementById('project-rename'),
    projectColorSave: document.getElementById('project-color-save'),
    projectMoveInbox: document.getElementById('project-move-inbox'),
    dateLabel: document.getElementById('date-label'),
    focusLine: document.getElementById('focus-line'),
    themeToggle: document.getElementById('theme-toggle'),
    focusToggle: document.getElementById('focus-toggle'),
    groupToggle: document.getElementById('group-toggle'),
    compactToggle: document.getElementById('compact-toggle'),
    collapseDoneToggle: document.getElementById('collapse-done-toggle'),
    settingsOpen: document.getElementById('settings-open'),
    aboutOpen: document.getElementById('about-open'),
    settingsSummary: document.getElementById('settings-summary'),
    clearCompleted: document.getElementById('clear-completed'),
    exportData: document.getElementById('export-data'),
    importData: document.getElementById('import-data'),
    restoreBackup: document.getElementById('restore-backup'),
    editDialog: document.getElementById('edit-dialog'),
    editForm: document.getElementById('edit-form'),
    deleteEditing: document.getElementById('delete-editing'),
    closeEditing: document.getElementById('close-editing'),
    commandDialog: document.getElementById('command-dialog'),
    commandInput: document.getElementById('command-input'),
    commandResults: document.getElementById('command-results'),
    closeCommand: document.getElementById('close-command'),
    settingsDialog: document.getElementById('settings-dialog'),
    settingsForm: document.getElementById('settings-form'),
    settingsClose: document.getElementById('settings-close'),
    aboutDialog: document.getElementById('about-dialog'),
    aboutClose: document.getElementById('about-close'),
    aboutContent: document.getElementById('about-content'),
    openBackupDir: document.getElementById('open-backup-dir'),
    toast: document.getElementById('toast')
  };

  const startupSplash = document.getElementById('startup-splash');
  setTimeout(() => {
    startupSplash?.classList.add('done');
  }, 1800);

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const cleanTags = (value) => String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

  function isToday(value) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }

  function isUpcoming(value) {
    if (!value) return false;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return false;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return time >= now && time <= now + sevenDays;
  }

  function isWithinNextDays(value, days) {
    if (!value) return false;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return false;
    const now = Date.now();
    return time >= now && time <= now + days * 24 * 60 * 60 * 1000;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const time = new Date(task.dueDate).getTime();
    return !Number.isNaN(time) && time < Date.now();
  }

  function formatDueDate(value) {
    if (!value) return '无截止时间';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '无截止时间';
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function toLocalInputValue(date) {
    const offset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function toLocalDateKey(date) {
    const offset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  function getQuickDueDate(kind) {
    if (kind === 'clear') return '';
    const date = new Date();
    if (kind === 'today') {
      date.setHours(17, 0, 0, 0);
    }
    if (kind === 'tomorrow') {
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
    }
    if (kind === 'weekend') {
      const day = date.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntilSaturday);
      date.setHours(10, 0, 0, 0);
    }
    return toLocalInputValue(date);
  }

  function applySettings() {
    elements.body.dataset.theme = state.settings.theme || 'light';
    elements.body.classList.toggle('compact', Boolean(state.settings.compactMode));
    elements.body.classList.toggle('focus-mode', Boolean(state.focusMode));
    elements.focusToggle.classList.toggle('active', Boolean(state.focusMode));
    elements.groupToggle.classList.toggle('active', Boolean(state.groupByProject));
    elements.compactToggle.classList.toggle('active', Boolean(state.settings.compactMode));
    elements.collapseDoneToggle.classList.toggle('active', Boolean(state.settings.collapsedCompleted));
    elements.settingsSummary.textContent = `${state.settings.defaultProject || 'Inbox'}，${reminderLabels[state.settings.defaultReminderOffset] || '到期时'}提醒`;
  }

  function hasSelection(taskId) {
    return state.selectedIds.includes(taskId);
  }

  function syncBulkBar() {
    const count = state.selectedIds.length;
    elements.bulkBar.classList.toggle('visible', count > 0);
    elements.bulkCount.textContent = `已选 ${count} 项`;
  }

  function applyDefaultFields() {
    elements.form.querySelector('[name="project"]').value = state.settings.defaultProject || 'Inbox';
    elements.form.querySelector('[name="reminderOffset"]').value = String(state.settings.defaultReminderOffset || 0);
  }

  function applyDefaultFieldsIfIdle() {
    const title = elements.form.querySelector('[name="title"]').value.trim();
    const notes = elements.form.querySelector('[name="notes"]').value.trim();
    if (!title && !notes) applyDefaultFields();
  }

  function getProjects() {
    return [...new Set(state.tasks.map((task) => task.project || 'Inbox'))].sort((a, b) => a.localeCompare(b));
  }

  function getProjectColor(project) {
    const saved = state.settings.projectMeta?.[project]?.color;
    if (saved) return saved;
    const palette = ['#2563eb', '#15803d', '#b45309', '#be123c', '#7c3aed', '#0f766e', '#4f46e5'];
    let hash = 0;
    for (const character of String(project || 'Inbox')) hash = character.charCodeAt(0) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  function getTags() {
    const counts = new Map();
    state.tasks.forEach((task) => {
      (task.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function taskMatchesQuery(task, query) {
    if (!query) return true;
    const parts = query.split(/\s+/).filter(Boolean);
    const terms = [];
    for (const part of parts) {
      if (part.startsWith('#')) {
        const tag = part.slice(1).toLowerCase();
        if (!(task.tags || []).some((item) => item.toLowerCase().includes(tag))) return false;
        continue;
      }
      if (part.toLowerCase().startsWith('project:')) {
        const project = part.slice('project:'.length).toLowerCase();
        if (!String(task.project || '').toLowerCase().includes(project)) return false;
        continue;
      }
      if (part.toLowerCase().startsWith('priority:')) {
        const priority = part.slice('priority:'.length).toLowerCase();
        if (!String(task.priority || '').toLowerCase().startsWith(priority)) return false;
        continue;
      }
      terms.push(part.toLowerCase());
    }
    if (!terms.length) return true;
    return [
      task.title,
      task.notes,
      task.project,
      ...(task.tags || [])
    ].join(' ').toLowerCase().includes(terms.join(' '));
  }

  function getVisibleTasks() {
    const query = state.query.trim().toLowerCase();
    const tasks = state.tasks.filter((task) => {
      if (state.focusMode && !(task.pinned || task.priority === 'high' || isToday(task.dueDate) || isOverdue(task))) return false;
      if (state.project !== 'all' && task.project !== state.project) return false;
      if (state.activeTag && !(task.tags || []).includes(state.activeTag)) return false;
      if (state.activeDate && (!task.dueDate || task.dueDate.slice(0, 10) !== state.activeDate)) return false;
      if (state.filter === 'today' && !isToday(task.dueDate)) return false;
      if (state.filter === 'upcoming' && !isUpcoming(task.dueDate)) return false;
      if (state.filter === 'overdue' && !isOverdue(task)) return false;
      if (state.filter === 'done' && !task.completed) return false;
      if (!['all', 'done'].includes(state.filter) && task.completed) return false;
      if (state.settings.collapsedCompleted && state.filter === 'all' && task.completed) return false;
      return taskMatchesQuery(task, query);
    });

    const isDefaultTodayView = state.filter === 'all'
      && state.project === 'all'
      && !state.activeTag
      && !state.activeDate
      && !query;

    return isDefaultTodayView ? sortForTodayView(tasks) : tasks;
  }

  function sortForTodayView(tasks) {
    const score = (task) => {
      if (task.completed) return 90;
      if (isOverdue(task)) return 0;
      if (isToday(task.dueDate)) return 1;
      if (task.pinned) return 2;
      if (task.priority === 'high') return 3;
      if (isWithinNextDays(task.dueDate, 7)) return 4;
      return 5;
    };
    return [...tasks].sort((a, b) => {
      const byScore = score(a) - score(b);
      if (byScore !== 0) return byScore;
      return Number(a.order || 0) - Number(b.order || 0);
    });
  }

  function syncStats() {
    const pending = state.tasks.filter((task) => !task.completed).length;
    const today = state.tasks.filter((task) => !task.completed && isToday(task.dueDate)).length;
    const done = state.tasks.filter((task) => task.completed).length;
    const high = state.tasks.filter((task) => !task.completed && task.priority === 'high').length;
    const next = getNextTasks().length;
    const overdue = state.tasks.filter((task) => isOverdue(task)).length;
    const week = state.tasks.filter((task) => !task.completed && isWithinNextDays(task.dueDate, 7)).length;

    elements.pending.textContent = pending;
    elements.today.textContent = today;
    elements.done.textContent = done;
    elements.overdue.textContent = overdue;
    elements.week.textContent = week;
    elements.high.textContent = high;
    elements.nextCount.textContent = next;
    elements.tagCount.textContent = getTags().length;
    elements.projectCount.textContent = getProjects().length;
    elements.dateLabel.textContent = new Intl.DateTimeFormat('zh-CN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).format(new Date());

    if (pending === 0) {
      elements.focusLine.textContent = '所有未完成任务都处理好了。';
    } else if (today > 0) {
      elements.focusLine.textContent = `今天还有 ${today} 个任务需要关注。`;
    } else {
      elements.focusLine.textContent = `还有 ${pending} 个未完成任务，先推进最小的一步。`;
    }

    syncSamguoMood({ pending, today, done, overdue, high, week });
  }

  function syncSamguoMood(stats) {
    let mood = 'ready';
    let title = '今天也一起把事情变轻一点。';
    let line = '专属待办小搭子已上线。';
    let badge = '准备中';

    if (!state.tasks.length) {
      mood = 'hello';
      title = 'Samguo 已经铺好第一张便签。';
      line = '先写下一件最小的小事，我们慢慢来。';
      badge = '欢迎';
    } else if (stats.overdue > 0) {
      mood = 'alert';
      title = `有 ${stats.overdue} 件事在轻轻敲门。`;
      line = '先处理最急的一件，剩下的排队等一下。';
      badge = '提醒';
    } else if (stats.pending === 0) {
      mood = 'done';
      title = '今日胶囊已经收纳完成。';
      line = stats.done > 0 ? `已经完成 ${stats.done} 件，Samguo 给你盖章。` : '现在可以放心休息一下。';
      badge = '完成';
    } else if (stats.today > 0) {
      mood = 'focus';
      title = `今天还有 ${stats.today} 颗任务胶囊。`;
      line = stats.high > 0 ? `其中 ${stats.high} 件比较重要，先挑一件推进。` : '选一颗最顺手的开始就好。';
      badge = '专注';
    } else if (stats.week > 0) {
      mood = 'plan';
      title = `未来一周有 ${stats.week} 件事在排队。`;
      line = '节奏已经看得见了，今天可以轻一点。';
      badge = '计划';
    }

    elements.samguoCard.dataset.mood = mood;
    elements.samguoTitle.textContent = title;
    elements.samguoLine.textContent = line;
    elements.samguoBadge.textContent = badge;
  }

  function renderProjects() {
    const projects = getProjects();
    const allCount = state.tasks.length;
    const buttons = [
      `<button class="pill ${state.project === 'all' ? 'active' : ''}" type="button" data-project="all">全部 <span>${allCount}</span></button>`,
      ...projects.map((project) => {
        const count = state.tasks.filter((task) => task.project === project).length;
        return `<button class="pill ${state.project === project ? 'active' : ''}" type="button" data-project="${escapeHtml(project)}" style="--project-color:${escapeHtml(getProjectColor(project))}">${escapeHtml(project)} <span>${count}</span></button>`;
      })
    ];
    elements.projectList.innerHTML = buttons.join('');
  }

  function renderTags() {
    const tags = getTags();
    if (!tags.length) {
      elements.tagList.innerHTML = '<p class="empty-mini">还没有标签。</p>';
      return;
    }
    elements.tagList.innerHTML = [
      `<button class="pill ${state.activeTag === '' ? 'active' : ''}" type="button" data-tag="">全部 <span>${tags.length}</span></button>`,
      ...tags.map(([tag, count]) => `<button class="pill ${state.activeTag === tag ? 'active' : ''}" type="button" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)} <span>${count}</span></button>`)
    ].join('');
  }

  function renderPriorityList() {
    const tasks = state.tasks
      .filter((task) => !task.completed && task.priority === 'high')
      .slice(0, 4);

    if (!tasks.length) {
      elements.priorityList.innerHTML = '<p class="empty-mini">没有高优先级任务。</p>';
      return;
    }

    elements.priorityList.innerHTML = tasks.map((task) => `
      <button class="mini-item" type="button" data-id="${escapeHtml(task.id)}">
        <span>${escapeHtml(task.title)}</span>
        <small>${escapeHtml(task.project || 'Inbox')} - ${escapeHtml(formatDueDate(task.dueDate))}</small>
      </button>
    `).join('');
  }

  function getNextTasks() {
    return state.tasks
      .filter((task) => !task.completed)
      .filter((task) => task.pinned || task.priority === 'high' || isToday(task.dueDate) || isOverdue(task))
      .slice(0, 5);
  }

  function renderNextList() {
    const tasks = getNextTasks();
    if (!tasks.length) {
      elements.nextList.innerHTML = '<p class="empty-mini">暂时没有紧急任务。</p>';
      return;
    }

    elements.nextList.innerHTML = tasks.map((task) => `
      <button class="mini-item" type="button" data-id="${escapeHtml(task.id)}">
        <span>${escapeHtml(task.title)}</span>
        <small>${escapeHtml(task.project || 'Inbox')} - ${escapeHtml(formatDueDate(task.dueDate))}</small>
      </button>
    `).join('');
  }

  function renderTimeline() {
    const tasks = state.tasks
      .filter((task) => !task.completed && isToday(task.dueDate))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    elements.timelineCount.textContent = tasks.length;
    if (!tasks.length) {
      elements.timelineList.innerHTML = '<p class="empty-mini">今天没有安排具体时间的任务。</p>';
      return;
    }
    elements.timelineList.innerHTML = tasks.map((task) => `
      <button class="timeline-item" type="button" data-id="${escapeHtml(task.id)}">
        <time>${escapeHtml(formatDueDate(task.dueDate).split(',').at(-1)?.trim() || formatDueDate(task.dueDate))}</time>
        <span>${escapeHtml(task.title)}</span>
      </button>
    `).join('');
  }

  function renderWeekStrip() {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const tasks = state.tasks.filter((task) => !task.completed && task.dueDate && sameDay(new Date(task.dueDate), date));
      return { date, tasks };
    });
    elements.weekStrip.innerHTML = days.map(({ date, tasks }) => {
      const key = toLocalDateKey(date);
      return `
      <button class="day-chip ${state.activeDate === key ? 'active' : ''}" type="button" data-date="${key}">
        <span>${date.toLocaleDateString('zh-CN', { weekday: 'short' })}</span>
        <strong>${date.getDate()}</strong>
        <small>${tasks.length}</small>
      </button>
    `;
    }).join('');
  }

  function renderDoneTrend() {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const count = state.tasks.filter((task) => task.completedAt && sameDay(new Date(task.completedAt), date)).length;
      return { date, count };
    });
    const max = Math.max(1, ...days.map((day) => day.count));
    elements.doneTrend.innerHTML = days.map(({ date, count }) => `
      <div class="trend-bar" title="完成 ${count} 个">
        <span style="height:${Math.max(8, (count / max) * 48)}px"></span>
        <small>${date.toLocaleDateString('zh-CN', { weekday: 'narrow' })}</small>
      </div>
    `).join('');
  }

  function renderTasks() {
    const tasks = getVisibleTasks();
    if (!tasks.length) {
      const empty = getEmptyStateCopy();
      elements.list.innerHTML = `
        <div class="empty-state ${empty.starter ? 'starter' : ''}">
          <strong>${empty.title}</strong>
          <span>${empty.description}</span>
          ${empty.starter ? `
            <div class="starter-actions">
              <button type="button" data-sample-task="Plan tomorrow tomorrow #planning project:Life medium">规划明天</button>
              <button type="button" data-sample-task="Write weekly report today #work project:Office high">工作周报</button>
              <button type="button" data-sample-task="Review finances weekend #personal project:Life low">周末复盘</button>
            </div>
          ` : ''}
        </div>
      `;
      return;
    }

    if (state.groupByProject) {
      const groups = getProjects()
        .map((project) => ({ project, tasks: tasks.filter((task) => (task.project || 'Inbox') === project) }))
        .filter((group) => group.tasks.length);
      elements.list.innerHTML = groups.map((group) => `
        <section class="task-group">
          <div class="task-group-head">
            <h2>${escapeHtml(group.project)}</h2>
            <span>${group.tasks.length}</span>
          </div>
          <div class="task-group-list">
            ${group.tasks.map(renderTaskCard).join('')}
          </div>
        </section>
      `).join('');
      return;
    }

    elements.list.innerHTML = tasks.map(renderTaskCard).join('');
  }

  function getEmptyStateCopy() {
    if (!state.tasks.length) {
      return {
        starter: true,
        title: '从一个小胶囊开始。',
        description: '写下一件今天最小的事，Samguo 会帮你收好。'
      };
    }
    if (state.query.trim()) {
      return {
        starter: false,
        title: '没有找到这张便签。',
        description: '换个关键词，或者试试项目名、标签名。'
      };
    }
    if (state.filter === 'today' || state.activeDate) {
      return {
        starter: false,
        title: '今天暂时很轻。',
        description: '没有需要今天处理的任务，可以放心留一点空白。'
      };
    }
    if (state.filter === 'overdue') {
      return {
        starter: false,
        title: '没有逾期任务。',
        description: '这里很干净，节奏保持得不错。'
      };
    }
    if (state.filter === 'done') {
      return {
        starter: false,
        title: '还没有盖章记录。',
        description: '完成一件任务后，它会出现在这里。'
      };
    }
    if (state.project !== 'all') {
      return {
        starter: false,
        title: '这个项目暂时安静。',
        description: '可以添加一张新便签，或切回全部任务看看。'
      };
    }
    if (state.activeTag) {
      return {
        starter: false,
        title: '这个标签下还没有任务。',
        description: '换个标签，或者给新任务贴上这个标签。'
      };
    }
    return {
      starter: false,
      title: '这里很安静。',
      description: '添加任务，或调整当前筛选条件。'
    };
  }

  function renderTaskCard(task) {
      const priority = priorityMeta[task.priority] || priorityMeta.medium;
      const tags = (task.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
      const repeat = task.repeatRule && task.repeatRule !== 'none' ? `<span>${repeatLabels[task.repeatRule]}</span>` : '';
      return `
        <article class="task-card ${task.completed ? 'completed' : ''} ${state.stampIds.includes(task.id) ? 'just-completed' : ''} ${state.newTaskIds.includes(task.id) ? 'new-task' : ''} ${task.pinned ? 'pinned' : ''} ${state.selectedId === task.id ? 'selected' : ''} ${hasSelection(task.id) ? 'multi-selected' : ''}" data-id="${escapeHtml(task.id)}" draggable="true" style="--project-color:${escapeHtml(getProjectColor(task.project || 'Inbox'))}">
          <button class="check-button" type="button" data-action="toggle" title="切换完成状态">
            ${task.completed ? 'OK' : ''}
          </button>
          <div class="task-content">
            <div class="task-title-line">
              <h3>${escapeHtml(task.title)}</h3>
              <span class="priority ${priority.className}">${priority.label}</span>
              ${isOverdue(task) ? '<span class="overdue">逾期</span>' : ''}
            </div>
            ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}
            <div class="task-meta">
              <span>${escapeHtml(task.project || 'Inbox')}</span>
              <span>${escapeHtml(formatDueDate(task.dueDate))}</span>
              <span>${escapeHtml(reminderLabels[task.reminderOffset] || '到期时')}</span>
              ${repeat}
              ${task.pinned ? '<span>已置顶</span>' : ''}
            </div>
            ${tags ? `<div class="tag-list">${tags}</div>` : ''}
          </div>
          <div class="task-actions">
            <button type="button" data-action="postpone" title="延期一天">+1d</button>
            <button type="button" data-action="pin" title="置顶">${task.pinned ? '取消' : '置顶'}</button>
            <button type="button" data-action="duplicate" title="复制">复制</button>
            <button type="button" data-action="edit" title="编辑">编辑</button>
            <button type="button" data-action="delete" title="删除">删除</button>
          </div>
          ${task.completed ? '<span class="completion-stamp" aria-hidden="true">已收纳</span>' : ''}
        </article>
      `;
  }

  function removeContextMenu() {
    document.querySelector('.context-menu')?.remove();
  }

  function openTaskEditor(task) {
    state.editingId = task.id;
    fillEditForm(task);
    elements.editDialog.showModal();
  }

  let toastTimer;
  function showToast(message, action, duration = 2200) {
    clearTimeout(toastTimer);
    elements.toast.classList.remove('reminder-toast');
    elements.toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        clearTimeout(toastTimer);
        elements.toast.classList.remove('visible');
        action.run();
      }, { once: true });
      elements.toast.appendChild(button);
    }
    elements.toast.classList.add('visible');
    toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), duration);
  }

  function showReminderToast(task) {
    if (!task?.id) return;
    const dueText = formatDueDate(task.dueDate);
    clearTimeout(toastTimer);
    elements.toast.classList.add('reminder-toast');
    elements.toast.innerHTML = `
      <img src="assets/samguo-avatar.svg" alt="" />
      <span><strong>任务提醒</strong>${escapeHtml(task.title)} · ${escapeHtml(dueText)}</span>
    `;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '查看';
    button.addEventListener('click', () => {
      clearTimeout(toastTimer);
      elements.toast.classList.remove('visible', 'reminder-toast');
      focusTask(task.id);
    }, { once: true });
    elements.toast.appendChild(button);
    elements.toast.classList.add('visible');
    toastTimer = setTimeout(() => elements.toast.classList.remove('visible', 'reminder-toast'), 9000);
  }

  function showDeleteUndo(tasks) {
    const deleted = tasks.filter(Boolean);
    if (!deleted.length) return;
    showToast(deleted.length === 1 ? '任务已删除' : `已删除 ${deleted.length} 个任务`, {
      label: '撤销',
      run: async () => {
        const restored = await window.capsule.restoreDeletedTasks(deleted);
        showToast(restored ? '已撤销删除' : '没有可恢复的任务');
      }
    });
  }

  function cheerSamguo() {
    elements.samguoCard.classList.remove('celebrate');
    void elements.samguoCard.offsetWidth;
    elements.samguoCard.classList.add('celebrate');
    setTimeout(() => elements.samguoCard.classList.remove('celebrate'), 900);
  }

  function markTasksStamped(taskIds) {
    const ids = [...new Set(taskIds.filter(Boolean))];
    if (!ids.length) return;
    state.stampIds = [...new Set([...state.stampIds, ...ids])];
    cheerSamguo();
    setTimeout(() => {
      state.stampIds = state.stampIds.filter((id) => !ids.includes(id));
      renderTasks();
    }, 1200);
  }

  function markTaskDelivered(taskId) {
    if (!taskId) return;
    state.newTaskIds = [...new Set([...state.newTaskIds, taskId])];
    cheerSamguo();
    renderTasks();
    setTimeout(() => {
      state.newTaskIds = state.newTaskIds.filter((id) => id !== taskId);
      renderTasks();
    }, 900);
  }

  async function toggleTaskWithFeedback(task) {
    const willComplete = !task.completed;
    const repeats = task.repeatRule && task.repeatRule !== 'none' && task.dueDate;
    if (willComplete && !repeats) markTasksStamped([task.id]);
    await window.capsule.toggleTaskComplete(task.id);
    showToast(willComplete ? (repeats ? '重复任务已安排下一次' : 'Samguo 已盖章：已收纳') : '任务已重新打开');
  }

  function showContextMenu(task, x, y) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
      <button type="button" data-context-action="toggle">${task.completed ? '标为未完成' : '完成'}</button>
      <button type="button" data-context-action="postpone">延期 1 天</button>
      <button type="button" data-context-action="duplicate">复制</button>
      <button type="button" data-context-action="pin">${task.pinned ? '取消置顶' : '置顶'}</button>
      <button type="button" data-context-action="edit">编辑</button>
      <button type="button" data-context-action="delete" class="danger">删除</button>
    `;
    menu.addEventListener('click', async (event) => {
      const action = event.target.closest('button')?.dataset.contextAction;
      if (!action) return;
      removeContextMenu();
      if (action === 'toggle') await toggleTaskWithFeedback(task);
      if (action === 'postpone') await window.capsule.postponeTask(task.id, 1, 'day');
      if (action === 'duplicate') await window.capsule.duplicateTask(task.id);
      if (action === 'pin') await window.capsule.updateTask(task.id, { pinned: !task.pinned });
      if (action === 'edit') openTaskEditor(task);
      if (action === 'delete' && window.confirm(`删除「${task.title}」？`)) {
        await window.capsule.deleteTask(task.id);
        showDeleteUndo([task]);
      }
    });
    document.body.appendChild(menu);
  }

  function render() {
    applySettings();
    syncStats();
    renderProjects();
    renderTags();
    renderPriorityList();
    renderNextList();
    renderTimeline();
    renderWeekStrip();
    renderDoneTrend();
    renderTasks();
    syncBulkBar();
  }

  function getTaskPayload(form) {
    const formData = new FormData(form);
    return {
      title: String(formData.get('title') || '').trim(),
      notes: String(formData.get('notes') || '').trim(),
      dueDate: String(formData.get('dueDate') || ''),
      priority: String(formData.get('priority') || 'medium'),
      reminderOffset: Number(formData.get('reminderOffset') || 0),
      repeatRule: String(formData.get('repeatRule') || 'none'),
      project: String(formData.get('project') || 'Inbox').trim() || 'Inbox',
      tags: cleanTags(formData.get('tags'))
    };
  }

  function parseSmartTitle(rawTitle) {
    const tokens = rawTitle.split(/\s+/).filter(Boolean);
    const tags = [];
    let project = '';
    let priority = '';
    let dueDate = '';
    const titleParts = [];

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (lower.startsWith('#') && token.length > 1) {
        tags.push(token.slice(1));
        continue;
      }
      if (lower.startsWith('project:')) {
        project = token.slice('project:'.length) || project;
        continue;
      }
      if (lower.startsWith('p:')) {
        priority = lower.slice(2);
        continue;
      }
      if (['high', 'medium', 'low', '高', '中', '低'].includes(lower)) {
        priority = ({ 高: 'high', 中: 'medium', 低: 'low' }[lower]) || lower;
        continue;
      }
      const quickDue = {
        today: 'today',
        '今天': 'today',
        tomorrow: 'tomorrow',
        '明天': 'tomorrow',
        weekend: 'weekend',
        '周末': 'weekend'
      }[lower];
      if (quickDue) {
        dueDate = getQuickDueDate(quickDue);
        continue;
      }
      titleParts.push(token);
    }

    return {
      title: titleParts.join(' ').trim() || rawTitle.trim(),
      tags,
      project,
      priority,
      dueDate
    };
  }

  function enrichPayloadFromSmartInput(payload) {
    const parsed = parseSmartTitle(payload.title);
    return {
      ...payload,
      title: parsed.title,
      tags: [...new Set([...payload.tags, ...parsed.tags])],
      project: parsed.project || payload.project,
      priority: parsed.priority || payload.priority,
      dueDate: parsed.dueDate || payload.dueDate
    };
  }

  function fillEditForm(task) {
    elements.editForm.querySelector('[name="title"]').value = task.title || '';
    elements.editForm.querySelector('[name="notes"]').value = task.notes || '';
    elements.editForm.querySelector('[name="dueDate"]').value = task.dueDate || '';
    elements.editForm.querySelector('[name="priority"]').value = task.priority || 'medium';
    elements.editForm.querySelector('[name="reminderOffset"]').value = String(task.reminderOffset || 0);
    elements.editForm.querySelector('[name="repeatRule"]').value = task.repeatRule || 'none';
    elements.editForm.querySelector('[name="project"]').value = task.project || 'Inbox';
    elements.editForm.querySelector('[name="tags"]').value = (task.tags || []).join(', ');
  }

  async function handleTaskClick(event) {
    const action = event.target.closest('button')?.dataset.action;
    if (!action) return;
    const card = event.target.closest('.task-card');
    const task = state.tasks.find((item) => item.id === card?.dataset.id);
    if (!task) return;
    state.selectedId = task.id;

    if (action === 'toggle') {
      await toggleTaskWithFeedback(task);
    }
    if (action === 'pin') {
      await window.capsule.updateTask(task.id, { pinned: !task.pinned });
    }
    if (action === 'duplicate') {
      await window.capsule.duplicateTask(task.id);
      showToast('已复制任务');
    }
    if (action === 'postpone') {
      await window.capsule.postponeTask(task.id, 1, 'day');
      showToast('已延期一天');
    }
    if (action === 'edit') {
      openTaskEditor(task);
    }
    if (action === 'delete') {
      const confirmed = window.confirm(`删除「${task.title}」？`);
      if (confirmed) {
        await window.capsule.deleteTask(task.id);
        showDeleteUndo([task]);
      }
    }
  }

  function handleCardSelection(event) {
    const card = event.target.closest('.task-card');
    if (!card || event.target.closest('button')) return;
    const visibleIds = getVisibleTasks().map((task) => task.id);
    const id = card.dataset.id;
    if (event.shiftKey && state.lastSelectedId) {
      const start = visibleIds.indexOf(state.lastSelectedId);
      const end = visibleIds.indexOf(id);
      if (start >= 0 && end >= 0) {
        const range = visibleIds.slice(Math.min(start, end), Math.max(start, end) + 1);
        state.selectedIds = [...new Set([...state.selectedIds, ...range])];
      }
    } else if (event.ctrlKey || event.metaKey) {
      state.selectedIds = hasSelection(id)
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id];
      state.lastSelectedId = id;
    } else {
      state.selectedIds = [id];
      state.lastSelectedId = id;
    }
    state.selectedId = id;
    renderTasks();
    syncBulkBar();
  }

  function focusTask(taskId) {
    state.filter = 'all';
    state.query = '';
    state.project = 'all';
    state.selectedId = taskId;
    state.activeDate = '';
    elements.search.value = '';
    elements.tabs.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.filter === 'all');
    });
    render();
    const card = elements.list.querySelector(`[data-id="${CSS.escape(taskId)}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('spotlight');
    setTimeout(() => card.classList.remove('spotlight'), 1400);
  }

  async function reorderFromDom() {
    const visibleIds = [...elements.list.querySelectorAll('.task-card')].map((card) => card.dataset.id);
    const hiddenIds = state.tasks.map((task) => task.id).filter((id) => !visibleIds.includes(id));
    await window.capsule.reorderTasks([...visibleIds, ...hiddenIds]);
  }

  function handleDragStart(event) {
    const card = event.target.closest('.task-card');
    if (!card) return;
    state.draggingId = card.dataset.id;
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', state.draggingId);
  }

  function handleDragOver(event) {
    event.preventDefault();
    const dragging = elements.list.querySelector('.dragging');
    const target = event.target.closest('.task-card');
    if (!dragging || !target || dragging === target) return;
    const targetBox = target.getBoundingClientRect();
    const shouldPlaceAfter = event.clientY > targetBox.top + targetBox.height / 2;
    elements.list.insertBefore(dragging, shouldPlaceAfter ? target.nextSibling : target);
  }

  async function handleDragEnd(event) {
    const card = event.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    if (state.draggingId) await reorderFromDom();
    state.draggingId = null;
  }

  async function bootstrap() {
    const initialState = await window.capsule.getState();
    state.tasks = initialState.tasks || [];
    state.settings = initialState.settings || state.settings;
    render();
    applyDefaultFields();
  }

  function selectRelativeTask(direction) {
    const cards = [...elements.list.querySelectorAll('.task-card')];
    if (!cards.length) return;
    const currentIndex = Math.max(0, cards.findIndex((card) => card.dataset.id === state.selectedId));
    const nextIndex = Math.max(0, Math.min(cards.length - 1, currentIndex + direction));
    state.selectedId = cards[nextIndex].dataset.id;
    renderTasks();
    elements.list.querySelector(`[data-id="${CSS.escape(state.selectedId)}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  function getSelectedTask() {
    return state.tasks.find((task) => task.id === state.selectedId);
  }

  async function openAbout() {
    const info = await window.capsule.getAppInfo();
    elements.aboutContent.innerHTML = `
      <dl>
        <div><dt>版本</dt><dd>${escapeHtml(info.version)}</dd></div>
        <div><dt>数据位置</dt><dd>本机私有应用数据目录</dd></div>
        <div><dt>备份位置</dt><dd>本机自动备份目录</dd></div>
      </dl>
    `;
    elements.aboutDialog.showModal();
  }

  function getCommands() {
    const commands = [
      { label: '新建任务', detail: '聚焦到快速新增输入框', run: () => elements.title.focus() },
      { label: '切换主题', detail: '切换浅色或深色模式', run: () => elements.themeToggle.click() },
      { label: '切换专注模式', detail: '显示今天、逾期、置顶和高优先级任务', run: () => elements.focusToggle.click() },
      { label: '切换项目分组', detail: '按项目分组显示任务列表', run: () => elements.groupToggle.click() },
      { label: '打开设置', detail: '默认项目、提醒和开机启动', run: () => elements.settingsOpen.click() },
      { label: '打开关于', detail: '版本、数据路径和备份路径', run: () => elements.aboutOpen.click() },
      { label: '导出数据', detail: '将任务保存为 JSON', run: () => elements.exportData.click() },
      { label: '恢复备份', detail: '从备份 JSON 文件恢复', run: () => elements.restoreBackup.click() }
    ];

    const taskCommands = state.tasks.slice(0, 30).map((task) => ({
      label: task.title,
      detail: `${task.project || 'Inbox'} - ${formatDueDate(task.dueDate)}`,
      run: () => focusTask(task.id)
    }));

    return [...commands, ...taskCommands];
  }

  function renderCommandResults() {
    const query = state.commandQuery.trim().toLowerCase();
    const results = getCommands()
      .filter((command) => !query || `${command.label} ${command.detail}`.toLowerCase().includes(query))
      .slice(0, 12);

    if (!results.length) {
      elements.commandResults.innerHTML = '<p class="empty-mini">没有匹配结果。</p>';
      return;
    }

    elements.commandResults.innerHTML = results.map((command, index) => `
      <button type="button" data-command-index="${index}">
        <span>${escapeHtml(command.label)}</span>
        <small>${escapeHtml(command.detail)}</small>
      </button>
    `).join('');

    elements.commandResults.querySelectorAll('[data-command-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const command = results[Number(button.dataset.commandIndex)];
        elements.commandDialog.close();
        state.commandQuery = '';
        elements.commandInput.value = '';
        command?.run();
      });
    });
  }

  function runFirstCommand() {
    const first = elements.commandResults.querySelector('[data-command-index]');
    first?.click();
  }

  function openCommandPalette() {
    state.commandQuery = '';
    elements.commandInput.value = '';
    renderCommandResults();
    elements.commandDialog.showModal();
    setTimeout(() => elements.commandInput.focus(), 0);
  }

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = enrichPayloadFromSmartInput(getTaskPayload(elements.form));
    if (!payload.title) return;
    const task = await window.capsule.createTask(payload);
    markTaskDelivered(task?.id);
    showToast('新便签已投递');
    elements.form.reset();
    elements.form.querySelector('[name="priority"]').value = 'medium';
    elements.form.querySelector('[name="repeatRule"]').value = 'none';
    applyDefaultFields();
    elements.title.focus();
  });

  elements.form.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quick-due]');
    if (!button) return;
    elements.form.querySelector('[name="dueDate"]').value = getQuickDueDate(button.dataset.quickDue);
  });

  elements.editForm.addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit-quick-due]');
    if (!button) return;
    elements.editForm.querySelector('[name="dueDate"]').value = getQuickDueDate(button.dataset.editQuickDue);
  });

  elements.editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.editingId) return;
    const payload = getTaskPayload(elements.editForm);
    await window.capsule.updateTask(state.editingId, payload);
    showToast('任务已保存');
    elements.editDialog.close();
    state.editingId = null;
  });

  elements.deleteEditing.addEventListener('click', async () => {
    if (!state.editingId) return;
    const task = state.tasks.find((item) => item.id === state.editingId);
    const confirmed = window.confirm(`删除「${task?.title || '这个任务'}」？`);
    if (!confirmed) return;
    await window.capsule.deleteTask(state.editingId);
    showDeleteUndo(task ? [task] : []);
    elements.editDialog.close();
    state.editingId = null;
  });

  elements.closeEditing.addEventListener('click', () => {
    elements.editDialog.close();
    state.editingId = null;
  });

  elements.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
  });

  elements.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (!tab) return;
    state.filter = tab.dataset.filter;
    state.activeDate = '';
    elements.tabs.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
    renderTasks();
  });

  elements.projectList.addEventListener('click', (event) => {
    const pill = event.target.closest('.pill');
    if (!pill) return;
    state.project = pill.dataset.project;
    state.activeTag = '';
    const selectedProject = state.project === 'all' ? 'Inbox' : state.project;
    elements.projectRenameInput.value = state.project === 'all' ? '' : state.project;
    elements.projectColorInput.value = getProjectColor(selectedProject);
    render();
  });

  elements.tagList.addEventListener('click', (event) => {
    const pill = event.target.closest('.pill');
    if (!pill) return;
    state.activeTag = pill.dataset.tag || '';
    render();
  });

  elements.timelineList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-id]');
    if (item) focusTask(item.dataset.id);
  });

  elements.weekStrip.addEventListener('click', (event) => {
    const day = event.target.closest('[data-date]');
    if (!day) return;
    state.activeDate = state.activeDate === day.dataset.date ? '' : day.dataset.date;
    state.filter = 'all';
    elements.tabs.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.filter === 'all');
    });
    renderTasks();
  });

  elements.projectRename.addEventListener('click', async () => {
    if (state.project === 'all') return window.alert('请先选择一个项目。');
    const nextName = elements.projectRenameInput.value.trim();
    if (!nextName) return;
    await window.capsule.renameProject(state.project, nextName);
    state.project = nextName;
    showToast('项目已重命名');
  });

  elements.projectColorSave.addEventListener('click', async () => {
    const project = state.project === 'all' ? 'Inbox' : state.project;
    await window.capsule.setProjectColor(project, elements.projectColorInput.value);
    showToast('项目颜色已保存');
  });

  elements.projectMoveInbox.addEventListener('click', async () => {
    if (state.project === 'all' || state.project === 'Inbox') return window.alert('请先选择一个非 Inbox 项目。');
    const confirmed = window.confirm(`将「${state.project}」下的所有任务移回 Inbox？`);
    if (!confirmed) return;
    await window.capsule.moveProjectToInbox(state.project);
    state.project = 'Inbox';
    showToast('任务已移回 Inbox');
  });

  elements.priorityList.addEventListener('click', (event) => {
    const item = event.target.closest('.mini-item');
    if (item) focusTask(item.dataset.id);
  });

  elements.nextList.addEventListener('click', (event) => {
    const item = event.target.closest('.mini-item');
    if (item) focusTask(item.dataset.id);
  });

  elements.list.addEventListener('click', handleTaskClick);
  elements.list.addEventListener('click', async (event) => {
    const sample = event.target.closest('[data-sample-task]');
    if (!sample) return;
    const payload = enrichPayloadFromSmartInput({
      title: sample.dataset.sampleTask,
      notes: '',
      dueDate: '',
      priority: 'medium',
      reminderOffset: Number(state.settings.defaultReminderOffset || 0),
      repeatRule: 'none',
      project: state.settings.defaultProject || 'Inbox',
      tags: []
    });
    const task = await window.capsule.createTask(payload);
    markTaskDelivered(task?.id);
    showToast('示例便签已投递');
  });
  elements.list.addEventListener('click', handleCardSelection);
  elements.list.addEventListener('dblclick', (event) => {
    const card = event.target.closest('.task-card');
    const task = state.tasks.find((item) => item.id === card?.dataset.id);
    if (task) openTaskEditor(task);
  });
  elements.list.addEventListener('contextmenu', (event) => {
    const card = event.target.closest('.task-card');
    const task = state.tasks.find((item) => item.id === card?.dataset.id);
    if (!task) return;
    event.preventDefault();
    state.selectedId = task.id;
    renderTasks();
    showContextMenu(task, event.clientX, event.clientY);
  });
  elements.list.addEventListener('dragstart', handleDragStart);
  elements.list.addEventListener('dragover', handleDragOver);
  elements.list.addEventListener('dragend', handleDragEnd);

  elements.themeToggle.addEventListener('click', async () => {
    const theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    await window.capsule.updateSettings({ theme });
  });

  elements.settingsOpen.addEventListener('click', () => {
    elements.settingsForm.querySelector('[name="defaultProject"]').value = state.settings.defaultProject || 'Inbox';
    elements.settingsForm.querySelector('[name="defaultReminderOffset"]').value = String(state.settings.defaultReminderOffset || 0);
    elements.settingsForm.querySelector('[name="openAtLogin"]').checked = Boolean(state.settings.openAtLogin);
    elements.settingsDialog.showModal();
  });

  elements.settingsClose.addEventListener('click', () => {
    elements.settingsDialog.close();
  });

  elements.settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.settingsForm);
    await window.capsule.updateSettings({
      defaultProject: String(formData.get('defaultProject') || 'Inbox').trim() || 'Inbox',
      defaultReminderOffset: Number(formData.get('defaultReminderOffset') || 0),
      openAtLogin: Boolean(formData.get('openAtLogin'))
    });
    elements.settingsDialog.close();
  });

  elements.aboutOpen.addEventListener('click', openAbout);
  elements.aboutClose.addEventListener('click', () => elements.aboutDialog.close());
  elements.openBackupDir.addEventListener('click', async () => {
    await window.capsule.openBackupDir();
  });

  document.querySelectorAll('.side-section.collapsible .section-head').forEach((head) => {
    head.addEventListener('click', () => {
      head.closest('.side-section')?.classList.toggle('collapsed');
    });
  });

  elements.focusToggle.addEventListener('click', () => {
    state.focusMode = !state.focusMode;
    state.filter = state.focusMode ? 'all' : state.filter;
    render();
  });

  elements.groupToggle.addEventListener('click', () => {
    state.groupByProject = !state.groupByProject;
    render();
  });

  elements.compactToggle.addEventListener('click', async () => {
    await window.capsule.updateSettings({ compactMode: !state.settings.compactMode });
  });

  elements.collapseDoneToggle.addEventListener('click', async () => {
    await window.capsule.updateSettings({ collapsedCompleted: !state.settings.collapsedCompleted });
  });

  elements.clearCompleted.addEventListener('click', async () => {
    await window.capsule.clearCompleted();
  });

  elements.bulkClear.addEventListener('click', () => {
    state.selectedIds = [];
    state.lastSelectedId = null;
    renderTasks();
    syncBulkBar();
  });

  elements.bulkComplete.addEventListener('click', async () => {
    const tasksToStamp = state.tasks
      .filter((task) => state.selectedIds.includes(task.id) && !task.completed && !(task.repeatRule && task.repeatRule !== 'none' && task.dueDate))
      .map((task) => task.id);
    markTasksStamped(tasksToStamp);
    await window.capsule.bulkCompleteTasks(state.selectedIds);
    showToast('Samguo 已批量盖章');
  });

  elements.bulkPostpone.addEventListener('click', async () => {
    await window.capsule.bulkPostponeTasks(state.selectedIds, 1, 'day');
    showToast('选中任务已延期');
  });

  elements.bulkMove.addEventListener('click', async () => {
    const project = elements.bulkProjectInput.value.trim();
    if (!project) return;
    await window.capsule.bulkUpdateTasks(state.selectedIds, { project });
    elements.bulkProjectInput.value = '';
    showToast('选中任务已移动');
  });

  elements.bulkTag.addEventListener('click', async () => {
    const tag = elements.bulkTagInput.value.trim();
    if (!tag) return;
    await window.capsule.bulkAddTag(state.selectedIds, tag);
    elements.bulkTagInput.value = '';
    showToast('标签已添加');
  });

  elements.bulkDelete.addEventListener('click', async () => {
    if (!state.selectedIds.length) return;
    const confirmed = window.confirm(`删除选中的 ${state.selectedIds.length} 个任务？`);
    if (!confirmed) return;
    const deletedTasks = state.tasks.filter((task) => state.selectedIds.includes(task.id));
    await window.capsule.bulkDeleteTasks(state.selectedIds);
    state.selectedIds = [];
    state.lastSelectedId = null;
    showDeleteUndo(deletedTasks);
  });

  elements.exportData.addEventListener('click', async () => {
    const result = await window.capsule.exportData();
    if (result && !result.canceled) showToast('导出完成');
  });

  elements.importData.addEventListener('click', async () => {
    const result = await window.capsule.importData();
    if (result && !result.canceled) showToast(`已导入 ${result.count} 个任务`);
  });

  elements.restoreBackup.addEventListener('click', async () => {
    const result = await window.capsule.restoreBackup();
    if (result && !result.canceled) showToast(`已恢复 ${result.count} 个任务`);
  });

  elements.commandInput.addEventListener('input', (event) => {
    state.commandQuery = event.target.value;
    renderCommandResults();
  });

  elements.commandInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runFirstCommand();
    }
  });

  elements.closeCommand.addEventListener('click', () => {
    elements.commandDialog.close();
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.context-menu')) removeContextMenu();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      removeContextMenu();
      if (elements.commandDialog.open) {
        elements.commandDialog.close();
        state.commandQuery = '';
      }
      if (elements.editDialog.open) {
        elements.editDialog.close();
        state.editingId = null;
      }
      if (elements.settingsDialog.open) {
        elements.settingsDialog.close();
      }
      if (elements.aboutDialog.open) {
        elements.aboutDialog.close();
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && document.activeElement === elements.form.querySelector('[name="notes"]')) {
      elements.form.requestSubmit();
    }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectRelativeTask(1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectRelativeTask(-1);
    }
    if (event.key === 'Enter') {
      const task = getSelectedTask();
      if (task) openTaskEditor(task);
    }
    if (event.key.toLowerCase() === 'x') {
      const task = getSelectedTask();
      if (task) toggleTaskWithFeedback(task);
    }
    if (event.key.toLowerCase() === 'p') {
      const task = getSelectedTask();
      if (task) window.capsule.postponeTask(task.id, 1, 'day');
    }
  });

  window.capsule.onStateChanged((nextState) => {
    state.tasks = nextState.tasks || [];
    state.settings = nextState.settings || state.settings;
    const validIds = new Set(state.tasks.map((task) => task.id));
    state.selectedIds = state.selectedIds.filter((id) => validIds.has(id));
    state.stampIds = state.stampIds.filter((id) => validIds.has(id));
    state.newTaskIds = state.newTaskIds.filter((id) => validIds.has(id));
    render();
    applyDefaultFieldsIfIdle();
  });

  window.capsule.onTaskFocus(focusTask);
  window.capsule.onReminderDue((task) => {
    showReminderToast(task);
  });
  window.capsule.onQuickAddFocus(() => {
    elements.title.focus();
  });
  bootstrap();
})();

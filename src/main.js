const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, Notification, crashReporter, dialog, shell } = require('electron');
const StorePkg = require('electron-store');
const path = require('path');
const fs = require('fs');

crashReporter.start({ submitURL: '', uploadToServer: false });

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

const Store = StorePkg.default || StorePkg;
const defaultSettings = {
  theme: 'light',
  compactMode: false,
  collapsedCompleted: false,
  lastBackupDate: '',
  openAtLogin: false,
  defaultProject: 'Inbox',
  defaultReminderOffset: 0,
  projectMeta: {}
};

const store = new Store({
  name: 'capsule-tasks',
  defaults: {
    tasks: [],
    settings: defaultSettings
  }
});

let mainWindow;
let tray;
let reminderTimer;
let reminderSweepQueued = false;
const notifiedKeys = new Set();

const priorities = ['low', 'medium', 'high'];
const repeatRules = ['none', 'daily', 'weekly', 'monthly'];
const reminderOffsets = [0, 5, 15, 30, 60, 1440];
const isSmokeTest = process.argv.includes('--smoke-test');
const appId = 'com.capsule.tasks';
const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.ico')
  : path.join(__dirname, '..', 'icon.ico');
const trayIconPath = path.join(__dirname, 'tray-icon.png');

app.setAppUserModelId(appId);

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanTags(tags) {
  const source = Array.isArray(tags)
    ? tags
    : String(tags || '').split(',');

  return [...new Set(source
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 8))]
    .map((tag) => tag.slice(0, 24));
}

function normalizeTask(task, index = 0) {
  const now = new Date().toISOString();
  const completed = Boolean(task?.completed ?? task?.isCompleted);
  return {
    id: String(task?.id || createId()),
    title: String(task?.title || '').trim(),
    notes: String(task?.notes || task?.remark || '').trim(),
    dueDate: task?.dueDate || '',
    priority: priorities.includes(task?.priority) ? task.priority : 'medium',
    project: String(task?.project || 'Inbox').trim().slice(0, 32) || 'Inbox',
    tags: cleanTags(task?.tags),
    reminderOffset: reminderOffsets.includes(Number(task?.reminderOffset)) ? Number(task.reminderOffset) : 0,
    repeatRule: repeatRules.includes(task?.repeatRule) ? task.repeatRule : 'none',
    completed,
    pinned: Boolean(task?.pinned),
    order: Number.isFinite(Number(task?.order)) ? Number(task.order) : Date.now() + index,
    createdAt: task?.createdAt || now,
    updatedAt: task?.updatedAt || now,
    completedAt: completed ? (task?.completedAt || now) : ''
  };
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return Number(a.order) - Number(b.order);
  });
}

function getTasks() {
  return sortTasks((store.get('tasks') || [])
    .map(normalizeTask)
    .filter((task) => task.title));
}

function setTasks(tasks) {
  store.set('tasks', sortTasks(tasks.map(normalizeTask).filter((task) => task.title)));
  backupToday();
  updateTrayMenu();
  broadcastState();
  queueReminderSweep();
}

function getSettings() {
  return { ...defaultSettings, ...(store.get('settings') || {}) };
}

function getState() {
  return {
    tasks: getTasks(),
    settings: getSettings()
  };
}

function broadcastState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('state:changed', getState());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    useContentSize: true,
    title: 'Capsule Tasks',
    icon: appIconPath,
    backgroundColor: '#f6f3ee',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  const trayImage = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(trayImage.isEmpty() ? appIconPath : trayImage);
  tray.setToolTip('胶囊待办');
  updateTrayMenu();
  tray.on('double-click', showWindow);
}

function updateTrayMenu() {
  if (!tray) return;
  const tasks = getTasks();
  const openCount = tasks.filter((task) => !task.completed).length;
  const todayCount = tasks.filter((task) => !task.completed && isTaskToday(task)).length;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `未完成：${openCount} | 今日：${todayCount}`, enabled: false },
    { type: 'separator' },
    { label: '打开胶囊待办', click: showWindow },
    {
      label: '快速新增任务',
      click: () => {
        showWindow();
        mainWindow?.webContents.send('quick-add:focus');
      }
    },
    { label: '检查提醒', click: emitDueNotifications },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
}

function isTaskToday(task) {
  if (!task.dueDate) return false;
  const date = new Date(task.dueDate);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function getReminderTime(task) {
  if (!task.dueDate) return NaN;
  const dueTime = new Date(task.dueDate).getTime();
  if (Number.isNaN(dueTime)) return NaN;
  return dueTime - Number(task.reminderOffset || 0) * 60 * 1000;
}

function sendReminderToRenderer(task) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('reminder:due', {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    project: task.project,
    reminderOffset: task.reminderOffset
  });
  if (!mainWindow.isFocused()) mainWindow.flashFrame(true);
}

function showTrayReminder(task, offsetLabel) {
  if (!tray || typeof tray.displayBalloon !== 'function') return;
  try {
    tray.displayBalloon({
      title: offsetLabel,
      content: task.title,
      icon: appIconPath,
      noSound: false
    });
  } catch {
    // Some Windows notification settings disable tray balloons; the in-app reminder still works.
  }
}

function showSystemReminder(task, offsetLabel) {
  if (!Notification.isSupported()) {
    showTrayReminder(task, offsetLabel);
    return;
  }

  try {
    const notification = new Notification({
      title: offsetLabel,
      body: task.title,
      icon: appIconPath,
      silent: false,
      urgency: 'critical',
      actions: [{ type: 'button', text: '延后 10 分钟' }]
    });

    notification.on('click', () => {
      showWindow();
      mainWindow?.flashFrame(false);
      mainWindow?.webContents.send('task:focus', task.id);
    });
    notification.on('action', (_event, index) => {
      if (index === 0) postponeTaskById(task.id, 10, 'minute');
    });
    notification.show();
  } catch {
    showTrayReminder(task, offsetLabel);
  }
}

function getNextRepeatDate(dueDate, repeatRule) {
  const next = new Date(dueDate);
  if (Number.isNaN(next.getTime())) return '';
  if (repeatRule === 'daily') next.setDate(next.getDate() + 1);
  if (repeatRule === 'weekly') next.setDate(next.getDate() + 7);
  if (repeatRule === 'monthly') next.setMonth(next.getMonth() + 1);
  const offset = next.getTimezoneOffset() * 60 * 1000;
  return new Date(next.getTime() - offset).toISOString().slice(0, 16);
}

function getBackupDir() {
  return path.join(app.getPath('userData'), 'backups');
}

function ensureBackupDir() {
  fs.mkdirSync(getBackupDir(), { recursive: true });
}

function listBackupFiles() {
  ensureBackupDir();
  return fs.readdirSync(getBackupDir())
    .filter((name) => /^capsule-tasks-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .map((name) => path.join(getBackupDir(), name));
}

function trimBackups() {
  const files = listBackupFiles();
  files.slice(0, Math.max(0, files.length - 7)).forEach((filePath) => {
    fs.rmSync(filePath, { force: true });
  });
}

function backupToday(force = false) {
  if (!app.isReady()) return;
  const today = new Date().toISOString().slice(0, 10);
  const settings = getSettings();

  ensureBackupDir();
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), ...getState() }, null, 2);
  fs.writeFileSync(path.join(getBackupDir(), `capsule-tasks-${today}.json`), payload, 'utf8');
  if (force || settings.lastBackupDate !== today) {
    store.set('settings', { ...settings, lastBackupDate: today });
  }
  trimBackups();
}

function toLocalDateTimeInputValue(date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function postponeDueDate(dueDate, amount, unit) {
  const base = dueDate && !Number.isNaN(new Date(dueDate).getTime())
    ? new Date(dueDate)
    : new Date();
  const next = new Date(base);
  if (unit === 'minute') next.setMinutes(next.getMinutes() + amount);
  if (unit === 'day') next.setDate(next.getDate() + amount);
  if (unit === 'week') next.setDate(next.getDate() + amount * 7);
  if (unit === 'hour') next.setHours(next.getHours() + amount);
  return toLocalDateTimeInputValue(next);
}

function completeTask(task) {
  const now = new Date().toISOString();
  if (task.repeatRule && task.repeatRule !== 'none' && task.dueDate) {
    const nextDueDate = getNextRepeatDate(task.dueDate, task.repeatRule);
    return normalizeTask({
      ...task,
      dueDate: nextDueDate || task.dueDate,
      completed: false,
      completedAt: '',
      updatedAt: now
    });
  }
  return normalizeTask({ ...task, completed: true, completedAt: now, updatedAt: now });
}

function postponeTaskById(taskId, amount, unit) {
  setTasks(getTasks().map((task) => (
    task.id === taskId
      ? normalizeTask({
        ...task,
        dueDate: postponeDueDate(task.dueDate, Number(amount) || 1, unit),
        updatedAt: new Date().toISOString()
      })
      : task
  )));
}

function emitDueNotifications() {
  reminderSweepQueued = false;
  const now = Date.now();
  getTasks().forEach((task) => {
    if (!task.dueDate || task.completed) return;
    const reminderTime = getReminderTime(task);
    const key = `${task.id}:${task.dueDate}:${task.reminderOffset}`;
    if (Number.isNaN(reminderTime) || reminderTime > now || notifiedKeys.has(key)) return;

    notifiedKeys.add(key);
    const offsetLabel = task.reminderOffset ? `提前 ${task.reminderOffset} 分钟` : '到期提醒';
    sendReminderToRenderer(task);
    showSystemReminder(task, offsetLabel);
  });
}

function startReminderPolling() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(emitDueNotifications, 30 * 1000);
  queueReminderSweep();
}

function queueReminderSweep() {
  if (!app.isReady() || reminderSweepQueued) return;
  reminderSweepQueued = true;
  setTimeout(emitDueNotifications, 500);
}

ipcMain.handle('state:get', () => getState());

ipcMain.handle('app:info', () => ({
  name: '胶囊待办',
  version: app.getVersion(),
  userDataPath: app.getPath('userData'),
  backupPath: getBackupDir()
}));

ipcMain.handle('app:open-backup-dir', async () => {
  ensureBackupDir();
  await shell.openPath(getBackupDir());
  return true;
});

ipcMain.handle('task:create', (_event, payload) => {
  const task = normalizeTask({
    ...payload,
    id: createId(),
    order: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  if (!task.title) return null;
  setTasks([task, ...getTasks()]);
  return task;
});

ipcMain.handle('task:update', (_event, taskId, patch) => {
  const updatedAt = new Date().toISOString();
  setTasks(getTasks().map((task) => (
    task.id === taskId ? normalizeTask({ ...task, ...patch, updatedAt }) : task
  )));
  return true;
});

ipcMain.handle('task:toggle-complete', (_event, taskId) => {
  setTasks(getTasks().map((task) => {
    if (task.id !== taskId) return task;
    if (!task.completed) return completeTask(task);
    return normalizeTask({ ...task, completed: false, completedAt: '', updatedAt: new Date().toISOString() });
  }));
  return true;
});

ipcMain.handle('task:duplicate', (_event, taskId) => {
  const source = getTasks().find((task) => task.id === taskId);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy = normalizeTask({
    ...source,
    id: createId(),
    title: `${source.title} 副本`,
    completed: false,
    completedAt: '',
    pinned: false,
    order: Date.now(),
    createdAt: now,
    updatedAt: now
  });
  setTasks([copy, ...getTasks()]);
  return copy;
});

ipcMain.handle('task:postpone', (_event, taskId, amount = 1, unit = 'day') => {
  postponeTaskById(taskId, amount, unit);
  return true;
});

ipcMain.handle('task:delete', (_event, taskId) => {
  setTasks(getTasks().filter((task) => task.id !== taskId));
  [...notifiedKeys].forEach((key) => {
    if (key.startsWith(`${taskId}:`)) notifiedKeys.delete(key);
  });
  return true;
});

ipcMain.handle('tasks:restore-deleted', (_event, tasks) => {
  const restored = (Array.isArray(tasks) ? tasks : []).map(normalizeTask).filter((task) => task.title);
  if (!restored.length) return 0;
  const existingIds = new Set(getTasks().map((task) => task.id));
  const uniqueRestored = restored.filter((task) => !existingIds.has(task.id));
  if (!uniqueRestored.length) return 0;
  setTasks([...uniqueRestored, ...getTasks()]);
  return uniqueRestored.length;
});

ipcMain.handle('task:clear-completed', () => {
  setTasks(getTasks().filter((task) => !task.completed));
  return true;
});

ipcMain.handle('tasks:bulk-update', (_event, taskIds, patch) => {
  const ids = new Set((Array.isArray(taskIds) ? taskIds : []).map(String));
  const updatedAt = new Date().toISOString();
  setTasks(getTasks().map((task) => (
    ids.has(task.id) ? normalizeTask({ ...task, ...patch, updatedAt }) : task
  )));
  return true;
});

ipcMain.handle('tasks:bulk-complete', (_event, taskIds) => {
  const ids = new Set((Array.isArray(taskIds) ? taskIds : []).map(String));
  setTasks(getTasks().map((task) => (ids.has(task.id) && !task.completed ? completeTask(task) : task)));
  return true;
});

ipcMain.handle('tasks:bulk-postpone', (_event, taskIds, amount = 1, unit = 'day') => {
  const ids = new Set((Array.isArray(taskIds) ? taskIds : []).map(String));
  setTasks(getTasks().map((task) => (
    ids.has(task.id)
      ? normalizeTask({
        ...task,
        dueDate: postponeDueDate(task.dueDate, Number(amount) || 1, unit),
        updatedAt: new Date().toISOString()
      })
      : task
  )));
  return true;
});

ipcMain.handle('tasks:bulk-add-tag', (_event, taskIds, tag) => {
  const ids = new Set((Array.isArray(taskIds) ? taskIds : []).map(String));
  const cleanTag = String(tag || '').trim().slice(0, 24);
  if (!cleanTag) return false;
  setTasks(getTasks().map((task) => (
    ids.has(task.id)
      ? normalizeTask({ ...task, tags: cleanTags([...(task.tags || []), cleanTag]), updatedAt: new Date().toISOString() })
      : task
  )));
  return true;
});

ipcMain.handle('tasks:bulk-delete', (_event, taskIds) => {
  const ids = new Set((Array.isArray(taskIds) ? taskIds : []).map(String));
  setTasks(getTasks().filter((task) => !ids.has(task.id)));
  ids.forEach((taskId) => {
    [...notifiedKeys].forEach((key) => {
      if (key.startsWith(`${taskId}:`)) notifiedKeys.delete(key);
    });
  });
  return true;
});

ipcMain.handle('project:rename', (_event, fromProject, toProject) => {
  const from = String(fromProject || '').trim();
  const to = String(toProject || '').trim().slice(0, 32) || 'Inbox';
  if (!from || from === to) return false;
  const settings = getSettings();
  const nextMeta = { ...(settings.projectMeta || {}) };
  if (nextMeta[from]) {
    nextMeta[to] = { ...nextMeta[from] };
    delete nextMeta[from];
  }
  const nextSettings = {
    ...settings,
    defaultProject: settings.defaultProject === from ? to : settings.defaultProject,
    projectMeta: nextMeta
  };
  store.set('settings', nextSettings);
  setTasks(getTasks().map((task) => (task.project === from ? { ...task, project: to } : task)));
  return true;
});

ipcMain.handle('project:move-to-inbox', (_event, projectName) => {
  const project = String(projectName || '').trim();
  if (!project || project === 'Inbox') return false;
  setTasks(getTasks().map((task) => (task.project === project ? { ...task, project: 'Inbox' } : task)));
  return true;
});

ipcMain.handle('project:set-color', (_event, projectName, color) => {
  const project = String(projectName || '').trim() || 'Inbox';
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(String(color || '')) ? color : '#2563eb';
  const settings = getSettings();
  const projectMeta = {
    ...(settings.projectMeta || {}),
    [project]: { ...(settings.projectMeta?.[project] || {}), color: safeColor }
  };
  store.set('settings', { ...settings, projectMeta });
  broadcastState();
  return true;
});

ipcMain.handle('tasks:reorder', (_event, orderedIds) => {
  const orderMap = new Map((Array.isArray(orderedIds) ? orderedIds : []).map((id, index) => [String(id), index]));
  setTasks(getTasks().map((task, index) => ({
    ...task,
    order: orderMap.has(task.id) ? orderMap.get(task.id) : index + orderMap.size
  })));
  return true;
});

ipcMain.handle('data:export', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出胶囊待办数据',
    defaultPath: `capsule-tasks-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), ...getState() }, null, 2);
  fs.writeFileSync(result.filePath, payload, 'utf8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('data:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入胶囊待办数据',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);
    const importedTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const importedSettings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
    store.set('settings', { ...getSettings(), ...importedSettings });
    notifiedKeys.clear();
    setTasks(importedTasks);
    return { canceled: false, count: importedTasks.length };
  } catch (error) {
    dialog.showErrorBox('导入失败', error.message || '无法导入所选文件。');
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle('backup:list', () => listBackupFiles().map((filePath) => ({
  filePath,
  name: path.basename(filePath),
  modifiedAt: fs.statSync(filePath).mtime.toISOString()
})));

ipcMain.handle('backup:restore', async () => {
  const files = listBackupFiles();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '恢复胶囊待办备份',
    defaultPath: files.at(-1) || getBackupDir(),
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);
    const importedTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const importedSettings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
    store.set('settings', { ...getSettings(), ...importedSettings });
    notifiedKeys.clear();
    setTasks(importedTasks);
    backupToday(true);
    return { canceled: false, count: importedTasks.length };
  } catch (error) {
    dialog.showErrorBox('恢复失败', error.message || '无法恢复所选备份。');
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle('settings:update', (_event, patch) => {
  const next = { ...getSettings(), ...patch };
  store.set('settings', next);
  app.setLoginItemSettings({ openAtLogin: Boolean(next.openAtLogin) });
  updateTrayMenu();
  broadcastState();
  return next;
});

if (hasSingleInstanceLock) app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: Boolean(getSettings().openAtLogin) });
  createWindow();
  createTray();
  startReminderPolling();
  backupToday();

  if (isSmokeTest) {
    setTimeout(() => {
      app.isQuitting = true;
      app.quit();
    }, 1200);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (reminderTimer) clearInterval(reminderTimer);
});

if (hasSingleInstanceLock) app.on('second-instance', showWindow);
app.on('window-all-closed', (event) => event.preventDefault());
app.on('browser-window-created', (_event, window) => window.removeMenu());

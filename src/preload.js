const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('capsule', {
  getState: () => ipcRenderer.invoke('state:get'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  openBackupDir: () => ipcRenderer.invoke('app:open-backup-dir'),
  createTask: (payload) => ipcRenderer.invoke('task:create', payload),
  updateTask: (taskId, patch) => ipcRenderer.invoke('task:update', taskId, patch),
  toggleTaskComplete: (taskId) => ipcRenderer.invoke('task:toggle-complete', taskId),
  duplicateTask: (taskId) => ipcRenderer.invoke('task:duplicate', taskId),
  postponeTask: (taskId, amount, unit) => ipcRenderer.invoke('task:postpone', taskId, amount, unit),
  deleteTask: (taskId) => ipcRenderer.invoke('task:delete', taskId),
  restoreDeletedTasks: (tasks) => ipcRenderer.invoke('tasks:restore-deleted', tasks),
  clearCompleted: () => ipcRenderer.invoke('task:clear-completed'),
  bulkUpdateTasks: (taskIds, patch) => ipcRenderer.invoke('tasks:bulk-update', taskIds, patch),
  bulkCompleteTasks: (taskIds) => ipcRenderer.invoke('tasks:bulk-complete', taskIds),
  bulkPostponeTasks: (taskIds, amount, unit) => ipcRenderer.invoke('tasks:bulk-postpone', taskIds, amount, unit),
  bulkAddTag: (taskIds, tag) => ipcRenderer.invoke('tasks:bulk-add-tag', taskIds, tag),
  bulkDeleteTasks: (taskIds) => ipcRenderer.invoke('tasks:bulk-delete', taskIds),
  renameProject: (fromProject, toProject) => ipcRenderer.invoke('project:rename', fromProject, toProject),
  moveProjectToInbox: (projectName) => ipcRenderer.invoke('project:move-to-inbox', projectName),
  setProjectColor: (projectName, color) => ipcRenderer.invoke('project:set-color', projectName, color),
  reorderTasks: (orderedIds) => ipcRenderer.invoke('tasks:reorder', orderedIds),
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  onStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state:changed', listener);
    return () => ipcRenderer.removeListener('state:changed', listener);
  },
  onTaskFocus: (callback) => {
    const listener = (_event, taskId) => callback(taskId);
    ipcRenderer.on('task:focus', listener);
    return () => ipcRenderer.removeListener('task:focus', listener);
  },
  onQuickAddFocus: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('quick-add:focus', listener);
    return () => ipcRenderer.removeListener('quick-add:focus', listener);
  }
});

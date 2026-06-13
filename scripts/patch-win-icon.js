const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function patchWinIcon(context = {}) {
  const root = path.resolve(__dirname, '..');
  const rcedit = path.join(root, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
  const exe = context.appOutDir
    ? path.join(context.appOutDir, 'Capsule Tasks.exe')
    : path.join(root, 'release', 'win-unpacked', 'Capsule Tasks.exe');
  const icon = path.join(root, 'icon.ico');

  for (const file of [rcedit, exe, icon]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing required file: ${file}`);
    }
  }

  const result = spawnSync(rcedit, [exe, '--set-icon', icon, '--set-version-string', 'IconPath', icon], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`rcedit failed with status ${result.status}`);
  }

  console.log('Patched Windows executable icon.');
}

module.exports = patchWinIcon;

if (require.main === module) {
  patchWinIcon();
}

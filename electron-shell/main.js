const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
Menu.setApplicationMenu(null);
function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 1000, title: 'Pro Photo Sorter',
    backgroundColor: '#1a1715',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'build', 'index.html')
    : path.join(__dirname, 'build', 'index.html');
  win.loadFile(indexPath);
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

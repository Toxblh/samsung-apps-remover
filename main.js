const { app, BrowserWindow } = require('electron')
const open = require('open')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 850,
    webPreferences: {
      nodeIntegration: true,
      devTools: false
    },
    icon: `${__dirname}/build/icon.png`,
  })

  win.removeMenu()
  win.loadFile('index.html')
  // win.webContents.openDevTools()
  win.webContents.on('new-window', function (event, url) {
    event.preventDefault()
    open(url)
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    icon: __dirname + '/assets/logo.png',
  })

  win.loadFile('index.html')
  win.webContents.openDevTools()
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


/**
sdb connect 192.168.1.2:26101
sdb -s 192.168.1.2:26101 push $WGT /home/owner/share/tmp/sdk_tools/tmp/
sdb -s 192.168.1.2:26101 shell 0 vd_appuninstall $APP_ID
sdb -s 192.168.1.2:26101 shell 0 vd_appinstall $APP_ID /home/owner/share/tmp/sdk_tools/tmp/$WGT
sdb -s 192.168.1.2:26101 shell 0 rmfile
sdb -s 192.168.1.2:26101 shell 0 was_execute $APP_ID
 */

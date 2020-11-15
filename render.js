const { Samsung, AutoSearch } = require('samsung-tv-control')
const { sep } = require('path')
const { exec } = require('child_process')
const { networkInterfaces } = require('os')
const { getMac } = require('macfromip')

const nets = networkInterfaces()
const results = []
let apps
let selectedToDel = {}

let control

const configTV = {
  nameApp: 'Samsung Apps Remover', // Default: NodeJS
}

const getTVMacByIP = (ip) =>
  new Promise((resolve, reject) => {
    getMac(ip, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      // fix the mac address so that every number consists of 2 bytes
      const mac = data
        .trim()
        .split(':')
        .map((n) => (n.length < 2 ? `0${n}` : `${n}`))
        .join('')
        .toUpperCase()
      resolve(mac)
    })
  })

function getMyLocalIp() {
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address)
      }
    }
  }

  document.getElementById('my-ip').innerHTML = results.join(',')
}

getMyLocalIp()

const appFolder = __dirname
const sdbFolder = process.platform == 'win32' ? 'win' : process.platform == 'linux' ? 'linux' : 'mac'
const sdbApp = process.platform == 'win32' ? 'sdb.exe' : 'sdb'
const sdbPath = `${appFolder}/sdb/${sdbFolder}/${sdbApp}`.split('/').join(sep)

const select = document.getElementById('options')
const selected = document.getElementById('selected')
const searchBtn = document.getElementById('search-tv')
const getAppsBtn = document.getElementById('get-apps')
const getAppsStatus = document.getElementById('get-apps-status')
const removeAppBtn = document.getElementById('remove-app')
const removeStatus = document.getElementById('remove-status')

async function searchTV() {
  const autoSearch = new AutoSearch()
  const tvs = await autoSearch.search(1000)
  console.log(tvs)

  if (tvs.length !== 0) {
    configTV.ip = tvs[0].ip
    configTV.mac = await getTVMacByIP(tvs[0].ip)

    document.getElementById('name').innerHTML = tvs[0].name
    document.getElementById('model').innerHTML = tvs[0].model
    document.getElementById('ip').innerHTML = configTV.ip
    document.getElementById('mac').innerHTML = configTV.mac

    console.log(configTV)
    control = new Samsung(configTV)
  }

  searchBtn.classList.remove('is-danger')
  searchBtn.innerText = 'Search TV'
}

select.addEventListener('change', (e) => {
  selectedToDel = apps.filter((app) => app.appId === e.target.value)[0]
  selected.innerHTML = `<b>${selectedToDel.name}</b> [${selectedToDel.appId}]`
  console.log('selectedToDel', selectedToDel)
})

searchBtn.onclick = () => {
  searchTV()
  searchBtn.classList.add('is-danger')
  searchBtn.innerText = 'Searching'
}

getAppsBtn.onclick = async () => {
  getAppsStatus.innerText = 'Please look to TV and confirm remote control for get list of applications'
  await control.isAvailable()
  let token = await control.getTokenPromise()
  console.log('$$ token:', token)

  getAppsStatus.innerText = 'Token received'

  const res = await control.getAppsFromTVPromise()
  apps = res.data.data

  console.log('# Response getAppsFromTV', apps)

  getAppsStatus.innerText = 'Choose to which application will delete'

  apps.forEach((app) => {
    console.log(app)
    var option = document.createElement('option')
    option.text = app.name
    option.value = app.appId
    select.appendChild(option)
  })
}

removeAppBtn.onclick = async () => {
  try {
    removeStatus.innerHTML = `Will remove app ${selectedToDel.name}`

    await connectToTV()
    await uninstallApp(selectedToDel.appId)

    removeStatus.innerHTML = `${selectedToDel.name} Removed!`
  } catch (err) {
    console.log('Error: ', err)
  }
}

function execAsync(cmd, outCheck) {
  return new Promise(function (resolve, reject) {
    console.log(`App Launcher: ${cmd}`)
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(`${err.name}: ${err.message}`)
      } else {
        if (outCheck) {
          outCheck(stdout, resolve, reject)
        } else {
          resolve()
        }
      }
    })
  })
}

function uninstallApp(appId) {
  return execAsync(`${sdbPath} -s ${configTV.ip}:26101 shell 0 vd_appuninstall ${appId}`)
}

function connectToTV() {
  return execAsync(`${sdbPath} connect ${configTV.ip}:26101`)
}

function disconnectTarget() {
  return execAsync(`${sdbPath} disconnect ${configTV.ip}:26101`)
}

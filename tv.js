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
  nameApp: 'Samsung Apps Remover',
}

const appFolder = __dirname
const sdbFolder =
  process.platform == 'win32' ? 'win' : process.platform == 'linux' ? 'linux' : 'mac'
const sdbApp = process.platform == 'win32' ? 'sdb.exe' : 'sdb'
const sdbPath = `${appFolder}/sdb/${sdbFolder}/${sdbApp}`.split('/').join(sep)

const appsDiv = document.getElementById('apps')
const donate = document.getElementById('donate')
const select = document.getElementById('options')
const searchBtn = document.getElementById('search-tv')
const getAppsBtn = document.getElementById('get-apps')
const getAppsStatus = document.getElementById('get-apps-status')
const removeAppBtn = document.getElementById('remove-app')
const removeStatus = document.getElementById('remove-status')
const searchIPBtn = document.getElementById('search-tv-ip')
const searchIP = document.getElementById('search-ip')
const connectIP = document.getElementById('connect-ip')
let counterSearches = 0

getMyLocalIp()

getAppsBtn.onclick = getApps
removeAppBtn.onclick = removeApp
searchBtn.onclick = searchTV
searchIPBtn.onclick = getUserIP

searchIP.addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    getUserIP()
  }
}); 

select.addEventListener('change', (e) => {
  selectedToDel = apps.filter((app) => app.appId === e.target.value)[0]
  removeAppBtn.innerHTML = `Remove &nbsp <b>${selectedToDel.name}</b>`
  removeAppBtn.classList.add('is-danger')
  console.log('selectedToDel', selectedToDel)
})

async function searchTV() {
  searchBtn.classList.add('is-warning')
  searchBtn.classList.add('is-loading')
  searchBtn.innerText = 'Searching'

  const autoSearch = new AutoSearch()
  const tvs = await autoSearch.search(1000)

  if (tvs.length !== 0) {
    document.getElementById('name').innerHTML = `Model: ${tvs[0].name}`
    document.getElementById('model').innerHTML = `Name: ${tvs[0].model}`

    configTV.ip = tvs[0].ip

    try {
      configTV.mac = await getTVMacByIP(tvs[0].ip)
    } catch (err) {
      searchBtn.classList.remove('is-warning')
      searchBtn.classList.remove('is-loading')
      searchBtn.innerText = 'Not found. Did you turn on TV? Try again.'
    }

    control = new Samsung(configTV)

    let isOn = await control.isAvailable()

    if (isOn) {
      await getToken(searchBtn)

      getApps()

      searchBtn.classList.remove('is-warning')
      searchBtn.classList.remove('is-loading')
      searchBtn.innerText = 'Search TV'
    } else {
      searchBtn.classList.remove('is-warning')
      searchBtn.classList.remove('is-loading')
      searchBtn.innerText = 'Not found. Did you turn on TV? Try again.'
    }
  } else {
    counterSearches++
    if (counterSearches < 7) {
      setTimeout(searchTV, 2000)
    } else {
      searchBtn.classList.remove('is-warning')
      searchBtn.classList.remove('is-loading')
      searchBtn.innerText = 'Not found. Did you turn on TV? Try again.'

      connectIP.style.display = 'block'

      counterSearches = 0
    }
  }
}

function validateIP(value) {
  let regex = /^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/
  return regex.test(value)
}

async function getUserIP() {
  let userIP = searchIP.value

  if (validateIP(userIP)) {
    searchIP.classList.remove('is-danger')
    searchIP.classList.remove('is-warning')

    searchIPBtn.classList.add('is-warning')
    searchIPBtn.classList.add('is-loading')
    searchIPBtn.innerText = 'Try to connect...'

    configTV.ip = userIP
    try {
      configTV.mac = await getTVMacByIP(userIP)

      control = new Samsung(configTV)

      let isOn = await control.isAvailable()

      if (isOn) {
        await getToken(searchIPBtn)

        getApps()

        searchIPBtn.classList.remove('is-warning')
        searchIPBtn.classList.remove('is-loading')
        searchIPBtn.innerText = 'Connect to IP'
      } else {
        searchBtn.classList.remove('is-warning')
        searchBtn.classList.remove('is-loading')
        searchBtn.innerText =
          "Can't to connect. Please check IP and TV is ON. Click to try again"
      }
    } catch (err) {
      searchIP.classList.add('is-warning')
      searchIPBtn.classList.remove('is-warning')
      searchIPBtn.classList.remove('is-loading')
      searchIPBtn.innerText =
        "Can't to connect. Please check IP and TV is ON.\nClick to try again"
    }
  } else {
    searchIP.classList.add('is-danger')
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function removeApp() {
  try {
    if (selectedToDel.name === undefined) {
      removeStatus.innerHTML = `Nothing to delete`
      return
    }

    removeAppBtn.classList.add('is-loading')

    await connectToTV()
    // await delay(1000)
    await uninstallApp(selectedToDel.appId)
    getApps()

    removeStatus.innerHTML = ''

    selectedToDel = {}

    removeAppBtn.classList.remove('is-loading')
    removeAppBtn.classList.remove('is-danger')
    removeAppBtn.classList.add('is-success')
    removeAppBtn.innerHTML =
      '<span class="icon is-small"><i class="fas fa-check"></i></span>&nbsp&nbsp&nbspRemoved!'

    await delay(500)

    removeAppBtn.classList.remove('is-danger')
    removeAppBtn.classList.remove('is-success')
    removeAppBtn.innerHTML = 'Choose an app'

    donate.style.display = 'block'
  } catch (err) {
    console.log('Error: ', err)

    removeStatus.innerHTML = `Error! Please check you turn on developer mode and restart TV (Hold power button until startup logo) and try again. Msg ${err}`
  }
}

async function getToken(button) {
  button.classList.remove('is-loading')
  button.innerText = 'Please look at the TV and confirm your request.'
  await control.getTokenPromise()
}

async function getApps() {
  const res = await control.getAppsFromTVPromise()
  apps = res.data.data

  getAppsStatus.innerText = 'Select the application you want to delete:'

  removeOptions(select)

  apps.forEach((app) => {
    console.log(app)
    var option = document.createElement('option')
    option.text = app.name
    option.value = app.appId
    select.appendChild(option)
  })

  appsDiv.style.display = 'block'
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

function removeOptions(selectElement) {
  var i,
    L = selectElement.options.length - 1
  for (i = L; i >= 0; i--) {
    selectElement.remove(i)
  }
}

function getTVMacByIP(ip) {
  return new Promise((resolve, reject) => {
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
}

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

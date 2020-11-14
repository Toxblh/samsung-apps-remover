const { desktopCapturer, remote } = require('electron')
const { Samsung, KEYS, APPS, AutoSearch } = require('samsung-tv-control')
const { networkInterfaces } = require('os')
const { getMac } = require('macfromip')

const nets = networkInterfaces()
const results = [] // or just '{}', an empty object

let control
const configTV = {
  // debug: true, // Default: false
  nameApp: 'Samsung Apps Remover', // Default: NodeJS
}

const getTVMacByIP = (ip) => new Promise((resolve, reject) => {
  getMac(ip, (err, data) => {
    if (err) {
      reject(err);
      return;
    }
    // fix the mac address so that every number consists of 2 bytes
    const mac = data.trim().split(':').map(n => n.length < 2 ? `0${n}` : `${n}`).join('').toUpperCase();
    resolve(mac);
  });
});

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

// Start AutoSearch
async function main() {
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

// Buttons
const select = document.getElementById('options')
const selected = document.getElementById('selected')

select.addEventListener('change', (e) => {
  selected.innerHTML = e.target.value
})

const searchBtn = document.getElementById('search-tv')
searchBtn.onclick = (e) => {
  main()
  searchBtn.classList.add('is-danger')
  searchBtn.innerText = 'Searching'
}

const getAppsBtn = document.getElementById('get-apps')

getAppsBtn.onclick = async (e) => {
  await control.isAvailable()
  let token = await control.getTokenPromise()
  console.log('$$ token:', token)


  const apps = await control.getAppsFromTVPromise()

  console.log('# Response getAppsFromTV', apps)

  apps.data.data.forEach((app) => {
    console.log(app)
    var option = document.createElement('option')
    option.text = app.name
    option.value = app.appId
    select.appendChild(option)
  })


  await control.openApp(APPS.Spotify)
}

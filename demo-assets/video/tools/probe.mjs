import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { connect } from './cdp-lite.mjs'
const out = process.argv[2]
const ch = spawn('google-chrome-stable', ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${out}/chrome-probe`, '--no-first-run', '--hide-scrollbars', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const c = await connect(9333)
await c.send('Page.enable'); await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false })
const shot = async (name) => { const r = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); writeFileSync(`${out}/${name}.jpg`, Buffer.from(r.data, 'base64')) }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
for (const [name, url, ms] of [['landing', 'http://localhost:5173/landing.html', 6000], ['business', 'http://localhost:5173/index.html#/business', 6000], ['pay', 'http://localhost:5173/index.html#/pay', 2500], ['loans', 'http://localhost:5173/index.html#/loans', 2500], ['lp', 'http://localhost:5173/index.html#/lp', 2500]]) {
  if (name === 'business' || !url.includes('index.html')) await c.send('Page.navigate', { url })
  else await c.evaluate(`location.hash='${url.split('#')[1]}'`)
  await wait(ms); await shot(name)
  console.log(name, JSON.stringify(await c.evaluate('({h:document.documentElement.scrollHeight, y:innerHeight, sc:[...document.querySelectorAll("*")].filter(e=>e.scrollHeight>e.clientHeight+50&&getComputedStyle(e).overflowY.match(/auto|scroll/)).map(e=>e.id||e.className).slice(0,3)})')))
}
c.close(); ch.kill()

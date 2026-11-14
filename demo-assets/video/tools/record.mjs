// Records the app scenes as 1920x1080 30fps clips with headless Chrome screencast, paced to timing.json.
// Read-only: it never connects a wallet or signs anything. Usage: node tools/record.mjs [sceneIds,...]
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { connect } from './cdp-lite.mjs'
const root = new URL('..', import.meta.url).pathname
const T = JSON.parse(readFileSync(root + 'timing.json', 'utf8'))
const P = T.paragraphs
const BASE = process.env.APP_URL ?? 'http://localhost:5173'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
// scene plan: id, paragraph range (+ optional split), page, action(secs)
const c2 = P[2].start + (P[2].end - P[2].start) * 0.5
const scenes = [
  { id: 'a-landing', from: 0, to: P[1].start, kind: 'landing' },
  { id: 'b-dashboard', from: P[1].start, to: P[2].start, kind: 'dashboard' },
  { id: 'c1-pay', from: P[2].start, to: c2, kind: 'pay' },
  { id: 'c2-money', from: c2, to: P[3].start, kind: 'money' },
  { id: 'd-loans', from: P[3].start, to: P[4].start, kind: 'loans' },
  { id: 'e-vault', from: P[4].start, to: P[5].start, kind: 'vault' },
  { id: 'f-limits', from: P[5].start, to: P[6].start, kind: 'limits' }
].map((s) => ({ ...s, dur: +(s.to - s.from).toFixed(2) }))
writeFileSync(root + 'scenes.json', JSON.stringify(scenes, null, 2))
const only = process.argv[2]?.split(',')
const smooth = `window.__sm=(y,ms)=>new Promise(r=>{const y0=scrollY,t0=performance.now();const e=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const f=n=>{const k=Math.min(1,(n-t0)/ms);scrollTo(0,y0+(y-y0)*e(k));k<1?requestAnimationFrame(f):r()};requestAnimationFrame(f)});
window.__to=(sel,txt,off)=>{const els=[...document.querySelectorAll(sel)];const el=txt?els.find(x=>x.textContent.includes(txt)):els[0];return el?el.getBoundingClientRect().top+scrollY-off:0};true`
const act = {
  landing: async (c, d) => { await wait(d * 0.62 * 1000); await c.evaluate(`window.__sm(380,${Math.round(d * 0.3 * 1000)})`) },
  dashboard: async (c, d) => {
    await c.evaluate(`document.querySelector('[data-nav="business"]')?.click()`)
    await wait(d * 0.26 * 1000); await c.evaluate(`window.__sm(540,${Math.round(d * 0.2 * 1000)})`)
    await wait(d * 0.16 * 1000); await c.evaluate(`window.__sm(Math.max(0,document.documentElement.scrollHeight-innerHeight),${Math.round(d * 0.26 * 1000)})`)
  },
  pay: async (c, d) => { await c.evaluate(`document.querySelector('[data-nav="pay"]')?.click()`); await wait(d * 1000) },
  money: async (c, d) => {
    await c.evaluate(`document.querySelector('[data-nav="business"]')?.click()`); await wait(1200)
    await c.evaluate(`window.__sm(window.__to('h2,h3','How the money moves',140),${Math.round(d * 0.35 * 1000)})`); await wait(d * 0.6 * 1000)
  },
  loans: async (c, d) => { await c.evaluate(`document.querySelector('[data-nav="loans"]')?.click()`); await wait(d * 1000) },
  vault: async (c, d) => {
    await c.evaluate(`location.hash='#/lp'`); await wait(d * 0.3 * 1000)
    await c.evaluate(`window.__sm(Math.max(0,document.documentElement.scrollHeight-innerHeight),${Math.round(d * 0.5 * 1000)})`)
  },
  limits: async (c, d) => {
    await c.evaluate(`window.__sm(window.__to('#limits',null,60),0)`); await wait(d * 0.15 * 1000)
    await c.evaluate(`window.__sm(window.__to('#limits',null,60)+240,${Math.round(d * 0.6 * 1000)})`)
  }
}
const pre = { landing: `${BASE}/landing.html`, dashboard: `${BASE}/index.html#/lp`, pay: `${BASE}/index.html#/business`, money: `${BASE}/index.html#/lp`, loans: `${BASE}/index.html#/business`, vault: `${BASE}/index.html#/loans`, limits: `${BASE}/landing.html` }
const ch = spawn('google-chrome-stable', ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${root}clips/.chrome`, '--no-first-run', '--hide-scrollbars', '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' })
process.on('exit', () => ch.kill())
await wait(2500)
const c = await connect(9333)
await c.send('Page.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false })
for (const s of scenes) {
  if (only && !only.includes(s.id)) continue
  const dir = `${root}clips/.frames-${s.id}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
  if (s.kind === 'landing') { await c.send('Page.navigate', { url: 'about:blank' }); await wait(300) }
  else { await c.send('Page.navigate', { url: pre[s.kind] }); await wait(s.kind === 'limits' ? 4500 : 5500); await c.evaluate(smooth) }
  const frames = []
  c.on('Page.screencastFrame', (p) => { frames.push({ ts: p.metadata.timestamp, data: p.data }); c.send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {}) })
  await c.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 })
  const t0 = Date.now()
  if (s.kind === 'landing') { await c.send('Page.navigate', { url: pre.landing }); await wait(1800); await c.evaluate(smooth) }
  await act[s.kind](c, Math.max(1, s.dur - (Date.now() - t0) / 1000))
  const remain = s.dur + 0.2 - (Date.now() - t0) / 1000
  if (remain > 0) await wait(remain * 1000)
  await c.send('Page.stopScreencast'); await wait(200)
  c.on('Page.screencastFrame', () => {})
  const list = frames.filter((f) => f.ts >= frames[0].ts)
  let txt = ''
  list.forEach((f, i) => { writeFileSync(`${dir}/f${String(i).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64')); const d = i + 1 < list.length ? list[i + 1].ts - f.ts : 0.1; txt += `file 'f${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(0.001, d).toFixed(4)}\n` })
  txt += `file 'f${String(list.length - 1).padStart(5, '0')}.jpg'\n`
  writeFileSync(`${dir}/list.txt`, txt)
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', `fps=30,tpad=stop_mode=clone:stop_duration=3,format=yuv420p`, '-t', String(s.dur + 0.2), '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-an', `${root}clips/${s.id}.mp4`])
  rmSync(dir, { recursive: true, force: true })
  console.log(s.id, `${list.length} frames`, `${s.dur}s`)
}
c.close(); ch.kill()

// Builds timing.json from audio/voice.mp3 (silence gaps between the 7 paragraphs) or, without audio, a char-rate estimate.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
const root = new URL('..', import.meta.url).pathname
const paras = readFileSync(root + 'audio/tts-input.txt', 'utf8').trim().split('\n')
const audio = root + 'audio/voice.mp3'
let source = 'estimate', starts, total
if (existsSync(audio)) {
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]).toString())
  const r = spawnSync('ffmpeg', ['-i', audio, '-af', 'silencedetect=noise=-34dB:d=0.28', '-f', 'null', '-'], { encoding: 'utf8' })
  const gaps = [...r.stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => ({ s: +m[1], e: +m[2], d: +m[2] - +m[1] })).filter((g) => g.s > 1 && g.e < dur - 0.5)
  if (gaps.length >= paras.length - 1) {
    // For each paragraph boundary, take the longest silence near where the char-proportional estimate says it is.
    const chars = paras.map((p) => p.length), sum = chars.reduce((a, b) => a + b, 0)
    let cum = 0
    const picked = chars.slice(0, -1).map((c) => {
      cum += c
      const exp = 0.3 + (dur * cum) / sum
      // snap to the silence closest to the estimate (within 2.5 s); otherwise keep the estimate itself
      const near = gaps.filter((g) => Math.abs((g.s + g.e) / 2 - exp) < 2.5).sort((a, b) => Math.abs((a.s + a.e) / 2 - exp) - Math.abs((b.s + b.e) / 2 - exp))[0]
      return near ?? { s: exp, e: exp + 0.05 }
    })
    starts = [0.3, ...picked.map((g) => g.e - 0.05)]
    total = dur + 0.3
    source = 'audio'
  } else {
    console.error(`WARNING: only ${gaps.length} gaps found; falling back to char-proportional split of ${dur}s`)
    const chars = paras.map((p) => p.length), sum = chars.reduce((a, b) => a + b, 0)
    let t = 0.3; starts = chars.map((c) => { const s = t; t += (dur * c) / sum; return s }); total = dur + 0.3; source = 'audio-proportional'
  }
} else {
  let t = 0.4; starts = paras.map((p) => { const s = t; t += p.length / 15.2 + 0.6; return s }); total = t
}
const ends = starts.map((s, i) => (i + 1 < starts.length ? starts[i + 1] : total))
const out = { source, tail: 2.5, total: +(total + 2.5).toFixed(2), paragraphs: paras.map((text, i) => ({ i, text, start: +starts[i].toFixed(2), end: +ends[i].toFixed(2) })) }
writeFileSync(root + 'timing.json', JSON.stringify(out, null, 2))
console.log(source, out.total + 's', out.paragraphs.map((p) => `${p.start}-${p.end}`).join(' '))

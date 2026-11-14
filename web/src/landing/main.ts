import { $, $$, reducedMotion } from '../app/dom'
import { P, USDC_UNIT, bpsToPct, creditLimit, fmt0, fmt2, mulBpsDown, usdc } from '../lib/engine'

const reduced = reducedMotion()
const clamp = (n: number, a = 0, b = 1): number => Math.min(b, Math.max(a, n))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, reduced ? Math.min(ms, 250) : ms))
const setText = (selector: string, value: string): void => {
  $(selector).textContent = value
}
const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const boot = (): void => {
  const ring = $<SVGCircleElement>('#pg')
  const label = $('#boot-p')
  const duration = reduced ? 200 : 1700
  const t0 = performance.now()
  let done = false
  const finish = (): void => {
    if (done) return
    done = true
    $('#boot').classList.add('done')
    document.dispatchEvent(new Event('rv:ready'))
    setTimeout(() => $('#boot').remove(), 600)
  }
  const tick = (now: number): void => {
    const k = clamp((now - t0) / duration)
    const e = 1 - Math.pow(1 - k, 2.2)
    ring.style.strokeDashoffset = String(327 * (1 - e))
    label.textContent = `${Math.round(e * 100)}%`
    if (k < 1) requestAnimationFrame(tick)
    else finish()
  }
  requestAnimationFrame(tick)
  setTimeout(finish, duration + 400)
}

const rotator = (): void => {
  if (reduced) return
  const track = $('#swap .swt')
  const items = $$('span', track)
  const first = items[0]
  if (first === undefined) return
  let i = 0
  setInterval(() => {
    i += 1
    track.style.transform = `translateY(${-i * first.offsetHeight}px)`
    if (i === items.length - 1) {
      setTimeout(() => {
        track.style.transition = 'none'
        i = 0
        track.style.transform = 'translateY(0)'
        void nextFrame().then(nextFrame).then(() => {
          track.style.transition = ''
        })
      }, 650)
    }
  }, 2200)
}

const tilt = (): void => {
  if (reduced) return
  const stack = $('#stack')
  const card = $('#tilt')
  stack.addEventListener('pointermove', (e) => {
    const r = stack.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`
  })
  stack.addEventListener('pointerleave', () => {
    card.style.transform = ''
  })
}

const liveCard = (): void => {
  const total = 515
  const pays = [300, 420, 600, 800]
  let repaid = 0
  let i = 0
  const run = async (): Promise<void> => {
    await wait(2100)
    for (;;) {
      const a = pays[i % 4] ?? 300
      const rep = Math.min((a * P.splitBps) / 10_000, total - repaid)
      const biz = a - rep
      $('#p-bar').classList.remove('split')
      $('#p-a').style.width = '0'
      $('#p-b').style.width = '0'
      setText('#p-src', `${fmt2(usdc(a))} USDC`)
      setText('#p-title', 'Customer payment in')
      setText('#p-ref', `inv_${2041 + i}`)
      setText('#p-la', '0.00')
      setText('#p-lb', '0.00')
      $('#pop1').classList.remove('on')
      await wait(1100)
      setText('#p-a', fmt2(usdc(rep)))
      setText('#p-b', fmt2(usdc(biz)))
      $('#p-bar').classList.add('split')
      $('#p-a').style.width = `calc(${(rep / a) * 100}% - 1.5px)`
      $('#p-b').style.width = `calc(${(biz / a) * 100}% - 1.5px)`
      setText('#p-la', fmt2(usdc(rep)))
      setText('#p-lb', fmt2(usdc(biz)))
      setText('#p-title', 'Split automatically')
      $('#pop1').classList.add('on')
      await wait(700)
      repaid += rep
      $('#d-paid').style.width = `${(repaid / total) * 100}%`
      setText('#d-rep', fmt2(usdc(repaid)))
      setText('#d-left', fmt2(usdc(total - repaid)))
      if (reduced) return
      await wait(1900)
      i += 1
      if (total - repaid < 0.005) {
        $('#d-chip').innerHTML = '<span class="dot"></span>Closed'
        setText('#p-title', 'Loan cleared')
        $('#pop2').classList.add('on')
        await wait(3200)
        $('#pop2').classList.remove('on')
        repaid = 0
        i = 0
        $('#d-paid').style.width = '0'
        setText('#d-rep', '0.00')
        setText('#d-left', fmt2(usdc(total)))
        $('#d-chip').innerHTML = '<span class="dot"></span>Self-repaying'
        await wait(600)
      }
    }
  }
  void run()
}

const reveals = (): void => {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('in')
        io.unobserve(e.target)
        $$('[data-count]', e.target).forEach((c) => {
          c.textContent = c.dataset.count ?? ''
        })
        if (e.target.id === 'tg' || e.target.querySelector('#tg') !== null) $('#tg').classList.add('on')
      }),
    { threshold: 0.2 }
  )
  $$('.rv').forEach((el) => io.observe(el))
  $$('.cr.wipe').forEach((el, i) => {
    el.style.transitionDelay = `${i * 90}ms`
  })
  new IntersectionObserver(
    ([e], o) => {
      if (e?.isIntersecting === true) {
        $$('.cr.wipe').forEach((r) => r.classList.add('in'))
        o.disconnect()
      }
    },
    { threshold: 0.2 }
  ).observe($('.cmp'))
  new IntersectionObserver(
    ([e], o) => {
      if (e?.isIntersecting === true) {
        $('#tg').classList.add('on')
        o.disconnect()
      }
    },
    { threshold: 0.5 }
  ).observe($('#tg'))
}

const controls = (): void => {
  const rev = $<HTMLInputElement>('#rev')
  const spl = $<HTMLInputElement>('#spl')
  const updateRevenue = (): void => {
    const routed = usdc(Number(rev.value))
    const limit = creditLimit(routed, P.advanceBps.agent, P.cap, P.starterLimit)
    setText('#rev-v', fmt0(routed))
    setText('#f-rev', fmt0(routed))
    setText('#lim-v', fmt0(limit))
    setText('#f-lim', fmt0(limit))
  }
  const updateSplit = (): void => {
    const split = Number(spl.value)
    setText('#spl-v', String(split))
    const daily = 110n * USDC_UNIT
    const slice = mulBpsDown(daily, split * 100)
    const debt = usdc(515)
    const days = (debt + slice - 1n) / slice
    setText('#spl-d', String(days))
  }
  rev.oninput = updateRevenue
  spl.oninput = updateSplit
  updateRevenue()
  updateSplit()
  $$('.bt').forEach((b) =>
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect()
      b.style.setProperty('--mx', `${e.clientX - r.left}px`)
      b.style.setProperty('--my', `${e.clientY - r.top}px`)
    })
  )
  $('#bars').innerHTML = Array.from(
    { length: 24 },
    (_, i) => `<i style="--h:${30 + Math.round((60 * i) / 23 + (i % 3) * 5)}%;--i:${i}"></i>`
  ).join('')
}

const KEYS = [1, 2, 3, 4] as const

const scenes = (): { frame: (vh: number) => void } => {
  const flow = $('#flow')
  const steps = $$('.fs')
  const paths = KEYS.map((k) => $<SVGPathElement>(`#P${k}`))
  const lives = KEYS.map((k) => $<SVGPathElement>(`#L${k}`))
  const coins = KEYS.map((k) => $<SVGGElement>(`#c${k}`))
  const pathAt = (k: number): SVGPathElement => paths[k - 1] ?? paths[0] ?? $<SVGPathElement>('#P1')
  const liveAt = (k: number): SVGPathElement => lives[k - 1] ?? lives[0] ?? $<SVGPathElement>('#L1')
  const coinAt = (k: number): SVGGElement => coins[k - 1] ?? coins[0] ?? $<SVGGElement>('#c1')
  const len = paths.map((p) => p.getTotalLength())
  const lenAt = (k: number): number => len[k - 1] ?? 0
  lives.forEach((l, i) => {
    l.style.strokeDasharray = String(len[i] ?? 0)
    l.style.strokeDashoffset = String(len[i] ?? 0)
  })
  const place = (k: number, c: SVGGElement, t: number): void => {
    const pt = pathAt(k).getPointAtLength(lenAt(k) * clamp(t))
    c.setAttribute('transform', `translate(${pt.x},${pt.y})`)
  }
  const nodes = { C: $('#nC'), R: $('#nR'), V: $('#nV'), E: $('#nE'), B: $('#nB') }
  const hot = (...n: (keyof typeof nodes)[]): void => n.forEach((k) => nodes[k].classList.add('hot'))
  const offset = (k: number, v: number): void => {
    liveAt(k).style.strokeDashoffset = String(v)
  }
  const opacity = (k: number, v: number): void => coinAt(k).setAttribute('opacity', String(v))
  const frame = (vh: number): void => {
    const r = flow.getBoundingClientRect()
    const p = clamp(-r.top / Math.max(1, r.height - vh))
    const st = Math.min(3, Math.floor(p * 4))
    const lp = clamp(p * 4 - st)
    steps.forEach((s, i) => {
      s.classList.toggle('on', i === st)
      $('.pr i', s).style.width = `${i === st ? lp * 100 : i < st ? 100 : 0}%`
    })
    KEYS.forEach((k) => {
      opacity(k, 0)
      offset(k, lenAt(k))
    })
    Object.values(nodes).forEach((n) => n.classList.remove('hot'))
    let lim = 0
    let owe = 0
    if (st === 0) {
      const t = ease(lp)
      place(1, coinAt(1), t)
      opacity(1, clamp(lp * 6))
      offset(1, lenAt(1) * (1 - t))
      hot('C')
      if (lp > 0.85) hot('R')
    }
    if (st >= 1) {
      offset(1, 0)
      hot('R')
    }
    if (st === 1) lim = 960 * ease(lp)
    if (st >= 2) lim = 960
    if (st === 2) {
      const t = ease(lp)
      place(4, coinAt(4), t)
      opacity(4, clamp(lp * 6) * clamp((1 - lp) * 8 + 0.2))
      offset(4, lenAt(4) * (1 - t))
      hot('V')
      if (lp > 0.8) hot('E')
      owe = 515 * ease(clamp(lp * 1.4))
    }
    if (st === 3) {
      owe = 515 - 24 * ease(clamp((lp - 0.45) * 2.2))
      lim = lerp(960, 1008, ease(clamp((lp - 0.7) * 3)))
      const a = clamp(lp / 0.38)
      if (a < 1) {
        place(1, coinAt(1), ease(a))
        opacity(1, clamp(lp * 8))
        offset(1, lenAt(1) * (1 - ease(a)))
        hot('C')
      } else {
        const t = ease(clamp((lp - 0.38) / 0.5))
        place(2, coinAt(2), t)
        place(3, coinAt(3), t)
        opacity(2, 1 - clamp((t - 0.92) * 12))
        opacity(3, 1 - clamp((t - 0.92) * 12))
        offset(2, lenAt(2) * (1 - t))
        offset(3, lenAt(3) * (1 - t))
        hot('R')
        if (t > 0.85) hot('V', 'B')
      }
    }
    setText('#s-lim', fmt0(usdc(Math.round(lim))))
    setText('#s-owe', fmt0(usdc(Math.round(owe))))
    $('#s-gau').style.width = `${clamp(lim / 1500) * 100}%`
  }
  return { frame }
}

const horizontal = (): { frame: (vh: number) => void } => {
  const hz = $('#modules')
  const track = $('#track')
  const mods = $$('.mod:not(.intro)')
  const frame = (vh: number): void => {
    const r = hz.getBoundingClientRect()
    const p = clamp(-r.top / Math.max(1, r.height - vh))
    const max = Math.max(0, track.scrollWidth - innerWidth)
    track.style.transform = `translate3d(${-max * ease(p)}px,0,0)`
    const act = Math.min(mods.length - 1, Math.round(ease(p) * (mods.length - 1)))
    mods.forEach((m, i) => m.classList.toggle('act', i === act))
    setText('#hz-n', `0${act + 1} / 0${mods.length}`)
    $('#hz-b').style.width = `${p * 100}%`
  }
  return { frame }
}

const finale = (): { frame: (vh: number) => void } => {
  const fin = $('#fin')
  const fill = $('#fill')
  const frame = (vh: number): void => {
    const r = fin.getBoundingClientRect()
    const p = clamp((-r.top / Math.max(1, r.height - vh)) * 1.25)
    fill.style.setProperty('--p', `${p * 108 - 4}%`)
    fin.classList.toggle('done', p > 0.96 || reduced)
  }
  return { frame }
}

const marquee = (): void => {
  if (reduced) return
  const marq = $('#marq')
  let mx = 0
  let last = scrollY
  let vel = 0
  const loop = (): void => {
    const d = scrollY - last
    last = scrollY
    vel = lerp(vel, d, 0.12)
    mx -= 0.5 + Math.abs(vel) * 0.6
    const w = marq.scrollWidth / 2
    if (-mx >= w) mx += w
    marq.style.transform = `translate3d(${mx}px,0,0)`
    requestAnimationFrame(loop)
  }
  loop()
}

const hero = (): { frame: (vh: number) => void } => {
  const fold = $('#fold')
  let folded = false
  const runFold = (): void => {
    if (folded) return
    folded = true
    fold.classList.add('in')
  }
  if (reduced) runFold()
  else {
    document.addEventListener('rv:ready', runFold, { once: true })
    setTimeout(runFold, 3200)
  }
  const glass = $('#glass')
  glass.addEventListener('pointermove', (e) => {
    const r = glass.getBoundingClientRect()
    glass.style.setProperty('--sx', `${e.clientX - r.left}px`)
    glass.style.setProperty('--sy', `${e.clientY - r.top}px`)
  })
  glass.addEventListener('pointerleave', () => {
    glass.style.setProperty('--sx', '50%')
    glass.style.setProperty('--sy', '0%')
  })
  const bg = $('#hero-bg')
  const copy = $('#hero-copy')
  const section = $('#product')
  const frame = (vh: number): void => {
    const y = scrollY
    if (reduced || y > section.offsetHeight + 80) return
    bg.style.transform = `translate3d(0,${y * 0.38}px,0) scale(1.06)`
    copy.style.transform = `translate3d(0,${y * -0.22}px,0)`
    copy.style.opacity = String(clamp(1 - y / (vh * 0.55)))
  }
  return { frame }
}

const navigation = (): void => {
  const navIn = $('#navin')
  const burger = $('#burger')
  burger.addEventListener('click', () => {
    const open = navIn.classList.toggle('open')
    burger.setAttribute('aria-expanded', String(open))
  })
  $$('#links a').forEach((a) =>
    a.addEventListener('click', () => {
      navIn.classList.remove('open')
      burger.setAttribute('aria-expanded', 'false')
    })
  )
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navIn.classList.contains('open')) {
      navIn.classList.remove('open')
      burger.setAttribute('aria-expanded', 'false')
      burger.focus()
    }
  })
}

const tiles = (): void => {
  const sample = creditLimit(usdc(2400), P.advanceBps.agent, P.cap, P.starterLimit)
  const items: readonly (readonly [string, string])[] = [
    ['Limit on 2,400 routed', `${fmt2(sample)} USDC`],
    ['Advance rate', `${bpsToPct(P.advanceBps.agent)}% agents · ${bpsToPct(P.advanceBps.creator)}% creators`],
    ['Repay split', `${bpsToPct(P.splitBps)}%`],
    ['Flat fee', `${bpsToPct(P.feeBps)}%`],
    ['Term', `${P.termDays} days`],
    ['Cap', `${fmt0(P.cap)} USDC`],
    ['Locked collateral', '0'],
    ['Revenue notes', 'pool-held'],
    ['NEAR Intents', 'mainnet quote preview only']
  ]
  const html = items.map(([k, v]) => `<div class="mt">${k}<b>${v}</b></div>`).join('')
  $('#marq').innerHTML = html + html
}

const terms = (): void => {
  const rows: readonly (readonly [string, string, string])[] = [
    ['Flat fee', `${bpsToPct(P.feeBps)}%`, 'On principal, shown before you confirm'],
    ['Term', `${P.termDays} days`, `Then a ${P.graceDays}-day grace period`],
    ['Advance rate', `${bpsToPct(P.advanceBps.agent)}% / ${bpsToPct(P.advanceBps.creator)}%`, 'Agents / creators, of trailing 30-day routed revenue'],
    ['Per-business cap', `${fmt0(P.cap)} USDC`, 'Limit never exceeds this'],
    ['Repay split', `${bpsToPct(P.splitBps)}%`, `${bpsToPct(P.pastDueSplitBps)}% once a loan is past due`],
    ['Starter limit', 'None', 'No routed revenue, no credit']
  ]
  $('#terms-grid').innerHTML = rows.map(([k, v, d]) => `<div class="term"><span class="k">${k}</span><b>${v}</b><small>${d}</small></div>`).join('')
}

const start = (): void => {
  tiles()
  terms()
  boot()
  rotator()
  tilt()
  liveCard()
  reveals()
  controls()
  marquee()
  navigation()
  const frames = [scenes(), horizontal(), finale(), hero()]
  const prog = $('#prog')
  const spy = $$<HTMLAnchorElement>('#links a')
  const targets = spy.map((a) => document.querySelector(a.getAttribute('href') ?? '#top'))
  let queued = false
  const frame = (): void => {
    queued = false
    const vh = innerHeight
    frames.forEach((f) => f.frame(vh))
    prog.style.transform = `scaleX(${clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - vh))})`
    let cur = -1
    targets.forEach((t, i) => {
      if (t !== null && t.getBoundingClientRect().top < vh * 0.45) cur = i
    })
    spy.forEach((a, i) => a.classList.toggle('on', i === cur))
  }
  const request = (): void => {
    if (!queued) {
      queued = true
      requestAnimationFrame(frame)
    }
  }
  addEventListener('scroll', request, { passive: true })
  addEventListener('resize', request)
  frame()
}

start()


import { USDC_UNIT, bpsToPct, fmt2, parseUsdc } from '../lib/engine'
import { cfg, demoBusinessIds, txUrl } from '../lib/chain/config'
import { loadSnapshot, readStorageMin } from '../lib/chain/reads'
import type { Snapshot } from '../lib/chain/reads'
import { TxError, lpDeposit, lpWithdraw, mintUsdc, payThroughLink, poke, registerBusiness, registerUsdc, requestDraw } from '../lib/chain/tx'
import type { TxResult } from '../lib/chain/tx'
import { onAccountChange, restoreSession, signIn, signOut, signedInAccount } from '../lib/chain/wallet'
import { MAIN_NAV, MORE_NAV, TITLES, isView } from './copy'
import type { ViewName } from './copy'
import { $, $$, $maybe, esc } from './dom'
import { ic } from './icons'
import { intentsPreviewBlock } from './intentsPreview'
import { errorView, kindChip, shortId, skeletonView, vBusiness, vLoans, vLp, vPay, vTestnet } from './views'
import type { LoadState, UiState, ViewCtx } from './views'

const REGISTERED_KEY = 'rv-registered'
const TOAST_MS = 5000

const loadRegistered = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REGISTERED_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

const ui: UiState = { view: 'business', moreOpen: false, noteFilter: 'all', biz: demoBusinessIds()[0] ?? cfg.businesses.agent, registered: loadRegistered() }

const markRegistered = (id: string): void => {
  if (ui.registered.includes(id)) return
  ui.registered = [...ui.registered, id]
  try {
    localStorage.setItem(REGISTERED_KEY, JSON.stringify(ui.registered))
  } catch {
    return
  }
}
let snap: Snapshot | null = null
let load: LoadState = 'loading'
let loadError: string | null = null
let busy = false
let me: string | null = null
let loadRun = 0
let paintedKey = ''

interface TxNotice {
  tone: 'ok' | 'bad' | 'info'
  text: string
  hash: string | null
}
let txNotice: TxNotice | null = null
let announced = ''

const ctx = (): ViewCtx => ({ snap, load, loadError, me, ui, busy })
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : 'Something went wrong. Try again.')

let toastTimer: number | undefined
const toast = (message: string): void => {
  const el = $('#toast')
  el.textContent = message
  el.classList.add('on')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el.classList.remove('on'), TOAST_MS)
}

const announce = (message: string, urgent: boolean): void => {
  const el = $(urgent ? '#live-alert' : '#live-status')
  el.textContent = ''
  window.setTimeout(() => {
    el.textContent = message
  }, 60)
}

const renderNotice = (): void => {
  const n = txNotice
  const link = n?.hash == null ? '' : ` <a class="xl" href="${esc(txUrl(n.hash))}" target="_blank" rel="noopener noreferrer">Tx ${esc(n.hash.slice(0, 8))}…<span class="sr-only"> (opens in a new tab)</span>${ic('up', 1.6)}</a>`
  const lead = n === null ? '' : n.tone === 'info' ? '<span class="spin" aria-hidden="true"></span>' : ic(n.tone === 'bad' ? 'warn' : 'check', 2)
  $('#tx-slot').innerHTML =
    n === null
      ? ''
      : `<div class="banner ${n.tone === 'bad' ? '' : n.tone}">${lead}<span style="flex:1">${esc(n.text)}${link}</span><button class="btn secondary" data-dismiss>Dismiss</button></div>`
  if (n === null) {
    announced = ''
  } else if (n.text !== announced) {
    announced = n.text
    announce(n.text, n.tone === 'bad')
  }
  const d = $maybe<HTMLButtonElement>('[data-dismiss]')
  if (d !== null) {
    d.onclick = () => {
      txNotice = null
      renderNotice()
      focusMain()
    }
  }
}

const focusMain = (): void => {
  $('#main').focus({ preventScroll: true })
}

const renderChrome = (): void => {
  $('#acct').innerHTML =
    me === null
      ? `<button class="btn primary" id="connect">${ic('wallet', 2)}<span>Connect<span class="xs-hide"> wallet</span></span></button>`
      : `<span class="acct-chip"><span class="wav" aria-hidden="true"></span><span class="addr"><span class="sr-only">Signed in on testnet as </span>${esc(me)}</span><small class="num">${snap?.me?.usdc.ok === true ? `${fmt2(BigInt(snap.me.usdc.value))} USDC` : ''}</small></span><button class="btn secondary" id="signout">Sign out</button>`
  const c = $maybe<HTMLButtonElement>('#connect')
  if (c !== null) c.onclick = () => void connect()
  const o = $maybe<HTMLButtonElement>('#signout')
  if (o !== null) o.onclick = () => void signOut()
}

const setMore = (open: boolean): void => {
  ui.moreOpen = open
  const btn = $maybe<HTMLButtonElement>('#more-btn')
  const menu = $maybe('#more-menu')
  if (btn !== null) btn.setAttribute('aria-expanded', String(open))
  if (menu !== null) menu.hidden = !open
}

const renderSide = (): void => {
  const inMore = MORE_NAV.some((m) => m[0] === ui.view)
  $('#nav-main').innerHTML =
    MAIN_NAV.map(([v, i, t, short]) =>
      short === t
        ? `<a href="#/${v}" data-nav="${v}" ${ui.view === v ? 'aria-current="page"' : ''}>${ic(i)}<span class="lbl">${t}</span></a>`
        : `<a href="#/${v}" data-nav="${v}" aria-label="${t}" ${ui.view === v ? 'aria-current="page"' : ''}>${ic(i)}<span class="lbl"><span class="l-full" aria-hidden="true">${t}</span><span class="l-short" aria-hidden="true">${short}</span></span></a>`
    ).join('') +
    `<div class="more-wrap"><button id="more-btn" aria-expanded="${ui.moreOpen}" aria-controls="more-menu" ${inMore ? 'aria-current="page"' : ''}>${ic('plus')}<span class="lbl">More</span><svg class="chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8l4 4 4-4"/></svg></button>
    <div class="menu" id="more-menu" ${ui.moreOpen ? '' : 'hidden'}>${MORE_NAV.map(
      ([v, i, t, sub]) => `<a href="#/${v}" data-nav="${v}" ${ui.view === v ? 'aria-current="page"' : ''}>${ic(i)}<span>${t}<small>${sub}</small></span></a>`
    ).join('')}</div></div>`
  $$<HTMLAnchorElement>('#nav-main [data-nav]').forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault()
      const target = a.dataset.nav
      if (target !== undefined && isView(target)) go(target)
    }
  })
  $('#more-btn').onclick = (e) => {
    e.stopPropagation()
    setMore(!ui.moreOpen)
  }
  const [title, sub] = TITLES[ui.view]
  const kind = snap?.credit.ok === true ? snap.credit.value.kind : null
  $('#crumb').innerHTML = `<h1 id="page-h" tabindex="-1">${title}</h1><span>${ui.view === 'business' ? esc(ui.biz) : sub}</span>${ui.view === 'business' && kind !== null ? kindChip(kind) : ''}`
  document.title = `${title} · RevVault`
  renderChrome()
}

const go = (view: ViewName): void => {
  ui.moreOpen = false
  ui.view = view
  location.hash = `#/${view}`
  render(false)
  window.scrollTo({ top: 0 })
  $('#page-h').focus({ preventScroll: true })
}

const FOCUS_ROOTS = ['#main', '#nav-main', '#acct', '#modal'] as const
const KEPT_FIELDS = '#main input[id]'

interface Kept {
  root: string
  selector: string
  caret: [number | null, number | null]
}

const selectorOf = (el: Element): string | null => {
  const quote = (v: string): string => v.replace(/["\\]/g, '\\$&')
  if (el.id !== '') return `#${CSS.escape(el.id)}`
  const name = el.getAttribute('name')
  const value = el.getAttribute('value')
  if (name !== null && value !== null) return `[name="${quote(name)}"][value="${quote(value)}"]`
  const data = [...el.attributes].find((a) => a.name.startsWith('data-'))
  return data === undefined ? null : `[${data.name}="${quote(data.value)}"]`
}

const keepFocus = (): Kept | null => {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return null
  const root = FOCUS_ROOTS.find((r) => $maybe(r)?.contains(el) === true)
  const selector = selectorOf(el)
  if (root === undefined || selector === null) return null
  const caret: Kept['caret'] = el instanceof HTMLInputElement && el.type === 'text' ? [el.selectionStart, el.selectionEnd] : [null, null]
  return { root, selector, caret }
}

const restoreFocus = (kept: Kept | null): void => {
  if (kept === null) return
  const el = $maybe<HTMLElement>(kept.selector, $(kept.root))
  if (el === null) return
  el.focus({ preventScroll: true })
  if (el instanceof HTMLInputElement && kept.caret[0] !== null && el.type === 'text') el.setSelectionRange(kept.caret[0], kept.caret[1])
}

interface KeptFields {
  values: Map<string, string>
  radio: string | null
  open: boolean[]
}

const keepFields = (): KeptFields => ({
  values: new Map($$<HTMLInputElement>(KEPT_FIELDS).filter((i) => i.type !== 'radio').map((i) => [i.id, i.value] as const)),
  radio: $maybe<HTMLInputElement>('#main input[name="regkind"]:checked')?.value ?? null,
  open: $$<HTMLDetailsElement>('#main details').map((d) => d.open)
})

const restoreFields = (kept: KeptFields): void => {
  kept.values.forEach((value, id) => {
    const input = $maybe<HTMLInputElement>(`#${CSS.escape(id)}`, $('#main'))
    if (input === null || input.value === value) return
    input.value = value
    input.dispatchEvent(new Event('input'))
  })
  if (kept.radio !== null) {
    const radio = $maybe<HTMLInputElement>(`#main input[name="regkind"][value="${kept.radio}"]`)
    if (radio !== null) radio.checked = true
  }
  $$<HTMLDetailsElement>('#main details').forEach((d, i) => {
    d.open = kept.open[i] ?? false
  })
}

const render = (keep = true): void => {
  const focus = keep ? keepFocus() : null
  const fields = keep ? keepFields() : null
  renderSide()
  renderNotice()
  const c = ctx()
  const html: Record<ViewName, () => string> = {
    business: () => vBusiness(c),
    loans: () => vLoans(c),
    pay: () => vPay(c),
    lp: () => vLp(c),
    testnet: () => vTestnet(c, intentsPreviewBlock())
  }
  const key = `${ui.view}:${ui.biz}:${snap === null ? 'wait' : 'ready'}`
  $('#main').classList.toggle('still', key === paintedKey)
  $('#main').setAttribute('aria-busy', String(busy))
  paintedKey = key
  $('#main').innerHTML = load === 'loading' && snap === null ? skeletonView('Loading testnet data') : load === 'error' && snap === null ? errorView(loadError ?? 'RPC unreachable.') : html[ui.view]()
  bind()
  if (fields !== null) restoreFields(fields)
  restoreFocus(focus)
}

const refresh = async (): Promise<void> => {
  const run = (loadRun += 1)
  if (snap === null) load = 'loading'
  try {
    const next = await loadSnapshot(ui.biz, me)
    if (run !== loadRun) return
    // Every read failed: the RPC is down. Show the Retry screen instead of a page of error cards.
    if (!next.stats.ok && !next.credit.ok && !next.notes.ok) {
      loadError = next.stats.error
      load = snap === null ? 'error' : 'ok'
    } else {
      snap = next
      load = 'ok'
      loadError = null
    }
  } catch (error) {
    if (run !== loadRun) return
    loadError = messageOf(error)
    load = snap === null ? 'error' : 'ok'
  }
  render()
}

const connect = async (): Promise<void> => {
  try {
    await signIn()
  } catch (error) {
    txNotice = { tone: 'bad', text: messageOf(error), hash: null }
    renderNotice()
  }
}

/** Runs one wallet transaction: lock the UI, wait for the final result, refresh from the chain, show the hash. */
const runTx = async (label: string, action: () => Promise<TxResult>): Promise<TxResult | null> => {
  if (busy) return null
  busy = true
  txNotice = { tone: 'info', text: `${label}: confirm in your wallet, then waiting for the chain…`, hash: null }
  render()
  try {
    const r = await action()
    txNotice = { tone: 'ok', text: `${label}: done.`, hash: r.hash }
    busy = false
    await refresh()
    return r
  } catch (error) {
    txNotice = { tone: 'bad', text: `${label} failed. ${messageOf(error)}`, hash: error instanceof TxError ? error.hash : null }
    busy = false
    await refresh()
    return null
  } finally {
    busy = false
  }
}

const needWallet = (): boolean => {
  if (me !== null) return true
  toast('Connect a testnet wallet first')
  void connect()
  return false
}

const bind = (): void => {
  $$<HTMLButtonElement>('#main [data-view]').forEach((b) => {
    b.onclick = () => {
      const target = b.dataset.view
      if (target !== undefined && isView(target)) go(target)
    }
  })
  $$<HTMLButtonElement>('[data-retry]').forEach((b) => (b.onclick = () => void refresh()))
  $$<HTMLButtonElement>('[data-biz]').forEach((b) => {
    b.onclick = () => {
      ui.biz = b.dataset.biz ?? ui.biz
      snap = null
      load = 'loading'
      render()
      void refresh()
    }
  })
  $$<HTMLButtonElement>('[data-draw]').forEach((b) => (b.onclick = () => drawFlow()))
  $$<HTMLButtonElement>('[data-connect]').forEach((b) => (b.onclick = () => void connect()))
  $$<HTMLButtonElement>('[data-nf]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.nf
      if (k === 'all' || k === 'agent' || k === 'creator') {
        ui.noteFilter = k
        render()
      }
    }
  })
  $$<HTMLButtonElement>('[data-poke]').forEach((b) => {
    b.onclick = () => {
      if (needWallet()) void runTx('Poke loan', () => poke(b.dataset.poke ?? ui.biz))
    }
  })
  $$<HTMLButtonElement>('[data-register-go]').forEach((b) => {
    b.onclick = () => {
      if (!needWallet() || me === null) return
      const who = me
      const kind = $maybe<HTMLInputElement>('input[name="regkind"]:checked')?.value === 'creator' ? 'creator' : 'agent'
      void runTx(`Register as ${kind}`, async () => {
        try {
          const r = await registerBusiness(kind)
          markRegistered(who)
          return r
        } catch (error) {
          if (messageOf(error).toLowerCase().includes('already')) markRegistered(who)
          throw error
        }
      })
    }
  })
  $$<HTMLButtonElement>('[data-mint]').forEach((b) => {
    b.onclick = () => {
      if (needWallet() && me !== null) {
        const to = me
        void runTx('Mint 1,000 test USDC', () => mintUsdc(to, 1_000n * USDC_UNIT))
      }
    }
  })
  $$<HTMLButtonElement>('[data-usdc-register]').forEach((b) => {
    b.onclick = () => {
      if (needWallet() && me !== null) {
        const who = me
        void runTx('Register for USDC', async () => registerUsdc(who, await readStorageMin()))
      }
    }
  })
  const amountInput = $maybe<HTMLInputElement>('#amt-in')
  if (amountInput !== null) bindPay(amountInput)
  const deposit = $maybe<HTMLButtonElement>('#lp-dep')
  if (deposit !== null) bindPool(deposit)
}

const myUsdc = (): bigint | null => (snap?.me?.usdc.ok === true ? BigInt(snap.me.usdc.value) : null)

const bindPay = (amountInput: HTMLInputElement): void => {
  const refInput = $<HTMLInputElement>('#ref-in')
  amountInput.oninput = () => {
    const parsed = parseUsdc(amountInput.value)
    $('#pl-amt').textContent = amountInput.value === '' ? '0' : amountInput.value
    $('#ph-amt').textContent = fmt2(parsed ?? 0n)
  }
  refInput.oninput = () => {
    $('#ph-ref').textContent = refInput.value
  }
  $('#copy').onclick = () => {
    void navigator.clipboard?.writeText(`revvault.app/pay/${ui.biz}?amt=${amountInput.value}`).catch(() => undefined)
    toast('Pay link copied')
  }
  $('#pay-btn').onclick = () => {
    if (!needWallet()) return
    const amount = parseUsdc(amountInput.value)
    if (amount === null || amount <= 0n) return toast('Enter an amount above zero')
    if (me === ui.biz) return toast('A business cannot pay itself. Sign in with another account.')
    const ref = refInput.value.trim()
    if (ref.length === 0 || ref.length > 64) return toast('Reference must be 1 to 64 characters')
    const bal = myUsdc()
    if (bal !== null && amount > bal) return toast(`Insufficient balance: you have ${fmt2(bal)} USDC. Mint test USDC first.`)
    const biz = ui.biz
    void runTx(`Pay ${fmt2(amount)} USDC to ${shortId(biz)}`, () => payThroughLink(biz, amount, ref))
  }
}

const bindPool = (deposit: HTMLButtonElement): void => {
  const amountInput = $<HTMLInputElement>('#lp-amt')
  const sharesInput = $<HTMLInputElement>('#lp-sh')
  deposit.onclick = () => {
    if (!needWallet()) return
    const amount = parseUsdc(amountInput.value)
    if (amount === null || amount < USDC_UNIT) return toast('Deposit at least 1 USDC')
    const bal = myUsdc()
    if (bal !== null && amount > bal) return toast(`Insufficient balance: you have ${fmt2(bal)} USDC. Mint test USDC first.`)
    void runTx(`LP deposit ${fmt2(amount)} USDC`, () => lpDeposit(amount))
  }
  $('#lp-wd').onclick = () => {
    if (!needWallet()) return
    const shares = parseUsdc(sharesInput.value)
    if (shares === null || shares <= 0n) return toast('Enter the rvUSDC shares to withdraw')
    const mine = snap?.me?.lp.ok === true ? BigInt(snap.me.lp.value.shares) : 0n
    if (shares > mine) return toast(`Insufficient shares: you hold ${fmt2(mine)} rvUSDC`)
    void runTx(`Withdraw ${fmt2(shares)} rvUSDC`, () => lpWithdraw(shares))
  }
}

const focusables = (root: HTMLElement): HTMLElement[] =>
  $$<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', root).filter((el) => !el.hidden)

let modalReturnFocus: HTMLElement | null = null
const modalOpen = (): boolean => $('#modal').innerHTML !== ''

const closeModal = (): void => {
  $('#modal').innerHTML = ''
  $('#shell').inert = false
  const back = modalReturnFocus
  modalReturnFocus = null
  if (back !== null && back.isConnected && !back.hasAttribute('disabled')) back.focus()
}

const drawFlow = (): void => {
  if (!needWallet() || snap === null || !snap.credit.ok || me !== snap.biz) return
  const credit = snap.credit.value
  const available = BigInt(credit.available)
  if (available <= 0n) return toast('No credit available right now')
  const feeBps = snap.params.ok ? snap.params.value.feeBps : null
  modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  $('#shell').inert = true
  const maxWhole = Number(available / USDC_UNIT)
  let amountText = String(Math.max(1, Math.min(maxWhole, 500)))
  let vendor = cfg.vendors[0] ?? ''
  let error = ''

  const draw = (): void => {
    const parsed = parseUsdc(amountText)
    const fee = parsed === null || feeBps === null ? null : (parsed * BigInt(feeBps) + 9_999n) / 10_000n
    const kept = modalOpen() ? keepFocus() : null
    $('#modal').innerHTML = `<div class="scrim" id="scrim"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="dlg-h" aria-describedby="dlg-d"><div class="modal-h"><div class="row"><h2 id="dlg-h">Draw credit</h2><span id="dlg-d">Real testnet transaction</span></div></div><div class="modal-b">
      <div class="field"><label for="da">Amount (USDC), up to ${fmt2(available)} available</label><input type="number" id="da" min="1" max="${maxWhole}" value="${esc(amountText)}" inputmode="decimal" autocomplete="off" ${error === '' ? '' : 'aria-invalid="true" aria-describedby="da-err"'}></div>
      <div class="vlabel" id="vl">Pay this vendor</div><div class="picks" role="group" aria-labelledby="vl">${cfg.vendors.map((v) => `<button class="pick" data-v="${esc(v)}" aria-pressed="${v === vendor}"><span class="av" style="--c:var(--op)">${esc(v.slice(0, 2).toUpperCase())}</span><span><b>${esc(shortId(v))}</b><small>Direct FT transfer (testnet)</small></span></button>`).join('')}</div>
      <div class="review" style="margin-top:12px"><div class="row"><span>Paid to ${esc(shortId(vendor))}</span><b class="num">${fmt2(parsed ?? 0n)} USDC</b></div><div class="row"><span>Fee${feeBps === null ? '' : ` (${bpsToPct(feeBps)}%)`}</span><b class="num">${fee === null ? 'set by the contract' : `${fmt2(fee)} USDC`}</b></div><div class="row"><span>Repay split</span><b>${Math.round(bpsToPct(credit.effectiveSplitBps))}% of each payment</b></div></div>
      <div class="hint">Funds go straight to the vendor. The contract checks the limit and vault cash; a rejection shows its message.</div>${error === '' ? '' : `<div class="field-err" id="da-err" role="alert">${ic('warn', 2)}${esc(error)}</div>`}</div>
      <div class="modal-f"><button class="btn ghost" id="mx">Cancel</button><button class="btn primary" id="mn">Confirm draw</button></div></div></div>`
    $<HTMLInputElement>('#da').oninput = (e) => {
      amountText = (e.target as HTMLInputElement).value
    }
    $<HTMLInputElement>('#da').onchange = draw
    $$<HTMLButtonElement>('[data-v]').forEach((b) => {
      b.onclick = () => {
        vendor = b.dataset.v ?? vendor
        draw()
      }
    })
    $('#mx').onclick = closeModal
    $('#mn').onclick = () => {
      const amount = parseUsdc(amountText)
      if (amount === null || amount <= 0n) {
        error = 'Enter an amount above zero.'
        return draw()
      }
      if (amount > available) {
        error = `Over your available credit (${fmt2(available)} USDC).`
        return draw()
      }
      closeModal()
      void runTx(`Draw ${fmt2(amount)} USDC to ${shortId(vendor)}`, () => requestDraw(amount, vendor, 'Compute'))
    }
    $('#scrim').onclick = (e) => {
      if (e.target instanceof HTMLElement && e.target.id === 'scrim') closeModal()
    }
    if (kept === null) $('#da').focus()
    else restoreFocus(kept)
  }
  draw()
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modalOpen()) return closeModal()
    if (ui.moreOpen) {
      const inside = $maybe('.more-wrap')?.contains(document.activeElement) === true
      setMore(false)
      if (inside) $maybe('#more-btn')?.focus()
    }
    return
  }
  if (e.key === 'Tab' && modalOpen()) {
    const dialog = $('.modal', $('#modal'))
    const items = focusables(dialog)
    const firstEl = items[0]
    const lastEl = items[items.length - 1]
    if (firstEl === undefined || lastEl === undefined) return
    if (!dialog.contains(document.activeElement)) {
      e.preventDefault()
      firstEl.focus()
    } else if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault()
      lastEl.focus()
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault()
      firstEl.focus()
    }
  }
})

document.addEventListener(
  'click',
  (e) => {
    if (e.target instanceof Element && e.target.closest('[aria-disabled="true"]') !== null) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  },
  true
)

document.addEventListener('click', (e) => {
  if (ui.moreOpen && e.target instanceof Element && e.target.closest('.more-wrap') === null) setMore(false)
})

$('#nav-main').addEventListener('focusout', (e) => {
  if (ui.moreOpen && e.relatedTarget instanceof Node && $maybe('.more-wrap')?.contains(e.relatedTarget) === false) setMore(false)
})

$('.skip').addEventListener('click', (e) => {
  e.preventDefault()
  focusMain()
})

const fromHash = (): void => {
  const h = location.hash.replace('#/', '')
  if (isView(h)) ui.view = h
}

window.addEventListener('hashchange', () => {
  const prev = ui.view
  fromHash()
  if (ui.view !== prev) {
    render(false)
    $('#page-h').focus({ preventScroll: true })
  }
})

window.addEventListener('rv:wallet-error', (e) => {
  txNotice = { tone: 'bad', text: e instanceof CustomEvent && typeof e.detail === 'string' ? e.detail : 'Sign-in refused', hash: null }
  renderNotice()
})

onAccountChange((id) => {
  me = id
  snap = null
  load = 'loading'
  if (id !== null && !demoBusinessIds().includes(ui.biz) && ui.biz !== id) ui.biz = id
  toast(id === null ? 'Signed out' : `Signed in as ${id}`)
  render()
  void refresh()
})

fromHash()
render()
void refresh()
void restoreSession().then(() => {
  me = signedInAccount()
})

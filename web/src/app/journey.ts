import { P, bpsToPct, fmt0, fmt2, pctOf } from '../lib/engine'
import type { Credit, Loan } from '../lib/chain/types'
import { esc } from './dom'
import { ic } from './icons'
import type { IconName } from './icons'
import { shortId } from './ids'
import type { ViewCtx } from './views'

const micro = (v: string): bigint => BigInt(v)

export const openLoan = (loans: Loan[]): Loan | null => loans.find((l) => l.status === 'open' || l.status === 'delinquent') ?? null

type StepState = 'done' | 'current' | 'locked'
type Illustration = 'wallet' | 'link' | 'coins' | 'draw' | 'repay' | 'view' | 'lock'
type Tone = 'blue' | 'warn' | 'ok' | 'down'

interface StepView {
  n: number
  label: string
  state: StepState
  caption: string
}

interface Action {
  label: string
  attrs: string
  icon: IconName
}

interface Next {
  ill: Illustration
  tone: Tone
  title: string
  body: string
  extra: string
  primary: Action | null
  secondary: Action | null
  why: string
}

export interface Journey {
  steps: StepView[]
  currentIndex: number
  next: Next
}

interface Own {
  account: string
  credit: Credit
  loans: Loan[]
}

export type JourneyState = { kind: 'ready'; journey: Journey } | { kind: 'other' } | { kind: 'unavailable' } | { kind: 'wait' }

const LABELS = ['Connect wallet', 'Create pay link', 'Get paid', 'Draw credit', 'Repay'] as const

/** The contract has no is_registered view and get_credit answers alike for "unregistered" and "registered agent, no revenue yet", so chain proof is history, creator kind, attestation or a non-active status; the local hint covers only the rest. */
export const registeredOnChain = (credit: Credit, loans: Loan[]): boolean =>
  loans.length > 0 || micro(credit.trailingRevenue) > 0n || credit.kind === 'creator' || credit.attested || credit.status !== 'active'

const drawBlock = (own: Own): string => {
  if (own.credit.status === 'paused') return 'This business is paused by the vault owner.'
  if (own.credit.status === 'delinquent') return 'New draws are blocked while a loan is past due or written off.'
  if (openLoan(own.loans) !== null) return 'Finish repaying the open loan first.'
  if (micro(own.credit.available) <= 0n) return 'No credit available: only revenue routed through the pay link counts.'
  return ''
}

const kindPicker = (): string =>
  `<fieldset class="kindpick"><legend>What kind of business is this?</legend>
    <label class="kp"><input type="radio" name="regkind" value="agent" checked><span><b>AI agent</b><small>Runs by itself and pays for compute and APIs. Advance ${bpsToPct(P.advanceBps.agent)}%.</small></span></label>
    <label class="kp"><input type="radio" name="regkind" value="creator"><span><b>Creator</b><small>Tips, sponsors and commissions. Advance ${bpsToPct(P.advanceBps.creator)}%.</small></span></label>
    <p class="hint">The kind cannot be changed later. Registering costs no deposit.</p></fieldset>`

const debtBar = (credit: Credit, loan: Loan): string => {
  const total = micro(loan.principal) + micro(loan.fee)
  const pct = Math.round(pctOf(micro(loan.repaid), total))
  return `<div class="nx-debt"><div class="debt" role="progressbar" aria-label="Loan repaid" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${pct}% repaid"><i class="paid" style="width:${pct}%"></i></div>
    <div class="debt-l"><span><b class="num">${fmt2(micro(loan.repaid))}</b> of ${fmt2(total)} USDC repaid (${pct}%)</span><span>${credit.estDaysToClear === null ? 'Clearing time unknown' : `Clears in about ${credit.estDaysToClear} days`}</span></div></div>`
}

const connectNext = (): Next => ({
  ill: 'wallet',
  tone: 'blue',
  title: 'Connect a testnet wallet',
  body: 'Your wallet signs every action. Use a throwaway testnet account, never a personal one. You can browse this demo without connecting.',
  extra: '',
  primary: { label: 'Connect wallet', attrs: 'data-connect', icon: 'wallet' },
  secondary: null,
  why: ''
})

const nextFor = (own: Own, done: boolean[]): Next => {
  const { credit, loans } = own
  const split = Math.round(bpsToPct(credit.effectiveSplitBps))
  const loan = openLoan(loans)
  const none: Pick<Next, 'extra' | 'primary' | 'secondary' | 'why'> = { extra: '', primary: null, secondary: null, why: '' }
  const payLink: Action = { label: 'Open pay link', attrs: 'data-view="pay"', icon: 'link' }

  if (credit.status === 'paused') {
    return { ...none, ill: 'lock', tone: 'down', title: 'This business is paused', body: 'The vault owner paused it, so nothing can be drawn right now. Existing balances are unchanged.', why: 'Nothing for you to do until the owner unpauses it.' }
  }
  if (credit.status === 'delinquent') {
    return {
      ...none,
      ill: 'lock',
      tone: 'down',
      title: 'Past due: repay before drawing again',
      body: `New draws are blocked. Each customer payment through your pay link now sends ${split}% to the loan.`,
      extra: loan === null ? '' : debtBar(credit, loan),
      primary: loan === null ? null : payLink,
      why: loan === null ? 'This loan was written off, so this business cannot draw again.' : ''
    }
  }
  if (loan !== null) {
    return {
      ...none,
      ill: 'repay',
      tone: 'warn',
      title: 'Your loan repays itself',
      body: `${fmt2(micro(credit.outstanding))} USDC left. ${split}% of every customer payment through your pay link goes to the loan automatically. There is nothing to repay by hand.`,
      extra: debtBar(credit, loan),
      primary: { ...payLink, label: 'Open pay link to get paid' }
    }
  }
  if (!done[1]) {
    return {
      ...none,
      ill: 'link',
      tone: 'blue',
      title: 'Create your pay link',
      body: 'Register this account as a business. Customers then pay through your link, and those payments become your credit history.',
      extra: kindPicker(),
      primary: { label: 'Create my pay link', attrs: 'data-register-go', icon: 'link' }
    }
  }
  if (!done[2]) {
    return {
      ...none,
      ill: 'coins',
      tone: 'blue',
      title: 'Get paid through your link',
      body: 'Credit is built only from revenue routed through your pay link in the last 30 days. Share the link, or pay it from a second testnet account to try it.',
      primary: payLink
    }
  }
  const reason = drawBlock(own)
  if (reason === '') {
    const again = loans.length > 0
    return {
      ...none,
      ill: 'draw',
      tone: 'ok',
      title: again ? `Draw again, up to ${fmt2(micro(credit.available))} USDC` : `Draw up to ${fmt2(micro(credit.available))} USDC`,
      body: `Pick a vendor and the pool pays them directly. The loan then repays itself from ${split}% of your next customer payments.`,
      primary: { label: again ? 'New draw' : 'Draw credit', attrs: 'data-draw', icon: 'up' }
    }
  }
  return {
    ...none,
    ill: 'coins',
    tone: 'warn',
    title: 'No credit available right now',
    body: 'Your limit is used up or at the per-business cap. More revenue routed through your pay link can raise it.',
    primary: payLink,
    why: reason
  }
}

const assemble = (next: (done: boolean[]) => Next, base: boolean[], revenue: bigint): Journey => {
  const done: boolean[] = []
  base.forEach((b, i) => done.push(b && (i === 0 || done[i - 1] === true)))
  const currentIndex = done.findIndex((d) => !d)
  const captions = ['Connected', 'Link is live', `${fmt0(revenue)} USDC routed`, 'Drawn', 'Paid off']
  const steps = LABELS.map((label, i): StepView => {
    const state: StepState = done[i] === true ? 'done' : i === currentIndex ? 'current' : 'locked'
    const caption = state === 'done' ? (captions[i] ?? '') : state === 'current' ? (i === 4 ? 'In progress' : i === 0 ? 'Start here' : 'Do this next') : `Unlocks after step ${currentIndex + 1}`
    return { n: i + 1, label, state, caption }
  })
  return { steps, currentIndex, next: next(done) }
}

/** The path always describes the connected account's own business, never the demo business on screen. */
export const journeyState = (ctx: ViewCtx): JourneyState => {
  const s = ctx.snap
  if (s === null) return { kind: 'wait' }
  if (ctx.me === null) return { kind: 'ready', journey: assemble(connectNext, [false, false, false, false, false], 0n) }
  if (ctx.me !== s.biz) return { kind: 'other' }
  const mine = s.me
  if (mine === null || mine.account !== ctx.me || !mine.credit.ok || !mine.loans.ok) return { kind: 'unavailable' }
  const own: Own = { account: mine.account, credit: mine.credit.value, loans: mine.loans.value }
  const revenue = micro(own.credit.trailingRevenue)
  const history = own.loans.length > 0 || revenue > 0n
  const base = [
    true,
    registeredOnChain(own.credit, own.loans) || ctx.ui.registered.includes(own.account),
    history,
    own.loans.length > 0,
    own.loans.length > 0 && openLoan(own.loans) === null && own.loans.some((l) => l.status === 'closed')
  ]
  return { kind: 'ready', journey: assemble((done) => nextFor(own, done), base, revenue) }
}

const sv = (inner: string): string =>
  `<svg class="ill" viewBox="0 0 160 120" aria-hidden="true" focusable="false">${inner}</svg>`

const ILLUSTRATIONS: Record<Illustration, string> = {
  wallet: sv(
    '<rect class="f a" x="28" y="40" width="96" height="58" rx="12"/><path class="a" d="M28 56v-8a8 8 0 0 1 8-8h62"/><rect class="a" x="98" y="62" width="34" height="22" rx="8"/><circle class="s" cx="111" cy="73" r="3"/><path class="a" d="M54 40V24M74 40V24M48 24h32"/><circle class="s pulse" cx="64" cy="14" r="3"/>'
  ),
  link: sv(
    '<rect class="f a" x="50" y="10" width="60" height="100" rx="12"/><path class="a" d="M70 18h20"/><g transform="translate(60 34) scale(2)"><path class="a" d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9"/><path class="a" d="M11.5 8.5a3 3 0 0 0-4.2 0L4.7 11.1a3 3 0 0 0 4.2 4.2l.9-.9"/></g><path class="a" d="M64 88h32"/><circle class="s pulse" cx="128" cy="32" r="3"/><circle class="s pulse d2" cx="30" cy="84" r="3"/>'
  ),
  coins: sv(
    '<rect class="f a" x="38" y="68" width="84" height="40" rx="12"/><circle class="a" cx="80" cy="88" r="9"/><path class="a" d="M80 79v-2M80 99v2"/><g class="fall"><circle class="w f2" cx="80" cy="20" r="9"/><path class="w" d="M80 16v8"/></g><g class="fall d2"><circle class="w f2" cx="52" cy="34" r="6"/></g><g class="fall d3"><circle class="w f2" cx="108" cy="30" r="6"/></g><path class="a" d="M80 36v22M74 52l6 6 6-6"/>'
  ),
  draw: sv(
    '<rect class="f a" x="10" y="42" width="48" height="44" rx="12"/><circle class="a" cx="34" cy="64" r="9"/><rect class="f a" x="106" y="42" width="44" height="44" rx="8"/><path class="a" d="M120 42v-8M136 42v-8M120 86v8M136 86v8"/><path class="a" d="M64 64h36M94 58l6 6-6 6"/><g class="slide"><circle class="w f2" cx="78" cy="64" r="7"/></g>'
  ),
  repay: sv(
    '<circle class="ring0" cx="80" cy="60" r="34"/><circle class="ring1" cx="80" cy="60" r="34" pathLength="100" stroke-dasharray="20 80" transform="rotate(-90 80 60)"/><circle class="ring2" cx="80" cy="60" r="34" pathLength="100" stroke-dasharray="80 20" stroke-dashoffset="-20" transform="rotate(-90 80 60)"/><g transform="translate(64 44) scale(1.6)"><rect class="a" x="3" y="5" width="14" height="10" rx="2.5"/><path class="a" d="M3 9h14"/></g>'
  ),
  view: sv(
    '<path class="f a" d="M24 60c14-24 34-34 56-34s42 10 56 34c-14 24-34 34-56 34S38 84 24 60z"/><circle class="a" cx="80" cy="60" r="13"/><circle class="s" cx="80" cy="60" r="5"/>'
  ),
  lock: sv(
    '<rect class="f a" x="46" y="54" width="68" height="50" rx="12"/><path class="a" d="M60 54V40a20 20 0 0 1 40 0v14"/><circle class="s" cx="80" cy="76" r="5"/><path class="a" d="M80 80v8"/>'
  )
}

const stepItem = (st: StepView): string => {
  const dot = st.state === 'done' ? ic('check', 2.2) : st.state === 'locked' ? ic('lock', 1.8) : String(st.n)
  return `<li class="st" data-state="${st.state}" ${st.state === 'current' ? 'aria-current="step"' : ''}><span class="st-dot" aria-hidden="true">${dot}</span><span class="st-t"><span class="sr-only">Step ${st.n} of 5: </span>${esc(st.label)}</span><span class="st-s">${esc(st.caption)}</span></li>`
}

const actionBtn = (a: Action, cls: string, busy: boolean): string =>
  `<button class="btn ${cls}" ${a.attrs} ${busy ? 'aria-disabled="true"' : ''}>${busy ? '<span class="spin" aria-hidden="true"></span>' : ic(a.icon, 2)}${esc(busy && cls === 'act-main' ? 'Waiting for your wallet…' : a.label)}</button>`

export const journeyCard = (ctx: ViewCtx, j: Journey): string => {
  const n = j.next
  const finished = j.currentIndex === -1
  const progress = Math.round((j.steps.filter((s) => s.state === 'done').length / (j.steps.length - 1)) * 100)
  const chip = finished ? 'All steps done' : `Step ${j.currentIndex + 1} of 5`
  return `<section class="card journey m-path rise" aria-labelledby="jr-h"><div class="ch">${ic('flag', 1.8)}<div class="ch-t"><h2 id="jr-h">Your path to credit</h2><span class="hint">One step at a time, top to bottom</span></div><span class="chip blue">${chip}</span></div>
    <ol class="steps5" style="--p:${Math.min(100, progress)}" aria-label="Progress, 5 steps">${j.steps.map(stepItem).join('')}</ol>
    <div class="next" data-tone="${n.tone}"><div class="next-ill">${ILLUSTRATIONS[n.ill]}</div>
      <div class="next-b"><span class="eyebrow">Next best action</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p>${n.extra}
      ${n.primary === null && n.secondary === null ? '' : `<div class="next-act">${n.primary === null ? '' : actionBtn(n.primary, 'act-main', ctx.busy)}${n.secondary === null ? '' : actionBtn(n.secondary, 'btn-link', false)}</div>`}
      ${n.why === '' ? '' : `<p class="why">${ic('info', 1.8)}<span>${esc(n.why)}</span></p>`}</div></div></section>`
}

export const journeyStrip = (j: Journey, withBack: boolean): string =>
  `<div class="jr-strip"><span class="chip blue">${j.currentIndex === -1 ? 'All steps done' : `Step ${j.currentIndex + 1} of 5`}</span><span class="jr-strip-t">${esc(j.next.title)}</span>${withBack ? `<button class="btn ghost" data-view="business">${ic('left', 2)}Back to the path</button>` : ''}</div>`

export const readOnlyBanner = (ctx: ViewCtx, cls = ''): string => {
  const s = ctx.snap
  if (s === null || ctx.me === null || ctx.me === s.biz) return ''
  return `<div class="banner info readonly ${cls}">${ic('info', 2)}<span><b>Read-only view.</b> You are looking at ${esc(shortId(s.biz))}, not your own business. Your path to credit and drawing belong to your own business.</span><button class="btn secondary" data-biz="${esc(ctx.me)}">${ic('home', 2)}Open my business</button></div>`
}

export const journeyUnavailable = (): string =>
  `<section class="card panel m-path rise" aria-labelledby="jr-h"><div class="errbox" role="alert">${ic('warn', 2)}<b id="jr-h">Could not read your business</b>Your path to credit needs your own on-chain data.<br><button class="btn secondary" data-retry>${ic('refresh')}Retry</button></div></section>`

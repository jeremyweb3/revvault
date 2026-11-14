import { P, bpsToPct, fmt0, fmt2, fmtScaled4, pctOf, USDC_UNIT } from '../lib/engine'
import { businessChoices } from '../lib/chain/reads'
import type { Part, Snapshot } from '../lib/chain/reads'
import { cfg, explorerLinks } from '../lib/chain/config'
import type { ExplorerLink } from '../lib/chain/config'
import type { Credit, Kind, Loan, LoanStatus, Note, NoteStatus, Params } from '../lib/chain/types'
import { COPY } from './copy'
import type { ViewName } from './copy'
import { badge, ic } from './icons'
import type { IconName } from './icons'
import { esc } from './dom'
import { journeyCard, journeyState, journeyStrip, journeyUnavailable, openLoan, readOnlyBanner } from './journey'
import type { JourneyState } from './journey'
import { shortId } from './ids'

export { shortId }

export interface UiState {
  view: ViewName
  moreOpen: boolean
  noteFilter: 'all' | Kind
  biz: string
  registered: string[]
}

export type LoadState = 'loading' | 'ok' | 'error'

export interface ViewCtx {
  snap: Snapshot | null
  load: LoadState
  loadError: string | null
  me: string | null
  ui: UiState
  busy: boolean
}

const micro = (v: string): bigint => BigInt(v)
const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

type ChipTone = 'ok' | 'bad' | 'warn' | 'blue' | 'op' | ''

export const chip = (tone: ChipTone, icon: IconName | null, text: string): string =>
  `<span class="chip ${tone}">${icon === null ? '<span class="dot" aria-hidden="true"></span>' : ic(icon, 2)}${text}</span>`

export const kindChip = (kind: Kind): string => chip(kind === 'creator' ? 'op' : 'blue', kind === 'creator' ? 'coin' : 'bot', kind === 'creator' ? 'Creator' : 'Agent')


const off = (cond: boolean): string => (cond ? 'aria-disabled="true"' : '')

const stat = (
  icon: IconName,
  title: string,
  value: string,
  unit: string,
  sub: string,
  o: { glow?: boolean; tone?: string; cls?: string; aside?: string } = {}
): string =>
  `<div class="card stat rise ${o.cls ?? ''} ${o.glow === true ? 'glow' : ''}"><div class="ch">${badge(icon, o.tone)}<h2>${title}</h2></div><div class="stat-row"><span class="v num">${value}${unit === '' ? '' : `<small>${unit}</small>`}</span>${o.aside ?? ''}</div><span class="d">${sub}</span></div>`

const retryBtn = (): string => `<button class="btn secondary" data-retry>${ic('refresh')}Retry</button>`

const failBox = (title: string, message: string): string =>
  `<section class="card panel"><div class="errbox" role="alert">${ic('warn', 2)}<b>${esc(title)}</b>${esc(message)}<br>${retryBtn()}</div></section>`

const skeleton = (label: string): string =>
  `<section class="card panel" aria-busy="true"><div class="skel" role="status" aria-label="${esc(label)}"><i></i><i></i><i></i></div></section>`

const emptyState = (icon: IconName, title: string, text: string): string =>
  `<div class="empty"><span class="empty-ic" aria-hidden="true">${ic(icon, 1.5)}</span><b>${title}</b>${text}</div>`

/** Pages that need one read: loading, error (Retry only) or the content. */
const gate = <T>(ctx: ViewCtx, p: (s: Snapshot) => Part<T>, title: string, render: (value: T, s: Snapshot) => string): string => {
  if (ctx.snap === null) {
    return ctx.load === 'error' ? failBox('Could not read testnet', ctx.loadError ?? 'RPC unreachable.') : skeleton('Loading testnet data')
  }
  const part = p(ctx.snap)
  return part.ok ? render(part.value, ctx.snap) : failBox(title, part.error)
}

const bizSwitch = (ctx: ViewCtx): string => {
  const ids = businessChoices(ctx.me)
  return `<div class="switchrow"><span class="hint" id="bs-l">Business shown</span><div class="seg" role="group" aria-labelledby="bs-l">${ids
    .map((id) => `<button data-biz="${esc(id)}" aria-pressed="${ctx.ui.biz === id}">${esc(shortId(id))}${id === ctx.me ? ' (you)' : ''}</button>`)
    .join('')}</div></div>`
}

const chart = (days: readonly { day: string; amount: string }[]): string => {
  const d = days.slice(-30)
  if (d.length === 0) return emptyState('trend', 'No revenue routed yet', 'Payments through the pay link show up here.')
  const values = d.map((b) => Number(micro(b.amount)) / 1_000_000)
  const mx = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0)
  const peakIdx = values.indexOf(Math.max(...values))
  const first = d[0]?.day ?? ''
  const last = d[d.length - 1]?.day ?? ''
  const summary = `Routed revenue over ${d.length} chain days: ${total.toLocaleString('en')} USDC in total, highest ${(values[peakIdx] ?? 0).toLocaleString('en')} USDC on ${d[peakIdx]?.day ?? ''}.`
  const bars = d
    .map((b, i) => {
      const n = values[i] ?? 0
      return `<i class="${n === 0 ? 'z' : ''}" style="--h:${n === 0 ? 0 : Math.max(4, (n / mx) * 100)}%;--n:${i}" title="${esc(b.day)}: ${n.toLocaleString('en')} USDC"></i>`
    })
    .join('')
  const rows = d.map((b, i) => `<tr><th scope="row">${esc(b.day)}</th><td class="amt num">${(values[i] ?? 0).toLocaleString('en')}</td></tr>`).join('')
  return `<div class="bars" role="img" aria-label="${esc(summary)}">${bars}</div><div class="chart-cap"><span>${esc(first)}</span><span>Peak ${(values[peakIdx] ?? 0).toLocaleString('en')} USDC</span><span>${esc(last)}</span></div>
    <details class="tools"><summary>${ic('trend', 1.8)}Show the numbers as a table</summary><div class="tablewrap" tabindex="0" role="region" aria-label="Revenue per day"><table><caption class="sr-only">Routed revenue per chain day, in USDC</caption><thead><tr><th scope="col">Day</th><th scope="col" class="amt">USDC</th></tr></thead><tbody>${rows}</tbody></table></div></details>`
}

const pathCard = (ctx: ViewCtx): string => {
  const j = journeyState(ctx)
  return j.kind === 'ready' ? journeyCard(ctx, j.journey) : j.kind === 'other' ? readOnlyBanner(ctx, 'm-path') : j.kind === 'unavailable' ? journeyUnavailable() : ''
}

const strip = (j: JourneyState, withBack: boolean): string => (j.kind === 'ready' ? journeyStrip(j.journey, withBack) : '')

const loanCard = (ctx: ViewCtx, credit: Credit, loans: Loan[]): string => {
  const L = openLoan(loans)
  if (L === null) {
    return `<section class="card panel loan idle rise"><div class="ch">${badge('loan', 'warn')}<h2>No active loan</h2>${chip('', 'check', 'Nothing to repay')}</div><ol class="flow3"><li>Draw credit to pay a vendor.</li><li>It repays itself from the next customer payments.</li><li>The draw mints a revenue note.</li></ol></section>`
  }
  const total = micro(L.principal) + micro(L.fee)
  const pct = Math.round(pctOf(micro(L.repaid), total))
  const left = total - micro(L.repaid)
  const past = L.status === 'delinquent' || credit.pastDue
  return `<section class="card panel loan live rise"><div class="ch">${badge('loan', 'warn')}<h2>Active loan · ${esc(L.id)}</h2>${past ? chip('bad', 'warn', 'Past due') : chip('ok', 'check', 'Self-repaying')}</div>
    <div class="loan-top"><span class="big num">${fmt2(left)}<small>USDC left</small></span><span class="hint">${esc(shortId(L.vendor))} · paid directly · due ${day(L.dueAtMs)}</span></div>
    <div class="debt" id="debt" role="progressbar" aria-label="Loan repaid" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${pct}% repaid"><i class="paid" style="width:${pct}%"></i></div>
    <div class="debt-l"><span><b class="num">${fmt2(micro(L.repaid))}</b> repaid of ${fmt2(total)}</span><span>${Math.round(bpsToPct(credit.effectiveSplitBps))}% of every payment · ${credit.estDaysToClear === null ? 'clearing time unknown' : `clears in ~${credit.estDaysToClear} days`}</span></div>
    <details class="tools"><summary>${ic('clock', 1.8)}Loan tools</summary><p class="hint">Anyone can check whether this loan is late. It only acts once the ${P.termDays}-day term has passed. This is the keeper “poke”.</p><button class="btn secondary" data-poke="${esc(L.business)}" ${off(ctx.me === null || ctx.busy)}>${ic('warn')}Check this loan for lateness</button></details></section>`
}

const heroCard = (credit: Credit, cap: string): string => {
  const lim = micro(credit.limit)
  const used = lim === 0n ? 0 : Math.min(100, pctOf(micro(credit.outstanding), lim))
  return `<section class="card hero glow m-hero rise" aria-labelledby="hero-h"><div class="ch">${badge('shield')}<h2 id="hero-h">Available credit</h2>${credit.attested ? chip('blue', 'check', 'Attested') : ''}</div>
    <span class="hero-v num">${fmt2(micro(credit.available))}<small>USDC</small></span>
    <div class="limitbar" role="img" aria-label="${Math.round(used)}% of the limit is in use, ${Math.round(100 - used)}% is available">${used > 0 ? `<i class="u" style="width:${used}%"></i>` : ''}<i class="a"></i></div>
    <div class="lg" aria-hidden="true"><span><i class="sw u"></i>In use</span><span><i class="sw a"></i>Available</span></div>
    <div class="hero-facts"><span>In use<b class="num">${fmt2(micro(credit.outstanding))} USDC</b></span><span>Limit (from the contract)<b class="num">${fmt2(lim)} USDC</b></span><span>Advance rate<b class="num">${bpsToPct(credit.advanceRateBps)}%</b></span><span>Per-business cap<b class="num">${cap} USDC</b></span></div></section>`
}

const flowCard = (credit: Credit): string => {
  const C = COPY[credit.kind]
  const split = Math.round(bpsToPct(credit.effectiveSplitBps))
  const arrow = `<span class="fl-arrow" aria-hidden="true">${ic('arrow', 1.8)}</span>`
  return `<section class="card panel m-flow rise" aria-labelledby="flow-h"><div class="ch">${badge('split', 'op')}<h2 id="flow-h">How the money moves</h2></div>
    <div class="flow"><div class="fl-node"><span class="fl-ic">${ic('coin', 1.6)}</span><b>Customer pays</b><small>Through your pay link</small></div>${arrow}
    <div class="fl-node"><span class="fl-ic blue">${ic('shield', 1.6)}</span><b>RevVault splits it</b><small>Every payment, automatically</small></div>${arrow}
    <div class="fl-out"><div class="fl-node warn"><span class="fl-ic">${ic('loan', 1.6)}</span><b class="num">${split}% to the loan</b><small>Only while you owe</small></div><div class="fl-node ok"><span class="fl-ic">${ic('wallet', 1.6)}</span><b class="num">${100 - split}% to you</b><small>Straight to the business wallet</small></div></div></div>
    <div class="sv-bar flat" aria-hidden="true"><i class="a" style="width:${split}%"></i><i class="b" style="width:${100 - split}%"></i></div>
    <p class="hint flow-note">${C.direct}</p></section>`
}

export const vBusiness = (ctx: ViewCtx): string => {
  const head = ctx.snap === null ? '' : bizSwitch(ctx)
  const body = gate(ctx, (s) => s.credit, 'Could not read this business', (credit, s) => {
    const loans = s.loans.ok ? s.loans.value : []
    const C = COPY[credit.kind]
    const banner = credit.status === 'delinquent'
      ? `<div class="banner" role="status">${ic('warn', 2)}<span>This business is past due or written off. New draws stay blocked${credit.pastDue ? `, and the repay split is now ${Math.round(bpsToPct(credit.effectiveSplitBps))}%` : ''}.</span></div>`
      : credit.status === 'paused'
        ? `<div class="banner" role="status">${ic('warn', 2)}<span>This business is paused by the vault owner.</span></div>`
        : ''
    const ledgerCard = s.ledger.ok ? chart(s.ledger.value) : `<div class="errbox" role="alert">${ic('warn', 2)}<b>Could not read the revenue ledger</b>${esc(s.ledger.error)}<br>${retryBtn()}</div>`
    const cap = s.params.ok ? fmt0(micro(s.params.value.perBizCap)) : '2,000'
    const split = Math.round(bpsToPct(credit.effectiveSplitBps))
    const owing = micro(credit.outstanding) > 0n
    return `${banner}<div class="mosaic dash">
    ${pathCard(ctx)}
    ${heroCard(credit, cap)}
    <div class="side m-side">${loanCard(ctx, credit, loans)}<div class="pair">
    ${stat('loan', 'Owed', fmt2(micro(credit.outstanding)), 'USDC', owing ? 'Principal plus fee, minus repaid' : 'No active loan', { tone: 'warn', cls: owing ? 'hot' : '' })}
    ${stat('split', 'Repay split', String(split), '%', 'Taken from each incoming payment', { tone: 'op', aside: `<span class="ring" style="--p:${split}" role="img" aria-label="${split}% of each payment repays the loan"></span>` })}</div></div>
    ${flowCard(credit)}
    <section class="card panel m-chart rise" aria-labelledby="chart-h"><div class="ch">${badge('trend', 'ok')}<h2 id="chart-h">Revenue routed through RevVault</h2>${chip('blue', 'clock', 'Last 30 chain days')}</div>
      <div class="chart-top"><span class="v num">${fmt0(micro(credit.trailingRevenue))}<small>USDC routed · 30d</small></span><span class="hint">${credit.noHistory ? 'No routed revenue yet' : 'Counted by the contract'}</span></div>${ledgerCard}
      <div class="chart-cap"><span>Only payments through the pay link count as collateral.</span></div></section>
    <section class="card panel m-cons rise" aria-labelledby="cons-h"><div class="ch">${badge('bot')}<h2 id="cons-h">Business constraints</h2>${kindChip(credit.kind)}</div>
      <div class="cons-body"><p class="mandate">${C.mandate}</p>
      <div class="rules"><div class="rule"><span class="k">Status</span><b>${credit.status === 'active' ? 'Active' : credit.status === 'paused' ? 'Paused' : 'Past due'}</b></div><div class="rule"><span class="k">Account</span><b>${esc(shortId(s.biz))}</b></div><div class="rule"><span class="k">Repay split</span><b class="num">${split}%</b></div><div class="rule"><span class="k">${C.access[0]}</span><b>${C.access[1]}</b></div></div></div></section>
    </div>`
  })
  return head + body
}

const tile = (icon: IconName, k: string, big: string, unit: string, sub: string, cls = ''): string =>
  `<div class="tile ${cls}"><span class="k">${ic(icon, 1.6)}${k}</span><span class="big num">${big}${unit === '' ? '' : `<small>${unit}</small>`}</span>${sub === '' ? '' : `<span class="s">${sub}</span>`}</div>`

const termsCard = (p: Params, kind: Kind): string =>
  `<section class="card panel rise" aria-labelledby="terms-h"><div class="ch">${badge('shield', 'ok')}<h2 id="terms-h">Loan terms</h2></div><div class="tiles">
    ${tile('coin', 'Fee', `${bpsToPct(p.feeBps)}%`, '', 'flat on principal')}${tile('clock', 'Term', String(p.loanTermDays), 'days', 'before a loan can go past due')}
    ${tile('trend', 'Advance rate', `${bpsToPct(kind === 'creator' ? p.advanceBpsCreator : p.advanceBpsAgent)}%`, '', `of trailing ${p.windowDays}d routed revenue`)}${tile('shield', 'Per-business cap', fmt0(micro(p.perBizCap)), 'USDC', 'most one business can owe')}
    ${tile('split', 'Repay split', `${bpsToPct(p.repayShareBpsDefault)}%`, '', `of each payment, ${bpsToPct(p.pastDueSplitBps)}% once past due`)}${tile('lock', 'Starter limit', 'None', '', 'No routed revenue, no credit.', 'none')}</div></section>`

const LOAN_CHIP: Record<LoanStatus, string> = {
  open: chip('warn', 'clock', 'Open'),
  closed: chip('ok', 'check', 'Closed'),
  delinquent: chip('bad', 'warn', 'Past due'),
  written_off: chip('bad', 'x', 'Written off')
}

const repaidCell = (repaid: string, principal: string, fee: string): string => {
  const p = Math.round(pctOf(micro(repaid), micro(principal) + micro(fee)))
  return `<span class="who"><span class="mini-meter" role="progressbar" aria-label="Repaid" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><i style="width:${p}%"></i></span><span class="num">${p}%</span></span>`
}

export const vLoans = (ctx: ViewCtx): string => {
  const head = ctx.snap === null ? '' : bizSwitch(ctx)
  const j = journeyState(ctx)
  const body = gate(ctx, (s) => s.loans, 'Could not read loans', (loans, s) => {
    const rows = loans.length === 0
      ? emptyState('loan', 'No loans yet', 'This business has not drawn. Its first draw shows up here.')
      : `<div class="tablewrap" tabindex="0" role="region" aria-label="Loan history table"><table><caption class="sr-only">Loans of ${esc(shortId(s.biz))}</caption><thead><tr><th scope="col">Loan · note</th><th scope="col">Vendor</th><th scope="col">Opened</th><th scope="col">Due</th><th scope="col">Repaid</th><th scope="col" class="amt">Principal</th><th scope="col" class="amt">Fee</th><th scope="col">Status</th></tr></thead><tbody>${loans
          .map(
            (l) =>
              `<tr><th scope="row" class="num">${esc(l.id)}</th><td>${esc(shortId(l.vendor))} <span class="hint">Direct FT (testnet)</span></td><td class="t num">${day(l.openedAtMs)}</td><td class="t num">${day(l.dueAtMs)}</td><td>${repaidCell(l.repaid, l.principal, l.fee)}</td><td class="amt num">${fmt2(micro(l.principal))}</td><td class="amt num">${fmt2(micro(l.fee))}</td><td>${LOAN_CHIP[l.status]}</td></tr>`
          )
          .join('')}</tbody></table></div>`
    const kind = s.credit.ok ? s.credit.value.kind : 'agent'
    return `<section class="card panel rise" aria-labelledby="loans-h"><div class="ch">${badge('loan', 'warn')}<h2 id="loans-h">Loan history · ${esc(shortId(s.biz))}</h2><button class="btn secondary" data-view="business">${ic('left', 2)}Draw from the Dashboard path</button></div>${rows}</section>
    ${s.params.ok ? termsCard(s.params.value, kind) : ''}`
  })
  return head + readOnlyBanner(ctx) + strip(j, false) + body
}

const walletCard = (ctx: ViewCtx): string => {
  if (ctx.me === null || ctx.snap?.me == null) {
    return `<section class="card panel" aria-labelledby="wal-h"><div class="ch">${badge('coin', 'op')}<h2 id="wal-h">Your testnet wallet</h2></div><p class="mandate">Connect a testnet account to mint mock USDC and sign transactions.</p><button class="btn primary" data-connect>${ic('wallet', 2)}Connect wallet</button></section>`
  }
  const me = ctx.snap.me
  const bal = me.usdc.ok ? `${fmt2(micro(me.usdc.value))}<small>USDC</small>` : '—'
  const reg = me.registered.ok ? (me.registered.value ? chip('ok', 'check', 'Registered for USDC') : chip('warn', 'warn', 'Not registered for USDC')) : ''
  return `<section class="card panel" aria-labelledby="wal-h"><div class="ch">${badge('coin', 'op')}<h2 id="wal-h">Your testnet wallet</h2>${reg}</div>
    <div class="bigamt num">${bal}</div><p class="hint" style="margin:6px 0 12px">${esc(me.account)} · The faucet registers the account for USDC automatically.</p>
    <div class="btnrow"><button class="btn primary" data-mint ${off(ctx.busy)}>${ic('down', 2)}Mint 1,000 test USDC</button>${me.registered.ok && !me.registered.value ? `<button class="btn secondary" data-usdc-register ${off(ctx.busy)}>Register for USDC (0.00125 NEAR)</button>` : ''}</div></section>`
}

export const vPay = (ctx: ViewCtx): string => {
  const head = ctx.snap === null ? '' : bizSwitch(ctx)
  const j = journeyState(ctx)
  const body = gate(ctx, (s) => s.credit, 'Could not read this business', (credit, s) => {
    const C = COPY[credit.kind]
    const ref = `${credit.kind === 'creator' ? 'tip' : 'inv'}_${Date.now().toString(36).slice(-5)}`
    const self = ctx.me === s.biz
    return `<div class="payview"><div class="col"><section class="card panel rise" aria-labelledby="pl-h"><div class="ch">${badge('link', 'ok')}<h2 id="pl-h">Your pay link</h2></div>
    <p class="mandate">${C.pay} Every payment lands in RevVault first, which <b>sends ${Math.round(bpsToPct(credit.effectiveSplitBps))}% to the loan</b> (if there is one) and the rest straight to the business wallet. That routed revenue is what the credit limit is built from.</p>
    <div class="linkbox"><span id="pl-url">revvault.app/pay/${esc(s.biz)}?amt=<span id="pl-amt">120</span></span><button class="pill" id="copy" aria-describedby="pl-url">${ic('copy')}Copy link</button></div>
    <div class="field" style="margin-top:14px"><label for="amt-in">Amount (USDC)</label><input type="number" id="amt-in" value="120" min="1" inputmode="decimal" autocomplete="off"></div>
    <div class="field" style="margin-top:12px"><label for="ref-in">Reference (max 64 characters)</label><input type="text" id="ref-in" maxlength="64" value="${ref}" autocomplete="off"></div>
    <div class="banner info" style="margin-top:14px;font-weight:500">${ic('shield', 2)}<span>${C.direct}</span></div></section>${walletCard(ctx)}</div>
    <div class="phone-col rise"><div class="phone" role="group" aria-label="Preview of what the payer sees"><div class="phone-in" id="phone">
      <div class="ph-biz"><span class="av" style="--c:var(--blue-400)" aria-hidden="true">${esc(shortId(s.biz).slice(0, 2).toUpperCase())}</span><div><b>${esc(s.biz)}</b><div class="hint">${C.who}</div></div></div>
      <div class="ph-amt num"><span id="ph-amt">120.00</span><small>USDC</small></div>
      <div class="hint" id="ph-ref">${ref}</div>
      <button class="btn primary big" id="pay-btn" ${off(ctx.busy)}>${ctx.me === null ? 'Connect wallet to pay' : self ? 'Use another account to pay' : 'Pay with NEAR wallet'}</button>
      <div class="ph-how">This sends a real testnet payment through the RevVault router, so it counts as routed revenue. A share goes to the seller’s loan if there is one. The payer cannot be the business itself.<details class="tech"><summary>Technical details</summary>ft_transfer_call to the router with 1 yoctoNEAR.</details></div>
    </div></div></div></div>`
  })
  return head + readOnlyBanner(ctx) + strip(j, true) + body
}

const NOTE_CHIP: Record<NoteStatus, string> = {
  open: chip('blue', 'clock', 'Open'),
  past_due: chip('bad', 'warn', 'Past due'),
  settled: chip('ok', 'check', 'Settled'),
  written_off: chip('bad', 'x', 'Written off')
}

const notesCard = (ctx: ViewCtx, all: Note[]): string => {
  const rows = all.filter((n) => ctx.ui.noteFilter === 'all' || n.kind === ctx.ui.noteFilter)
  const seg = `<div class="seg" role="group" aria-label="Filter notes by kind">${(
    [
      ['all', 'All'],
      ['agent', 'Agent'],
      ['creator', 'Creator']
    ] as const
  )
    .map(([k, t]) => `<button data-nf="${k}" aria-pressed="${ctx.ui.noteFilter === k}">${t}</button>`)
    .join('')}</div>`
  const body =
    rows.length === 0
      ? emptyState('vault', all.length > 0 ? 'No notes for this filter' : 'No notes on chain yet', all.length > 0 ? 'Pick another kind to see more.' : 'A draw mints the first one.')
      : `<div class="notes">${rows
          .map((n) => {
            const debt = micro(n.principal) + micro(n.fee)
            const p = Math.round(pctOf(micro(n.repaid), debt))
            return `<article class="note" data-s="${n.status}" aria-label="Note ${esc(n.id)}"><div class="note-h"><h3 class="note-id num">${esc(n.id)}</h3>${NOTE_CHIP[n.status]}</div>
              <div class="who">${esc(shortId(n.business))}${n.business === ctx.me ? ' <span class="chip">you</span>' : ''} ${kindChip(n.kind)}</div>
              <div class="note-debt num">${fmt2(debt)}<small>USDC debt</small></div>
              <div><div class="note-r"><span>Repaid</span><b class="num">${p}%</b></div><div class="note-bar" role="progressbar" aria-label="Repaid" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><i style="width:${p}%"></i></div></div>
              <div class="note-f"><span>Split <b class="num">${Math.round(bpsToPct(n.repayShareBps))}%</b></span><span class="num">${n.status === 'settled' ? 'Settled' : `Due ${day(n.dueAtMs)}`}</span></div></article>`
          })
          .join('')}</div>`
  return `<section class="card panel rise" aria-labelledby="notes-h"><div class="ch">${badge('vault')}<h2 id="notes-h">Revenue notes · pool-held</h2>${chip('', null, `${all.length} on chain`)}${seg}</div>${body}
    <p class="hint" style="margin-top:22px">Notes are economic claims recorded in the contract: pool-held, not securities, not transferable in this MVP. Each one follows a single loan’s repayment and settles when it is paid.</p></section>`
}

export const vLp = (ctx: ViewCtx): string => {
  if (ctx.snap === null) return gate(ctx, (s) => s.stats, '', () => '')
  const s = ctx.snap
  const stats = s.stats.ok
    ? (() => {
        const st = s.stats.value
        const util = st.utilisationBps / 100
        return `<div class="mosaic pool">
    <section class="card hero glow m-tvl rise" aria-labelledby="tvl-h"><div class="ch">${badge('vault')}<h2 id="tvl-h">TVL (total value in the pool)</h2></div>
      <span class="hero-v num">${fmt2(micro(st.tvl))}<small>USDC</small></span>
      <div class="limitbar" role="img" aria-label="${util.toFixed(1)}% of the pool is lent out" style="--u:var(--accent)">${util > 0 ? `<i class="u" style="width:${Math.max(util, 1)}%"></i>` : ''}<i class="a"></i></div>
      <div class="lg" aria-hidden="true"><span><i class="sw u"></i>Lent out</span><span><i class="sw a"></i>Cash in the pool</span></div>
      <div class="hero-facts"><span>Cash<b class="num">${fmt2(micro(st.cash))} USDC</b></span><span>Utilisation<b class="num">${util.toFixed(1)}%</b></span><span>Open loans<b class="num">${st.openLoans}</b></span></div></section>
    ${stat('coin', 'Illustrative APY', (st.illustrativeApyBps / 100).toFixed(1), '%', 'From fees only. Illustrative, not a promise of yield.', { tone: 'ok', cls: 'm-apy apy' })}
    ${stat('shield', 'Reserve (first-loss)', fmt2(micro(st.reserve)), 'USDC', `${st.delinquent} past due`, { tone: 'warn', cls: 'm-rsv rsv' })}
  </div>`
      })()
    : failBox('Could not read vault stats', s.stats.error)
  const lpPart: Part<{ shares: string; value: string; earned: string }> = s.me !== null ? s.me.lp : s.seedLp
  const who = s.me !== null ? 'You' : `Seed LP ${shortId(cfg.deployer)}`
  const pos = lpPart.ok
    ? `<div class="bigamt num">${fmt2(micro(lpPart.value.shares))}<small>rvUSDC</small></div><p class="hint" style="margin:6px 0 14px">${who}: ≈ ${fmt2(micro(lpPart.value.value))} USDC (earned ${fmt2(micro(lpPart.value.earned))})${s.stats.ok && micro(s.stats.value.totalShares) > 0n ? ` at ${fmtScaled4(micro(s.stats.value.tvl), micro(s.stats.value.totalShares))} USDC per share` : ''}. Withdrawals are limited by vault cash.</p>`
    : `<div class="errbox" role="alert">${ic('warn', 2)}<b>Could not read the LP position</b>${esc(lpPart.error)}<br>${retryBtn()}</div>`
  const signed = ctx.me !== null
  const notes = s.notes.ok ? notesCard(ctx, s.notes.value) : failBox('Could not load notes', s.notes.error)
  const p = s.params.ok ? s.params.value : null
  return `${stats}
  <div class="grid2">
    <div class="col"><section class="card panel rise" aria-labelledby="pool-h"><div class="ch">${badge('down', 'ok')}<h2 id="pool-h">${signed ? 'Your pool share' : 'Pool share'}</h2></div>${pos}
      <div class="field"><label for="lp-amt">Deposit (USDC)</label><input type="number" id="lp-amt" value="500" min="1" inputmode="decimal" autocomplete="off"></div>
      <div class="field" style="margin-top:12px"><label for="lp-sh">Withdraw (rvUSDC shares)</label><input type="number" id="lp-sh" value="" min="0" inputmode="decimal" autocomplete="off" placeholder="${lpPart.ok ? Number(micro(lpPart.value.shares) / USDC_UNIT) : 0}"></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn primary grow" id="lp-dep" ${off(ctx.busy)}>${ic('down', 2)}${signed ? 'Fund pool' : 'Connect to fund'}</button><button class="btn secondary grow" id="lp-wd" ${off(ctx.busy)}>${ic('up', 2)}Withdraw</button></div></section></div>
    <div class="col"><section class="card panel rise" aria-labelledby="risk-h"><div class="ch">${badge('shield', 'ok')}<h2 id="risk-h">Risk panel</h2></div><div class="rules">
      <div class="rule"><span class="k">Advance rate</span><b>${p === null ? '—' : `${bpsToPct(p.advanceBpsAgent)}% agent · ${bpsToPct(p.advanceBpsCreator)}% creator`}</b></div>
      <div class="rule"><span class="k">Fee / term</span><b>${p === null ? '—' : `${bpsToPct(p.feeBps)}% · ${p.loanTermDays} days`}</b></div>
      <div class="rule"><span class="k">Reserve share of fees</span><b>${p === null ? '—' : `${bpsToPct(p.reserveBps)}%`}</b></div>
      <div class="rule"><span class="k">Past-due notes</span><b class="num">${s.notes.ok ? s.notes.value.filter((n) => n.status === 'past_due').length : '—'}</b></div></div>
      <p class="mandate" style="margin:14px 0 0"><b>If a business defaults:</b> its draws stop, the reserve absorbs the first loss, then LP shares absorb the rest. Notes settle when repaid or are written off. Repayment is enforced by economics, not by law.</p></section>${walletCard(ctx)}</div></div>
  ${notes}`
}

const link = (l: ExplorerLink): string => `<a class="xl" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}<span class="sr-only"> (opens in a new tab)</span>${ic('up', 1.6)}</a>`

export const vTestnet = (ctx: ViewCtx, preview: string): string => {
  const l = explorerLinks()
  const s = ctx.snap
  const read = s === null ? '' : ` · read ${esc(new Date(s.fetchedAtMs).toLocaleTimeString('en', { hour12: false }))}`
  const rv = s !== null && s.rvSupply.ok ? `<div class="rule"><span class="k">rvUSDC supply</span><b class="num">${fmt2(micro(s.rvSupply.value))}</b></div>` : ''
  return `<section class="card panel" aria-labelledby="tn-h"><div class="ch">${badge('pulse', 'ok')}<h2 id="tn-h">Testnet only</h2>${chip('ok', 'check', 'testnet')}<button class="btn secondary" data-retry style="margin-left:auto">${ic('refresh')}Refresh</button></div>
    <div class="rules"><div class="rule"><span class="k">RevVault</span><b>${esc(cfg.revvault)}</b></div><div class="rule"><span class="k">Mock USDC</span><b>${esc(cfg.usdc)}</b></div><div class="rule"><span class="k">RPC</span><b>${esc(cfg.rpcUrl)}${read}</b></div>${rv}</div></section>
  <section class="card panel" aria-labelledby="ex-h"><div class="ch">${badge('link', 'ok')}<h2 id="ex-h">Explorer</h2></div>
    <p class="hint">Contracts</p><div class="xls">${l.contracts.map(link).join('')}</div>
    <p class="hint" style="margin-top:12px">Seeded transactions</p><div class="xls">${l.txs.map(link).join('')}</div>
    <p class="hint" style="margin-top:12px">Demo accounts</p><div class="xls">${l.accounts.map(link).join('')}</div></section>${preview}`
}

export const skeletonView = (label: string): string => skeleton(label)
export const errorView = (message: string): string => failBox('Could not read testnet', message)

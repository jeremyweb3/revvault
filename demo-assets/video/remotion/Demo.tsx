import React from 'react'
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import timing from '../timing.json'
import scenes from '../scenes.json'

const font = '"Mona Sans", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif'
const BLUE = '#6f8bff'

type Para = { i: number; text: string; start: number; end: number }
const paras = timing.paragraphs as Para[]

// Split each paragraph into sentences, timed in proportion to their length.
const captions = paras.slice(0, 6).flatMap((p) => {
  const sentences = p.text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [p.text]
  const total = sentences.reduce((a, s) => a + s.length, 0)
  let t = p.start
  return sentences.map((s) => {
    const d = ((p.end - p.start) * s.length) / total
    const c = { text: s, start: t, end: t + d }
    t += d
    return c
  })
})

const Scene: React.FC<{ id: string; dur: number }> = ({ id, dur }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const n = Math.round((dur + 0.2) * fps)
  const scale = interpolate(f, [0, n], [1, 1.035], { easing: Easing.inOut(Easing.quad), extrapolateRight: 'clamp' })
  const opacity = interpolate(f, [0, 9], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})`, transformOrigin: '50% 40%' }}>
      <OffthreadVideo src={staticFile(`clips/${id}.mp4`)} muted style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  )
}

const Caption: React.FC<{ text: string; start: number; end: number }> = ({ text, start, end }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const n = Math.round((end - start) * fps)
  const o = interpolate(f, [0, 6, n - 6, n], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 54, opacity: o }}>
      <div style={{ maxWidth: 1380, padding: '16px 30px', borderRadius: 18, background: 'rgba(3,6,17,0.82)', boxShadow: 'inset 0 0 0 1px rgba(111,139,255,0.35), 0 18px 50px rgba(0,0,0,0.5)', color: '#fff', fontFamily: font, fontSize: 38, lineHeight: 1.3, textAlign: 'center', fontWeight: 500 }}>{text}</div>
    </AbsoluteFill>
  )
}

const EndCard: React.FC = () => {
  const f = useCurrentFrame()
  const o = interpolate(f, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const y = interpolate(f, [0, 30], [24, 0], { easing: Easing.out(Easing.cubic), extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(60% 70% at 70% 20%, #16275f 0%, #030611 62%)', justifyContent: 'center', alignItems: 'center', fontFamily: font, color: '#fff', opacity: o }}>
      <div style={{ transform: `translateY(${y}px)`, textAlign: 'center' }}>
        <div style={{ fontSize: 30, letterSpacing: 8, color: BLUE, fontWeight: 600 }}>REVVAULT</div>
        <div style={{ fontSize: 120, fontWeight: 500, marginTop: 18, lineHeight: 1.05 }}>Credit that <span style={{ fontStyle: 'italic', color: BLUE }}>repays</span> itself</div>
        <div style={{ fontSize: 40, marginTop: 34, opacity: 0.85 }}>Built at the NEAR Hackathon</div>
        <div style={{ fontSize: 28, marginTop: 40, opacity: 0.6 }}>Testnet prototype · mock USDC · seeded revenue history · not audited</div>
        <div style={{ fontSize: 28, marginTop: 10, opacity: 0.6 }}>Repayment is economic, not legal · APY is illustrative</div>
      </div>
    </AbsoluteFill>
  )
}

const Badge: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
    <div style={{ padding: '8px 16px', borderRadius: 999, background: 'rgba(3,6,17,0.78)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)', color: '#d8e0ff', fontFamily: font, fontSize: 18, fontWeight: 600 }}>● NEAR testnet · mock USDC</div>
  </AbsoluteFill>
)

export const Demo: React.FC<{ hasVoice: boolean }> = ({ hasVoice }) => {
  const { fps } = useVideoConfig()
  const endStart = paras[6].start
  return (
    <AbsoluteFill style={{ background: '#030611' }}>
      {scenes.map((s) => (
        <Sequence key={s.id} from={Math.round(s.from * fps)} durationInFrames={Math.round((s.dur + 0.2) * fps)}>
          <Scene id={s.id} dur={s.dur} />
        </Sequence>
      ))}
      <Sequence from={Math.round(endStart * fps)}>
        <EndCard />
      </Sequence>
      <Badge />
      {captions.map((c, i) => (
        <Sequence key={i} from={Math.round(c.start * fps)} durationInFrames={Math.max(1, Math.round((c.end - c.start) * fps))}>
          <Caption {...c} />
        </Sequence>
      ))}
      {hasVoice ? <Audio src={staticFile('audio/voice.mp3')} /> : null}
    </AbsoluteFill>
  )
}

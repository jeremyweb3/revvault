import React from 'react'
import { Composition } from 'remotion'
import { Demo } from './Demo'
import timing from '../timing.json'

export const FPS = 30
export const Root: React.FC = () => (
  <Composition
    id="RevVaultDemo"
    component={Demo}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={Math.ceil(timing.total * FPS)}
    defaultProps={{ hasVoice: false }}
  />
)

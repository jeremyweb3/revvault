import { cfg } from '../lib/chain/config'

export const shortId = (id: string): string => id.replace(`.${cfg.deployer}`, '')

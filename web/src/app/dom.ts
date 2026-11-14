export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T => {
  const el = root.querySelector<T>(selector)
  if (el === null) throw new Error(`Missing element: ${selector}`)
  return el
}

export const $maybe = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(selector)

export const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] => [
  ...root.querySelectorAll<T>(selector)
]

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

export const esc = (value: string): string => value.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c)

export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches

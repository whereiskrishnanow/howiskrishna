// Picks white or black text for a picture, whichever contrasts more with its
// average colour (WCAG contrast ratio).

export type Ink = 'white' | 'black'

function luminance(r: number, g: number, b: number) {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function inkFor(r: number, g: number, b: number): Ink {
  const l = luminance(r, g, b)
  return 1.05 / (l + 0.05) > (l + 0.05) / 0.05 ? 'white' : 'black'
}

export function inkForHex(hex: string): Ink {
  const n = parseInt(hex.replace('#', ''), 16)
  return inkFor((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

/** Averages the image's colours (it's same-origin, so the canvas can read it). */
export async function measureInk(src: string): Promise<Ink> {
  const img = new Image()
  img.src = src
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 10
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no 2d context')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const n = data.length / 4
  return inkFor(r / n, g / n, b / n)
}

export type FontEntry = { name: string; group: 'Sans' | 'Serif' | 'Display' | 'Script' | 'Mono'; weights: string }

const W = '400;700'
const ONE = '400'

export const FONT_LIST: FontEntry[] = [
  { name: 'Inter', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Poppins', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Montserrat', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'DM Sans', group: 'Sans', weights: '400;500;700' },
  { name: 'Manrope', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Outfit', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Work Sans', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Raleway', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Nunito', group: 'Sans', weights: '400;600;700;800' },
  { name: 'Open Sans', group: 'Sans', weights: '400;600;700;800' },
  { name: 'Roboto', group: 'Sans', weights: '400;500;700' },
  { name: 'Lato', group: 'Sans', weights: W },
  { name: 'League Spartan', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Space Grotesk', group: 'Sans', weights: '400;500;600;700' },
  { name: 'Syne', group: 'Sans', weights: '400;500;600;700;800' },
  { name: 'Playfair Display', group: 'Serif', weights: '400;500;600;700;800' },
  { name: 'DM Serif Display', group: 'Serif', weights: ONE },
  { name: 'Lora', group: 'Serif', weights: '400;500;600;700' },
  { name: 'Merriweather', group: 'Serif', weights: W },
  { name: 'Cormorant Garamond', group: 'Serif', weights: '400;500;600;700' },
  { name: 'Abril Fatface', group: 'Serif', weights: ONE },
  { name: 'Bebas Neue', group: 'Display', weights: ONE },
  { name: 'Oswald', group: 'Display', weights: '400;500;600;700' },
  { name: 'Anton', group: 'Display', weights: ONE },
  { name: 'Archivo Black', group: 'Display', weights: ONE },
  { name: 'Unbounded', group: 'Display', weights: '400;500;600;700;800' },
  { name: 'Righteous', group: 'Display', weights: ONE },
  { name: 'Bangers', group: 'Display', weights: ONE },
  { name: 'Fredoka', group: 'Display', weights: '400;500;600;700' },
  { name: 'Caveat', group: 'Script', weights: W },
  { name: 'Pacifico', group: 'Script', weights: ONE },
  { name: 'Dancing Script', group: 'Script', weights: W },
  { name: 'Lobster', group: 'Script', weights: ONE },
  { name: 'Satisfy', group: 'Script', weights: ONE },
  { name: 'Permanent Marker', group: 'Script', weights: ONE },
  { name: 'JetBrains Mono', group: 'Mono', weights: '400;500;700' },
]

export const FONTS = FONT_LIST.map((f) => f.name)
export const FONT_GROUPS = ['Sans', 'Serif', 'Display', 'Script', 'Mono'] as const

export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  FONT_LIST.map((f) => `family=${f.name.replace(/ /g, '+')}:wght@${f.weights}`).join('&') +
  '&display=swap'

let sheet: Promise<void> | null = null

/** Resolves once the named typefaces are usable. Canvas text drawn before then falls back silently. */
export async function ensureFonts(names: string[]): Promise<void> {
  sheet ??= new Promise<void>((resolve) => {
    let link = document.getElementById('studio-fonts') as HTMLLinkElement | null
    if (link) return resolve()
    link = document.createElement('link')
    link.id = 'studio-fonts'
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    link.onload = () => resolve()
    link.onerror = () => resolve()
    window.setTimeout(resolve, 6000)
    document.head.appendChild(link)
  })
  await sheet
  const wanted = [...new Set(names)].filter((n) => FONTS.includes(n))
  await Promise.all(
    wanted.flatMap((name) => [
      document.fonts.load(`400 40px "${name}"`).catch(() => []),
      document.fonts.load(`700 40px "${name}"`).catch(() => []),
    ]),
  )
}

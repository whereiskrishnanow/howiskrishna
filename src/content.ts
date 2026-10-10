// Everything you'd edit to update the page lives here.

export const intro = {
  title: 'Krishna & his experiences',
  // \n marks a line break
  summary: 'Product Designer who built and scaled design from\n0→ Series A at SuperAGI and Contlo',
}

export type Project = {
  id: string
  title: string
  /** One line shown under the title on hover. Keep it short (about 30 characters) so it fits on one line. */
  description: string
  /** The card's detail page. Its content lives in caseStudies.ts. */
  href: string
  /**
   * Image under public/ (path relative to the site), cropped to 16:10. Its top edge is what shows sharpest,
   * so frame the interesting part there.
   */
  image: string
  /** Solid color shown while the image loads; roughly its average. */
  tint: string
  /**
   * Text colour while this card is hovered (the page takes on its picture).
   * Leave it out to pick automatically from the image's brightness.
   */
  ink?: 'white' | 'black'
}

export const projects: Project[] = [
  { id: 'superagi', title: 'SuperAGI', description: 'AI Super App for Work', href: '#/work/superagi', image: 'work/superagi.jpg', tint: '#2a1b4d' },
  { id: 'contlo', title: 'Contlo', description: 'B2B Marketing Automation', href: '#/work/contlo', image: 'work/contlo.jpg', tint: '#e2820f' },
  { id: 'voice-agents', title: 'Voice Agents', description: 'AI Voice Agent Management', href: '#/work/voice-agents', image: 'work/voice-agents.jpg', tint: '#dfe3e8' },
  { id: 'coder-pro', title: 'Coder Pro', description: 'AI Coding Assistant for Enterprises', href: '#/work/coder-pro', image: 'work/coder-pro.jpg', tint: '#127f9a', ink: 'white' },
  { id: 'i-live-assist', title: 'I Live Assist', description: 'Anonymous AI Assistant', href: '#/work/i-live-assist', image: 'work/i-live-assist.jpg', tint: '#7d7464' },
  { id: 'cookit', title: 'CooKit', description: 'Meal Kit Delivery App', href: '#/work/cookit', image: 'work/cookit.jpg', tint: '#6f9a2c' },
]

export const contacts: { label: string; href: string; external: boolean; copy?: string }[] = [
  { label: 'Resume', href: 'https://drive.google.com/file/d/1s-Xyzh_BEhCfGwhQzpS-BDruNb_Hr8st/view?usp=sharing', external: true },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/krishna-vamsi-anumalasetty/', external: true },
  // also copies the address, for visitors with no mail app set up
  {
    label: 'Mail',
    href: 'mailto:whereiskrishnanow@gmail.com?subject=Hey%20there%2C%20Let%27s%20connect',
    external: false,
    copy: 'whereiskrishnanow@gmail.com',
  },
  { label: 'Phone', href: 'https://wa.me/919663800886?text=Hey%20there', external: true }, // opens a WhatsApp chat
]

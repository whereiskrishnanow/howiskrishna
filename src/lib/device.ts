// Phones and touch tablets get a lighter site: the same look, without the
// continuous animations that cost a phone its smoothness. Desktop is untouched.
// Keep in sync with the "Mobile: lighter" block in styles.css.
export const LITE_QUERY = '(max-width: 767.98px), (hover: none) and (pointer: coarse)'

export const isLite = () => window.matchMedia(LITE_QUERY).matches

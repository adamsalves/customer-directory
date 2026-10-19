// Inline script for <head> (nuxt.config.ts), run before the first paint (ADR-0011).
// With a cookie the server already rendered <html data-theme>, so it returns early; without one
// it applies the system preference. Plain ES5 on purpose: nothing compiles or bundles it.
export const THEME_SCRIPT =
  "(function(){try{var d=document.documentElement;if(d.hasAttribute('data-theme'))return;d.setAttribute('data-theme',matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}})()"

import { themes } from '../design/tokens';

export function applyTheme(name: keyof typeof themes = 'movie'){
  const theme = themes[name];
  for(const k in theme){
    document.documentElement.style.setProperty(k, (theme as any)[k]);
  }
}

export { themes };

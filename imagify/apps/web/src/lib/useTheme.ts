import { useEffect } from 'react';
import { themes } from '../design/tokens';

export function useTheme(name: keyof typeof themes = 'movie'){
  useEffect(()=>{
    const theme = themes[name];
    for(const k in theme){
      document.documentElement.style.setProperty(k, (theme as any)[k]);
    }
  }, [name]);
}

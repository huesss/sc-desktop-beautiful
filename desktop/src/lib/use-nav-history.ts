import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function useNavHistory() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keysRef = useRef<string[]>([location.key]);
  const indexRef = useRef(0);
  const [{ index, stackLength }, setStack] = useState({ index: 0, stackLength: 1 });

  useEffect(() => {
    const keys = keysRef.current;
    const idx = indexRef.current;
    let nextIndex = idx;

    if (navigationType === 'PUSH') {
      const next = keys.slice(0, idx + 1);
      next.push(location.key);
      keysRef.current = next;
      nextIndex = next.length - 1;
    } else if (navigationType === 'REPLACE') {
      const next = [...keys];
      next[idx] = location.key;
      keysRef.current = next;
    } else {
      const existingIndex = keys.indexOf(location.key);
      if (existingIndex !== -1) {
        nextIndex = existingIndex;
      } else {
        keysRef.current = [location.key];
        nextIndex = 0;
      }
    }

    indexRef.current = nextIndex;
    setStack({ index: nextIndex, stackLength: keysRef.current.length });
  }, [location.key, navigationType]);

  return {
    canGoBack: index > 0,
    canGoForward: index < stackLength - 1,
  };
}

import { useEffect, useState } from 'react';






export function useAutoHide(active: boolean, delayMs = 1500): boolean {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);

  return visible;
}

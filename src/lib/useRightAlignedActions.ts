import { useEffect, useRef, useState } from 'react';

export function useRightAlignedActions(
  deps: unknown[] = [],
  options?: { cardClassName?: string }
) {
  const cardClass = options?.cardClassName ?? 'card';
  const gridRef = useRef<HTMLElement | null>(null);
  const [actionsRightGap, setActionsRightGap] = useState(0);

  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const measure = () => {
      const children = Array.from(gridElement.children).filter((node) =>
        (node as HTMLElement).classList?.contains(cardClass)
      ) as HTMLElement[];
      if (!children.length) {
        setActionsRightGap(0);
        return;
      }
      const gridRect = gridElement.getBoundingClientRect();
      let maxRight = 0;
      for (const childEl of children) {
        const rect = childEl.getBoundingClientRect();
        if (rect.right > maxRight) maxRight = rect.right;
      }
      const leftover = Math.max(0, Math.round(gridRect.right - maxRight));
      setActionsRightGap(leftover);
    };

    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, deps);

  const setGridRef = (element: HTMLOListElement | HTMLUListElement | null) => {
    gridRef.current = element as unknown as HTMLElement | null;
  };

  return { setGridRef, actionsRightGap } as const;
}

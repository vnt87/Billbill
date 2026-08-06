import type { ForwardedRef, HTMLAttributes, PointerEvent, ReactNode } from 'react';
import { createElement, forwardRef, useImperativeHandle, useRef } from 'react';

type SpotlightElement = 'article' | 'aside' | 'div' | 'section' | 'form';

interface SpotlightCardProps extends HTMLAttributes<HTMLElement> {
  as?: SpotlightElement;
  children: ReactNode;
}

export const SpotlightCard = forwardRef<HTMLElement, SpotlightCardProps>(function SpotlightCard(
  {
    as = 'div',
    className = '',
    children,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
    ...props
  },
  forwardedRef: ForwardedRef<HTMLElement>
) {
  const cardRef = useRef<HTMLElement>(null);
  useImperativeHandle(forwardedRef, () => cardRef.current as HTMLElement, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || !cardRef.current) return;

    const bounds = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    cardRef.current.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
  };

  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') {
      cardRef.current?.setAttribute('data-spotlight-active', 'true');
    }
  };

  const handlePointerLeave = () => {
    cardRef.current?.setAttribute('data-spotlight-active', 'false');
  };

  return createElement(
    as,
    {
      ...props,
      ref: cardRef,
      className: `spotlight-surface ${className}`.trim(),
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        handlePointerMove(event);
        onPointerMove?.(event);
      },
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        handlePointerEnter(event);
        onPointerEnter?.(event);
      },
      onPointerLeave: (event: PointerEvent<HTMLElement>) => {
        handlePointerLeave();
        onPointerLeave?.(event);
      },
    },
    children
  );
});

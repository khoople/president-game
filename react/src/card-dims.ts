export type CardSize = 'small' | 'medium' | 'large';

export const CARD_DIMS: Record<CardSize, { width: number; height: number }> = {
  small:  { width: 52,  height: 73  },
  medium: { width: 64,  height: 90  },
  large:  { width: 80,  height: 112 },
};

export type CardSize = 'small' | 'medium' | 'large';

export const CARD_DIMS: Record<CardSize, { width: number; height: number }> = {
  small:  { width: 40,  height: 56  },
  medium: { width: 52,  height: 73  },
  large:  { width: 80,  height: 112 },
};

// Labor cost modifiers (multiplicative)

// Interior modifiers
export const INTERIOR_MODIFIERS = {
  HEAVILY_FURNISHED: 1.25,
  EMPTY_HOUSE: 0.85,
  EXTENSIVE_PREP: 1.15,
  ADDITIONAL_COAT: 1.25,
  ONE_COAT: 0.85,
} as const;

// Exterior modifiers
export const EXTERIOR_MODIFIERS = {
  THREE_STORY: 1.15,
  EXTENSIVE_PREP: 1.2,
  HARD_TERRAIN: 1.15,
  ADDITIONAL_COAT: 1.25,
  ONE_COAT: 0.85,
} as const;

// Labels for display
export const INTERIOR_MODIFIER_LABELS: Record<keyof typeof INTERIOR_MODIFIERS, string> = {
  HEAVILY_FURNISHED: 'Heavily Furnished (×1.25)',
  EMPTY_HOUSE: 'Empty House (×0.85)',
  EXTENSIVE_PREP: 'Extensive Prep (×1.15)',
  ADDITIONAL_COAT: 'Additional Coat (×1.25)',
  ONE_COAT: 'Reduce to 1 Coat (×0.85)',
};

export const EXTERIOR_MODIFIER_LABELS: Record<keyof typeof EXTERIOR_MODIFIERS, string> = {
  THREE_STORY: '3 Story (×1.15)',
  EXTENSIVE_PREP: 'Extensive Prep (×1.2)',
  HARD_TERRAIN: 'Hard Terrain (×1.15)',
  ADDITIONAL_COAT: 'Additional Coat (×1.25)',
  ONE_COAT: 'Reduce to 1 Coat (×0.85)',
};

export const COLS_MIN = 4;
export const COLS_MAX = 24;
export const GAPS = [8, 12, 16, 24] as const;
export const MAX_ELEMENTS = 40;
export const H_MIN = 64;
export const H_MAX = 4000;
// Taller / Shorter and Shift+arrows
export const H_STEP = 40;
// heights from a drag snap to this grid
export const H_SNAP = 8;
// below this grid width every item stacks
export const PHONE_WIDTH = 760;
// content height of an item not measured yet
export const UNMEASURED_HEIGHT = 180;
// height of a folded item: its title row (44 px on touch) and its border
export const FOLDED_HEIGHT = 46;
// the band is sticky only up to this share of the viewport
export const BAND_STICKY_SHARE = 0.4;
export const STORAGE_KEY = "prunplanner:planLayout:v1";


import { ExpansionChipInfo } from './types';    

export const EXPANSION_CHIP_FLAGS: Record<string, { bit: number, name: string }> = {
  VRC6: { bit: 0, name: "VRC6 Audio" },
  VRC7: { bit: 1, name: "VRC7 Audio" },
  FDS: { bit: 2, name: "FDS Sound" },
  MMC5: { bit: 3, name: "MMC5 Audio" },
  N163: { bit: 4, name: "Namco 163" },
  SUNSOFT_5B: { bit: 5, name: "Sunsoft 5B (FME-07)" },
};

export const getExpansionChipInfo = (expansionByte: number): ExpansionChipInfo[] => {
  return Object.values(EXPANSION_CHIP_FLAGS).map(chip => ({
    name: chip.name,
    supported: (expansionByte & (1 << chip.bit)) !== 0,
  }));
};

export const getPalNtscInfoString = (palNtscByte: number): string => {
  const palPreferred = (palNtscByte & 0b1) !== 0;
  const isDual = (palNtscByte & 0b10) !== 0;

  if (isDual) {
    return palPreferred ? "Dual (PAL preferred)" : "Dual (NTSC preferred)";
  }
  return palPreferred ? "PAL" : "NTSC";
};

export const DEFAULT_SONG_INDEX = 0; // 0-based for internal use

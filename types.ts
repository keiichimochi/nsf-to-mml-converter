
export interface NsfHeader {
  magic: string;
  version: number;
  totalSongs: number;
  startingSong: number; // 1-based
  loadAddress: number;
  initAddress: number;
  playAddress: number;
  songName: string;
  artistName: string;
  copyrightName: string;
  ntscSpeed: number; // microseconds
  bankswitchInit: Uint8Array; // 8 bytes, from 0x070-0x077
  palSpeed: number; // microseconds
  palNtscSettings: number; // Raw byte for 0x06C
  expansionSound: number; // Raw byte for 0x07B
  rawHeaderBytes: Uint8Array; // The first 128 bytes
}

export interface ExpansionChipInfo {
  name: string;
  supported: boolean;
}

export interface PalNtscInfo {
  primary: 'NTSC' | 'PAL';
  isDual: boolean;
}

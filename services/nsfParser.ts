
import { NsfHeader } from '../types';
import { DEFAULT_SONG_INDEX } from '../constants';

// Helper to read little-endian 16-bit unsigned int
const readUint16LE = (buffer: Uint8Array, offset: number): number => {
  return buffer[offset] | (buffer[offset + 1] << 8);
};

// Helper to decode null-terminated ASCII string from Uint8Array
const decodeNullTerminatedAscii = (buffer: Uint8Array, offset: number, maxLength: number): string => {
  let str = "";
  for (let i = 0; i < maxLength; i++) {
    const charCode = buffer[offset + i];
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  const decoded = str.trim();
  // NSF spec says use "<?>" if unknown
  return decoded === "" || decoded === "<?>" ? "N/A" : decoded;
};

export const parseNsfHeader = (arrayBuffer: ArrayBuffer): NsfHeader | null => {
  if (arrayBuffer.byteLength < 128) {
    console.error("NSF file too short for header.");
    return null;
  }
  const view = new Uint8Array(arrayBuffer, 0, 128);

  const magicChars = String.fromCharCode(...view.slice(0, 4));
  if (magicChars !== "NESM" || view[4] !== 0x1A) { // NESM^Z
    console.error("Invalid NSF magic number.");
    return null;
  }

  return {
    magic: "NESM\x1A",
    version: view[0x005],
    totalSongs: view[0x006] === 0 ? 1 : view[0x006], // Ensure at least 1 song
    startingSong: view[0x007] === 0 ? 1 : view[0x007], // 1-based, ensure at least 1
    loadAddress: readUint16LE(view, 0x008),
    initAddress: readUint16LE(view, 0x00A),
    playAddress: readUint16LE(view, 0x00C),
    songName: decodeNullTerminatedAscii(view, 0x00E, 32),
    artistName: decodeNullTerminatedAscii(view, 0x026, 32),
    copyrightName: decodeNullTerminatedAscii(view, 0x044, 32),
    ntscSpeed: readUint16LE(view, 0x060),
    bankswitchInit: view.slice(0x070, 0x070 + 8), // Use 0x070-0x077 as these are applied before INIT
    palSpeed: readUint16LE(view, 0x06A),
    palNtscSettings: view[0x06C],
    expansionSound: view[0x07B],
    rawHeaderBytes: view.slice(0, 128),
  };
};

// IMPORTANT: This function simulates MML generation. Actual NSF-to-MML conversion
// requires full 6502 CPU and 2A03 APU emulation and complex APU register log analysis,
// which is beyond the scope of a single-file generation.
// The output MML is a placeholder demonstrating what a real converter might produce.
export const generateSimulatedMml = (header: NsfHeader, songIndex: number): string => {
  const currentSongDisplay = songIndex + 1; // User-facing song number (1-based)

  const expansionChips = [];
  if (header.expansionSound & 0b00000001) expansionChips.push("VRC6");
  if (header.expansionSound & 0b00000010) expansionChips.push("VRC7");
  if (header.expansionSound & 0b00000100) expansionChips.push("FDS");
  if (header.expansionSound & 0b00001000) expansionChips.push("MMC5");
  if (header.expansionSound & 0b00010000) expansionChips.push("N163");
  if (header.expansionSound & 0b00100000) expansionChips.push("Sunsoft 5B");

  let mml = `#TITLE ${header.songName || 'Untitled'} (Song ${currentSongDisplay}/${header.totalSongs})\n`;
  mml += `#ARTIST ${header.artistName || 'Unknown Artist'}\n`;
  mml += `#COPYRIGHT ${header.copyrightName || 'Unknown Copyright'}\n`;
  mml += `#PROGRAMMER NSF to MML Web App (Simulated Output)\n`;
  if (expansionChips.length > 0) {
    mml += `#EXPANSION ${expansionChips.join(', ')}\n`;
  }
  mml += `\n; NSF Header Info (parsed):\n`;
  mml += `; Load Address: $${header.loadAddress.toString(16).toUpperCase().padStart(4, '0')}\n`;
  mml += `; Init Address: $${header.initAddress.toString(16).toUpperCase().padStart(4, '0')}\n`;
  mml += `; Play Address: $${header.playAddress.toString(16).toUpperCase().padStart(4, '0')}\n`;
  mml += `; NTSC Speed: ${header.ntscSpeed} µs (${(1000000 / header.ntscSpeed).toFixed(2)} Hz)\n`;
  mml += `; PAL Speed: ${header.palSpeed} µs (${(1000000 / header.palSpeed).toFixed(2)} Hz)\n`;
  mml += `\n`;

  // Common MML definitions (PPMCK style)
  mml += `@v0 = {15 14 13 12 11 10 9 8 7 6 5 4 3 2 1 0} ; Volume envelope (decay)\n`;
  mml += `@v1 = {0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15} ; Volume envelope (attack)\n`;
  mml += `@0 = {0} ; Duty Cycle 12.5% (Square 1)\n`;
  mml += `@1 = {1} ; Duty Cycle 25% (Square 2)\n`;
  mml += `@2 = {2} ; Duty Cycle 50% (VRC6 Pulse 1)\n`;
  mml += `@3 = {3} ; Duty Cycle 75% (VRC6 Pulse 2)\n`;
  mml += `@s0 = {0, 4, 7} ; Arpeggio (Major Chord)\n`;
  mml += `@s1 = {0, 3, 7} ; Arpeggio (Minor Chord)\n`;
  mml += `@EP0 = {0,1,2,3,4,3,2,1,0,-1,-2,-3,-4,-3,-2,-1} ; Pitch Envelope (Vibrato)\n`;
  mml += `@DPCM0 = {"KICK.DMC", 15, 1024, 0, 0} ; DPCM sample definition (placeholder)\n`;
  mml += `@DPCM1 = {"SNARE.DMC", 12, 512, 0, 0} ; DPCM sample definition (placeholder)\n`;
  mml += `\n`;
  
  const tempo = 120 + (songIndex * 12 % 60); // Vary tempo
  const baseOctave = 4 + (songIndex % 3);

  // Channel A: Pulse 1
  mml += `A @0 t${tempo} o${baseOctave} l8 v12 EN@s0 MP@EP0 ;(PULSE 1 - Melody)\n`;
  mml += `A cdef | gab>c< | r4 `;
  mml += songIndex % 2 === 0 ? `cege ` : `dfaf `;
  mml += `fedc | <bagf | edcr \n\n`;

  // Channel B: Pulse 2
  mml += `B @1 t${tempo} o${baseOctave - 1} l8 v10 EN@s1 ;(PULSE 2 - Harmony/Counter-Melody)\n`;
  mml += `B eg<c e | >bg e<c | r4 `;
  mml += songIndex % 2 === 0 ? `g<cec>g<` : `a<dfd>a<`;
  mml += `eg<c e | >bg e<c | r4 \n\n`;

  // Channel C: Triangle
  mml += `C t${tempo} o${baseOctave - 2} l4 v15 ;(TRIANGLE - Bassline)\n`; // Triangle has fixed volume, typically max
  mml += `C c g <e g | c g <d f# | a d <f# a | >c <g e g | r2 \n\n`;

  // Channel E: Noise (Original document calls it E for PPMCK, not D for noise)
  mml += `E t${tempo} l16 v${8 + (songIndex%5)} m${songIndex % 2} p${(songIndex % 15) + 1} @v0 ;(NOISE - Percussion)\n`;
  mml += `E [n r n r]4 | [n n r r]4 | [n r n n]4 | [n n n r]4 | r8 \n\n`;

  // Channel D: DPCM (Original document sometimes maps D to DPCM)
  mml += `D t${tempo} l16 v15 ;(DPCM - Drums/Samples)\n`;
  mml += `D @DPCM0 d r d r @DPCM1 d r d r | @DPCM0 d @DPCM1 d @DPCM0 d @DPCM1 d | r8 \n\n`;

  if (header.expansionSound & 0b00000001) { // VRC6
    mml += `; --- VRC6 Expansion Channels ---\n`;
    mml += `M @2 t${tempo} o${baseOctave} l8 v10 @v0 ;(VRC6 PULSE 1)\n`;
    mml += `M c+d+fg+ | a+>c+<bg+ | r4 c+d+fg+ r4 \n\n`;
    mml += `N @3 t${tempo} o${baseOctave-1} l8 v10 @v0 ;(VRC6 PULSE 2)\n`;
    mml += `N f+g+<c+d+ | >bg+f+<c+ | r4 f+g+<c+d+ r4 \n\n`;
    mml += `O t${tempo} o${baseOctave-2} l8 v12 @v1 ;(VRC6 SAWTOOTH)\n`;
    mml += `O c<g>c<g | c<f>c<f | r4 c<g>c<g r4 \n\n`;
  }
  // TODO: Add simulated MML for other expansion chips if present
  // For FDS: use @FM, for N163 use @N, etc.

  mml += `\n; --- End of Simulated MML for Song ${currentSongDisplay} ---`;
  return mml;
};

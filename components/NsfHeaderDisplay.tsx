
import React from 'react';
import { NsfHeader, ExpansionChipInfo } from '../types';
import { getExpansionChipInfo, getPalNtscInfoString } from '../constants';

interface NsfHeaderDisplayProps {
  header: NsfHeader | null;
}

const HeaderItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="py-2 px-1 grid grid-cols-3 gap-4">
    <dt className="text-sm font-medium text-gray-400 truncate">{label}</dt>
    <dd className="text-sm text-gray-200 col-span-2 break-words">{value}</dd>
  </div>
);

const NsfHeaderDisplay: React.FC<NsfHeaderDisplayProps> = ({ header }) => {
  if (!header) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg shadow text-center text-gray-500">
        Upload an NSF file to see header details.
      </div>
    );
  }

  const expansionChips: ExpansionChipInfo[] = getExpansionChipInfo(header.expansionSound);
  const palNtscInfo = getPalNtscInfoString(header.palNtscSettings);

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-indigo-400 mb-4 border-b border-gray-700 pb-2">NSF Header Information</h2>
      <dl className="divide-y divide-gray-700">
        <HeaderItem label="Song Title" value={header.songName} />
        <HeaderItem label="Artist" value={header.artistName} />
        <HeaderItem label="Copyright" value={header.copyrightName} />
        <HeaderItem label="Total Songs" value={header.totalSongs} />
        <HeaderItem label="Starting Song" value={header.startingSong} />
        <HeaderItem label="Version" value={`NSF ${header.version}`} />
        <HeaderItem label="Load Address" value={`$${header.loadAddress.toString(16).toUpperCase().padStart(4, '0')}`} />
        <HeaderItem label="Init Address" value={`$${header.initAddress.toString(16).toUpperCase().padStart(4, '0')}`} />
        <HeaderItem label="Play Address" value={`$${header.playAddress.toString(16).toUpperCase().padStart(4, '0')}`} />
        <HeaderItem label="NTSC Speed" value={`${header.ntscSpeed} µs (${(1000000 / header.ntscSpeed).toFixed(2)} Hz)`} />
        <HeaderItem label="PAL Speed" value={`${header.palSpeed} µs (${(1000000 / header.palSpeed).toFixed(2)} Hz)`} />
        <HeaderItem label="PAL/NTSC" value={palNtscInfo} />
        <HeaderItem
          label="Bankswitch Init"
          value={
            <span className="font-mono text-xs">
              {Array.from(header.bankswitchInit).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
            </span>
          }
        />
        <div className="py-2 px-1">
          <dt className="text-sm font-medium text-gray-400 mb-1">Expansion Sound</dt>
          <dd className="text-sm text-gray-200">
            {expansionChips.filter(c => c.supported).length > 0 ? (
              <ul className="list-disc list-inside ml-2">
                {expansionChips.filter(c => c.supported).map(chip => (
                  <li key={chip.name}>{chip.name}</li>
                ))}
              </ul>
            ) : (
              "None"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default NsfHeaderDisplay;

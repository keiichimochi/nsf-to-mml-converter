
import React from 'react';
// import { DEFAULT_SONG_INDEX } from '../constants'; // Not used here

interface ControlsProps {
  onConvert: () => void;
  onCopyMml: () => void;
  onDownloadMml: () => void;
  totalSongs: number;
  currentSongIndex: number; // 0-based
  onSongChange: (songIndex: number) => void;
  isConverting: boolean;
  hasMml: boolean;
  hasFile: boolean;
  isMmlPlaying: boolean;
  onPlayMml: () => void;
  onStopMml: () => void;
}

const Button: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; variant?: 'primary' | 'secondary'; 'aria-label'?: string }> = 
  ({ onClick, disabled, children, variant = 'primary', ...props }) => {
  const baseClasses = "w-full sm:w-auto text-sm font-medium py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out";
  const primaryClasses = "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-400";
  const secondaryClasses = "bg-gray-600 text-gray-200 hover:bg-gray-500 focus:ring-gray-500 disabled:bg-gray-400";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variant === 'primary' ? primaryClasses : secondaryClasses} disabled:opacity-70 disabled:cursor-not-allowed`}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};


const Controls: React.FC<ControlsProps> = ({
  onConvert,
  onCopyMml,
  onDownloadMml,
  totalSongs,
  currentSongIndex,
  onSongChange,
  isConverting,
  hasMml,
  hasFile,
  isMmlPlaying,
  onPlayMml,
  onStopMml
}) => {
  const songOptions = Array.from({ length: totalSongs }, (_, i) => i); // 0-based indices

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow mb-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="song-select" className="block text-sm font-medium text-gray-300 mb-1">
            Select Song (1 to {totalSongs})
          </label>
          <select
            id="song-select"
            value={currentSongIndex}
            onChange={(e) => onSongChange(parseInt(e.target.value, 10))}
            disabled={isConverting || totalSongs <= 1 || !hasFile || isMmlPlaying}
            className="block w-full py-2 px-3 border border-gray-600 bg-gray-700 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Select song, current song ${currentSongIndex + 1} of ${totalSongs}`}
          >
            {songOptions.map(index => (
              <option key={index} value={index}>
                Song {index + 1}
              </option>
            ))}
          </select>
        </div>
        <Button 
          onClick={onConvert} 
          disabled={isConverting || !hasFile || isMmlPlaying} 
          variant="primary"
          aria-label="Convert selected song to MML"
        >
          {isConverting ? 'Converting...' : 'Convert to MML'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button 
          onClick={onCopyMml} 
          disabled={isConverting || !hasMml || isMmlPlaying} 
          variant="secondary"
          aria-label="Copy generated MML to clipboard"
        >
          Copy MML
        </Button>
        <Button 
          onClick={onDownloadMml} 
          disabled={isConverting || !hasMml || isMmlPlaying} 
          variant="secondary"
          aria-label="Download generated MML as a file"
        >
          Download MML
        </Button>
      </div>

      {hasMml && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-700 mt-4">
            {!isMmlPlaying ? (
                <Button 
                  onClick={onPlayMml} 
                  disabled={isConverting || !hasMml || isMmlPlaying} 
                  variant="primary"
                  aria-label="Play generated MML (simulated)"
                >
                  Play MML (Simulated)
                </Button>
            ) : (
                <Button 
                  onClick={onStopMml} 
                  disabled={isConverting || !isMmlPlaying} 
                  variant="secondary"
                  aria-label="Stop MML playback"
                >
                  Stop Playback
                </Button>
            )}
             {/* Empty div for layout balance if only one button is shown, or could make the shown button full width */}
            {isMmlPlaying && <div className="hidden sm:block"></div>}
        </div>
      )}
    </div>
  );
};

export default Controls;

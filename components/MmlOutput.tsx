
import React from 'react';

interface MmlOutputProps {
  mml: string | null;
  isLoading: boolean;
}

const MmlOutput: React.FC<MmlOutputProps> = ({ mml, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-full p-4 bg-gray-800 rounded-lg shadow flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Generating MML...</p>
        </div>
      </div>
    );
  }

  if (!mml) {
    return (
      <div className="h-full p-4 bg-gray-800 rounded-lg shadow flex items-center justify-center">
        <p className="text-gray-500 text-center">MML output will appear here after conversion.</p>
      </div>
    );
  }

  return (
    <div className="h-full p-1 bg-gray-800 rounded-lg shadow flex flex-col">
      <h2 className="text-xl font-semibold text-indigo-400 mb-3 px-4 pt-3 border-b border-gray-700 pb-2">
        Generated MML (Simulated)
      </h2>
      <textarea
        readOnly
        value={mml}
        className="flex-grow w-full p-3 bg-gray-900 text-gray-200 rounded-b-md border-none focus:ring-0 font-mono text-xs resize-none leading-relaxed"
        placeholder="MML output..."
        spellCheck="false"
      />
    </div>
  );
};

export default MmlOutput;

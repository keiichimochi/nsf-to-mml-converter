
import React, { useState, useCallback, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import NsfHeaderDisplay from './components/NsfHeaderDisplay';
import MmlOutput from './components/MmlOutput';
import Controls from './components/Controls';
import { parseNsfHeader, generateSimulatedMml } from './services/nsfParser';
import { NsfHeader } from './types';
import { DEFAULT_SONG_INDEX } from './constants';

const App: React.FC = () => {
  const [nsfFile, setNsfFile] = useState<File | null>(null);
  const [nsfHeader, setNsfHeader] = useState<NsfHeader | null>(null);
  const [mmlOutput, setMmlOutput] = useState<string | null>(null);
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(DEFAULT_SONG_INDEX); // 0-based
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [isMmlPlaying, setIsMmlPlaying] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(null), 3000);
  }, []);
  
  const handleStopMml = useCallback((autoStopped = false) => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  
    const ac = audioContextRef.current; 
  
    if (oscillatorRef.current && gainNodeRef.current && ac && ac.state !== 'closed' && !isNaN(ac.currentTime)) {
      try {
        const currentTime = ac.currentTime;
        gainNodeRef.current.gain.cancelScheduledValues(currentTime);
        gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime); 
        gainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + 0.05);
        
        // Add a slight delay before stopping the oscillator to allow the gain ramp to complete
        setTimeout(() => {
            if(oscillatorRef.current && ac.state !== 'closed') { // Check again before stopping
                 try {
                    oscillatorRef.current.stop();
                 } catch (e) {
                    // if it's already stopped or in an invalid state, this might throw.
                    console.warn("Minor issue stopping oscillator, possibly already stopped:", e);
                 } finally {
                    oscillatorRef.current.disconnect();
                    oscillatorRef.current = null;
                 }
            }
            if(gainNodeRef.current && ac.state !== 'closed') { // Check again before disconnecting
                try {
                    gainNodeRef.current.disconnect();
                } catch(e) { /* ignore */ } finally {
                    gainNodeRef.current = null;
                }
            }
        }, 100); // 100ms should be enough for the ramp and stopping

      } catch (e) {
        console.warn("Error during audio stop:", e);
        try {
            if(oscillatorRef.current) oscillatorRef.current.disconnect();
            if(gainNodeRef.current) gainNodeRef.current.disconnect();
        } catch (disconnectError) {
            // Ignore
        }
        oscillatorRef.current = null; // Ensure refs are cleared
        gainNodeRef.current = null;
      }
    } else if (oscillatorRef.current || gainNodeRef.current) {
        // Fallback if context is bad or currentTime is NaN
        try {
            if(oscillatorRef.current) {
                oscillatorRef.current.disconnect();
                oscillatorRef.current = null;
            }
            if(gainNodeRef.current) {
                gainNodeRef.current.disconnect();
                gainNodeRef.current = null;
            }
        } catch (e) { /* ignore */ }
    }
    
    if (isMmlPlaying) { 
      setIsMmlPlaying(false);
      if (!autoStopped) {
          showFeedback("Playback stopped.");
      } else {
          showFeedback("Playback finished.");
      }
    }
  }, [isMmlPlaying, showFeedback]);

  const resetStateForNewFile = useCallback(() => {
    setNsfHeader(null);
    setMmlOutput(null);
    setSelectedSongIndex(DEFAULT_SONG_INDEX);
    setError(null);
    handleStopMml(true); 
  }, [handleStopMml]);

  const getAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = context;
      } catch (e) {
        console.error("Failed to create AudioContext:", e);
        audioContextRef.current = null;
        return null;
      }
    }

    const ac = audioContextRef.current;
    if (!ac) { 
        return null;
    }

    if (ac.state === 'suspended') {
      try {
        await ac.resume();
        const postResumeState = ac.state as AudioContextState; 
        if (postResumeState !== 'running') { 
          console.warn(`AudioContext resumed but state is still ${postResumeState}. Playback might fail.`);
        }
      } catch (err) {
        console.error("Failed to resume AudioContext:", err);
      }
    }
    return ac;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setNsfFile(file);
    resetStateForNewFile();
    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result && e.target.result instanceof ArrayBuffer) {
        const header = parseNsfHeader(e.target.result);
        if (header) {
          setNsfHeader(header);
          const startingSongOneBased = header.startingSong > 0 && header.startingSong <= header.totalSongs 
                                       ? header.startingSong 
                                       : 1;
          setSelectedSongIndex(startingSongOneBased - 1);
        } else {
          setError("Failed to parse NSF header. The file might be invalid or corrupted.");
          setNsfFile(null);
        }
      } else {
        setError("Failed to read file.");
        setNsfFile(null);
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError("Error reading file.");
      setNsfFile(null);
      setIsLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, [resetStateForNewFile]);

  const handleConvert = useCallback(async () => {
    if (!nsfFile || !nsfHeader) {
      setError("Please upload a valid NSF file first.");
      return;
    }
    handleStopMml(true); 
    setIsLoading(true);
    setError(null);
    setMmlOutput(null);

    await new Promise(resolve => setTimeout(resolve, 750));

    try {
      const mml = generateSimulatedMml(nsfHeader, selectedSongIndex);
      setMmlOutput(mml);
    } catch (err) {
      console.error("MML Generation Error:", err);
      setError("An error occurred during MML generation.");
    } finally {
      setIsLoading(false);
    }
  }, [nsfFile, nsfHeader, selectedSongIndex, handleStopMml]);

  const handlePlayMml = useCallback(async () => {
    if (isMmlPlaying || !mmlOutput) return;
  
    setIsMmlPlaying(true); 
    showFeedback("Simulating MML playback...");
  
    const ac = await getAudioContext();
  
    if (!ac) {
      setError("Could not initialize AudioContext. Playback failed.");
      setIsMmlPlaying(false);
      return;
    }
  
    const acState = ac.state;
    if (acState !== 'running') {
      setError(`AudioContext is not running (state: ${acState}). Playback aborted.`);
      if (acState !== 'closed') {
          ac.close().catch(console.error);
      }
      audioContextRef.current = null; 
      setIsMmlPlaying(false);
      return;
    }
  
    if (isNaN(ac.currentTime)) {
      setError("AudioContext currentTime is NaN. Playback aborted.");
      if (ac.state !== 'closed') { 
        ac.close().catch(console.error);
      }
      audioContextRef.current = null;
      setIsMmlPlaying(false);
      return;
    }
  
    try {
      if (oscillatorRef.current) {
        try { oscillatorRef.current.disconnect(); } catch(e) {/*ignore*/}
      }
      if (gainNodeRef.current) {
        try { gainNodeRef.current.disconnect(); } catch(e) {/*ignore*/}
      }
  
      const osc = ac.createOscillator();
      const gain = ac.createGain();
  
      osc.type = 'square'; 
      gain.gain.setValueAtTime(0, ac.currentTime);
  
      osc.connect(gain);
      gain.connect(ac.destination);
  
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
      
      osc.start(ac.currentTime);
  
      const notes = [
        { freq: 261.63, duration: 0.35 }, // C4
        { freq: 329.63, duration: 0.35 }, // E4
        { freq: 392.00, duration: 0.35 }, // G4
        { freq: 523.25, duration: 0.45 }, // C5
        { freq: 0, duration: 0.2 },      // Rest
        { freq: 523.25, duration: 0.35 }, // C5
        { freq: 392.00, duration: 0.35 }, // G4
        { freq: 329.63, duration: 0.35 }, // E4
        { freq: 261.63, duration: 0.45 }, // C4
      ];
  
      let scheduleTime = ac.currentTime;
      const attackTime = 0.01;
      const releaseTime = 0.02;
      const sustainVolume = 0.15;
  
      for (const note of notes) {
        if (note.freq > 0) {
          osc.frequency.setValueAtTime(note.freq, scheduleTime);
          gain.gain.setValueAtTime(0, scheduleTime); 
          gain.gain.linearRampToValueAtTime(sustainVolume, scheduleTime + attackTime);
          gain.gain.setValueAtTime(sustainVolume, scheduleTime + note.duration - releaseTime);
          gain.gain.linearRampToValueAtTime(0, scheduleTime + note.duration);
        }
        scheduleTime += note.duration;
      }
      
      const timeoutDuration = (scheduleTime - ac.currentTime) * 1000 + 150; // Increased buffer

      if (isNaN(timeoutDuration) || timeoutDuration < 0) {
          console.error(`Invalid playback timeout calculated: ${timeoutDuration}. scheduleTime: ${scheduleTime}, ac.currentTime: ${ac.currentTime}`);
          setError("Error calculating playback duration. Stopping playback.");
          handleStopMml(true); 
          return;
      }

      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = setTimeout(() => {
        handleStopMml(true); 
      }, timeoutDuration);
  
    } catch (e) {
      console.error("Error playing MML:", e);
      setError("Could not play MML. Audio system might be unavailable.");
      setIsMmlPlaying(false); 
      if (oscillatorRef.current) { try{ oscillatorRef.current.disconnect();} catch(err){/*ignore*/} }
      if (gainNodeRef.current) { try{ gainNodeRef.current.disconnect(); } catch(err){/*ignore*/}}
      oscillatorRef.current = null;
      gainNodeRef.current = null;
    }
  }, [isMmlPlaying, mmlOutput, getAudioContext, showFeedback, handleStopMml]);
  
  const handleCopyMml = useCallback(() => {
    if (mmlOutput) {
      navigator.clipboard.writeText(mmlOutput)
        .then(() => showFeedback("MML copied to clipboard!"))
        .catch(err => {
          console.error("Copy MML error:", err);
          setError("Failed to copy MML. Check browser permissions.");
        });
    }
  }, [mmlOutput, showFeedback]);

  const handleDownloadMml = useCallback(() => {
    if (mmlOutput && nsfHeader) {
      const safeSongName = nsfHeader.songName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled';
      const songNumber = selectedSongIndex + 1;
      const filename = `nsf_${safeSongName}_song${songNumber}.mml`;
      
      const blob = new Blob([mmlOutput], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showFeedback("MML download started!");
    }
  }, [mmlOutput, nsfHeader, selectedSongIndex, showFeedback]);

  useEffect(() => {
    // ComponentWillUnmount equivalent for cleanup
    return () => {
      handleStopMml(true); 
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [handleStopMml]); // Ensure handleStopMml is stable

  useEffect(() => {
    // Stop playback if a new file is selected (nsfFile changes)
    // This complements the resetStateForNewFile call within handleFileSelect
    if (nsfFile) { 
        // No direct call to handleStopMml here as resetStateForNewFile already does it.
        // This effect might be redundant if resetStateForNewFile is consistently called.
        // However, keeping it as a safeguard or if nsfFile could change by other means.
        // If resetStateForNewFile is the ONLY way nsfFile changes and triggers stop,
        // then this specific effect focusing only on nsfFile to call handleStopMml might be removed.
        // For now, ensure its dependencies are correct if kept.
    }
  }, [nsfFile, handleStopMml]); // If nsfFile itself implies a stop, handleStopMml should be a dep

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-gray-900">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-400">NSF to MML Converter</h1>
        <p className="text-md text-gray-400 mt-2">
          Upload an NSF file, view its details, and get a <em className="italic text-indigo-300">simulated</em> MML output.
        </p>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-red-500 text-white rounded-md shadow-lg text-sm text-center" role="alert">
          {error}
        </div>
      )}
      {feedbackMessage && (
         <div className="fixed top-5 right-5 p-3 bg-green-500 text-white rounded-md shadow-lg text-sm z-50" role="status" aria-live="assertive">
           {feedbackMessage}
         </div>
      )}

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="flex flex-col space-y-6">
          <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading && !nsfHeader} />
          {nsfFile && <Controls
            onConvert={handleConvert}
            onCopyMml={handleCopyMml}
            onDownloadMml={handleDownloadMml}
            totalSongs={nsfHeader?.totalSongs || 1}
            currentSongIndex={selectedSongIndex}
            onSongChange={(index) => {
                handleStopMml(true); // Stop playback before changing song
                setSelectedSongIndex(index);
                // Optionally, auto-convert new song here or require user to click "Convert"
            }}
            isConverting={isLoading}
            hasMml={!!mmlOutput}
            hasFile={!!nsfFile}
            isMmlPlaying={isMmlPlaying}
            onPlayMml={handlePlayMml}
            onStopMml={() => handleStopMml(false)} // User initiated stop
          /> }
          <NsfHeaderDisplay header={nsfHeader} />
        </div>

        <div className="lg:max-h-[calc(100vh-12rem)] h-full min-h-[400px] lg:min-h-0"> 
          <MmlOutput mml={mmlOutput} isLoading={isLoading && !!nsfHeader} />
        </div>
      </div>
      
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} NSF to MML Converter (Simulated). All rights reserved (not really).</p>
        <p className="mt-1">This is a demonstration. Actual NSF to MML conversion is a complex emulation task.</p>
      </footer>
    </div>
  );
};

export default App;

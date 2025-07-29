// SoundKit.tsx
import { useState } from 'react';
import * as Tone from 'tone';

interface SoundKitProps {
  show: boolean;
  position: { x: number; y: number };
  onSoundSelect: (soundType: string) => void;
  onClose: () => void;
}

const SoundKit = ({ show, position, onSoundSelect, onClose }: SoundKitProps) => {
//   const [isPlaying, setIsPlaying] = useState(false);

  const [_, setIsPlaying] = useState(false);
  
  const soundOptions = [
    { id: 'fm-synth', name: 'FM Synth', note: 'C4' },
    { id: 'am-synth', name: 'AM Synth', note: 'G4' },
    { id: 'bass', name: 'Bass', note: 'C2' },
    { id: 'lead', name: 'Lead', note: 'C5' },
    { id: 'drum', name: 'Drum Hit', note: 'C3' }
  ];

  const playSound = async (soundType: string, note: string) => {
    await Tone.start(); // Ensure audio context is started
    setIsPlaying(true);
    
    let synth;
    switch (soundType) {
      case 'fm-synth':
        synth = new Tone.FMSynth().toDestination();
        break;
      case 'am-synth':
        synth = new Tone.AMSynth().toDestination();
        break;
      case 'bass':
        synth = new Tone.MonoSynth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.8 }
        }).toDestination();
        break;
      case 'lead':
        synth = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.4 }
        }).toDestination();
        break;
      case 'drum':
        synth = new Tone.MembraneSynth().toDestination();
        break;
      default:
        synth = new Tone.Synth().toDestination();
    }
    
    synth.triggerAttackRelease(note, '8n');
    
    // Clean up synth after a delay
    setTimeout(() => {
      synth.dispose();
      setIsPlaying(false);
    }, 2000);
  };

  const handleSoundSelect = (soundType: string, note: string) => {
    playSound(soundType, note);
    onSoundSelect(soundType);
    onClose();
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        backgroundColor: 'white',
        border: '2px solid #333',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 10000,
        minWidth: '200px',
        padding: '8px 0',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #ddd',
        fontWeight: 'bold',
        fontSize: '14px',
        color: '#333',
        backgroundColor: '#f8f8f8'
      }}>
        Select Sound
      </div>
      {soundOptions.map((sound) => (
        <button
          key={sound.id}
          onClick={() => handleSoundSelect(sound.id, sound.note)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            backgroundColor: 'white',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#333',
            transition: 'background-color 0.2s',
            display: 'block'
          }}
          onMouseOver={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
            (e.target as HTMLElement).style.color = '#1976d2';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLElement).style.backgroundColor = 'white';
            (e.target as HTMLElement).style.color = '#333';
          }}
        >
          {sound.name}
        </button>
      ))}
      <div style={{ borderTop: '1px solid #ddd', padding: '8px' }}>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            backgroundColor: '#f0f0f0',
            color: '#666',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
          onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#e0e0e0'}
          onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#f0f0f0'}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SoundKit;
// SoundKit.tsx
import { useState } from 'react';
import * as Tone from 'tone';
// import { type DrawnShape } from '../sharedTypes';

interface SoundKitProps {
  shapeId: number | null;
  show: boolean;
  position: { x: number; y: number };
  onSoundSelect: (soundType: string) => void;
  onClose: () => void;
  selectedSoundType?: string | null;
}

interface ShapeSound {
  shapeId: number | null;
  soundType: string;
  instrument: any;
}

const SoundKit = ({ shapeId, show, position, onSoundSelect, onClose, selectedSoundType }: SoundKitProps) => {
  const [_, setIsPlaying] = useState(false);
  const [ActiveShapes, setActiveShapes] = useState<ShapeSound[]>([]);

  const soundOptions = [
    { id: 'fm-synth', name: 'FM Synth', note: 'C4' },
    { id: 'am-synth', name: 'AM Synth', note: 'G4' },
    { id: 'bass', name: 'Bass', note: 'C2' },
    { id: 'lead', name: 'Lead', note: 'C5' },
    { id: 'drum', name: 'Drum Hit', note: 'C3' },
    { id: 'drum_loop', name: 'Drum Loop', note: null}
  ];

  const playSound = async (soundType: string, note: string | null, shapeId: number | null) => {
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
      case 'drum_loop':
        synth = new Tone.Player("https://tonejs.github.io/audio/drum-samples/breakbeat.mp3").toDestination();
        synth.loop = true;
        break;
      default:
        synth = new Tone.Synth().toDestination();
    }

    if (synth.name == "Player") {
      synth.autostart = true;
    } else {
      synth.triggerAttackRelease(note, '8n');
    }

    // Update ActiveShapes with add/update logic
    if (shapeId !== null) {
      setActiveShapes(prev => {
        const existingIndex = prev.findIndex(ss => ss.shapeId === shapeId);
        
        if (existingIndex !== -1) {
          const existing = prev[existingIndex];
          
          // If soundType changed, dispose old instrument and update
          if (existing.soundType !== soundType) {
            existing.instrument?.dispose?.();
            
            return [
              ...prev.slice(0, existingIndex),
              { shapeId, soundType, instrument: synth },
              ...prev.slice(existingIndex + 1)
            ];
          }
          return prev; // No change needed
        }
        
        // Add new entry
        return [...prev, { shapeId, soundType, instrument: synth }];
      });
    }

    console.log('active shapes')
    console.log(ActiveShapes)

    // Clean up synth after a delay
    setTimeout(() => {
      synth.dispose();
      setIsPlaying(false);
    }, 10000);
  };

  const stopSound = (shapeId: number | null) => {
    // Find the matching shape sound
    const matchedShapeSound = ActiveShapes.find(ss => ss.shapeId === shapeId);

    // Dispose of the instrument if found
    if (matchedShapeSound && matchedShapeSound.instrument) {
      matchedShapeSound.instrument.dispose();
    }

    setActiveShapes(prev => 
      prev.filter(shapeSound => shapeSound.shapeId !== shapeId)
    )
      // Stop transport if no more active sounds
    // if (ActiveShapes.length <= 1) { // <= 1 because we're about to remove one
    //   Tone.Transport.stop();
    // }
    // setIsPlaying(false);
  };

  const handleSoundSelect = (shapeId: number | null, 
                             soundType: string, 
                             note: string | null) => {
    playSound(soundType, note, shapeId);
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
          onClick={() => handleSoundSelect(shapeId, sound.id, sound.note)}
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
            display: 'block',
            position: 'relative'
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
          {selectedSoundType === sound.id && (
            <span style={{
              position: 'absolute',
              right: '12px',
              color: '#10b981',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>✔</span>
          )}
        </button>
      ))}
      <div style={{ borderTop: '1px solid #ddd', padding: '8px' }}>
      <button
          onClick={() => stopSound(shapeId)}
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
          Stop audio
      </button>
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
// SoundKit.tsx
// import { useState } from 'react';
import SoundPlayer from './SoundPlayer'; // Import the separate component

interface SoundKitProps {
  show: boolean;
  shapeId: number | null;
  position: { x: number; y: number };
  onSoundSelect: (soundType: string) => void;
  onClose: () => void;
  selectedSoundType?: string | null;
}

const SoundKit = ({ show, shapeId, position, onSoundSelect, onClose, selectedSoundType }: SoundKitProps) => {
  const soundOptions = [
    { id: 'fm-synth', name: 'FM Synth', note: 'C4' },
    { id: 'am-synth', name: 'AM Synth', note: 'G4' },
    { id: 'bass', name: 'Bass', note: 'C2' },
    { id: 'lead', name: 'Lead', note: 'C5' },
    { id: 'drum', name: 'Drum Hit', note: 'C3' },
    { id: 'beat_loop', name: 'Beat Loop', note: 'C4'},
    { id: 'organ_loop', name: 'Organ Loop', note: 'C4'}
  ];

  const handleSoundSelect = (soundType: string, note: string) => {
    const soundPlayer = SoundPlayer.getInstance();
    soundPlayer.playSingle(soundType, note);
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
        Select Sound for {shapeId}
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
// SoundPlayer.ts - Utility for playing sounds
import * as Tone from 'tone';
import { type SoundConfig } from '../sharedTypes';

export class SoundPlayer {
  private static instance: SoundPlayer;
  private activeSynths: any[] = [];

  static getInstance(): SoundPlayer {
    if (!SoundPlayer.instance) {
      SoundPlayer.instance = new SoundPlayer();
    }
    return SoundPlayer.instance;
  }

  async playSingle(soundType: string, note: string): Promise<void> {
    await Tone.start();
    
    const synth = this.createSynth(soundType);
    this.triggerSynth(synth, soundType, note);
    
    // Clean up after demo duration
    setTimeout(() => {
      synth.dispose();
    }, 8000);
  }

  async playMultiple(sounds: SoundConfig[]): Promise<void> {
    await Tone.start();
    
    // Clear any existing active synths
    this.stopAll();
    
    // Create all synths first
    const synthConfigs = sounds.map(({ soundType, note }) => {
      const synth = this.createSynth(soundType);
      this.activeSynths.push(synth);
      return { synth, soundType, note };
    });
    
    // Schedule all to start at the same time
    const startTime = Tone.now() + 0.1;
    
    synthConfigs.forEach(({ synth, soundType, note }) => {
      this.triggerSynth(synth, soundType, note, startTime);
    });
  }

  stopAll(): void {
    this.activeSynths.forEach(synth => {
      try {
        synth.dispose();
      } catch (e) {
        console.warn('Error disposing synth:', e);
      }
    });
    this.activeSynths = [];
  }

  private createSynth(soundType: string): any {
    switch (soundType) {
      case 'fm-synth':
        return new Tone.FMSynth().toDestination();
      case 'am-synth':
        return new Tone.AMSynth().toDestination();
      case 'bass':
        return new Tone.MonoSynth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.8 }
        }).toDestination();
      case 'lead':
        return new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.4 }
        }).toDestination();
      case 'drum':
        return new Tone.MembraneSynth().toDestination();
      case 'beat_loop':
        const beatPlayer = new Tone.Player("https://tonejs.github.io/audio/drum-samples/loops/blueyellow.mp3").toDestination();
        beatPlayer.loop = true;
        return beatPlayer;
      case 'organ_loop':
        const organPlayer = new Tone.Player("https://tonejs.github.io/audio/drum-samples/loops/organ-echo-chords.mp3").toDestination();
        organPlayer.loop = true;
        return organPlayer;
      default:
        return new Tone.Synth().toDestination();
    }
  }

  private triggerSynth(synth: any, soundType: string, note: string, startTime?: number): void {
    if (soundType.includes('loop')) {
    //   synth.start(startTime || Tone.now());
      synth.autostart = true;
    } else {
      synth.triggerAttackRelease(note, '8n', startTime || Tone.now());
    }
  }
}

export default SoundPlayer



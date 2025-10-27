// SoundPlayer.ts - Utility for playing sounds
import * as Tone from 'tone';
import { type SoundConfig } from '../sharedTypes';

type SynthInstrument = Tone.Synth | Tone.FMSynth | Tone.AMSynth | Tone.MonoSynth | Tone.MembraneSynth;
type Instrument = SynthInstrument | Tone.Loop | Tone.Player;
type InstrumentGroup = Instrument | Instrument[];

export class SoundPlayer {
  private static instance: SoundPlayer;
  private activeInstruments: InstrumentGroup[] = [];

  static getInstance(): SoundPlayer {
    if (!SoundPlayer.instance) {
      SoundPlayer.instance = new SoundPlayer();
    }
    return SoundPlayer.instance;
  }

  async playSingle(soundType: string, note: string): Promise<void> {
    await Tone.start();
    const timeLimit = 4000;
    
    const instrument = this.createInstrument(soundType);
    this.triggerInstrument(instrument, note);
    
    // Clean up after demo duration
    setTimeout(() => {
      this.destroyInstrument(instrument);
    }, timeLimit);
  }

  async playMultiple(sounds: SoundConfig[]): Promise<void> {
    await Tone.start();
    
    // Clear any existing active instruments
    this.stopAll();
    
    // Create all instruments first
    const synthConfigs = sounds.map(({ soundType, note }) => {
      const instrument = this.createInstrument(soundType);
      this.activeInstruments.push(instrument);
      return { instrument, note };
    });
    
    // Schedule all to start at the same time
    const startTime = Tone.now() + 0.1;
    
    synthConfigs.forEach(({ instrument, note }) => {
      this.triggerInstrument(instrument, note, startTime);
    });
  }

  stopAll(): void {
    this.activeInstruments.forEach(instrument => {
      this.destroyInstrument(instrument);
    });
    this.activeInstruments = [];
  }

  private createInstrument(soundType: string): InstrumentGroup {
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
      case 'test':
        const synthA = new Tone.FMSynth().toDestination();
        const synthB = new Tone.AMSynth().toDestination();
        const loopA = new Tone.Loop((time) => {
          synthA.triggerAttackRelease("D2", "8n", time);
        }, "4n").start(0);
        const loopB = new Tone.Loop((time) => {
          synthB.triggerAttackRelease("A2", "8n", time);
        }, "4n").start("8n");
        return [loopA, loopB];
      default:
        return new Tone.Synth().toDestination();
    }
  }

  private triggerInstrument(instrument: InstrumentGroup, note: string, startTime?: number): void {
    const instruments = Array.isArray(instrument) ? instrument : [instrument];
    const time = startTime || Tone.now();
    
    instruments.forEach((inst) => {
      if (inst instanceof Tone.Loop) {
        Tone.getTransport().start();
      } else if (inst instanceof Tone.Player) {
        inst.autostart = true;
      } else if (this.isSynthInstrument(inst)) {
        inst.triggerAttackRelease(note, '8n', time);
      }
    });
  }

  private destroyInstrument(instrument: InstrumentGroup): void {
    const instruments = Array.isArray(instrument) ? instrument : [instrument];
    
    instruments.forEach((inst) => {
      try {
        if (inst instanceof Tone.Loop) {
          inst.stop();
          Tone.getTransport().stop();
        }
        inst.dispose();
      } catch (e) {
        console.warn('Error disposing instrument:', e);
      }
    });
  }

  private isSynthInstrument(inst: Instrument): inst is SynthInstrument {
    return 'triggerAttackRelease' in inst;
  }
}

export default SoundPlayer;
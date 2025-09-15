export interface SoundConfig {
  soundType: string;
  note: string;
}

export interface DrawnShape {
    id: number;
    type: string;
    coordinates: any;
    soundType: string | null;
}
import Flatten from 'flatten-js';

export interface SoundConfig {
  soundType: string;
  note: string;
}

// export interface DrawnShape {
//     id: number;
//     type: string;
//     coordinates: any;
//     soundType: string | null;
//     flatShape: Flatten.Circle | Flatten.Polygon | Flatten.Point | null;
// }

export interface DrawnLayer {
    id: number;
    type: string;
    coordinates: any;
    soundType: string | null;
}

export type DrawnShape = Flatten.Circle | Flatten.Polygon;

// export interface DrawnShape extends DrawnLayer {
//   flatShape: Flatten.Circle | Flatten.Polygon;
// }

// export interface DrawnMarker extends DrawnLayer {
//     type: "point";
//     flatShape: Flatten.Point;
// }
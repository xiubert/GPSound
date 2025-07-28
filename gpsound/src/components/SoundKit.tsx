import React, { useRef, useState } from 'react';
import * as Tone from "tone";

interface SoundKitProps {
  show: boolean;
}

const SoundKit = ({ show = false }: SoundKitProps) => {
//   const mapRef = useRef(null);
//   const mapInstanceRef = useRef(null);
//   const drawnItemsRef = useRef(null);
    const [SoundBox, setSoundBox] = useState([]);

    // create two monophonic synths
    const synthA = new Tone.FMSynth().toDestination();
    const synthB = new Tone.AMSynth().toDestination();
    //play a note every quarter-note
    const loopA = new Tone.Loop((time) => {
        synthA.triggerAttackRelease("C2", "8n", time);
    }, "4n").start(0);
    //play another note every off quarter-note, by starting it "8n"
    const loopB = new Tone.Loop((time) => {
        synthB.triggerAttackRelease("C4", "8n", time);
    }, "4n").start("8n");

  if (!show) return null;
  return <div>Sounds</div>;
};


export default SoundKit;

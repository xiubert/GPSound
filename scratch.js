// var roiStart = {
    //     name: "start",
    //     coor: quadrant0,
    //     roiSynth: psynth,
    //     roiBPM: 50, //this is global, interval is local to beat
    //     beatLoop: beatLoop0,
    //     roiBeatInterval: "2n",
    //     synthPartNotes: [
    //         'A4', 'F#5', 'D4', 'A5',
    //         'A5', 'F#4', 'D5', 'A4'],
    //     synthPartTimes: [
    //         "0", "0:0:2", "0:1:0", "0:1:2",
    //         "0:2:0", "0:2:2", "0:3:0", "0:3:2"],
    //     partHelper: null,
    //     //velocity future
    //     enterRegion: function () {
    //         this.partHelper = playNotes(this.roiSynth, this.synthPartNotes, this.synthPartTimes);
    //         //fmOsc.frequency.value = rescale(pos,5,200,minGridPos(),maxGridPos(maxX,maxY));
    //         fmOsc.frequency.value = 44;
    //     },
    //     leaveRegion: function () {
    //         // sample
    //         this.partHelper.stop();
    //     }
    // };

    // var roi0 = {
    //     name: "roi0",
    //     coor: quadrant0,
    //     roiSynth: psynth,
    //     roiBPM: 50, //this is global, interval is local to beat
    //     beatLoop: beatLoop0,
    //     roiBeatInterval: "2n",
    //     synthPartNotes: [
    //         'A4', 'F#5', 'D4', 'A5',
    //         'A5', 'F#4', 'D5', 'A4'],
    //     synthPartTimes: [
    //         "0", "0:0:2", "0:1:0", "0:1:2",
    //         "0:2:0", "0:2:2", "0:3:0", "0:3:2"],
    //     partHelper: null,
    //     //velocity future
    //     enterRegion: function () {
    //         this.partHelper = playNotes(this.roiSynth, this.synthPartNotes, this.synthPartTimes);
    //         //fmOsc.frequency.value = rescale(pos,5,200,minGridPos(),maxGridPos(maxX,maxY));
    //         fmOsc.frequency.value = 44;
    //     },
    //     leaveRegion: function () {
    //         // sample
    //         this.partHelper.stop();
    //     }
    // };

    // var roi1 = {
    //     name: "roi1",
    //     coor: quadrant1,
    //     roiSynth: psynth,
    //     roiBPM: 100,
    //     beatLoop: beatLoop0,
    //     roiBeatInterval: "4n",
    //     synthPartNotes: [
    //         'A4', 'F#5', 'D4', 'A5',
    //         'A5', 'F#4', 'D5', 'A4'],
    //     synthPartTimes: [
    //         "0", "0:0:2", "0:1:0", "0:1:2",
    //         "0:2:0", "0:2:2", "0:3:0", "0:3:2"],
    //     partHelper: null,
    //     //velocity future
    //     enterRegion: function () {
    //         this.partHelper = playNotes(this.roiSynth, this.synthPartNotes, this.synthPartTimes);
    //         //fmOsc.frequency.value = rescale(pos,5,200,minGridPos(),maxGridPos(maxX,maxY));
    //         fmOsc.frequency.value = 88;
    //     },
    //     leaveRegion: function () {
    //         // sample
    //         this.partHelper.stop();
    //     }
    // };

    // var roi2 = {
    //     name: "roi2",
    //     coor: quadrant2,
    //     roiSynth: psynth,
    //     roiBPM: 150,
    //     beatLoop: beatLoop0,
    //     roiBeatInterval: "8n",
    //     synthPartNotes: [
    //         'A4', 'F#5', 'D4', 'A5',
    //         'A5', 'F#4', 'D5', 'A4'],
    //     synthPartTimes: [
    //         "0", "0:0:2", "0:1:0", "0:1:2",
    //         "0:2:0", "0:2:2", "0:3:0", "0:3:2"],
    //     partHelper: null,
    //     //velocity future
    //     enterRegion: function () {
    //         this.partHelper = playNotes(this.roiSynth, this.synthPartNotes, this.synthPartTimes);
    //         //fmOsc.frequency.value = rescale(pos,5,200,minGridPos(),maxGridPos(maxX,maxY));
    //         fmOsc.frequency.value = 100;
    //     },
    //     leaveRegion: function () {
    //         // sample
    //         this.partHelper.stop();
    //     }
    // };

    // var roi3 = {
    //     name: "roi3",
    //     coor: quadrant3,
    //     roiSynth: psynth,
    //     roiBPM: 200,
    //     beatLoop: beatLoop0,
    //     roiBeatInterval: "16n",
    //     synthPartNotes: [
    //         'A4', 'F#5', 'D4', 'A5',
    //         'A5', 'F#4', 'D5', 'A4'],
    //     synthPartTimes: [
    //         "0", "0:0:2", "0:1:0", "0:1:2",
    //         "0:2:0", "0:2:2", "0:3:0", "0:3:2"],
    //     partHelper: null,
    //     //velocity future
    //     enterRegion: function () {
    //         this.partHelper = playNotes(this.roiSynth, this.synthPartNotes, this.synthPartTimes);
    //         //fmOsc.frequency.value = rescale(pos,5,200,minGridPos(),maxGridPos(maxX,maxY));
    //         fmOsc.frequency.value = 120;
    //     },
    //     leaveRegion: function () {
    //         // sample
    //         this.partHelper.stop();
    //     }
    // };

    const quads = [[0, 150, 0, 150],
    [150, 300, 0, 150],
    [0, 150, 150, 300],
    [150, 300, 150, 300]]
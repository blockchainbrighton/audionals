// modules/piano-roll.js
export const PianoRoll = {
    init() {
        this.rollGrid = document.getElementById('rollGrid');
    },
    draw() {
        let seq = synthApp.seq;
        this.rollGrid.innerHTML='';
        let timeGrid=this.ce('div','time-grid'), pitchGrid=this.ce('div','pitch-grid');
        this.rollGrid.append(timeGrid,pitchGrid);
        for(let i=0;i<=10;i++){let l=this.ce('div','time-line');l.style.left=i*10+'%';timeGrid.append(l);}
        for(let i=0;i<=24;i++){let l=this.ce('div','pitch-line');l.style.top=i*100/24+'%';pitchGrid.append(l);}
        seq.forEach((o,i)=>{
            let n=this.ce('div','roll-note',null); n.dataset.idx=i;
            n.style.left=(o.start/10)*100+'%'; n.style.width=(o.dur/10)*100+'%';
            n.style.top=(100-(Tone.Frequency(o.note).toMidi()-48)/24*100)+'%'; n.style.opacity=o.vel;
            n.onclick = _=>{
                this.rollGrid.querySelectorAll('.roll-note').forEach(e=>e.classList.remove('selected'));
                n.classList.add('selected'); synthApp.selNote=i;
            };
            this.rollGrid.append(n);
        });
    },
    ce(tag,cls,note){let e=document.createElement(tag);e.className=cls;if(note)e.dataset.note=note;return e;}
};

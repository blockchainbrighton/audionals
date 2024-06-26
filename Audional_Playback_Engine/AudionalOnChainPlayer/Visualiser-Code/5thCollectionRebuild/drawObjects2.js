// drawObjects.js

cp.drawObject = function(obj, tm) {
    for (let f of obj.f) {
        let v = f.map((i) => obj.v[i]);
        let p = v.map((v) => ({ x: v.x, y: v.y }));
        cx.beginPath();
        cx.moveTo(p[0].x, p[0].y);
        for (let i = 1; i < p.length; i++) {
            cx.lineTo(p[i].x, p[i].y);
        }
        cx.closePath();

       // Assuming angle, tm, and v are calculated correctly here
        let angle = Math.atan2(p[0].y - S / 2, p[0].x - S / 2) * 180 / Math.PI;

        // Now, obtain colors dynamically
        let colors = organizeEffects(angle, tm, v); // Use the updated global cci directly
        cx.fillStyle = colors[cci % colors.length]; // This uses the directly updated cci value
        cx.fill();

        cx.strokeStyle = 'black';
        cx.stroke();
    }
};


// drawObject16.1.js

function d(tm) {
    cx.clearRect(0, 0, S, S);
    let a;
    if (t === undefined) {
        a = 0;
    } else {
        let d = tm - t;
        a = RS * d * 100;
    }
    t = tm;
    cp.rP(cp.c, a); // Adjust color patterns based on rotation

    // Pass `tm` to `cp.drawObject` for dynamic color changes
    cp.drawObject(cp.cy, tm);
    cp.drawObject(cp.sp1, tm);
    cp.drawObject(cp.sp2, tm);
    requestAnimationFrame(d);
}

requestAnimationFrame(d);

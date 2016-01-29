var grid =
    [[1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10]];

function render(canvas) {
    var ctx = canvas.getContext('2d');
    var width = canvas.width,
        height = canvas.height;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeRect(1, 1, width-2, height-2);
    ctx.translate(offsetX, offsetY);

    var pointy = true
    var hexSize = 20;
    var x, y;
    for (y in grid) {
        var row = grid[y];
        for (x in row) {

            var a_size = hexSize / 2.0,
                b_size = hexSize * Math.sqrt(3) / 2.0,
                height = hexSize * 2.0,
                width = b_size * 2.0;

            if (pointy) {
            var cx = b_size + x * width + y * b_size,
                cy = hexSize + 3 * y * a_size;
            // var cx = hexSize + 3 * x * a_size + y * hexSize,
            //     cy = b_size + y * height;
            ctx.beginPath()
            ctx.moveTo(cx - b_size, cy - a_size);
            ctx.lineTo(cx, cy - hexSize);
            ctx.lineTo(cx + b_size, cy - a_size);
            ctx.lineTo(cx + b_size, cy + a_size);
            ctx.lineTo(cx, cy + hexSize);
            ctx.lineTo(cx - b_size, cy + a_size);
            ctx.lineTo(cx - b_size, cy - a_size);
            ctx.stroke();
//            ctx.strokeText(x + ',' + y, cx, cy);
            } else {
            var cx = hexSize + 3 * x * a_size,
                cy = b_size + y * height + x * b_size;
            ctx.beginPath()
            ctx.moveTo(cx - hexSize, cy);
            ctx.lineTo(cx - a_size, cy - b_size);
            ctx.lineTo(cx + a_size, cy - b_size);
            ctx.lineTo(cx + hexSize, cy);
            ctx.lineTo(cx + a_size, cy + b_size);
            ctx.lineTo(cx - a_size, cy + b_size);
            ctx.lineTo(cx - hexSize, cy);
            ctx.stroke();
                ctx.fillText(x + ',' + y, cx, cy);
            }
        }
    }
    ctx.restore();
}

var angle = 0;
var offsetX = 0;
var offsetY = 0;

function update() {
    angle += 0.05;
    offsetX = Math.cos(angle) * 50;
    offsetY = Math.sin(angle) * 50-50;
}

function loop(canvas) {
    requestAnimationFrame(function() {loop(canvas)});
    update();
    render(canvas);
}

function start(canvasId) {
    var canvas = document.getElementById(canvasId);

    requestAnimationFrame(function() {loop(canvas)});
}

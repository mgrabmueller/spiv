var grid =
    [[1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
     [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10]];

function render(canvas) {
    var ctx = canvas.getContext('2d');

    var hexSize = 32;
    var a_size = hexSize / 2.0,
        b_size = hexSize * Math.sqrt(3) / 2.0,
        height = hexSize * 2.0,
        width = b_size * 2.0;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeRect(1, 1, canvas.width-2, canvas.height-2);
    ctx.translate(offsetX, offsetY);

    var pointy = true

    var mouseRow = Math.floor((mouseY - offsetY) / (height - a_size)),
	mouseRowRest = (mouseY - offsetY) - (mouseRow * (height - a_size));
    var mouseCol = Math.floor((mouseX - offsetX - mouseRow * b_size) / width);
    var mouseColRest = Math.floor(mouseX - offsetX - mouseRow * b_size) - (mouseCol * width);
    if (mouseRowRest < a_size) {
	if (mouseColRest < hexSize*Math.abs(0.5-mouseRow/width)) {
	    mouseRow--;
	} else if (mouseColRest>hexSize *Math.abs(0.5-mouseRow/width)) {
	    mouseRow--;
	    mouseCol++;
	}
//	console.log(mouseRowRest, mouseColRest);
    }
    var x, y;
    ctx.strokeStyle = 'lightgray';
    for (y in grid) {
        var row = grid[y];
        for (x in row) {
	    ctx.strokeRect(x * width + y * b_size,
			   y * (height - a_size),
			   width,
			   height - a_size);

	}
    }
    ctx.fillStyle = 'lightgreen';
    ctx.strokeStyle = 'black';
    for (y in grid) {
        var row = grid[y];
        for (x in row) {

	    if (x == mouseCol && y == mouseRow) {
		var cx = b_size + x * width + y * b_size,
                    cy = hexSize + 3 * y * a_size;

		ctx.beginPath()
		ctx.moveTo(cx - b_size, cy - a_size);
		ctx.lineTo(cx, cy - hexSize);
		ctx.lineTo(cx + b_size, cy - a_size);
		ctx.lineTo(cx + b_size, cy + a_size);
		ctx.lineTo(cx, cy + hexSize);
		ctx.lineTo(cx - b_size, cy + a_size);
		ctx.lineTo(cx - b_size, cy - a_size);
		ctx.fill();
	    }
            var cx = b_size + x * width + y * b_size,
                cy = hexSize + 3 * y * a_size;
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
        }
    }
    ctx.restore();
}

var mouseX = 0,
    mouseY = 0;
var angle = 0;
var offsetX = 10;
var offsetY = 10;

function update() {
    angle += 0.01;
    offsetX = Math.cos(angle) * 50 + 50;
    offsetY = Math.sin(angle) * 50 + 50;
}

function loop(canvas) {
    requestAnimationFrame(function() {loop(canvas)});
//    update();
    render(canvas);
}

function start(canvasId) {
    var canvas = document.getElementById(canvasId);

    canvas.addEventListener("mousemove",
			      function(e) {
				  var x = e.clientX - 20,
				      y = e.clientY - 20;
				  mouseX = x;
				  mouseY = y;
			      });
    requestAnimationFrame(function() {loop(canvas)});
}

// JavaScript Document

$(document).ready(function () {
	initEvents($("#myCanvas"));
});

// キャンバスにイベントを紐付ける関数
function initEvents(canvas) {

	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();
	var inputPoints = [];	// 入力頂点
	var boundaryPoints = [];
	var holeBoundaryPoints = [];

	var selectPoint = null;

	function circle(center) {
		var inputPoints = [];
		var r = 0.1 * canvasHeight;
		var thDiv = 10;
		var th;
		for(var i = 0; i < thDiv; ++i) {
			th = 2 * Math.PI / thDiv * i;
			inputPoints.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
		}
		return { points: inputPoints};
	}


	function waveCircle(center) {
		var inputPoints = [];
		var rad = 0.3 * canvasHeight;
		var innerRad = 0.3 * rad;
		var thDiv = 40;
		var numWave = 5;
		var th;
		var r;
		for(var i = 0; i < thDiv; ++i) {
			th = 2 * Math.PI / thDiv * i;
			r = rad + innerRad * Math.sin(numWave * th + Math.PI);
			inputPoints.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
		}
		return { points: inputPoints };
	}

	function makeInputData() {
		var center = [canvasWidth * 0.5, canvasHeight * 0.5];
		var waveResult = waveCircle(center);
		inputPoints = new Array(2);
		inputPoints[0] = waveResult.points;
		boundaryPoints = [waveResult.points];

		holeBoundaryPoints = [];
		var circleResult = circle(center);
		holeBoundaryPoints.push(circleResult.points);
		inputPoints[1] = circleResult.points;

	}

	makeInputData();

	draw();

	// mouseクリック時のイベントコールバック設定
	canvas.mousedown(function (event) {
		// 左クリック or 右クリック
		if(event.button == 2 || event.button == 0) {
			var canvasOffset = canvas.offset();
			var canvasX = Math.floor(event.pageX - canvasOffset.left);
			var canvasY = Math.floor(event.pageY - canvasOffset.top);
			if(canvasX < 0 || canvasX > canvasWidth) {
				return;
			}
			if(canvasY < 0 || canvasY > canvasHeight) {
				return;
			}
			var clickPos = [canvasX, canvasY];
			var dist;
			for(var i = 0; i < inputPoints.length; ++i) {
				for(var j = 0; j < inputPoints[i].length; ++j) {
					dist = util.norm2(util.sub(inputPoints[i][j], clickPos));
					if(dist < 10) {
						selectPoint = [i, j];
						break;
					}
				}
			}
		}
	});
	// mouse移動時のイベントコールバック設定
	canvas.mousemove(function (event) {
		var canvasOffset = canvas.offset();
		var canvasX = Math.floor(event.pageX - canvasOffset.left);
		var canvasY = Math.floor(event.pageY - canvasOffset.top);
		if(canvasX < 0 || canvasX > canvasWidth) {
			return;
		}
		if(canvasY < 0 || canvasY > canvasHeight) {
			return;
		}
		if(selectPoint != null) {
			inputPoints[selectPoint[0]][selectPoint[1]] = [canvasX, canvasY];
			draw();
		}
	});
	// mouseクリック解除時のイベントコールバック設定
	$(window).mouseup(function (event) {
		selectPoint = null;
		draw();
	});

	$("input").click(function () {
		draw()
	});

	// リセットボタン
	$("#reset").click(function () {
		inputPoints = [];
		points = [];
		selectPoint = null;
		makeInputData();
		draw();
	});

	// 点群の生成と三角形分割
	// レンダリングのリフレッシュを行う関数
	function draw() {

		var context = canvas.get(0).getContext("2d");
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		var innerTriangulation = $('#innerCheckbox:checked').val() 

		// 三角形分割
		var option;
		if(innerTriangulation) {
			option = { triSize: 'auto'}
		}
		var result = cdt(boundaryPoints, holeBoundaryPoints, option);
		drawResult(result, context, inputPoints);

	}

	function drawResult(result, context, inputPoints) {
		if(result == null) {
			// 点の描画
			context.fillStyle = 'black';
			drawPoints(canvas, inputPoints[0], 3);
			drawPoints(canvas, inputPoints[1], 3);
			return;
		}
		var points = result.points;
		var conn = result.connectivity;

		// 三角形の描画
		context.strokeStyle = 'black';
		context.fillStyle = 'lightyellow';
		for(var i = 0; i < conn.length; ++i) {
			context.beginPath();
			context.moveTo(points[conn[i][0]][0], points[conn[i][0]][1]);
			context.lineTo(points[conn[i][1]][0], points[conn[i][1]][1]);
			context.lineTo(points[conn[i][2]][0], points[conn[i][2]][1]);
			context.lineTo(points[conn[i][0]][0], points[conn[i][0]][1]);
			context.stroke();
			context.fill();
		}

		// 境界の描画
		context.strokeStyle = 'lightgreen';
		context.lineWidth = 6;
		context.beginPath();
		context.globalAlpha = 0.5;
		for(var j = 0; j < boundaryPoints.length; ++j) {
			if(boundaryPoints[j].length != 0) {
				context.moveTo(boundaryPoints[j][0][0], boundaryPoints[j][0][1]);
			}
			for(var i = 1; i < boundaryPoints[j].length; ++i) {
				context.lineTo(boundaryPoints[j][i][0], boundaryPoints[j][i][1]);
			}
			context.lineTo(boundaryPoints[j][0][0], boundaryPoints[j][0][1]);
			context.stroke();
		}
		context.lineWidth = 1;
		context.globalAlpha = 1.0;

		// 穴境界の描画
		context.strokeStyle = 'lightblue';
		context.lineWidth = 6;
		context.globalAlpha = 0.5;
		context.beginPath();
		for(var j = 0; j < holeBoundaryPoints.length; ++j) {
			if(holeBoundaryPoints[j].length != 0) {
				context.moveTo(holeBoundaryPoints[j][0][0], holeBoundaryPoints[j][0][1]);
			}
			for(var i = 1; i < holeBoundaryPoints[j].length; ++i) {
				context.lineTo(holeBoundaryPoints[j][i][0], holeBoundaryPoints[j][i][1]);
			}
			context.lineTo(holeBoundaryPoints[j][0][0], holeBoundaryPoints[j][0][1]);
			context.stroke();
		}
		context.lineWidth = 1;
		context.globalAlpha = 1.0;

		// 点の描画
		context.fillStyle = 'black';
		drawPoints(canvas, points, 2);
	}
}

function drawPoints(canvas, points, rad) {
	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var i = 0; i < points.length; ++i) {
		context.beginPath();
		context.arc(points[i][0], points[i][1], rad, 0, 2 * Math.PI, true);
		context.fill();
	}
}


// 配列処理

function util() { };
util.clone = function (src) {
	if(src.length == 0) {
		return [];
	}
	var tmp = new Array(src.length);
	if(typeof (src[0]) == 'number') {
		for(var i = 0; i < src.length; ++i) {
			tmp[i] = src[i];
		}
		return tmp;
	}
	if(typeof (src[0][0] == 'number')) {
		for(var i = 0; i < src.length; ++i) {
			tmp[i] = new Array(src[i].length);
			for(var j = 0; j < src[i].length; ++j) {
				tmp[i] = src[i];
			}
		}
		return tmp;
	}
	if(typeof (src[0][0][0] == 'number')) {
		alert('この処理は未検証 at util.clone');
		for(var i = 0; i < src.length; ++i) {
			tmp[i] = new Array(src[i].length);
			for(var j = 0; j < src[i].length; ++j) {
				tmp[i][j] = new Array(src[i][j].length);
				for(var k = 0; k < src[i][j].length; ++k) {
					tmp[i][j][k] = src[i][j][k];
				}
			}
		}
	}
}

util.norm2 = function (src) {
	var tmp = 0;
	for(var i = 0; i < src.length; ++i) {
		tmp += src[i] * src[i];
	}
	return Math.sqrt(tmp);
}

// return x-y
util.sub = function (x, y) {
	if(x.length != y.length) {
		console.log('length of input arrays are not equal. in util.sub');
		return null;
	}
	var l = x.length;
	var tmp = new Array(l);
	for(var i = 0; i < l; ++i) {
		tmp[i] = x[i] - y[i];
	}
	return tmp;
}


// return x+y
util.add = function (x, y) {
	if(x.length != y.length) {
		console.log('ERROR: length of input arrays are not equal. in util.sub');
		return null;
	}
	var l = x.length;
	var tmp = new Array(l);
	for(var i = 0; i < l; ++i) {
		tmp[i] = x[i] + y[i];
	}
	return tmp;
}


// return x*y
util.mul = function (x, y) {
	var a;
	var v;
	if(typeof (x) == 'number') {
		a = x;
		v = y;
	} else if(typeof (y) == 'number') {
		a = y;
		v = x;
	} else {
		console.log('ERROR: input argument do not include scalar value');
		return null;
	}
	var l = v.length;
	var tmp = new Array(l);
	for(var i = 0; i < l; ++i) {
		tmp[i] = a * v[i];
	}
	return tmp;
}


// return x/y
util.div = function (x, y) {
	var a;
	var v;
	if(typeof (x) == 'number') {
		a = x;
		v = y;
	} else if(typeof (y) == 'number') {
		a = y;
		v = x;
	} else {
		console.log('ERROR: input arguments do not include scalar value');
		return null;
	}
	var l = v.length;
	var tmp = new Array(l);
	var inva = 1 / a;
	for(var i = 0; i < l; ++i) {
		tmp[i] = v[i] * inva;
	}
	return tmp;
}

// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />

var colors=['lightsalmon', 'lightseagreen', 'aquamarine', 'beige', 'burlywood', 'mistyrose', 'mediumpurple', 'darkcyan', 'darkgray', 'orchid', 'peru', 'dodgerblue'];
var N=1000;
var distMin=10;

$(document).ready(function () {
	initEvents($("#myCanvas"));
});

// キャンバスにイベントを紐付ける関数
function initEvents(canvas) {

	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	var clickPoint=[];

	var points=[];	// 頂点の座標群
	var head=[];	// DelaunayTriangleクラスのインスタンス配列

	var selectPoint=null;
	var clickState="up";

	init();
	draw();

	// mouseクリック時のイベントコールバック設定
	canvas.mousedown(function (event) {
		// 左クリック
		if(event.button==0) {
			var canvasOffset=canvas.offset();
			var canvasX=Math.floor(event.pageX-canvasOffset.left);
			var canvasY=Math.floor(event.pageY-canvasOffset.top);
			if(canvasX<0||canvasX>canvasWidth) {
				return;
			}
			if(canvasY<0||canvasY>canvasHeight) {
				return;
			}
			clickState="down";
			clickPoint=[canvasX, canvasY];
			lawson();
			draw();
		}
	});

	// mouse移動時のイベントコールバック設定
	canvas.mousemove(function (event) {
		var canvasOffset=canvas.offset();
		var canvasX=Math.floor(event.pageX-canvasOffset.left);
		var canvasY=Math.floor(event.pageY-canvasOffset.top);
		if(canvasX<0||canvasX>canvasWidth) {
			return;
		}
		if(canvasY<0||canvasY>canvasHeight) {
			return;
		}
		if(clickState=="down") {
			for(var i=0; i<points.length; ++i) {
				if(canvasX==points[i][0]&&canvasY==points[i][1]) {
					return;
				}
			}
			clickPoint=[canvasX, canvasY];
			lawson();
			draw();
		}
	});

	// mouseクリック解除時のイベントコールバック設定
	$(window).mouseup(function (event) {
		clickState="up";
	});

	$("input").click(function () {
		draw()
	});

	// リセットボタン
	$("#reset").click(function () {
		init();
		draw();
	});
	
	// 点群の生成と三角形分割
	function init() {
		// ランダムな点群を生成
		points = generateRondomPoints(canvasWidth, canvasHeight, distMin, N);
		// 三角形分割
		var result=new DelaunayTriangulation(points, canvasHeight, 0, canvasWidth, 0);
		head=result.head;
		points=result.points;
	}

	function lawson() {
		// ローソンの三角形探査
		if(clickPoint.length!=0) {
			var resultTri=DelaunayTriangle.lawsonTriangleDetection(points, head, clickPoint);
			points.push(clickPoint);
			resultTri.addPoint(points.length-1, points);
		}
	}

	// レンダリングのリフレッシュを行う関数
	function draw() {

		var context = canvas.get(0).getContext("2d");
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		// 外接円の描画
		if($('#gaisetuenCheckBox').is(':checked')) {
			drawCircumcirclesFromHead(canvas, points, head);
		}

		// 三角形の描画
		context.strokeStyle='black';
		drawTrianglesFromHead(canvas, points, head);

		// 点の描画
		context.fillStyle='black';
		drawPoints(canvas, points);

		// クリックした点の描画
		context.fillStyle='red';
		context.beginPath();
		context.arc(clickPoint[0], clickPoint[1], 3, 0, Math.PI*2, true);
		context.fill();

	}
}

// ランダムな点群を生成する
function generateRondomPoints(width, height, distMin, N){
	var randx, randy;
	var dist, isTooClose;
	var points=[];
	for(var i=0; i<N; ++i) {
		for(var j=0; j<10; ++j) {
			randx=0.8*width*(Math.random()-0.5)+0.5*width;
			randy=0.8*height*(Math.random()-0.5)+0.5*height;
			isTooClose=false;
			for(var j=0; j<points.length; ++j) {
				dist=(randx-points[j][0])*(randx-points[j][0])+(randy-points[j][1])*(randy-points[j][1]);
				if(dist<distMin*distMin) {
					isTooClose=true;
					break;
				}
			}
			if(!isTooClose) {
				points.push([randx, randy]);
				break;
			}
		}
	}
	return points;
}


// 以下、描画関係

function drawPoints(canvas, points) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var i=0; i<points.length; ++i) {
		context.beginPath();
		context.arc(points[i][0], points[i][1], 2, 0, 2*Math.PI, true);
		context.fill();
	}
}

function drawTrianglesFromHead(canvas, points, head) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var tri=head; tri!=null; tri=tri.next) {
		context.beginPath();
		context.moveTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.lineTo(points[tri.vertexID[1]][0], points[tri.vertexID[1]][1]);
		context.lineTo(points[tri.vertexID[2]][0], points[tri.vertexID[2]][1]);
		context.lineTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.stroke();
	}
}


function fillTrianglesFromHead(canvas, points, head) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	var i=0;
	for(var tri=head; tri!=null; tri=tri.next) {
		context.fillStyle=colors[i%colors.length];
		context.beginPath();
		context.moveTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.lineTo(points[tri.vertexID[1]][0], points[tri.vertexID[1]][1]);
		context.lineTo(points[tri.vertexID[2]][0], points[tri.vertexID[2]][1]);
		context.lineTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.fill();
		++i;
	}
}


// 三角形の外接円を描画
function drawCircumcirclesFromHead(canvas, points, head) {
	var context=canvas.get(0).getContext("2d");
	var cir;
	var i=0;
	context.globalAlpha=0.3;
	for(var tri=head; tri!=null; tri=tri.next) {
		context.fillStyle=colors[i%colors.length];
		context.beginPath();
		cir=new Circumcircle(points[tri.vertexID[0]], points[tri.vertexID[1]], points[tri.vertexID[2]]);
		context.arc(cir.p[0], cir.p[1], cir.rad, 0, Math.PI*2, true);
		context.fill();
		++i;
	}
	context.globalAlpha=1.0;
}



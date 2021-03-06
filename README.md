cdt.js
======
**JavaScriptによる二次元三角形分割 (Constrained Delaunay Triangulation)**

`cdt.js`は，二次元空間における境界内部を三角形分割する関数を提供します．三角形分割のアルゴリズムは，『谷口健男著，FEMのための要素自動分割，森北出版』を参考に，拘束ドロネー三角分割 (Constrained Delaunay Triangulation, CDT) に基づいて実装されています．分割対象領域は多角形境界で定義します，領域内部への節点追加配置にも対応し，簡易的な有限要素法 (Finite Element Method, FEM) のプリプロセッサとして用いることもできます．



License
---
* MIT
    * see LICENSE

Demo
---
[Interactive demo](http://sasekazu.github.io/cdt.js/example/interactive-demo)

![rectangle](img/demo.gif)

Install
---
`dist/cdt-0.1.min.js` を直接読み込んで使用します．
```html
<script type='text/javascript' src='cdt.js'></script>
```


Usege
---
提供する関数はひとつだけです．
```javascript
function cdt(boundaryPolygons, holeBoundaryPolygons, option) -> result
```
`arg1` `boundaryPolygons`: 「境界を表す多角形の頂点座標配列」の配列.
`arg2` `holeBoundaryPolygons`: 「穴境界を表す多角形の頂点座標配列」の配列.
`arg3` `option`: 省略可能．詳細はExampleにて説明．
`return value` `result`: 結果を格納したオブジェクト
`return value` `result.points`:  全頂点の座標，
`return value` `result.connectivity`:三角形を構成する頂点のIDリスト


Example - Single boundary
---
1. 入力データの準備
境界を多角形頂点座標の配列として準備します．
例えば，4点 (100, 100), (300, 100), (300, 200), (100, 200) を頂点とする多角形（四角形）の場合，以下のように配列を作成します．
```javascript
var polygonPoints0 = [[100, 100], [300, 100], [300, 200], [100, 200]];	// Coordinates of vertices of a rectangle
```
多角形の境界が自己交差しないよう注意してください．`cdt.js`は境界に交差がないことを前提としており，エラー処理や交差チェックは未実装です．

2. 三角形分割の実行
領域を三角形分割するには，以下のように関数`cdt`を呼びます．
```javascript
var result = cdt([polygonPoints0], []);
```
`cdt`の第一引数を`Array` of `Array`として渡すのは，後述の複数境界のデータ形式と合わせるためです．
第二引数は穴の境界多角形の頂点座標を与えますが，ここでは空配列を渡しています（現状では省略できません）．
複数境界，穴の追加については後述します．

3. 結果の取り出し
分割結果は以下のように取り出します．
```javascript
var points = result.points;
var conn = result.connectivity;
```
ここで，`points`は頂点座標を格納した配列で，この例の場合，`polygonPoints0`と同じ値を持ちます．
`conn`は三角形の結合情報を表すコネクティビティ配列です．
例えば，i番目の三角形の頂点座標は以下のようにアクセスします．
```javascript
p0 = points[conn[i][0]];
p1 = points[conn[i][1]];
p2 = points[conn[i][2]];
```
この例の分割結果は下の図のようになります．

![rectangle](img/square.png)

Example - Hole boundary
---
通常境界と同様に，穴境界についても頂点座標の配列を作成します．
例えば，上記の長方形に加えて，小さい四角形の頂点座標配列を以下のように作成します．
```javascript
var polygonPoints0 = [[100, 100], [300, 100], [300, 200], [100, 200]];	// Large rectangle
var polygonPoints1 = [[170, 170], [130, 170], [130, 130], [170, 130]];	// Small square
```
三角形分割するには，`cdt`の第二引数に`polygonPoints1`を渡します．
```javascript
var result = cdt([polygonPoints0],[polygonPoints1]);
```
結果の取り出しは Single boundary の場合と同様です．
分割結果は以下のようになります．

![rectangle with hole](img/hole.png)

Example - Multiple boundary
---
以下のように`polygonPoints0`, `polygonPoints1`, `hpolygonPoints2` を作成したとします．
```javascript
var polygonPoints0 = [[100, 100], [300, 100], [300, 200], [100, 200]];	// Large rectangle
var polygonPoints1 = [[170, 170], [130, 170], [130, 130], [170, 130]];	// Small square (left)
var polygonPoints2 = [[270, 170], [230, 170], [230, 130], [270, 130]];	// Small square (right）
```
`polygonPoints0`によって外部境界を，`polygonPoints1`, `polygonPoints2`によって穴境界を定義したい場合，以下のような配列を作成します．
```javascript
var boundary = [polygonPoints0];
var holeBoundary = [polygonPoints1, polygonPoints2];
```
三角形分割は`cdt()`を以下のように呼び出します．
```javascript
var result = cdt(boundary, holeBoundary);
```
分割結果は大きい長方形の内部に二つの小さい穴が生成されます．

![rectangle with hole](img/multiple1.png)

`polygonPoints0`と`polygonPoints1`によって外部境界を，`polygonPoints2`によって穴境界を定義したい場合，以下のような配列を作成します．
```javascript
var boundary = [polygonPoints0, polygonPoints1];
var holeBoundary = [polygonPoints2];
```
分割結果は下のようになります．

![rectangle with hole](img/multiple2.png)

このように外部境界が他の境界の内側にある場合は，その境界上の辺が分割後も保存されるように分割されます．

次に`polygonPoints1`と`polygonPoints2`によって外部境界を作成する場合，
以下のように配列を作成します．
```javascript
var boundary = [polygonPoints1, polygonPoints2];
var holeBoundary = [];
```
分割結果は以下のようになります．

![rectangle with hole](img/multiple3.png)

外部境界が分離している場合でも，ひとまとめにした結果が`result.points`, `result.connectivity`に出力されます．

Example - Inner points addition
---
FEMのための解析用メッシュに用いるには，領域内部を詳細に三角形分割をすることが求められます．
例えば，歯車のような形状の境界データが得られているとします．
これを以下のようにして分割すると，下の図のような境界が得られます．
```javascript
cdt(boundary, holeboundary);
```

![rectangle with hole](img/gear.png)

領域内部をより詳細に分割する場合は，以下のように`option`を与えることで自動的に領域内部に節点を配置して分割します．
```javascript
var option = {triSize: 'auto'}
cdt(boundary, holeboundary, option);
```

![rectangle with hole](img/gear-inner.png)

`option`のプロパティ`triSize`に数値を設定すると，大まかな三角形の辺のサイズを指定することができます．`auto`に設定すると入力した境界の辺の長さを平均した値に基づいて自動的に`triSize`を内部で生成します．

Code 
---
[Code (Rectangles)](http://sasekazu.github.io/cdt.js/example/minimum)
```javascript
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>cdt.js minimum</title>
	<script type="text/javascript" src="cdt-0.1.min.js"></script>
	<script>
		window.onload = function () {

			// input data
			var polygonPoints0 = [[100, 100], [300, 100], [300, 200], [100, 200]];  // Large rectangle
			var polygonPoints1 = [[170, 170], [130, 170], [130, 130], [170, 130]];  // Small square (left)
			var polygonPoints2 = [[270, 170], [230, 170], [230, 130], [270, 130]];  // Small square (right)
			var boundary = [polygonPoints0];
			var holeBoundary = [polygonPoints1, polygonPoints2];

			// triangulate
			var result = cdt(boundary, holeBoundary);
			var points = result.points;
			var conn = result.connectivity;

			// create canvas
			var canvas = document.createElement("canvas");
			canvas.width = '400';
			canvas.height = '300';
			document.body.appendChild(canvas);
			var context = canvas.getContext('2d');

			// draw points
			context.fillStyle = 'black';
			for(var i = 0; i < points.length; ++i) {
				context.beginPath();
				context.arc(points[i][0], points[i][1], 2, 0, Math.PI * 2, false);
				context.fill();
			}

			// draw triangles
			context.fillStyle = 'lightyellow';
			context.strokeStyle = 'black';
			for(var i = 0; i < conn.length; ++i) {
				context.beginPath();
				context.moveTo(points[conn[i][0]][0], points[conn[i][0]][1]);
				context.lineTo(points[conn[i][1]][0], points[conn[i][1]][1]);
				context.lineTo(points[conn[i][2]][0], points[conn[i][2]][1]);
				context.lineTo(points[conn[i][0]][0], points[conn[i][0]][1]);
				context.stroke();
				context.fill();
			}

		}
	</script>
</head>
<body>
</body>
</html>

```

[Code (Gear)](http://sasekazu.github.io/cdt.js/example/gear)

```javascript
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>cdt.js minimum</title>
	<script type="text/javascript" src="../../dist/cdt-0.1.min.js"></script>
	<script>
		window.onload = function () {

			// input data
			var canvasWidth = 400;
			var canvasHeight = 300;
			var center = [canvasWidth * 0.5, canvasHeight * 0.5];
			var waveResult = waveCircle(center, 0.3 * canvasHeight, 0.1 * 0.3 * canvasHeight, 150, 20);
			var boundary = [waveResult.points];
			var circleResult = circle(center, 0.06 * canvasHeight, 20);
			var holeBoundary = [circleResult.points];

			// triangulate
			var option = { triSize: 'auto' };
			var result = cdt(boundary, holeBoundary, option);
			var points = result.points;
			var conn = result.connectivity;

			// create canvas
			var canvas = document.createElement("canvas");
			canvas.width = ''+canvasWidth;
			canvas.height = ''+canvasHeight;
			document.body.appendChild(canvas);
			var context = canvas.getContext('2d');

			// draw points
			context.fillStyle = 'black';
			for(var i = 0; i < points.length; ++i) {
				context.beginPath();
				context.arc(points[i][0], points[i][1], 2, 0, Math.PI * 2, false);
				context.fill();
			}

			// draw triangles
			context.fillStyle = 'lightyellow';
			context.strokeStyle = 'black';
			for(var i = 0; i < conn.length; ++i) {
				context.beginPath();
				context.moveTo(points[conn[i][0]][0], points[conn[i][0]][1]);
				context.lineTo(points[conn[i][1]][0], points[conn[i][1]][1]);
				context.lineTo(points[conn[i][2]][0], points[conn[i][2]][1]);
				context.lineTo(points[conn[i][0]][0], points[conn[i][0]][1]);
				context.stroke();
				context.fill();
			}

		}

		// generate circle boundary
		function circle(center, rad, div) {
			var inputPoints = [];
			var th;
			for(var i = 0; i < div; ++i) {
				th = 2 * Math.PI / div * i;
				inputPoints.push([center[0] + rad * Math.cos(th), center[1] + rad * Math.sin(th)]);
			}
			return { points: inputPoints };
		}

		// generate wave circle boundary
		function waveCircle(center, rad, innerRad, div, numWave) {
			var inputPoints = [];
			var th;
			var r;
			for(var i = 0; i < div; ++i) {
				th = 2 * Math.PI / div * i;
				r = rad + innerRad * Math.sin(numWave * th);
				inputPoints.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
			}
			return { points: inputPoints };
		}
	</script>
</head>
<body>
</body>
</html>
```

## Author

Kazuya Sase (http://sasekazu.info/)
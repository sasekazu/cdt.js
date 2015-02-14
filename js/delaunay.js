// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />


// ドロネー三角形分割用の三角形クラス
// 引数 points 頂点の座標 [[x1,y1],[x2,y2],......]
// 引数 indices 頂点のインデックス
function DelauneyTriangle(points, indices){
	this.adjacent=[null, null, null];	// 隣接する三角形の参照，辺12, 辺23，辺31において隣接する三角形を順に格納する
	this.edgeIDinAdjacent=[-1,-1,-1];	// adjacentの各要素と対応．adjacent[i]が隣接する辺ID．辺IDはadjacent側のもの．	
	this.vertexID=numeric.clone(indices);
	this.init(points);
	this.prev=null;	// 双方向連結リストの前ポインタ
	this.next=null;	// 双方向連結リストの次ポインタ
}

DelauneyTriangle.prototype.push=function (next) {
	this.next=next;
	next.prev=this;
}


// 新しい点を追加して三角形を分割する
// このメソッド実行後、このインスタンス(this)は
// 使われないので、GCに開放してほしい。
// 実行後にthisはほかのインスタンスから参照されない
// はずだが、確認はしていない。
DelauneyTriangle.prototype.deleteAndAdd = function (newPointID, points) {

	// STEP1: 
	// 追加点pを内包する三角形Tを三分割する
	// Tの頂点をp1,p2,p3とすると
	// 3つの新しい三角形 (p,p1,p2),(p,p2,p3),(p,p3,p1) が
	// Tを削除した後に追加される

	// 新しい三角形オブジェクトの作成
	var indices;
	var newTri=new Array(3);
	for(var i = 0; i < 3; ++i) {
		indices=[newPointID, this.vertexID[i], this.vertexID[(i+1)%3]];
		newTri[i] = new DelauneyTriangle(points, indices);
	}

	// next の更新
	if(this.prev != null) {
		this.prev.next=newTri[0];
	}
	newTri[0].next=newTri[1];
	newTri[1].next=newTri[2];
	newTri[2].next=this.next;

	// prev の更新
	if(this.next != null) {
		this.next.prev=newTri[2];
	}
	newTri[2].prev=newTri[1];
	newTri[1].prev=newTri[0];
	newTri[0].prev=this.prev;

	// adjacent, edgeIDAdjacent の更新
	// newPointを含む辺では他のnewTriと隣接
	// newPointを含まない辺では,
	// もともとの三角形の隣接三角形と隣接する
	for(var i = 0; i < 3; ++i) {
		newTri[i].adjacent[0]=newTri[(i+2)%3];
		newTri[i].adjacent[1]=this.adjacent[i];
		newTri[i].adjacent[2]=newTri[(i+1)%3];
		if(this.adjacent[i]!=null) {
			this.adjacent[i].adjacent[this.edgeIDinAdjacent[i]]=newTri[i];
		}
		newTri[i].edgeIDinAdjacent[0]=2;
		newTri[i].edgeIDinAdjacent[1]=this.edgeIDinAdjacent[i];
		newTri[i].edgeIDinAdjacent[2]=0;
		if(this.adjacent[i]!=null) {
			this.adjacent[i].edgeIDinAdjacent[this.edgeIDinAdjacent[i]]=1;
		}
	}
	
	// STEP2:
	// スワッピングアルゴリズム（フリップとも呼ばれる）
	// 新しい三角形をスタックに格納
	// スタックが空になるまでスワッピングアルゴリズムを適用

	var stack=[];	// Last In Last Out
	stack.push(newTri[0]);
	stack.push(newTri[1]);
	stack.push(newTri[2]);
	while(stack.length!=0) {
		this.swapping(newPointID, points, stack);
	}

}

// スワッピングアルゴリズム
// ※thisのプロパティとの依存性なし
// 引数 newPointID: 追加点のID, pointsの中の何番目の点に該当するかを指す
// 引数 points: 点群の座標 [[x1,y1],[x2,y2],.....]
// 引数 stack: スワッピングアルゴリズムを適用する三角形の参照を格納したスタック
//             後ろから取り出してスワップ処理し，スワップが生じた場合、
//             スワップで生じた2つの三角形を後ろに追加する
DelauneyTriangle.prototype.swapping=function (newPointID, points, stack) {

	var tri=stack.pop();	// 対象三角形の参照
	var newPtTri;	// newPointのtriにおけるローカルID
	var oppEdgeTri;	// newPointの対辺のtriにおけるローカルID, opp: opposite
	var adjTri;		// newPointの対辺で隣接する三角形
	var oppEdgeAdj;	// 対辺のadjTriにおけるローカルID
	var farPtAdj;	// triと共有しないadjTriの頂点のローカルID
	var vOpp;		// 対辺のベクトル
	var vFar;		// newPointとfarPointの相対ベクトル

	for(var i=0; i<3; ++i) {
		if(tri.vertexID[i]==newPointID) {
			newPtTri=i;
			oppEdgeTri=(newPtTri+1)%3
			break;
		}
	}
	adjTri=tri.adjacent[oppEdgeTri];
	if(adjTri==null) {
		return;
	}
	oppEdgeAdj=tri.edgeIDinAdjacent[oppEdgeTri];
	farPtAdj=(oppEdgeAdj+2)%3;


	var swapFlag=false;

	// newPoint が adjTri の外接円に含まれればスワップ
	var c=new Circumcircle(
				points[adjTri.vertexID[0]],
				points[adjTri.vertexID[1]],
				points[adjTri.vertexID[2]]
			);
	swapFlag = (numeric.norm2(numeric.sub(c.p, points[newPointID]))<c.rad);

	// FEMのための要素自動分割」では、以下の3行のようにして
	// 対辺がvFarより短いときスワップを行っているが、
	// ドロネー三角分割にならないことがあるため外接円を使って判定する
	//vOpp=numeric.sub(points[tri.vertexID[(newPtTri+2)%3]], points[tri.vertexID[(newPtTri+1)%3]]);
	//vFar=numeric.sub(points[adjTri.vertexID[farPtAdj]], points[tri.vertexID[newPtTri]]);
	//swapFlag=(numeric.norm2(vOpp)>numeric.norm2(vFar));

	if(swapFlag) {
		// vertexID の更新
		tri.vertexID[(newPtTri+2)%3]=adjTri.vertexID[farPtAdj];
		adjTri.vertexID[(farPtAdj+2)%3]=tri.vertexID[newPtTri];
		// adjacent の更新
		tri.adjacent[oppEdgeTri]=adjTri.adjacent[(oppEdgeAdj+1)%3];
		adjTri.adjacent[oppEdgeAdj]=tri.adjacent[(oppEdgeTri+1)%3];
		tri.adjacent[(oppEdgeTri+1)%3]=adjTri;
		adjTri.adjacent[(oppEdgeAdj+1)%3]=tri;
		if(tri.adjacent[oppEdgeTri]!=null) {
			tri.adjacent[oppEdgeTri].adjacent[adjTri.edgeIDinAdjacent[(oppEdgeAdj+1)%3]]=tri;
		}
		if(adjTri.adjacent[oppEdgeAdj]!=null) {
			adjTri.adjacent[oppEdgeAdj].adjacent[tri.edgeIDinAdjacent[(oppEdgeTri+1)%3]]=adjTri;
		}
		// edgeIDinAdjacent の更新
		tri.edgeIDinAdjacent[oppEdgeTri]=adjTri.edgeIDinAdjacent[(oppEdgeAdj+1)%3];
		adjTri.edgeIDinAdjacent[oppEdgeAdj]=tri.edgeIDinAdjacent[(oppEdgeTri+1)%3];
		tri.edgeIDinAdjacent[(oppEdgeTri+1)%3]=(oppEdgeAdj+1)%3;
		adjTri.edgeIDinAdjacent[(oppEdgeAdj+1)%3]=(oppEdgeTri+1)%3;
		if(tri.adjacent[oppEdgeTri]!=null) {
			tri.adjacent[oppEdgeTri].edgeIDinAdjacent[tri.edgeIDinAdjacent[oppEdgeTri]]=oppEdgeTri;
		}
		if(adjTri.adjacent[oppEdgeAdj]!=null) {
			adjTri.adjacent[oppEdgeAdj].edgeIDinAdjacent[adjTri.edgeIDinAdjacent[oppEdgeAdj]]=oppEdgeAdj;
		}

		// stackに新しいスワップ対象を追加
		stack.push(tri);
		stack.push(adjTri);
	}
}

DelauneyTriangle.prototype.init = function(points){
	var v1=numeric.sub(points[this.vertexID[1]], points[this.vertexID[0]]);
	var v2=numeric.sub(points[this.vertexID[2]], points[this.vertexID[0]]);
	// もし，頂点が時計回りならばpoints[1]とpoints[2]を入れ替える
	// v1 cross v2 のz座標が負であれば時計回り
	var tmp;
	if(v1[0]*v2[1]-v1[1]*v2[0]<0) {
		tmp=this.vertexID[1];
		this.vertexID[1]=this.vertexID[2];
		this.vertexID[2]=tmp;
	}
}


// ドロネー三角形分割関数
// ※非常に効率の悪い実装
// 引数1 inputPoints: 入力点の座標 [[x1,y1],[x2,y2],....]
// 引数2,3,4,5 ymax, ymin, xmax, xmin: 入力点が含まれる領域の最大・最小座標
// 返り値：triangleのコネクティビティ 
// 例: [[0,1,2], [0,1,3], [1,2,4]..] は 
// inputPoints[0], inputPoints[1], inputPoints[2] が三角形を構成する。
// …以下、同様
function DelaunayTriangulation(inputPoints, ymax, ymin, xmax, xmin) {

	var pos = numeric.clone(inputPoints);	// 点の数 x 2(x,y)
	var dPos = [];	// 動的に変わる点
	var tri = [];	// 三角形の数 x 3(三角形頂点の点番号)

	// すべての点を内包する
	// 大きい三角形(superTriangle)の頂点を追加
	// 下の点, 上の点1, 上の点2の順
	dPos.push([(xmax+xmin)*0.5, ymin-(xmax-xmin)*0.5*1.73205080757]);
	dPos.push([(xmax+xmin)*0.5-(xmax-xmin)*0.5-(ymax-ymin)/1.73205080757, ymax]);
	dPos.push([(xmax+xmin)*0.5+(xmax-xmin)*0.5+(ymax-ymin)/1.73205080757, ymax]);
	tri.push([0, 1, 2]);

	// すべての入力点が追加されるまで実行
	for(var step=0; step<pos.length; ++step) {

		// 新しい入力点を追加
		p = pos[step];
		dPos.push(p);

		// 入力点を外接円に内包する三角形を探す
		// その三角形は削除対象として格納される
		// このリストは値が降順になるように格納
		// 注意：総当たりで調べている。非効率！
		var removeTri=[];
		for(var i=0; i<tri.length; i++) {
			var c=new Circumcircle(
							dPos[tri[i][0]],
							dPos[tri[i][1]],
							dPos[tri[i][2]]
						);
			var distVec=numeric.sub(c.p, p);
			var dist=numeric.norm2(distVec);
			if(dist<c.rad) {
				removeTri.unshift(i);
			}
		}

		// removeTriに含まれる三角形を削除してできる
		// 多角形の頂点を抽出する
		var pointsDupricated = [];
		for(var i=0; i<removeTri.length; i++) {
			for(var j=0; j<3; j++) {
				pointsDupricated.push(tri[removeTri[i]][j]);
			}
		}
		var points = pointsDupricated.filter(function (x, i, self) {
			return self.indexOf(x)===i;
		});

		// removeTriリストの三角形をtriから削除する
		for(var i=0; i<removeTri.length; ++i) {
			tri.splice(removeTri[i], 1);
		}

		// 多角形の頂点を反時計回りに並べ替え
		points.sort(
			function (val1, val2) {
				th1=Math.atan2(dPos[val1][1]-p[1], dPos[val1][0]-p[0]);
				th2=Math.atan2(dPos[val2][1]-p[1], dPos[val2][0]-p[0]);
				return th2-th1;
			}
		);

		// 入力点と多角形の辺で構成される三角形を追加
		for(var i=0; i<points.length; i++) {
			var newTri=[points[i], points[(i+1)%points.length], dPos.length-1];
			tri.push(newTri);
		}
	}

	// superTriangleの頂点(0,1,2番)を含む三角形を探して削除
	removeTri = [];
	for(var i=0; i<tri.length; ++i) {
		for(var j=0; j<3; ++j) {
			if(tri[i][j]==0||tri[i][j]==1||tri[i][j]==2) {
				removeTri.unshift(i);
				break;
			}
		}
	}
	for(var i=0; i<removeTri.length; ++i) {
		tri.splice(removeTri[i],1);
	}

	// superTriangleの頂点を削除してtriに格納されているインデックスを-3する
	// dPos.splice(0, 3); とすると dPos == inputPoints となる
	for(var i=0; i<tri.length; ++i) {
		for(var j=0; j<3; ++j) {
			tri[i][j]-=3;
		}
	}

	return tri;
}


// 外接円クラス
function Circumcircle(p1, p2, p3) {
	var a=numeric.norm2(numeric.sub(p2, p3));
	var b=numeric.norm2(numeric.sub(p3, p1));
	var c=numeric.norm2(numeric.sub(p1, p2));
	var s=(a+b+c)*0.5;
	this.S=Math.sqrt(s*(s-a)*(s-b)*(s-c));	// area
	this.rad=(a*b*c)/(4.0*this.S);
	// Calc center
	var tmpv1=numeric.mul(a*a*(b*b+c*c-a*a), p1);
	var tmpv2=numeric.mul(b*b*(c*c+a*a-b*b), p2);
	var tmpv3=numeric.mul(c*c*(a*a+b*b-c*c), p3);
	this.p = numeric.div(numeric.add(numeric.add(tmpv1, tmpv2), tmpv3), 16*this.S*this.S);
}


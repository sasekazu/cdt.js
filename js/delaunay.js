// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />


// ドロネー三角形分割関数
// 引数 inputPoints: 入力点の座標 [[x1,y1],[x2,y2],....]
// 引数 ymax, ymin, xmax, xmin: 入力点が含まれる領域の最大・最小座標
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
//                  ※閉境界であるため最後の要素は先頭の要素と一致するようにする
//                    一致しない場合，先頭要素と最後の要素をつなぐ辺も拘束される．
//                  ※省略可能 undefinedで渡されたら拘束なしとみなす
// 返り値：
//    オブジェクト
//    points: 点の座標リスト (inputPointsに加えて点群を内包する大きい三角形の頂点を含む)
//    head: ドロネー三角形クラスの連結リストの先頭への参照
function mcdt(inputPoints, constraint) {

	// 入力点がない場合、強制終了
	if(inputPoints.length<3) {
		return null;
	}

	var points=mcdt.clone(inputPoints);	// 点の数 x 2(x,y)
	var cst=mcdt.clone(constraint);		// 閉境界 cst[0]=cst[length-1] となるようにする
	if(cst[0]!=cst[cst.length-1]) {
		cst.push(cst[0]);
	}


	// STEP1: スーパートライアングルの作成

	// すべての点を内包する
	// 大きい三角形(superTriangle)の頂点を追加
	var superTri=mcdt.getSuperTriangle(points);
	points.push(superTri[0]);
	points.push(superTri[1]);
	points.push(superTri[2]);
	var l=points.length;
	var head=new DelaunayTriangle(points, [l-3, l-2, l-1]);


	// STEP2: 点の逐次追加

	// まず点を内包する三角形をローソン探査法で探し
	// その後、スワッピングアルゴリズムを用いて分割
	var resultTri=head;
	for(var i=0; i<points.length-3; ++i) {
		resultTri=DelaunayTriangle.lawsonTriangleDetection(points, resultTri, points[i]);
		resultTri.addPoint(i, points, cst);
	}


	// STEP3: 辺と閉境界との交差判定

	// 点から三角形へアクセスするためのデータ作成
	var pointToTri=mcdt.makePointToTri(points, head);
	var crossConstraint=[];
	var crossTri=[];
	for(var i=0; i<cst.length-1; ++i) {
		crossTri=mcdt.isEdgeCross(points, pointToTri, cst, i);
		if(crossTri.length>0) {
			crossConstraint=[i];
			break;
		}
	}


	// STEP4: 交差解消

	// 交差三角形を削除する
	for(var j=0; j<crossTri.length; ++j) {
		head=crossTri[j].remove(head);
	}
	// 新しい三角形を追加する


	// スーパートライアングルの削除
	head=mcdt.removeSuperTriangle(head, points);

	// 三角形接続リストの作成
	var conn=[];
	for(var tri=head; tri!=null; tri=tri.next) {
		conn.push(tri.vertexID);
	}

	return { points: inputPoints, head: head, crossConstraint: crossConstraint, crossTris: [crossTri], connectivity: conn };
}

mcdt.removeSuperTriangle=function(head, points) {
	var isSuperVtx;
	var tri=head;
	while(1) {
		if(tri==null) {
			break;
		}
		isSuperVtx=false;
		for(var i=0; i<3; ++i) {
			for(var j=0; j<3; ++j) {
				if(tri.vertexID[i]==points.length-1-j) {
					isSuperVtx=true;
					break;
				}
			}
		}
		if(isSuperVtx) {
			if(tri===head) {
				head=tri.remove(head);
				tri=head;
			} else {
				var nextTmp=tri.next;
				tri.remove(head);	// 削除対象がheadでないことは確実
				tri=nextTmp;
			}
		} else {
			tri=tri.next;
		}
	}
	return head;
}


// i番目の拘束辺の交差判定
mcdt.isEdgeCross=function (points, pointToTri, cst, i) {
	var edgePos=[points[cst[i]], points[cst[i+1]]];	// 辺の始点・終点の座標 [[始点],[終点]]
	// 拘束辺の始点を含む三角形についてのループ
	var tri;
	var adjEdge=null;
	for(var j=0; j<pointToTri[cst[i]].length; ++j) {
		tri=pointToTri[cst[i]][j];
		adjEdge=mcdt.isTriAndEdgeCross(points, tri, cst, edgePos);
		if(adjEdge!=null) {
			break;
		}
	}
	if(adjEdge==null) {
		return [];
	}

	var crossTri=[tri];
	var edgeIDinAdj;
	for(; ;) {
		edgeIDinAdj=tri.edgeIDinAdjacent[adjEdge];
		tri=tri.adjacent[adjEdge];
		crossTri.push(tri);
		if(tri.vertexID[(edgeIDinAdj+2)%3]==cst[i+1]) {
			break;
		}
		adjEdge=mcdt.isTriAndEdgeCross(points, tri, cst, edgePos, edgeIDinAdj);
	}
	return crossTri;
}


// 三角形と辺の交差判定
// 交差している場合, triのうちの交差している辺番号を返す
// そうでない場合，nullを返す
mcdt.isTriAndEdgeCross=function (points, tri, cst, edgePos, except) {
	var triPos=[[0, 0], [0, 0], [0, 0]];	// 三角形の頂点座標　[[頂点1],[頂点2],[頂点3]]
	for(var k=0; k<3; ++k) {
		triPos[k]=points[tri.vertexID[k]];
	}
	for(var k=0; k<3; ++k) {
		if(mcdt.isIntersect(edgePos, [triPos[k], triPos[(k+1)%3]])) {
			if(k!=except) {
				return k;
			}
		}
	}
	return null;
}

// pointToTriの作成
mcdt.makePointToTri = function(points, head){
	var pointToTri=new Array(points.length);
	for(var i=0; i<pointToTri.length; ++i) {
		pointToTri[i]=[];
	}
	for(var tri=head; tri!=null; tri=tri.next) {
		pointToTri[tri.vertexID[0]].push(tri);
		pointToTri[tri.vertexID[1]].push(tri);
		pointToTri[tri.vertexID[2]].push(tri);
	}
	return pointToTri;
}


// 線分の衝突
// 参考: http://marupeke296.com/COL_2D_No10_SegmentAndSegment.html
mcdt.isIntersect = function(s1, s2) {
	var v=mcdt.sub(s2[0], s1[0]);
	var v1=mcdt.sub(s1[1], s1[0]);
	var v2=mcdt.sub(s2[1], s2[0]);
	var crs_v1_v2=v1[0]*v2[1]-v1[1]*v2[0];
	if(crs_v1_v2==0.0) {
		return false	// 平行状態
	}
	var crs_v_v1=v[0]*v1[1]-v[1]*v1[0];
	var crs_v_v2=v[0]*v2[1]-v[1]*v2[0];
	var t1=crs_v_v2/crs_v1_v2;
	var t2=crs_v_v1/crs_v1_v2;
	var eps=0.00001;
	// 1点のみを共有する場合は交差とみなさない
	if(t1-eps<=0||t1+eps>=1||t2-eps<=0||t2+eps>=1) {
		return false;	// 交差していない
	} else {
		return true;	// 交差している
	}
}

mcdt.getSuperTriangle=function (points) {
	if(points.length==0) {
		return [[0, 0], [0, 0], [0, 0]];
	}
	// AABBを作成
	var ymin=points[0][1];
	var ymax=points[0][1];
	var xmax=points[0][0];
	var xmin=points[0][0];
	for(var i=1; i<points.length; ++i) {
		if(xmin>points[i][0]) {
			xmin=points[i][0];
		}
		if(xmax<points[i][0]) {
			xmax=points[i][0];
		}
		if(ymin>points[i][1]) {
			ymin=points[i][1];
		}
		if(ymax<points[i][1]) {
			ymax=points[i][1];
		}
	}
	// AABBを内包する円の半径rと中心(cx,cy)を求める
	var r;
	if(xmax-xmin>ymax-ymin) {
		r=xmax-xmin;
	} else {
		r=ymax-ymin;
	}
	var cx=(xmax-xmin)*0.5+xmin;
	var cy=(ymax-ymin)*0.5+ymin;
	// 求めた円を内包する大き目の正三角形をスーパートライアングルとする
	var l=4*r;
	var superTri=new Array(3);
	superTri[0]=[cx-0.5*l, cy-1.732/6*l];
	superTri[1]=[cx+0.5*l, cy-1.732/6*l];
	superTri[2]=[cx, cy+1.732/3*l];
	return superTri;
}


// ドロネー三角形分割用の三角形クラス
// 引数 points 頂点の座標 [[x1,y1],[x2,y2],......]
// 引数 indices 頂点のインデックス
function DelaunayTriangle(points, indices){
	this.adjacent;			// 隣接する三角形の参照，辺12, 辺23，辺31において隣接する三角形を順に格納する
	this.edgeIDinAdjacent;	// adjacentの各要素と対応．adjacent[i]が隣接する辺ID．辺IDはadjacent側のもの．	
	this.vertexID;			// 三角形の頂点のpoints配列におけるインデックス
	this.prev;	// 双方向連結リストの前ポインタ
	this.next;	// 双方向連結リストの次ポインタ
	this.init(points, indices);
}

// 初期化関数
// コンストラクタとして使う
DelaunayTriangle.prototype.init=function (points, indices) {
	this.adjacent=[null, null, null];
	this.edgeIDinAdjacent=[-1, -1, -1];
	this.vertexID=mcdt.clone(indices);
	this.prev=null;
	this.next=null;
	// 頂点が反時計回りになるように並べ替える
	// v1 cross v2 のz座標が負であれば時計回り
	var v1=mcdt.sub(points[this.vertexID[1]], points[this.vertexID[0]]);
	var v2=mcdt.sub(points[this.vertexID[2]], points[this.vertexID[0]]);
	var tmp;
	if(v1[0]*v2[1]-v1[1]*v2[0]<0) {
		tmp=this.vertexID[1];
		this.vertexID[1]=this.vertexID[2];
		this.vertexID[2]=tmp;
	}
}

// プロパティをコピーする
// 参照のプロパティ以外は値コピー
DelaunayTriangle.prototype.cloneProperties=function () {
	return {
		adjacent: this.adjacent,
		edgeIDinAdjacent: mcdt.clone(this.edgeIDinAdjacent),
		vertexID: mcdt.clone(this.vertexID),
		prev: this.prev,
		next: this.next
	};
}


// 三角形の削除
// この三角形を削除して隣接三角形の参照をはずす
// 連結リストでは前後の三角形を連結させる
// 連結リストの次の三角形への参照を返す
// 削除される三角形がheadだった場合は、
// headを次の三角形の参照に変更する
// 使用例）head=tri.remove(tri) のように呼び出す
DelaunayTriangle.prototype.remove=function (head) {
	if(this.adjacent==null) {
		return null;
	}
	for(var i=0; i<3; ++i) {
		if(this.adjacent[i]!=null) {
			this.adjacent[i].adjacent[this.edgeIDinAdjacent[i]]=null;
		}
	}
	this.edgeIDinAdjacent=[];
	this.adjacent=null;
	if(this.next!=null) {
		this.next.prev=this.prev;
	}
	if(this.prev!=null) {
		this.prev.next=this.next;
	}
	if(this.prev!=null) {
		this.next=null;
	}
	this.prev=null;

	// もし削除する三角形がheadならば
	// nextに格納されている三角形をheadとする
	if(this===head) {
		head=this.next;
	}

	return head;
}

// 新しい点を追加して三角形を分割する
// 引数 newPointID: 追加点のID, pointsの中の何番目の点に該当するかを指す
// 引数 points: 点群の座標 [[x1,y1],[x2,y2],.....]
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
DelaunayTriangle.prototype.addPoint=function (newPointID, points, constraint) {

	// STEP1: 
	// 追加点pを内包する三角形Tを三分割する
	// Tの頂点をp1,p2,p3とすると
	// 3つの新しい三角形 (p,p1,p2),(p,p2,p3),(p,p3,p1) が追加される
	// ただし，Tのメモリ領域を(p,p1,p2)に割り当てる

	// 削除する三角形のプロパティを退避
	var rmTri = this.cloneProperties();

	// 新しい三角形オブジェクトの作成
	// 0番目の三角形はthisの領域を用いる
	var indices;
	var newTri=new Array(3);
	for(var i = 0; i < 3; ++i) {
		indices=[newPointID, rmTri.vertexID[i], rmTri.vertexID[(i+1)%3]];
		if(i==0) {
			newTri[i]=this;
			newTri[i].init(points, indices);
		} else {
			newTri[i]=new DelaunayTriangle(points, indices);
		}
	}

	// next の更新
	if(rmTri.prev != null) {
		rmTri.prev.next=newTri[0];
	}
	newTri[0].next=newTri[1];
	newTri[1].next=newTri[2];
	newTri[2].next=rmTri.next;

	// prev の更新
	if(rmTri.next != null) {
		rmTri.next.prev=newTri[2];
	}
	newTri[2].prev=newTri[1];
	newTri[1].prev=newTri[0];
	newTri[0].prev=rmTri.prev;

	// adjacent, edgeIDAdjacent の更新
	// newPointを含む辺では他のnewTriと隣接
	// newPointを含まない辺では,
	// もともとの三角形の隣接三角形と隣接する
	for(var i = 0; i < 3; ++i) {
		newTri[i].adjacent[0]=newTri[(i+2)%3];
		newTri[i].adjacent[1]=rmTri.adjacent[i];
		newTri[i].adjacent[2]=newTri[(i+1)%3];
		if(rmTri.adjacent[i]!=null) {
			rmTri.adjacent[i].adjacent[rmTri.edgeIDinAdjacent[i]]=newTri[i];
		}
		newTri[i].edgeIDinAdjacent[0]=2;
		newTri[i].edgeIDinAdjacent[1]=rmTri.edgeIDinAdjacent[i];
		newTri[i].edgeIDinAdjacent[2]=0;
		if(rmTri.adjacent[i]!=null) {
			rmTri.adjacent[i].edgeIDinAdjacent[rmTri.edgeIDinAdjacent[i]]=1;
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
		DelaunayTriangle.swapping(stack, newPointID, points, constraint);
	}

}

// スワッピングアルゴリズム
// ※DelaunayTriangleのプロパティとの依存性なし
// 引数 stack: スワッピングアルゴリズムを適用する三角形の参照を格納したスタック
//             後ろから取り出してスワップ処理し，スワップが生じた場合、
//             スワップで生じた2つの三角形を後ろに追加する
// 引数 newPointID: 追加点のID, pointsの中の何番目の点に該当するかを指す
// 引数 points: 点群の座標 [[x1,y1],[x2,y2],.....]
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
//                  ※省略可能 undefinedで渡されたら拘束なしとみなす
DelaunayTriangle.swapping=function (stack, newPointID, points, constraint) {

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

	// 隣接する三角形を取得
	adjTri=tri.adjacent[oppEdgeTri];
	if(adjTri==null) {
		return;
	}
	oppEdgeAdj=tri.edgeIDinAdjacent[oppEdgeTri];
	farPtAdj=(oppEdgeAdj+2)%3;


	// 拘束が引数で与えられなければ空arrayで初期化
	if(constraint==undefined || constraint==null) {
		constraint=[];
	}
	// 対辺が拘束辺ならスワップせず終了
	var p1, p2, c1, c2;
	p1=tri.vertexID[oppEdgeTri];
	p2=tri.vertexID[(oppEdgeTri+1)%3];
	for(var i=0; i<constraint.length-1; ++i) {
		c1=constraint[i];
		c2=constraint[i+1];
		if((p1==c1&&p2==c2)||(p1==c2&&p2==c1)) {
			return;
		}
	}

	// newPoint が adjTri の外接円に含まれればスワップ
	var c=new DelaunayTriangle.Circumcircle(
				points[adjTri.vertexID[0]],
				points[adjTri.vertexID[1]],
				points[adjTri.vertexID[2]]
			);
	var swapFlag=(mcdt.norm2(mcdt.sub(c.p, points[newPointID]))<c.rad);

	// FEMのための要素自動分割」では、以下の3行のようにして
	// 対辺がvFarより短いときスワップを行っているが、
	// ドロネー三角分割にならないことがあるため外接円を使って判定する
	//vOpp=mcdt.sub(points[tri.vertexID[(newPtTri+2)%3]], points[tri.vertexID[(newPtTri+1)%3]]);
	//vFar=mcdt.sub(points[adjTri.vertexID[farPtAdj]], points[tri.vertexID[newPtTri]]);
	//var swapFlag=(mcdt.norm2(vOpp)>mcdt.norm2(vFar));

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



// ローソンの探査法
// ※DelaunayTriangleのプロパティとの依存性なし
DelaunayTriangle.lawsonTriangleDetection=function (points, head, newPoint) {
	// head から順にローソンのアルゴリズムを適用していく
	var triTmp=head;
	var edge=0;
	var vEdge, vPt;
	var isPointInner=false;
	var edgeTmp;
	while(1) {
		isPointInner=true;
		for(var i=0; i<3; ++i) {
			vPt=mcdt.sub(newPoint, points[triTmp.vertexID[edge]]);
			vEdge=mcdt.sub(points[triTmp.vertexID[(edge+1)%3]], points[triTmp.vertexID[edge]]);
			// newPointが辺ベクトルの右側にあれば右隣りの三角形に移る
			if(vPt[0]*vEdge[1]-vPt[1]*vEdge[0]>0) {
				edgeTmp=triTmp.edgeIDinAdjacent[edge];
				triTmp=triTmp.adjacent[edge];
				edge=(edgeTmp+1)%3
				isPointInner=false;
				if(triTmp==null) {
					alert("Triangle search failed.");
				}
				break;
			}
			edge=(edge+1)%3;
		}
		if(isPointInner) {
			return triTmp;
		}
	}
}



// 外接円クラス
DelaunayTriangle.Circumcircle=function(p1, p2, p3) {
	var a=mcdt.norm2(mcdt.sub(p2, p3));
	var b=mcdt.norm2(mcdt.sub(p3, p1));
	var c=mcdt.norm2(mcdt.sub(p1, p2));
	var s=(a+b+c)*0.5;
	this.S=Math.sqrt(s*(s-a)*(s-b)*(s-c));	// area
	this.rad=(a*b*c)/(4.0*this.S);
	// Calc center
	var tmpv1=mcdt.mul(a*a*(b*b+c*c-a*a), p1);
	var tmpv2=mcdt.mul(b*b*(c*c+a*a-b*b), p2);
	var tmpv3=mcdt.mul(c*c*(a*a+b*b-c*c), p3);
	this.p = mcdt.div(mcdt.add(mcdt.add(tmpv1, tmpv2), tmpv3), 16*this.S*this.S);
}


//
// utilities for array processing
//

mcdt.clone=function (src) {
	if(src.length==0) {
		return [];
	}
	var tmp=new Array(src.length);
	if(typeof (src[0])=='number') {
		for(var i=0; i<src.length; ++i) {
			tmp[i]=src[i];
		}
		return tmp;
	}
	if(typeof (src[0][0]=='number')) {
		for(var i=0; i<src.length; ++i) {
			tmp[i]=new Array(src[i].length);
			for(var j=0; j<src[i].length; ++j) {
				tmp[i]=src[i];
			}
		}
		return tmp;
	}
	if(typeof (src[0][0][0]=='number')) {
		alert('この処理は未検証 at mcdt.clone');
		for(var i=0; i<src.length; ++i) {
			tmp[i]=new Array(src[i].length);
			for(var j=0; j<src[i].length; ++j) {
				tmp[i][j]=new Array(src[i][j].length);
				for(var k=0; k<src[i][j].length; ++k) {
					tmp[i][j][k]=src[i][j][k];
				}
			}
		}
	}
}

mcdt.norm2=function(src){
	var tmp=0;
	for(var i=0; i<src.length; ++i) {
		tmp+=src[i]*src[i];
	}
	return Math.sqrt(tmp);

}

// return x-y
mcdt.sub=function (x, y) {
	if(x.length!=y.length) {
		console.log('length of input arrays are not equal. in mcdt.sub');
		return null;
	}
	var l=x.length;
	var tmp=new Array(l);
	for(var i=0; i<l; ++i) {
		tmp[i]=x[i]-y[i];
	}
	return tmp;
}


// return x+y
mcdt.add=function (x, y) {
	if(x.length!=y.length) {
		console.log('ERROR: length of input arrays are not equal. in mcdt.sub');
		return null;
	}
	var l=x.length;
	var tmp=new Array(l);
	for(var i=0; i<l; ++i) {
		tmp[i]=x[i]+y[i];
	}
	return tmp;
}


// return x*y
mcdt.mul=function (x, y) {
	var a;
	var v;
	if(typeof (x)=='number') {
		a=x;
		v=y;
	} else if (typeof(y)=='number'){
		a=y;
		v=x;
	} else {
		console.log('ERROR: input argument do not include scalar value');
		return null;
	}
	var l=v.length;
	var tmp=new Array(l);
	for(var i=0; i<l; ++i) {
		tmp[i]=a*v[i];
	}
	return tmp;
}


// return x/y
mcdt.div=function (x, y) {
	var a;
	var v;
	if(typeof (x)=='number') {
		a=x;
		v=y;
	} else if(typeof (y)=='number') {
		a=y;
		v=x;
	} else {
		console.log('ERROR: input arguments do not include scalar value');
		return null;
	}
	var l=v.length;
	var tmp=new Array(l);
	var inva=1/a;
	for(var i=0; i<l; ++i) {
		tmp[i]=v[i]*inva;
	}
	return tmp;
}
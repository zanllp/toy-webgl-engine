import { Model } from './model';
import { degToRad, r2t, calcNormalN, num2color, PosDataType } from './util';
import { colorType } from './type';
import { vec3 } from 'gl-matrix';

type latLong = {
	/**
	 * 开始弧度
	 */
	start: number;
	/**
	 * 结束幅度
	 */
	end: number;
	/**
	 * 细分数量
	 */
	sub: number;
};
/**
 * 球体
 */
export class Sphere extends Model {
	/**
	 * 球体，面数 = 2 x latitude.sub x longitube.sub，默认2 x 30 x 30面
	 * @param radius 半径
	 * @param latitude 维度相关
	 * @param longitude 经度相关
	 */
	public constructor({ radius = 100, latitude, longitude, color = 'none', reverse = false }: {
		radius?: number; latitude?: Partial<latLong>;
		longitude?: Partial<latLong>; color?: 'none' | 'rand' | colorType,
		reverse?: boolean
	} = {}) {
		const str = JSON.stringify({ radius, latitude, longitude, reverse });
		const vertex = Sphere.memoPos.get(str);
		const d = 2 * radius;
		if (vertex) {
			super(vertex.pos, [d, d, d], vertex.normal);
		} else {
			const lat = { start: degToRad(90), end: degToRad(-90), sub: 30, ...latitude };
			const long = { start: 0, end: degToRad(360), sub: 30, ...longitude };
			const posSrc = new Array<Array<Array<number>>>();
			const latStep = (lat.end - lat.start) / lat.sub;
			const longStep = (long.end - long.start) / long.sub;
			for (let i = 0; i < lat.sub + 1; i++) {
				const posFloor = new Array<Array<number>>();
				for (let ii = 0; ii < long.sub + 1; ii++) {
					const latRad = lat.start + latStep * i;
					const longRad = long.start + longStep * ii;
					const x = radius * Math.cos(latRad) * Math.sin(longRad);
					const z = radius * Math.cos(latRad) * Math.cos(longRad);
					const y = radius * Math.sin(latRad);
					posFloor.push([x, y, z]);
				}
				posSrc.push(posFloor);
			}
			const pos = new Array<Array<number>>();
			const p = posSrc;
			for (let i = 0; i < p.length - 1; i++) { // 层
				for (let ii = 0; ii < p[i].length - 1; ii++) { // 列
					pos.push(r2t([
						...p[i][ii + 1],
						...p[i][ii],
						...p[i + 1][ii],
						...p[i + 1][ii + 1],
					], reverse));
				}
			}
			// 下面操作是平滑面法线
			let topNormal = [0, 1, 0]; // 北极点法线
			let bottomNormal = [0, -1, 0]; // 南极点法线
			let indexVertexInPosArray = {
				lt: 5,
				rt: 4,
				lb: 0,
				rb: 1,
				rt1: 2,
				lb1: 3
			};
			if (reverse) {
				topNormal = [0, -1, 0]; // 北极点法线
				bottomNormal = [0, 1, 0]; // 南极点法线
				// 正向和方向的顶点位置排布不一样，具体参考r2t函数
				indexVertexInPosArray = {
					lt: 3, // 左上角方块的右下角
					rt: 0,
					lb: 2,
					rb: 1,
					rt1: 4, // 左上角有两个点
					lb1: 5
				};
			}
			const n = calcNormalN(pos);
			const vec3Avg = (p: Array<number>, c: Array<number>) => {
				p[0] += c[0] / 4;
				p[1] += c[1] / 4;
				p[2] += c[2] / 4;
				return p;
			};
			const ip = indexVertexInPosArray;
			// 取4个矩形对中间的6个顶点进行均值
			for (let i = 0; i < lat.sub - 1; i += 1) {
				for (let ii = 0; ii < long.sub; ii += 1) {
					if (ii === long.sub - 1) { // 经度越界的地方变成0
						const lt = n[lat.sub * i + ii][ip.lt];
						const rt = n[lat.sub * i][ip.rt];
						const lb = n[lat.sub * (i + 1) + ii][ip.lb];
						const rb = n[lat.sub * (i + 1)][ip.rb];
						const avg = [lt, rt, lb, rb].reduce(vec3Avg, [0, 0, 0]);
						n[lat.sub * i + ii][ip.lt] = avg;
						n[lat.sub * i][ip.rt] = avg;
						n[lat.sub * i][ip.rt1] = avg;
						n[lat.sub * (i + 1) + ii][ip.lb] = avg;
						n[lat.sub * (i + 1) + ii][ip.lb1] = avg;
						n[lat.sub * (i + 1)][ip.rb] = avg;
					} else {
						const lt = n[lat.sub * i + ii][ip.lt];
						const rt = n[lat.sub * i + ii + 1][ip.rt];
						const lb = n[lat.sub * (i + 1) + ii][ip.lb];
						const rb = n[lat.sub * (i + 1) + ii + 1][ip.rb];
						const avg = [lt, rt, lb, rb].reduce(vec3Avg, [0, 0, 0]);
						n[lat.sub * i + ii][ip.lt] = avg;
						n[lat.sub * i + ii + 1][ip.rt] = avg;
						n[lat.sub * i + ii + 1][ip.rt1] = avg;
						n[lat.sub * (i + 1) + ii][ip.lb] = avg;
						n[lat.sub * (i + 1) + ii][ip.lb1] = avg;
						n[lat.sub * (i + 1) + ii + 1][ip.rb] = avg;
					}
				}
			}
			for (let i = 0; i < long.sub; i++) {
				n[i][0] = topNormal;
				n[i][1] = topNormal;
				n[i][3] = topNormal;
				n[(lat.sub - 1) * long.sub + i][2] = bottomNormal;
				n[(lat.sub - 1) * long.sub + i][4] = bottomNormal;
				n[(lat.sub - 1) * long.sub + i][5] = bottomNormal;
			}
			const normal = n.flat(2);
			super(pos, [d, d, d], normal);
			Sphere.memoPos.set(str, { pos, normal });
		}
		if (color === 'rand') {
			this.fillRandColor();
		} else if ((color instanceof Array) || (typeof color === 'number')) {
			this.fillColor(color);
		}
		this.type = 'Sphere';
	}

	static memoPos = new Map<string, { pos: PosDataType, normal: Array<number> }>();

	/**
	 * 填充颜色
	 * @param color vec4或者vec3 (0 -> 255),或0x1890ff
	 */
	public fillColor(color: colorType) {
		// 一个面2个三角形
		let c: Array<number>;
		if (color instanceof Array) {
			c = color;
		} else {
			c = num2color(color);
		}
		c = c.map(c => c / 255);
		for (let i = 0; i < this.data.length * 2 * 3; i++) {
			this.color.push(...c);
		}
	}
}




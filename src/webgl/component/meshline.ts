import { createShaderMaterial } from '../glBase';
import { mat4 } from 'gl-matrix';
import { IRenderAble } from '../toyEngine';


const createMeshLineMaterial = (gl: WebGLRenderingContext) => createShaderMaterial({
	gl,
	location: {
		attribute: {
			a_pos: 3
		},
		uniform: {
			u_proj: mat4.create(),
			u_view: mat4.create(),
		}
	},
	source: {
		vertex: `
		uniform mat4 u_proj;
		uniform mat4 u_view;
		attribute vec3 a_pos;
		void main() {
			vec4 pos = vec4(a_pos,1);
			gl_Position =  u_proj * u_view * pos;
		}`,
		fragment: `
		precision mediump float; 
		void main() {
			gl_FragColor = vec4(1.,1.,1.,1);
		}
		`
	}
});

/**
 * 网格线
 */
export class MeshLine implements IRenderAble {
	public constructor({ range = 1500, num = 10, is3d = true, gl }:
		{ range?: number; num?: number; is3d?: boolean; gl: WebGLRenderingContext }) {
		const data = [] as number[][];
		// 0 -> 1
		for (let i = 0; i < num + 1; i++) {
			const leftRow = [0, i / num];
			const rightRow = [1, i / num];
			const topCol = [i / num, 1];
			const bottomCol = [i / num, 0];
			data.push(leftRow, rightRow, topCol, bottomCol);
		}
		const dst = data.map((x) => {
			x[0] -= 0.5;
			x[1] -= 0.5;
			if (is3d) {
				x[2] = x[1];
				x[1] = 0;
			}
			return x.map(x => x *= range);
		});
		this.size = is3d ? 3 : 2;
		this.gl = gl;
		this.info = createMeshLineMaterial(gl);
		this.position = dst.flat(1);
	}

	public size: number;

	projectionMat: mat4 = mat4.create();

	viewMat: mat4 = mat4.create();

	gl: WebGLRenderingContext;

	info: ReturnType<typeof createMeshLineMaterial>;

	position: Array<number>;

	public render() {
		const { gl, info } = this;
		info.u_proj = this.projectionMat;
		info.u_view = this.viewMat;
		info.a_pos.set(this.position, this);
		gl.drawArrays(gl.LINES, 0, this.position.length / this.size);
	}
}

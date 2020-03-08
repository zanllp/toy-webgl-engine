import { createShaderMaterial, } from '../glBase';
import { IRenderAble } from '../toyEngine';
import { mat4 } from 'gl-matrix';
import { modelMat2WorldMat } from '../mesh/util';
import { CubeTexture } from '../texture';

const createPre = (gl: WebGLRenderingContext) => createShaderMaterial({
	gl,
	location: {
		attribute: {
			a_pos: 2,
		},
		uniform: {
			u_viewDirectionProjectionInverse: mat4.create(),
			u_skybox: null,
		}
	},
	source: {
		vertex: `
		attribute vec4 a_pos;
		varying vec4 v_pos;
		void main() {
		  v_pos = a_pos;
		  gl_Position = a_pos;
		  gl_Position.z = 1.0;
		}
			`,
		fragment: `	
		precision mediump float;
		
		uniform samplerCube u_skybox;
		uniform mat4 u_viewDirectionProjectionInverse;
		
		varying vec4 v_pos;
		void main() {
		  vec4 t = u_viewDirectionProjectionInverse * v_pos;
		  gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
		}
		`
	}
});

/**
 * 天空盒
 */
export class SkyBox implements IRenderAble {
    /**
     * 天空盒
     * @param gl webgl上下文 
     * @param texAll 六个面纹理的链接
     * @param onLoad 纹理加载完成回调
     */
	public constructor(gl: WebGLRenderingContext, cube: CubeTexture) {
		this.gl = gl;
		this.info = createPre(gl);
		this.tex = cube;
		this.tex.loadTex(gl);
	}

	public tex: CubeTexture;

	public projectionMat: mat4 = mat4.create();

	public viewMat: mat4 = mat4.create();

	public data = [
		-1, -1,
		1, -1,
		-1, 1,
		-1, 1,
		1, -1,
		1, 1,
	];
	public gl: WebGLRenderingContext;
	public info: ReturnType<typeof createPre>;
	public render() {
		const { gl, info } = this;
		info.a_pos.set(this.data, this);
		const mat = mat4.create();
		mat4.mul(mat, this.projectionMat, modelMat2WorldMat(this.viewMat));
		mat4.invert(mat, mat);
		info.u_viewDirectionProjectionInverse = mat;
		gl.uniform1i(info.loc.u_skybox, 0);

		// let our quad pass the depth test at 1.0
		gl.depthFunc(gl.LEQUAL);
		// Draw the geometry.
		gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);
	}


}
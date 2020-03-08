import { createShaderMaterial, TexData, Texture } from '../glBase';
import { IRenderAble } from '../toyEngine';
import { mat4 } from 'gl-matrix';
import { modelMat2WorldMat } from '../mesh/util';

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
	public constructor(gl: WebGLRenderingContext,
		texAll: { posX: string; posY: string; posZ: string; negX: string; negY: string; negZ: string; },
		onLoad?: () => void) {
		this.gl = gl;
		this.info = createPre(gl);
		if (onLoad) {
			this.onLoad = onLoad;
		}
		this.loadTex(texAll);
	}

	projectionMat: mat4 = mat4.create();
	viewMat: mat4 = mat4.create();
	public data = [
		-1, -1,
		1, -1,
		-1, 1,
		-1, 1,
		1, -1,
		1, 1,
	];
	public gl: WebGLRenderingContext;
	public buf?: WebGLBuffer | null;
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
	private onLoad() { }
	private loadTex(texAll: { posX: string; posY: string; posZ: string; negX: string; negY: string; negZ: string; }) {
		const { gl } = this;
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		const allPromise = Object.entries(texAll)
			.map(([k, v]) => ({ url: v, target: (Texture as any)[k] as Texture }))
			.map((faceInfo) => {
				const { target, url } = faceInfo;
				TexData.write(gl, 512, 512, target, null, texture);
				const image = new Image();
				image.src = url;
				return new Promise(x => {
					image.addEventListener('load', () => {
						TexData.writeImage(gl, image, target, texture);
						x();
					});
				});
			});
		Promise.all(allPromise).then(this.onLoad.bind(this));
		gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	}

}
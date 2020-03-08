import { Texture, TexData } from './util';

export type CubeTexParamsType = {
    posX: string;
    posY: string;
    posZ: string;
    negX: string;
    negY: string;
    negZ: string;
};

export class CubeTexture {
    constructor(uri: CubeTexParamsType, length?: number) {
        this.uri = uri;
        this.length = length || 512;
    }

    public uri: CubeTexParamsType;

    public length: number;

    private _loadCompleted = false;

    public static readonly varNameSize = 'u_CubeSize';
    
    public static readonly varNameUv = 'v_cubeUv';

    public loadSuccess() {
        return this._loadCompleted;
    }

    public onLoad() {

    }

    public loadTex(gl: WebGLRenderingContext) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        const allPromise = Object.entries(this.uri)
            .map(([k, v]) => ({ url: v, target: (Texture as any)[k] as Texture }))
            .map((faceInfo) => {
                const { target, url } = faceInfo;
                TexData.write(gl, this.length, this.length, target, null, texture);
                const image = new Image();
                image.src = url;
                return new Promise(x => {
                    image.addEventListener('load', () => {
                        TexData.writeImage(gl, image, target, texture);
                        x();
                    });
                });
            });
        Promise.all(allPromise).then(() => {
            this._loadCompleted = true;
            this.onLoad();
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        });
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
}
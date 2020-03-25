import { Texture, TexData } from './util';

export type texture2DparamsType = { uri: string, height: number, width: number } | HTMLImageElement;

export class Texture2D {
    constructor(image: texture2DparamsType) {
        this.image = image;
        this.height = image.height;
        this.width = image.width;
    }

    public image: texture2DparamsType;
    public height: number;
    public width: number;
    private _loadCompleted = false;

    public static readonly varNameSize = 'a_2dUV';

    public static readonly varNameUv = 'v_2dUV';

    public loadSuccess() {
        return this._loadCompleted;
    }

    public onLoad() {

    }

    public loadTex(gl: WebGLRenderingContext) {
        const { image } = this;
        if (image instanceof HTMLImageElement) {

        } else {
            const tex = TexData.write(gl, image.width, image.height, Texture.T2D, null);
            const img = new Image();
            img.src = image.uri;
            img.addEventListener('load', () => {
                TexData.writeImage(gl, img, Texture.T2D, tex);
                this._loadCompleted = true;
                this.onLoad();
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            });
        }
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
}
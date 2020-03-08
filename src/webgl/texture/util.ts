
export enum Texture {
    posX = 'TEXTURE_CUBE_MAP_POSITIVE_X',
    negX = 'TEXTURE_CUBE_MAP_NEGATIVE_X',
    posY = 'TEXTURE_CUBE_MAP_POSITIVE_Y',
    negY = 'TEXTURE_CUBE_MAP_NEGATIVE_Y',
    posZ = 'TEXTURE_CUBE_MAP_POSITIVE_Z',
    negZ = 'TEXTURE_CUBE_MAP_NEGATIVE_Z',
    T2D = 'TEXTURE_2D',
}
export const TexData = {
    null(gl: WebGLRenderingContext, width: number, height: number, target: Texture, data?: ArrayLike<number>) {
        return TexData.write(gl, width, height, target, data, null);
    },
    /**
     * 写入图像到指定纹理,如果是立方体贴图需要自己生成Mipmap
     * @param gl 
     * @param image 图像
     * @param target 纹理类型
     * @param tex 指定纹理，未定义时新建
     */
    writeImage(gl: WebGLRenderingContext, image: HTMLImageElement, target: Texture, tex?: WebGLTexture | null) {
        const texture = (tex === undefined) ? gl.createTexture() : tex;
        const t = target === Texture.T2D ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
        gl.bindTexture(t, texture);
        gl.texImage2D(gl[target], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (target === Texture.T2D) {
            gl.generateMipmap(t);
        }
        return texture;
    },
    /**
     * 写数据到指定纹理,如果是立方体贴图需要自己生成Mipmap
     * @param gl 
     * @param width 
     * @param height 
     * @param target 纹理类型
     * @param data 数据，可为null
     * @param tex 指定纹理，未定义时新建
     */
    write(gl: WebGLRenderingContext, width: number, height: number, target: Texture, data?: ArrayLike<number> | null, tex?: WebGLTexture | null, ) {
        const texture = (tex === undefined) ? gl.createTexture() : tex;
        const t = target === Texture.T2D ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
        gl.bindTexture(t, texture);
        // rgba 4个通道各8位
        gl.texImage2D(gl[target], 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data ? new Uint8Array(data) : null);
        if (target === Texture.T2D) {
            gl.generateMipmap(t);
        }
        return texture;
    },
};
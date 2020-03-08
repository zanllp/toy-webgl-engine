import { mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';

export function resize(canvas: any, dpi = window.devicePixelRatio || 1) {
    // 获取浏览器中画布的显示尺寸
    const displayWidth = canvas.clientWidth * dpi | 0;
    const displayHeight = canvas.clientHeight * dpi | 0;

    // 检尺寸是否相同
    if (canvas.width !== displayWidth ||
        canvas.height !== displayHeight) {

        // 设置为相同的尺寸
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

export function createShader({ gl, type, source }: { gl: WebGLRenderingContext; type: number; source: string; }) {
    var shader = gl.createShader(type);
    if (!shader) {
        throw new Error('shader err');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        const msg = gl.getShaderInfoLog(shader);
        console.error(msg);
        gl.deleteShader(shader);
        throw new Error(`'createShader !success' ${msg}`);
    }
    return shader;
}

/**
 * 从查询字符串创建程序
 * @param gl 
 * @param vertex script的id
 * @param fragment 
 */
export const createProgramQuery = (gl: WebGLRenderingContext, vertex: string, fragment: string) => {
    return createProgram(gl, document.querySelector(vertex)!.textContent!, document.querySelector(fragment)!.textContent!);
};


export function createProgram(gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string) {
    var program = gl.createProgram();
    if (!program) {
        throw new Error('! program');
    }
    gl.attachShader(program, createShader({ gl, type: gl.VERTEX_SHADER, source: vertexSrc }));
    gl.attachShader(program, createShader({ gl, type: gl.FRAGMENT_SHADER, source: fragmentSrc }));
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        const msg = gl.getProgramInfoLog(program);
        console.error(msg);
        gl.deleteProgram(program);
        throw new Error(`createProgram( !success ${msg}`);
    }
    return program;
}


export const BufferData = {
	/**
	 * 重用buffer
	 */
    reuse(gl: WebGLRenderingContext, buf: WebGLBuffer | null, size: number, location: number) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    },
	/**
	 * 从新的数据创建buffer
	 */
    write(gl: WebGLRenderingContext, data: Iterable<number>, size: number, location: number) {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        return buf;
    }
};
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


export type typeAll = mat3 | mat4 | vec4 | vec3 | vec2 | number;
export type constraintNull = { [x: string]: number };
export type constraintAll = { [x: string]: typeAll | null };
export const createSetUniformFn = (gl: WebGLRenderingContext, loc: WebGLUniformLocation | null) => {
    return (_: typeAll, trans = false) => {
        if (typeof _ === 'number') {
            gl.uniform1f(loc, _);
        } else {
            // 没有mat2因为不能和vec4区分
            // 不使用instanceof是因为mat,vec的类型有类，但实际是模块而是构造器
            switch (_.length) {
                case 2:
                    gl.uniform2f(loc, _[0], _[1]);
                    break;
                case 3:
                    gl.uniform3f(loc, _[0], _[1], _[2]);
                    break;
                case 4:
                    gl.uniform4f(loc, _[0], _[1], _[2], _[3]);
                    break;
                case 9:
                    gl.uniformMatrix3fv(loc, trans, _);
                    break;
                case 16:
                    gl.uniformMatrix4fv(loc, trans, _);
                    break;
                default:
                    throw new Error('未定义类型');
            }
        }

    };
};

export type unifType<U> = { [p in keyof U]: U[p] };
export type attrResType = { set(data: Array<number>, id?: any): void, get(id: any): Array<number> | undefined };
export type attrType<A> = { [p in keyof A]: attrResType };
export const ShaderMaterialFromKey = <A extends constraintNull, U extends constraintAll>({ gl, program, attribute, uniform }:
    { gl: WebGLRenderingContext; program: WebGLProgram; attribute: A; uniform: U; }) => {
    const switch2BindProgram = () => {
        if (gl.getParameter(gl.CURRENT_PROGRAM) !== program) {
            gl.useProgram(program);
        }
    };
    switch2BindProgram();
    const loc = {} as { [p in keyof A]: number } & { [p in keyof U]: WebGLUniformLocation | null };
    const res = {} as { program: WebGLProgram; loc: typeof loc; src: A & U, switch2BindProgram: () => void, getUnifLoc: (u: string) => WebGLUniformLocation | null }
        & unifType<U> & attrType<A>; // 如果定义在一个即将展开的对象上,setget生效
    Object.keys(attribute).forEach(x => {
        (loc as any)[x] = gl.getAttribLocation(program, x);
        const size = attribute[x];
        const idRec = new Map<any, { data: Array<number>; buf: WebGLBuffer | null }>();
        (res as any)[x] = {
            get(id: any) {
                const res = idRec.get(id);
                if (res) {
                    return res.data;
                }
            },
            set(data: any, id?: any) {
                switch2BindProgram();
                if (id === undefined) {
                    BufferData.write(gl, data, size, loc[x]);
                } else {
                    const rec = idRec.get(id);
                    if (rec !== undefined && rec.data === data) { // 可以重用数据
                        BufferData.reuse(gl, rec.buf, size, loc[x]);
                    } else {
                        const buf = BufferData.write(gl, data, size, loc[x]);
                        idRec.set(id, { data, buf });
                    }
                }
            }
        };
    });
    Object.keys(uniform).forEach(x => {
        const uloc = gl.getUniformLocation(program, x);
        const eset = createSetUniformFn(gl, uloc);
        Object.defineProperty(res, x, {
            set(_: any) {
                switch2BindProgram();
                eset(_);
            },
            get() {
                switch2BindProgram();
                return gl.getUniform(program, uloc as any);
            }
        });
        const initValue = uniform[x];
        if (initValue) {
            (res as any)[x] = initValue; // 初始化设定值
        }
        (loc as any)[x] = uloc;
    });
    res.program = program;
    res.loc = loc;
    res.switch2BindProgram = switch2BindProgram;
    res.src = { ...attribute, ...uniform };
    res.getUnifLoc = u => res.loc[u];
    return res;
};
export type ShaderMaterialT = ReturnType<typeof ShaderMaterialFromKey>;


export type ShaderMaterialParamsT<A, U> = {
    gl: WebGLRenderingContext;
    location: {
        attribute: A;
        uniform: U;
    },
    source: {
        vertex: string;
        fragment: string;
    }
};

/**
 * 创建程序信息
 * @param param0 
 */
export const createShaderMaterial = <A extends constraintNull, U extends constraintAll>({ gl, location, source }: ShaderMaterialParamsT<A, U>) => {
    const program = createProgram(gl, source.vertex, source.fragment);
    return ShaderMaterialFromKey({ gl, program, attribute: location.attribute, uniform: location.uniform });
};


import { mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { variableEnum } from './shader';

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
        throw new Error(`'createShader !success' ${msg}\n${source}`);
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
export type allLocType<A, U> = { [p in keyof A]: number } & { [p in keyof U]: WebGLUniformLocation | null };
export type shaderMaterialResType<A, U> = {
    program: WebGLProgram;
    /**
     * 已经定义的所有地址，没有类型推断但确定定义过的也可以通过(info.loc as loc)[key]获取
     */
    loc: allLocType<A, U>;
    /**
     * 创建材质的原参数
     */
    src: A & U;
    /**
     * 切换到材质绑定的程序
     */
    switch2BindProgram(): void;
    /**
     * 获取uniform地址，给不能类型推断的目标使用的
     */
    getUnifLoc(u: variableEnum | keyof U): WebGLUniformLocation | null,
    /**
     * 获取某个attribute值的setget函数，给不能类型推断的目标使用的
     */
    getAttrFn(u: variableEnum | keyof U): attrResType,

    /**
     * 设置某个unifrom的值，给不能类型推断的目标使用的
     */
    setUnif(u: variableEnum | keyof U, val: typeAll | number[]): void;
    /**
     * 专门用来设置数组的
     * @param u 目标
     * @param iorf int 或者 float
     * @param number vec3就是3
     * @param data 
     */
    setUnif(u: variableEnum | keyof U, iorf: 'i' | 'f', number: '1' | '2' | '3' | '4', data: Iterable<number>): void;
} & unifType<U> & attrType<A> ; // 如果定义在一个即将展开的对象上,setget生效

export const ShaderMaterialFromKey = <A extends constraintNull, U extends constraintAll>({ gl, program, attribute, uniform }:
    { gl: WebGLRenderingContext; program: WebGLProgram; attribute: A; uniform: U; }) => {
    const switch2BindProgram = () => {
        if (gl.getParameter(gl.CURRENT_PROGRAM) !== program) {
            gl.useProgram(program);
        }
    };
    switch2BindProgram();
    const loc = {} as allLocType<A, U>;
    const res = {} as shaderMaterialResType<A, U>;
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
    res.getAttrFn = u => res[u];
    (res as any).setUnif = (k: any, v: any, n: any, data: any) => {
        if (typeof v === 'string') {
            const iof = v as 'i' | 'f';
            const num = n as '1' | '2' | '3' | '4';
            (gl as any)[`uniform${num}${iof}v`](res.getUnifLoc(k), data);
        } else {
            (res as any)[k] = v;
        }
    };
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


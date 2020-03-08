import { vec3, mat4 } from 'gl-matrix';

export type SetMatType = ((mat: mat4) => mat4 | void) | mat4;
/**
 * 创建设置矩阵的函数，仅用于类方法
 * @param target 目标矩阵的键
 */
export const createSetMatFn = <T>(target: keyof T) => {
    return function (this: T, fn: SetMatType) {
        const t = this as any;
        if (typeof fn === 'function') { // 如果是函数
            const mat = mat4.create();
            const res = fn(mat);
            if (res) { // 如果函数有返回值
                t[target] = res;
            } else {
                t[target] = mat;
            }
        } else { // 如果是矩阵类型
            t[target] = fn;
        }
        return t[target] as mat4;
    };
};

/**
 * 交换指定数组的元素
 * @param array 
 * @param l 
 * @param r 
 */
export const arraySwap = <T>(array: T[], l: number, r: number) => {
    const temp = array[r];
    array[r] = array[l];
    array[l] = temp;
    return array;
};

/**
 * rect2triangle,将一个矩形展开成2个三角形
 * @param rect 逆时针顺序的矩形
 * @param reverse 将三角形反向
 */
export const r2t = (rect: Array<number>, reverse = false) => {
    for (let i = 0; i < 3; i++) {
        rect[5 * 3 + i] = rect[3 * 3 + i];
        rect[4 * 3 + i] = rect[2 * 3 + i];
        rect[3 * 3 + i] = rect[i];
    }
    if (reverse) {
        for (let i = 0; i < 3; i++) {
            arraySwap(rect, 0 * 3 + i, 2 * 3 + i);
            arraySwap(rect, 3 * 3 + i, 5 * 3 + i);
        }
    }
    return rect;
};

/**
 * 数组转vec3，如果是float32array 直接 as vec3就行
 * @param _ 
 */
export const array2Vec3 = (_: Array<number>) => vec3.fromValues(_[0], _[1], _[2]);

export type PosDataType = number[][];

/**
 * 从位置数据生成对应的数量随机颜色
 * @param posData 
 * @param factor 修改颜色因子
 */
export const randColor = (posData: PosDataType, factor = 1) => {
    const colorData = posData.map(() => {
        let color = Array.from(vec3.random(vec3.create()).map(Math.abs));
        if (factor !== 1) {
            color = color.map(_ => _ * factor);
        }
        return [color, color, color, color, color, color];
    }).flat(2);
    return colorData;
};

/**
 * 计算表面法线
 */
export const calcNormal = (posData: PosDataType) => {
    return calcNormalN(posData).flat(2);
};

/**
 * 计算表面法线，不压平，返回【面【顶点【数据】】】
 */
export const calcNormalN = (posData: PosDataType) => {
    return posData.map((x) => {
        const e = [[x[0], x[1], x[2]], [x[3], x[4], x[5]], [x[6], x[7], x[8]]];
        const v1 = vec3.sub(vec3.create(), e[1], e[0]);
        const v2 = vec3.sub(vec3.create(), e[2], e[0]);
        const normal = vec3.cross(vec3.create(), v1, v2);
        vec3.normalize(normal, normal);
        const res = Array.from(normal);
        return [res, res, res, res, res, res]; // 一个面2个三角形6个点
    });
};


export type setStateType<V> = (Partial<V> | ((s: V) => Partial<V>) | { action: 'incr' | 'decr', key: keyof V, value: number });
/**
 * 创建设置状态函数
 * @param gl 
 * @param programInfo 程序信息，渲染器的参数 render(gl, programInfo, s.state) 
 * @param render 渲染函数 
 * @param s 包含state键的对象，用来作为状态的唯一源，和渲染器的参数
 */
export const createSetStateFn = </*T, */V, U extends { state: V }>(/*gl: WebGLRenderingContext, programInfo: T, render: (gl: WebGLRenderingContext, info: T, v?: V) => any, */s: U) => {
    //const throttleRender = throttle((s: U) => render(gl, programInfo, s.state), 12);
    return (set: setStateType<V>) => {
        let { state } = s;
        if (typeof set === 'object') {
            if ('action' in set) {
                const v = state as any;
                if (typeof v[set.key] !== 'number') {
                    throw new Error(`key:${set.key} 不能作用于value:${v},type:${typeof v[set.key]}`);
                }
                switch (set.action) {
                    case 'incr':
                        v[set.key] += set.value;
                        break;
                    case 'decr':
                        v[set.key] -= set.value;
                        break;
                }
            } else {
                state = { ...state, ...set };
            }
        } else {
            state = { ...state, ...set(state) };
        }
        s.state = state;
        //throttleRender(state);
        //render(gl, programInfo, state.value)
        return state;
    };
};

/**
 * 数字转3通道颜色数字 0x1890ff => [24,144,255]
 * @param c 
 */
export const num2color = (c: number) => {
    const r = c >> 16;
    const g = (c >> 8) & 0xff;
    const b = c & 0xff;
    return [r, g, b];
};

/**
 * 
 * @param t 获取指定目标类名
 */
export const getClassName = (t: any) => {
    return t.__proto__.constructor.name as string;
};

/**
 * 模型矩阵转世界矩阵
 * @param modelMat 
 */
export const modelMat2WorldMat = (modelMat: mat4) => {
    const worldMat = mat4.clone(modelMat);
    worldMat[12] = 0;
    worldMat[13] = 0;
    worldMat[14] = 0;
    return worldMat;
};


/**
 * 角度转幅度
 * @param d 
 */
export const degToRad = (d: number) => {
    return d * Math.PI / 180;
};
import { mat3, mat4, vec3 } from 'gl-matrix';
import { createMesh, createWriteBufFn, degToRad, modifyWindow, mulM3V3, mulV3M3, printMat, resize, createProgramInfo, writeMultiBuf } from './tool';
import { ui } from './ui';
modifyWindow({ mat3, mulM3V3, printMat, mulV3M3, vec3 });


const vEle = `
uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
uniform vec3 u_lightPoint;
uniform vec3 u_viewWorldPos;
attribute vec3 a_pos;
attribute vec3 a_color;
attribute vec3 a_normal;
varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_surface2Light;
varying vec3 v_surface2View;

void main() {
    vec4 worldPos = u_model * vec4(a_pos,1); // 自己的坐标转换成世界坐标,a_pos类型vec3是已经转置的所以要放最右边
    gl_Position =   u_proj * u_view * worldPos; // 按照model view projection也就是倒着的pvm矩阵
    v_surface2Light = u_lightPoint - worldPos.xyz;
    v_surface2View = u_viewWorldPos - worldPos.xyz;
    v_color = a_color; 
    v_normal = mat3(u_model) * a_normal;
}`;
const fEle = `
precision mediump float; // 默认精度
uniform vec3 u_lightDirectional;
uniform float u_shininess;
varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_surface2Light;
varying vec3 v_surface2View;

float lightFactor(vec3 normal,vec3 light) {
    return max(dot(normal,light),.0);
}

// 表面反射光
float reflectLight(float light,vec3 normal,vec3 surface2View,vec3 surface2Point) {
    // 当入射光与反射光的角度越接近时，即两个向量的半向量与法线越接近时越亮
    vec3 halfVec = normalize(surface2View + surface2Point);
    float specular = .0;
    if (light > 0.0) {
      specular = pow(lightFactor(normal,halfVec), u_shininess);
    }
    return specular;
}

void main() {
    vec3 normal = normalize(v_normal);
    vec3 surface2PointLight = normalize(v_surface2Light);
    vec3 surface2View = normalize(v_surface2View);
    gl_FragColor = vec4(v_color, 1);
    float light = lightFactor(normal, surface2PointLight) + lightFactor(normal, u_lightDirectional); // 点光源 + 平行光源
    gl_FragColor.rgb *= light;
    gl_FragColor.rgb += reflectLight(light, normal, surface2View, surface2PointLight); 
}
`;

const vScene = `
uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
attribute vec3 a_pos;
void main() {
    vec4 pos = vec4(a_pos,1);
    gl_Position =  u_proj * u_view * pos;
    gl_PointSize = 24.;
}`;
const fScene = `
precision mediump float; 
void main() {
    gl_FragColor = vec4(.2,.2,.2,1);
}
`;

const createInfo = (gl: WebGLRenderingContext) => ({
    ele: createProgramInfo({
        gl,
        location: {
            attribute: {
                a_pos: '',
                a_color: '',
                a_normal: '',
            },
            uniform: {
                u_proj: '',
                u_view: '',
                u_model: '',
                u_lightDirectional: '',
                u_lightPoint: '',
                u_viewWorldPos: '',
                u_shininess: '',
            }
        },
        source: {
            vertex: vEle,
            fragment: fEle
        }
    }),
    scene: createProgramInfo({
        gl,
        location: {
            attribute: {
                a_pos: ''
            },
            uniform: {
                u_proj: '',
                u_view: '',
                u_model: '',
            }
        },
        source: {
            vertex: vScene,
            fragment: fScene
        }
    }),
});
type infoT = ReturnType<typeof createInfo>;

export const start = (gl: WebGLRenderingContext, ani = false) => {
    resize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const info = createInfo(gl);
    const setV = createSetValueFn(gl, info);
    if (ani) {
        let lt = 0;
        let lRotate = value.rotateY;
        const anifn = (t: number) => {
            lRotate += (30 * (t - lt)) / 300.0;
            setV({ rotateY: lRotate, rotateX: 360 - lRotate, z: -(Math.sin(lRotate / 100)) * 10 + 350 });
            requestAnimationFrame(anifn);
            lt = t;
        };
        requestAnimationFrame(anifn);
    } else {
        const step = 1;
        document.addEventListener('keydown', x => {
            const step = 3;
            switch (x.code) {
                case 'ArrowLeft':
                    setV({ action: 'decr', key: 'rotateCameraY', value: step });
                    break;
                case 'ArrowRight':
                    setV({ action: 'incr', key: 'rotateCameraY', value: step });
                    break;
                case 'ArrowDown':
                    setV({ action: 'decr', key: 'rotateCameraX', value: step });
                    break;
                case 'ArrowUp':
                    setV({ action: 'incr', key: 'rotateCameraX', value: step });
                    break;
                case 'PageUp':
                    setV({ action: 'incr', key: 'y', value: step });
                    break;
                case 'PageDown':
                    setV({ action: 'decr', key: 'y', value: step });
                    break;
                case 'KeyW':
                    setV({ action: 'decr', key: 'z', value: step });
                    break;
                case 'KeyS':
                    setV({ action: 'incr', key: 'z', value: step });
                    break;
                case 'KeyA':
                    setV({ action: 'decr', key: 'x', value: step });
                    break;
                case 'KeyD':
                    setV({ action: 'incr', key: 'x', value: step });
                    break;
                case 'KeyQ':
                    setV({ action: 'decr', key: 'rotateCameraY', value: step });
                    break;
                case 'KeyE':
                    setV({ action: 'incr', key: 'rotateCameraY', value: step });
                    break;
            }
        });
        ui.setupSlider('#rotate-y', { value: value.rotateY, slide: (x: any) => setV({ rotateY: x }), min: -360, max: 360 });
        ui.setupSlider('#rotate-x', { value: value.rotateX, slide: (x: any) => setV({ rotateX: x }), min: -360, max: 360 });
        ui.setupSlider('#range-shininess', { value: value.shininess, slide: (x: any) => setV({ shininess: x }), min: 1, max: 100, step });
        render(gl, info);
    }


};
let value = {
    z: 350, y: 150, x: 0,
    rotateCameraY: 0, rotateCameraX: 0,
    rotateY: 0, rotateX: 0,
    shininess: 30
};
type valueT = typeof value;
const createSetValueFn = (gl: WebGLRenderingContext, programInfo: infoT) =>
    (s: (Partial<valueT> | ((s: valueT) => Partial<valueT>) | { action: 'incr' | 'decr', key: keyof valueT, value: number })) => {
        if (typeof s === 'object') {
            if ('action' in s) {
                switch (s.action) {
                    case 'incr':
                        value[s.key] += s.value;
                        break;
                    case 'decr':
                        value[s.key] -= s.value;
                        break;
                }
            } else {
                value = { ...value, ...s };
            }
        } else {
            value = { ...value, ...s(value) };
        }
        render(gl, programInfo, value);
        return value;
    };

const render = (gl: WebGLRenderingContext, info: infoT, v = value) => {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(info.ele.program);
    const projection = mat4.create();
    const fieldOfView = degToRad(75);
    const aspect = gl.canvas.width / gl.canvas.height;
    const zNear = 1;
    const zFar = 1000;
    mat4.perspective(projection, fieldOfView, aspect, zNear, zFar); // 投影
    gl.uniformMatrix4fv(info.ele.u_proj, false, projection);
    // 视锥在zNear 的距离时是 2 个单位高和 2 * aspect 个单位宽。视图的范围是 -1 到 +1 
    // 矩阵乘法的执行顺序是倒的
    const camera = mat4.create();
    const viewPos = [v.x, v.y, v.z];
    mat4.rotateX(camera, camera, degToRad(v.rotateCameraX));
    mat4.rotateY(camera, camera, degToRad(v.rotateCameraY));
    mat4.translate(camera, camera, viewPos.map(_ => -_));
    gl.uniformMatrix4fv(info.ele.u_view, false, camera);
    gl.uniform3fv(info.ele.u_viewWorldPos, viewPos);

    const scaleFactor = 1;

    const model = mat4.create();
    mat4.translate(model, model, [50, 50, 50].map(_ => _ / scaleFactor));
    mat4.rotateX(model, model, degToRad(v.rotateX));
    mat4.rotateY(model, model, degToRad(v.rotateY));
    mat4.translate(model, model, [-50, -50, -50].map(_ => _ / scaleFactor));
    gl.uniformMatrix4fv(info.ele.u_model, false, model);
    gl.uniform3fv(info.ele.u_lightDirectional, [1, 1, 1]);
    gl.uniform3fv(info.ele.u_lightPoint, [70, 30, 180]);
    gl.uniform1f(info.ele.u_shininess, v.shininess);
    //
    const posData = dataF.map(_ => _ / scaleFactor);
    const norData = normalData;
    writeMultiBuf(gl, [
        {
            data: posData,
            size: 3,
            location: info.ele.a_pos
        }, {
            data: colorData,
            size: 3,
            location: info.ele.a_color,
        }, {
            data: norData,
            size: 3,
            location: info.ele.a_normal,
        }
    ]);
    gl.drawArrays(gl.TRIANGLES, 0, posData.length / 3);

    gl.useProgram(info.scene.program);
    gl.uniformMatrix4fv(info.scene.u_proj, false, projection);
    gl.uniformMatrix4fv(info.scene.u_view, false, camera);
    createWriteBufFn(gl)([70, 30, 120], 3, info.scene.a_pos);
    gl.drawArrays(gl.POINTS, 0, 1);
    createMesh({ gl, posLoc: info.scene.a_pos, range: 3000, num: 20, is3d: true });
};
export const webgl = (gl: WebGLRenderingContext) => {
    start(gl);
};
const data = [
    // front
    [100, 100, 100,
        0, 100, 100,
        0, 0, 100,
        100, 100, 100,
        0, 0, 100,
        100, 0, 100,],
    // back
    [100, 100, 0,
        0, 0, 0,
        0, 100, 0,
        100, 100, 0,
        100, 0, 0,
        0, 0, 0,],
    // right
    [100, 100, 100,
        100, 0, 100,
        100, 0, 0,
        100, 100, 0,
        100, 100, 100,
        100, 0, 0,],
    //left
    [0, 100, 100,
        0, 100, 0,
        0, 0, 0,
        0, 100, 100,
        0, 0, 0,
        0, 0, 100,],
    //top
    [100, 100, 0,
        0, 100, 0,
        0, 100, 100,
        100, 100, 0,
        0, 100, 100,
        100, 100, 100,],
    //bottom
    [0, 0, 0,
        100, 0, 0,
        0, 0, 100,
        100, 0, 0,
        100, 0, 100,
        0, 0, 100,],
];
const dataF = data.flat();

const colorData = data.map(() => {
    const color = Array.from(vec3.random(vec3.create()).map(Math.abs)).map(_ => _ / 1);
    return [color, color, color, color, color, color];
}).flat(2);
/**
 * 自动计算表面法线
 */
const ek = [] as number[][];
const normalData = data.map((x) => {
    const e = [[x[0], x[1], x[2]], [x[3], x[4], x[5]], [x[6], x[7], x[8]]];
    const v1 = vec3.sub(vec3.create(), e[1], e[0]);
    const v2 = vec3.sub(vec3.create(), e[2], e[0]);
    const normal = vec3.cross(vec3.create(), v1, v2);
    vec3.normalize(normal, normal);
    const res = Array.from(normal);
    ek.push(res);
    return [res, res, res, res, res, res]; // 一个面2个三角形6个点
}).flat(2);

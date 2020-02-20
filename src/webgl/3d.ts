import { mat3, mat4, vec3 } from 'gl-matrix';
import { modifyWindow, mulM3V3, mulV3M3, printMat, createProgram, resize, writeBufferData, degToRad } from './tool';


const vtc = `
attribute vec3 a_pos;
attribute vec3 a_color;
varying vec3 v_color;
uniform mat4 u_tsf;
uniform mat4 u_view;
void main() {
    gl_Position =  u_tsf *  vec4(a_pos,1);
    v_color = a_color; 
}`;
const fgc = `
precision mediump float; // 默认精度
varying vec3 v_color;

void main() {
    // 在纹理上寻找对应颜色值
    gl_FragColor = vec4(v_color/255.0,1);
}
`;


const programInfo = (gl: WebGLRenderingContext, program: WebGLProgram) => {
    let posLoc = gl.getAttribLocation(program, 'a_pos');
    let colorLoc = gl.getAttribLocation(program, 'a_color');
    let tsfLoc = gl.getUniformLocation(program, 'u_tsf');
    let viewLoc = gl.getUniformLocation(program, 'u_view');
    return { posLoc, colorLoc, tsfLoc, program, viewLoc };
};
type programInfoT = ReturnType<typeof programInfo>;


export const start = (gl: WebGLRenderingContext, ani = true) => {
    const shaderProgram = createProgram(gl, vtc, fgc);
    resize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const info = programInfo(gl, shaderProgram);
    if (ani) {
        let lt = 0;
        let lRotate = 0;
        const anifn = (t: number) => {
            lRotate += (30 * (t - lt)) / 100000.0;
            render(gl, info, lRotate);
            requestAnimationFrame(anifn);
            lt = t;
        };
        requestAnimationFrame(anifn);
    } else {
        render(gl, info);
    }
};
const render = (gl: WebGLRenderingContext, programInfo: programInfoT, rotate: number = 0) => {

    const { program, tsfLoc, posLoc, colorLoc } = programInfo;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    const projection = mat4.create();
    const fieldOfView = degToRad(75);
    const aspect = gl.canvas.width / gl.canvas.height;
    const zNear = 1;
    const zFar = 4000;

    mat4.perspective(projection, fieldOfView, aspect, zNear, zFar); // 投影
    // 视锥在zNear 的距离时是 2 个单位高和 2 * aspect 个单位宽。视图的范围是 -1 到 +1 

    const radius = 500;
    const camera = mat4.create();
    mat4.translate(camera, projection, [0, 0, -800]);

    mat4.rotateX(camera, camera, degToRad(15));
    mat4.rotateZ(camera, camera, degToRad(180));
    mat4.rotateY(camera, camera, degToRad(rotate * 100));
    writeBufferData(gl, data, 3, posLoc);
    writeBufferData(gl, colorData, 3, colorLoc);
    let center: Array<number>;
    const numFs = 5;
    for (let ii = 0; ii < numFs; ++ii) {
        let angle = ii * Math.PI * 2 / numFs;
        let x = Math.cos(angle) * radius;
        let y = Math.sin(angle) * radius;
        // 从视图投影矩阵开始
        // 计算 F 的矩阵
        const newMat = mat4.create();
        mat4.translate(newMat, camera, [x, 0, y]);
        const _mat = mat4.create();
        let cameraPosition = [
            camera[12],
            camera[13],
            camera[14],
        ];
        mat4.lookAt(_mat, cameraPosition, [0, 0, radius], [0, 1, 0]); // 指向第一个f
        // 设置矩阵
        gl.uniformMatrix4fv(tsfLoc, false, mat4.mul(newMat, newMat, _mat));

        // 获得几何体
        gl.drawArrays(gl.TRIANGLES, 0, 6 * 16);
    }
};

const data = [
    // left column front
    0, 0, 0,
    0, 150, 0,
    30, 0, 0,
    0, 150, 0,
    30, 150, 0,
    30, 0, 0,

    // top rung front
    30, 0, 0,
    30, 30, 0,
    100, 0, 0,
    30, 30, 0,
    100, 30, 0,
    100, 0, 0,

    // middle rung front
    30, 60, 0,
    30, 90, 0,
    67, 60, 0,
    30, 90, 0,
    67, 90, 0,
    67, 60, 0,

    // left column back
    0, 0, 30,
    30, 0, 30,
    0, 150, 30,
    0, 150, 30,
    30, 0, 30,
    30, 150, 30,

    // top rung back
    30, 0, 30,
    100, 0, 30,
    30, 30, 30,
    30, 30, 30,
    100, 0, 30,
    100, 30, 30,

    // middle rung back
    30, 60, 30,
    67, 60, 30,
    30, 90, 30,
    30, 90, 30,
    67, 60, 30,
    67, 90, 30,

    // top
    0, 0, 0,
    100, 0, 0,
    100, 0, 30,
    0, 0, 0,
    100, 0, 30,
    0, 0, 30,

    // top rung right
    100, 0, 0,
    100, 30, 0,
    100, 30, 30,
    100, 0, 0,
    100, 30, 30,
    100, 0, 30,

    // under top rung
    30, 30, 0,
    30, 30, 30,
    100, 30, 30,
    30, 30, 0,
    100, 30, 30,
    100, 30, 0,

    // between top rung and middle
    30, 30, 0,
    30, 60, 30,
    30, 30, 30,
    30, 30, 0,
    30, 60, 0,
    30, 60, 30,

    // top of middle rung
    30, 60, 0,
    67, 60, 30,
    30, 60, 30,
    30, 60, 0,
    67, 60, 0,
    67, 60, 30,

    // right of middle rung
    67, 60, 0,
    67, 90, 30,
    67, 60, 30,
    67, 60, 0,
    67, 90, 0,
    67, 90, 30,

    // bottom of middle rung.
    30, 90, 0,
    30, 90, 30,
    67, 90, 30,
    30, 90, 0,
    67, 90, 30,
    67, 90, 0,

    // right of bottom
    30, 90, 0,
    30, 150, 30,
    30, 90, 30,
    30, 90, 0,
    30, 150, 0,
    30, 150, 30,

    // bottom
    0, 150, 0,
    0, 150, 30,
    30, 150, 30,
    0, 150, 0,
    30, 150, 30,
    30, 150, 0,

    // left side
    0, 0, 0,
    0, 0, 30,
    0, 150, 30,
    0, 0, 0,
    0, 150, 30,
    0, 150, 0];
const colorData = [
    // left column front
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,

    // top rung front
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,

    // middle rung front
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,

    // left column back
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,

    // top rung back
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,

    // middle rung back
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,

    // top
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,

    // top rung right
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,

    // under top rung
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,

    // between top rung and middle
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,

    // top of middle rung
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,

    // right of middle rung
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,

    // bottom of middle rung.
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,

    // right of bottom
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,

    // bottom
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,

    // left side
    160, 160, 220,
    160, 160, 220,
    160, 160, 220,
    160, 160, 220,
    160, 160, 220,
    160, 160, 220];
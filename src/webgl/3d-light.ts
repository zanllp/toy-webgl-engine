import { mat4 } from 'gl-matrix';
import { createProgram, degToRad, resize, writeBufferData } from './tool';
import { ui } from './ui';


const vtc = `
uniform mat4 u_tsf;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_lightDot;
attribute vec3 a_pos;
attribute vec3 a_color;
attribute vec3 a_normal;
varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_surfaceToLight;

void main() {
    vec4 pos = vec4(a_pos,1);
    gl_Position =  u_tsf * pos;
    v_surfaceToLight = u_lightDot - (u_world * pos).xyz;
    v_color = a_color; 
    v_normal =  mat3(u_world)* a_normal;
}`;
const fgc = `
precision mediump float; // 默认精度
uniform vec3 u_lightDirection;
varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;

void main() {
    gl_FragColor = vec4(0.2,1,0.1,1);//vec4(v_color/255.0,1);
    vec3 normal = normalize(v_normal);
    vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
    //float light = dot(normal, u_lightDirection);
    float light = dot(normal, surfaceToLightDirection) + dot(normal, u_lightDirection);
    gl_FragColor.rgb *= light;
}
`;


const programInfo = (gl: WebGLRenderingContext, program: WebGLProgram) => {
    let posLoc = gl.getAttribLocation(program, 'a_pos');
    let colorLoc = gl.getAttribLocation(program, 'a_color');
    let tsfLoc = gl.getUniformLocation(program, 'u_tsf');
    let viewLoc = gl.getUniformLocation(program, 'u_view');
    let worldLoc = gl.getUniformLocation(program, 'u_world');
    let lightLoc = gl.getUniformLocation(program, 'u_lightDirection'); // 平行光源
    let normalLoc = gl.getAttribLocation(program, 'a_normal');
    let lightDotLoc = gl.getUniformLocation(program, 'u_lightDot'); // 点光源
    return { posLoc, colorLoc, tsfLoc, program, viewLoc, lightLoc, normalLoc, worldLoc, lightDotLoc };
};
type programInfoT = ReturnType<typeof programInfo>;


export const start = (gl: WebGLRenderingContext, ani = false) => {
    const shaderProgram = createProgram(gl, vtc, fgc);
    resize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const info = programInfo(gl, shaderProgram);
    if (ani) {
        let lt = 0;
        let lRotate = 0;
        const anifn = (t: number) => {
            lRotate += (30 * (t - lt)) / 300000.0;
            render(gl, info, lRotate);
            requestAnimationFrame(anifn);
            lt = t;
        };
        requestAnimationFrame(anifn);
    } else {
        let value = 0;
        const fn = (_: any, ui: any) => {
            render(gl, info, ui.value / 100);
        };
        ui.setupSlider('#range', { value, slide: fn, min: -360, max: 360 });
        render(gl, info);
    }


};
const render = (gl: WebGLRenderingContext, programInfo: programInfoT, rotate: number = 0) => {

    const { program, tsfLoc, posLoc, colorLoc, lightLoc, normalLoc, worldLoc, lightDotLoc } = programInfo;
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

    const radius = 300;
    const camera = mat4.create();
    mat4.translate(camera, projection, [0, 0, -500]);

    //mat4.rotateX(camera, camera, degToRad(15));
    mat4.rotateZ(camera, camera, degToRad(180));
    mat4.rotateY(camera, camera, degToRad(rotate * 100));

    // 取旋转的逆矩阵让光照保存不动
    const sun = mat4.create();
    const ro = mat4.create();
    mat4.rotateY(ro, ro, degToRad(rotate * 100));
    mat4.invert(sun, ro);
    gl.uniformMatrix4fv(worldLoc, false, sun);
    //gl.uniform3fv(lightLoc, [.0, .0, -.75]);
    gl.uniform3fv(lightDotLoc, [0, 0, -500]);

    writeBufferData(gl, data, 3, posLoc);
    writeBufferData(gl, colorData, 3, colorLoc);
    writeBufferData(gl, normalData, 3, normalLoc);
    const numFs = 5;
    for (let ii = 0; ii < numFs; ++ii) {
        let angle = ii * Math.PI * 2 / numFs;
        let x =  Math.cos(angle) * radius;
        let y = Math.sin(angle) * radius;
        // 从视图投影矩阵开始
        // 计算 F 的矩阵
        const newMat = mat4.create();
        mat4.translate(newMat, camera, [x, 0, y]);
        //const _mat = mat4.create();
        //let cameraPosition = [camera[12], camera[13], camera[14],];
        //mat4.lookAt(_mat, cameraPosition, [0, 0, radius], [0, 1, 0]); // 指向第一个f
        //mat4.mul(newMat, newMat, _mat);
        // 设置矩阵
        gl.uniformMatrix4fv(tsfLoc, false, newMat);

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
const normalData = [
    // left column front
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,

    // top rung front
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,

    // middle rung front
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,

    // left column back
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,

    // top rung back
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,

    // middle rung back
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,

    // top
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,

    // top rung right
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,

    // under top rung
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,

    // between top rung and middle
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,

    // top of middle rung
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,

    // right of middle rung
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,

    // bottom of middle rung.
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,

    // right of bottom
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,

    // bottom
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,

    // left side
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0];
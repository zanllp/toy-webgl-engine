import { mat3 } from 'gl-matrix';
import { createProgram, resize, writeBufferData, createMesh } from './tool';
const vtc = `
attribute vec2 a_pos;
attribute vec3 a_color;
varying vec3 v_color;
uniform mat3 u_tsf;
void main() {
    gl_Position = vec4((u_tsf * vec3(a_pos, 1)).xy, 0, 1);
    v_color = a_color; 
}`;
const fgc = `
precision mediump float; // 默认精度
varying vec3 v_color;

void main() {
    // 在纹理上寻找对应颜色值
    gl_FragColor = vec4(0,0,0,1);
}
`;


const programInfo = (gl: WebGLRenderingContext, program: WebGLProgram) => {
    let posLoc = gl.getAttribLocation(program, 'a_pos');
    let colorLoc = gl.getAttribLocation(program, 'a_color');
    let tsfLoc = gl.getUniformLocation(program, 'u_tsf');
    return { posLoc, colorLoc, tsfLoc, program };
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
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    const tsf = mat3.create();
    mat3.projection(tsf, gl.canvas.width, gl.canvas.height);
    mat3.translate(tsf, tsf, [500.0, 500.0]);
    mat3.rotate(tsf, tsf, rotate);


    gl.uniformMatrix3fv(tsfLoc, false, tsf);
    if (true) {
        createMesh({ gl, posLoc });
    } else {
        writeBufferData(gl, [
            500., 500.,
            0.00, 500.,
            0.00, 0.00,

            500., 500.,
            0.00, 0.00,
            500., 0.00,
        ], 2, posLoc);
        writeBufferData(gl, [
            24, 144, 255,
            24, 144, 255,
            24, 144, 255,

            102, 204, 255,
            102, 204, 255,
            102, 204, 255,
        ], 3, colorLoc);
    }
};

let first = true;


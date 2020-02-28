import { mat2, mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { array2Vec3, Box, createProgramInfo, createSetValueFn, degToRad, modifyWindow, printMat, resize, Scene, createKeyListener, Sphere, Mesh, Point, Assembly } from './tool';
import { ui } from './ui';
import color from 'color-name';
modifyWindow({ mat3, printMat, vec3, vec4, mat2, mat4, d2r: degToRad });


const vEle = `
uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
uniform mat4 u_world;
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
    v_surface2View = mat3(u_view) * u_viewWorldPos - worldPos.xyz;
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
attribute vec3 a_pos;
void main() {
    vec4 pos = vec4(a_pos,1);
    gl_Position =  u_proj * u_view * pos;
    gl_PointSize = 8.;
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
                a_pos: 3,
                a_color: 3,
                a_normal: 3
            },
            uniform: {
                u_proj: mat4.create(),
                u_view: mat4.create(),
                u_model: mat4.create(),
                u_lightDirectional: vec3.fromValues(1, 1, 1),
                u_lightPoint: vec3.fromValues(70, 30, 180),
                u_viewWorldPos: vec3.create(),
                u_shininess: 50,
            }
        },
        source: {
            vertex: vEle,
            fragment: fEle
        }
    }),
    plane: createProgramInfo({
        gl,
        location: {
            attribute: {
                a_pos: 3
            },
            uniform: {
                u_proj: mat4.create(),
                u_view: mat4.create(),
            }
        },
        source: {
            vertex: vScene,
            fragment: fScene
        }
    }),
});

type infoT = ReturnType<typeof createInfo>;

export const start = (gl: WebGLRenderingContext) => {
    resize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const info = createInfo(gl);
    const setV = createSetValueFn(gl, info, render, state);
    render(gl, info);
    document.addEventListener('wheel', x => {
        const direction = x.deltaY / Math.abs(x.deltaY);
        return setV(_ => ({ scale: _.scale * (1 + (direction * .1)) }));
    });
    document.addEventListener('mousedown', x => {
        if (x.buttons === 1) {
            state.clicked = true;
        }
    });
    document.addEventListener('mouseup', x => {
        if (x.buttons === 0) {
            state.clicked = false;
        }
    });
    document.addEventListener('mousemove', x => {
        if (state.clicked) {
            const { movementX, movementY } = x;
            setV(y => ({
                rotateCameraX: y.rotateCameraX - movementY / 20,
                rotateCameraY: y.rotateCameraY - movementX / 5,
            }));
        }
    });
    createKeyListener({
        ArrowLeft: t => setV({ action: 'decr', key: 'rotateCameraY', value: t / 20 }),
        ArrowDown: t => setV({ action: 'decr', key: 'rotateCameraX', value: t / 20 }),
        ArrowUp: t => setV({ action: 'incr', key: 'rotateCameraX', value: t / 20 }),
        PageUp: t => setV({ action: 'incr', key: 'y', value: t / 20 }),
        PageDown: t => setV({ action: 'decr', key: 'y', value: t / 20 }),
        KeyW: t => setV({ action: 'decr', key: 'z', value: t / 20 }),
        KeyS: t => setV({ action: 'incr', key: 'z', value: t / 20 }),
        KeyA: t => setV({ action: 'decr', key: 'x', value: t / 20 }),
        KeyD: t => setV({ action: 'incr', key: 'x', value: t / 20 }),
        KeyQ: t => setV({ action: 'decr', key: 'rotateCameraY', value: t / 50 }),
        KeyE: t => setV({ action: 'incr', key: 'rotateCameraY', value: t / 50 }),
        KeyX: t => setV({ action: 'incr', key: 'rotateY', value: t / 5000 })
    });
    const { value } = state;
    ui.setupSlider('#rotate-y', { value: value.rotateY, slide: (x: any) => setV({ rotateY: x }), min: -360, max: 360 });
    ui.setupSlider('#rotate-x', { value: value.rotateX, slide: (x: any) => setV({ rotateX: x }), min: -360, max: 360 });
    ui.setupSlider('#range-shininess', { value: value.shininess, slide: (x: any) => setV({ shininess: x }), min: 1, max: 100, step: 1 });
};

const state = {
    value: {
        z: 1600, y: 600, x: 0,
        rotateCameraY: 0, rotateCameraX: 0, scale: 1,
        rotateY: 0, rotateX: 0,
        shininess: 50,
    },
    model: null as modelType | null,
    clicked: false,
};


const render = (gl: WebGLRenderingContext, info: infoT, v = state.value) => {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // 右向左（倒）移动物体坐标，左向右（顺）移动坐标轴
    const { ele, plane } = info;
    const { scene, scene2, box0, spheres } = state.model as NonNullable<modelType>;
    gl.useProgram(ele.program);
    ele.u_shininess = v.shininess;
    const projection = scene.setProjectionMat(projection => {
        // 视锥在zNear 的距离时是 2 个单位高和 2 * aspect 个单位宽。视图的范围是 -1 到 +1 
        const fieldOfView = degToRad(45);
        const aspect = gl.canvas.width / gl.canvas.height;
        const zNear = 1;
        const zFar = 4000;
        mat4.perspective(projection, fieldOfView, aspect, zNear, zFar); // 投影
    });
    const viewPos = [v.x, v.y, v.z];
    ele.u_viewWorldPos = array2Vec3(viewPos);
    const camera = scene.setViewMat(x => {
        mat4.translate(x, x, viewPos.map(_ => -_));
        mat4.rotateX(x, x, degToRad(v.rotateCameraX));
        mat4.rotateY(x, x, degToRad(v.rotateCameraY));
        mat4.scale(x, x, [v.scale, v.scale, v.scale]);
    });

    box0.setModelMat(x => {
        mat4.translate(x, x, [50, 50, 50]);
        mat4.rotateX(x, x, degToRad(v.rotateX));
        mat4.rotateY(x, x, degToRad(v.rotateY));
        mat4.translate(x, x, [-50, -50, -50]);// 立方体需要矫正位置，因为球的中心点就在后左底三面相交点
    });
    let i = 1;
    spheres[0].children.forEach(x => {
        if (i === 3 + 1) {

            {
                const mat1 = mat4.create();
                x.popMat();
                const r = 600 + 400 * i ** 1.4;
                const xp = r * Math.cos(v.rotateY / i);
                const zp = r * Math.sin(v.rotateY / i);
                mat4.translate(mat1, mat1, [xp, 150, zp]);
                mat4.rotateY(mat1, mat1, degToRad(v.rotateY * 300));
                x.pushMat(mat1);
            }

            const mat = mat4.create();
            const c = Array.from(x.children)[0];
            c.popMat();
            //抵消父级的自转
            mat4.translate(mat, mat, [-300, 0, 0]);
            mat4.rotateY(mat, mat, -degToRad(v.rotateY * 300));

            mat4.rotateZ(mat, mat, degToRad(45));
            const r = 300;
            const xp = r * Math.cos(v.rotateY * 10 / i);
            const zp = r * Math.sin(v.rotateY * 10 / i);
            mat4.translate(mat, mat, [xp, 0, zp]);

            mat4.rotateY(mat, mat, degToRad(v.rotateY * 300));
            c.pushMat(mat);
        } else {

            x.popMat();
            const r = 600 + 400 * i ** 1.4;
            const xp = r * Math.cos(v.rotateY / i);
            const zp = r * Math.sin(v.rotateY / i);
            const mat = mat4.create();
            x.pushMat(mat4.translate(mat, mat, [xp, 150, zp]));
        }
        i++;
    });

    //largeSphere.setModelMat(x => {
    //    mat4.translate(x, x, [250, 150, 50]); // 球不需要矫正位置，因为球的中心点就在0，0，0
    //    mat4.rotateX(x, x, degToRad(v.rotateX));
    //    mat4.rotateY(x, x, degToRad(v.rotateY));
    //});
    scene.render(gl, ele);
    gl.useProgram(plane.program);
    scene2.setProjectionMat(projection);
    scene2.setViewMat(camera);
    scene2.render(gl, plane);
};
export const webgl = (gl: WebGLRenderingContext) => {
    setTimeout(() => {
        state.model = createModel();
        start(gl);
        document.querySelector('#hint')?.remove();
    });
};


const createModel = () => {
    const box0 = new Box({ color: 'rand' });
    const sub = 50;
    const spheres = new Array<Sphere>();
    for (let i = 0; i < 1; i++) {
        const s = new Sphere({ radius: 400, latitude: { sub }, longitude: { sub }, color: 'rand' });
        s.setModelMat(x => {
            mat4.translate(x, x, [0, 800, 0]);
        });
        spheres.push(s);
    }
    //const largeSphere = new Sphere({ radius: 1000, latitude: { sub:2500 }, longitude: { sub:2500 }, color: 'rand' }); // 1250w面

    for (let i = 0; i < 6; i++) {
        const box = new Sphere({ radius: 150 + 50 * Math.random(), color: 'rand' });
        const mat = mat4.create();
        box.pushMat(mat4.translate(mat, mat, [600 + 400 * i ** 1.4, 150, -100]));
        spheres[0].children.add(box);
    }
    const nsp = new Sphere({ radius: 50, color: 'rand' });

    const mat = mat4.create();
    nsp.pushMat(mat4.translate(mat, mat, [300, 0, 0]));
    nsp.pushMat(mat4.create());
    const tsp = Array.from(spheres[0].children)[3];
    tsp.children.add(nsp);

    const scene = new Scene(box0, ...spheres);
    const mesh = new Mesh({ is3d: true, range: 8000, num: 100 });
    const point = new Point(70, 30, 120);
    const scene2 = new Scene(mesh, point);
    return { scene, scene2, box0, spheres };
};
type modelType = ReturnType<typeof createModel>;
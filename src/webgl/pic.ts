import towa from './towa.jpg';
import { resize } from './tool';

let rorate = 0;
const render = (image: HTMLImageElement, gl: WebGLRenderingContext, program: WebGLProgram) => {
    resize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // look up where the vertex data needs to go.
    let positionLocation = gl.getAttribLocation(program, 'a_position');
    let texcoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    ((x: number, y: number, width: number, height: number) => {
        let x1 = x;
        let x2 = x + width;
        let y1 = y;
        let y2 = y + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
        ]), gl.STATIC_DRAW);
    })(0, 0, image.width, image.height);

    // provide texture coordinates for the rectangle.
    let texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
    ]), gl.STATIC_DRAW);


    // Create a texture.
    let texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);// 绑定texture，gl.TEXTURE0。只有一个时可以忽略
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // lookup uniforms


    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    rorate++;
    const angleInRadians = (rorate % 360) * Math.PI / 180;
    gl.uniform2fv(gl.getUniformLocation(program, 'u_rot'), [Math.sin(angleInRadians), Math.cos(angleInRadians)]);
    {
        // Turn on the position attribute
        gl.enableVertexAttribArray(positionLocation); // 状态机切换
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        let offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);
    }

    {
        // Turn on the teccord attribute
        gl.enableVertexAttribArray(texcoordLocation);
        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        let offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(texcoordLocation, size, type, normalize, stride, offset);
    }

    // set the resolution
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), gl.canvas.width, gl.canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_imgSize'), image.width, image.height);
    // Draw the rectangle.
    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = 4;
    gl.drawArrays(primitiveType, offset, count);

};



export const start = (gl: WebGLRenderingContext, shaderProgram: WebGLProgram) => {
    const img = new Image();
    img.src = towa;
    img.onload = () => {
        render(img, gl, shaderProgram);//setInterval(() => render(img, gl, shaderProgram), 10);
    };
};
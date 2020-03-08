import { vec3 } from 'gl-matrix';
import { baseMaterialType } from '../shader/general';
import { light } from './light';

export class DirectionalLight extends light {
    constructor(directional?: vec3) {
        super();
        this.directional = directional || vec3.fromValues(0, 1, 0);
    }

    public directional: vec3;

    static readonly varNameDirectional = 'u_lightDirectional';

    setLightParams(material: baseMaterialType, gl: WebGLRenderingContext) {
        const { directional } = this;
        const directLoc = material.getUnifLoc(DirectionalLight.varNameDirectional);
        gl.uniform3f(directLoc, directional[0], directional[1], directional[2]);
    }
}
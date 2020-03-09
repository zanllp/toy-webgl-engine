import { vec3 } from 'gl-matrix';
import { baseMaterialType } from '../shader/general';
import { light } from './light';
import { array2Vec3 } from '../mesh';

export class DirectionalLight extends light {
    constructor(directional?: vec3|Array<number>) {
        super();
        if (directional instanceof Array) {
            this.directional = array2Vec3(directional);
        } else {
            this.directional = directional || vec3.fromValues(0, 1, 0);
        }
    }

    public directional: vec3;

    static readonly varNameDirectional = 'u_lightDirectional';



    public static setLightParams(material: baseMaterialType, target: DirectionalLight[]) {
        const directional = new Array<number>();
        target.forEach(x => {
            directional.push(...Array.from(x.directional));
        });
        material.setUnif('u_lightDirectional', 'f', '3', directional);
    }
}
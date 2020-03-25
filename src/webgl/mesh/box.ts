import { Model } from './model';
import { colorType } from './type';
import { calcNormal, num2color, PosDataType, r2t } from './util';
import { CubeTexture, Texture2D } from '../texture';

export type cubeColorType = Partial<{
    front: colorType;
    back: colorType;
    right: colorType;
    left: colorType;
    top: colorType;
    bottom: colorType;
}> | number;
export type cubeTex2dType = Partial<{
    front: number[]; // 需要定义4个点的uv
    back: number[];
    right: number[];
    left: number[];
    top: number[];
    bottom: number[];
}> & { texture: Texture2D };

export class Box extends Model {
    public constructor({ x = 100, y = 100, z = 100, color, reverse = false, texture }: {
        x?: number; y?: number; z?: number; color?: 'rand' | cubeColorType; reverse?: boolean, texture?: CubeTexture | cubeTex2dType
    } = {}) {
        if (color) {
            if (texture) {
                if (texture instanceof CubeTexture) {
                    throw new RangeError('不允许同时定义立方体纹理和颜色');
                }
                const array = [...Object.keys(texture), ...Object.keys(color)];
                if (array.length !== 7) {
                    throw new RangeError('定义纹理数量或颜色不对，两者应为互补');
                }
                if (new Set(array).size !== array.length) {
                    throw new RangeError('不允许同时定义同一面的纹理和颜色');
                }
            } else {
                if (typeof color === 'object' && Object.keys(color).length !== 6) {
                    throw new RangeError('定义颜色数量不完整');
                }
            }

        }
        if (texture instanceof CubeTexture && !(x === y && x === z)) {
            throw new RangeError('使用立方体纹理时xyz必须相等');
        }


        const str = JSON.stringify({ x, y, z, reverse });
        const memo = Box.memoPos.get(str);
        if (memo) {
            super(memo.pos, [x, y, z], memo.normal);
        } else {
            const e = (x: Array<number>) => r2t(x, reverse);
            const pos = [
                // front
                e([x, y, z,
                    0, y, z,
                    0, 0, z,
                    x, 0, z,]),
                e([x, y, 0,
                    x, 0, 0,
                    0, 0, 0,
                    0, y, 0,]),
                // right
                e([x, y, z,
                    x, 0, z,
                    x, 0, 0,
                    x, y, 0]),
                //left
                e([0, y, z,
                    0, y, 0,
                    0, 0, 0,
                    0, 0, z,]),
                //top
                e([x, y, 0,
                    0, y, 0,
                    0, y, z,
                    x, y, z,]),
                //bottom
                e([0, 0, 0,
                    x, 0, 0,
                    x, 0, z,
                    0, 0, z,]),
            ];
            const normal = calcNormal(pos);
            super(pos, [x, y, z], normal);
            Box.memoPos.set(str, { pos, normal });
        }

        if (color === 'rand') {
            this.fillRandColor();
        } else if (typeof color === 'object' || typeof color === 'number') {
            this.fillColor(color);
        }

        if (texture) {
            this.texture = texture;
        }

        this.type = 'Box';
    }

    public readonly texture?: CubeTexture | cubeTex2dType;


    static memoPos = new Map<string, { pos: PosDataType, normal: Array<number> }>();

    public fillColor(color: cubeColorType) {
        if (typeof color === 'object') {
            const { front, back, right, left, top, bottom } = color;
            this.color = [front, back, right, left, top, bottom].map(color => {
                let c: Array<number>;
                if (color instanceof Array) {
                    c = color;
                } else {
                    c = num2color(color!);
                }
                c = c.map(c => c / 255);
                return [c, c, c, c, c, c];
            }).flat(2);
        } else {
            const vec3C = num2color(color);
            this.fillColor({
                front: vec3C,
                back: vec3C,
                right: vec3C,
                left: vec3C,
                top: vec3C,
                bottom: vec3C
            });
        }

    }
}

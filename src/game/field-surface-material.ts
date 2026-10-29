import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import type { Scene } from '@babylonjs/core/scene';

/** V2 terrain only: one blend owner, hardware-filtered tiles at physical metre scales. */
export class FieldSurfaceMaterial extends MaterialPluginBase {
  readonly ready: Promise<void>;
  private readonly grass: Texture;
  private readonly stone: Texture;
  private readonly earth: Texture;

  constructor(material: StandardMaterial, private readonly mask: BaseTexture, scene: Scene, private readonly inhabited = false) {
    super(material, 'ChickenCivFieldSurfaces', 200, {}, true, true);
    const load = (path: string) => {
      let texture!: Texture;
      const ready = new Promise<void>((resolve, reject) => {
        texture = new Texture(path, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE,
          () => resolve(), message => reject(new Error(message ?? `Could not load ${path}`)));
      });
      texture.anisotropicFilteringLevel = 8;
      return { texture, ready };
    };
    const grass = load('/assets/materials/meadow-turf-v1.jpg');
    const stone = load('/assets/materials/weathered-stone-v1.jpg');
    const earth = load('/assets/materials/ground-albedo.jpg');
    this.earth = earth.texture;
    this.grass = grass.texture;
    this.stone = stone.texture;
    this.ready = Promise.all([grass.ready, stone.ready, earth.ready]).then(() => undefined);
  }
  override isCompatible(language: ShaderLanguage) { return language === ShaderLanguage.GLSL; }
  override isReadyForSubMesh() { return this.mask.isReady() && this.grass.isReady() && this.stone.isReady() && this.earth.isReady(); }
  override getSamplers(samplers: string[]) { samplers.push('ccSurfaceMask', 'ccMeadowTile', 'ccStoneTile', 'ccEarthTile'); }
  override bindForSubMesh(buffer: UniformBuffer) {
    buffer.setTexture('ccSurfaceMask', this.mask);
    buffer.setTexture('ccMeadowTile', this.grass);
    buffer.setTexture('ccStoneTile', this.stone);
    buffer.setTexture('ccEarthTile', this.earth);
  }
  override getActiveTextures(textures: BaseTexture[]) { textures.push(this.mask, this.grass, this.stone, this.earth); }
  override hasTexture(texture: BaseTexture) { return [this.mask, this.grass, this.stone, this.earth].includes(texture); }
  override getCustomCode(type: string) {
    if (type !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
        uniform sampler2D ccSurfaceMask;
        uniform sampler2D ccMeadowTile;
        uniform sampler2D ccStoneTile;
        uniform sampler2D ccEarthTile;
      `,
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
        vec4 ccMask = texture2D(ccSurfaceMask, vPositionW.xz / 64.0 + 0.5);
        vec2 ccWeights = ccMask.rg;
        vec3 ccGrass = texture2D(ccMeadowTile, vPositionW.xz / 2.8).rgb
                     * mix(vec3(0.95, 0.98, 0.95), vec3(1.07, 1.02, 0.95), ccMask.b);
        ${this.inhabited ? `float ccLuma=dot(ccGrass,vec3(.299,.587,.114));
        ccGrass=mix(vec3(ccLuma),ccGrass,.90);
        ccGrass=mix(ccGrass, mix(vec3(.63,.59,.36),vec3(.28,.44,.31),ccMask.b),.22);` : ""}
        vec3 ccEarth = texture2D(ccEarthTile, vPositionW.xz / 3.7).rgb * vec3(0.85, 0.86, 0.82);
        baseColor.rgb = mix(baseColor.rgb, ccEarth, ccMask.a * ${this.inhabited ? "0.36" : "0.8"});
        vec3 ccAxes = pow(abs(normalW), vec3(4.0));
        ccAxes /= max(dot(ccAxes, vec3(1.0)), 0.001);
        vec3 ccRock = texture2D(ccStoneTile, vPositionW.zy / 3.0).rgb * ccAxes.x
                    + texture2D(ccStoneTile, vPositionW.xz / 3.0).rgb * ccAxes.y
                    + texture2D(ccStoneTile, vPositionW.xy / 3.0).rgb * ccAxes.z;
        ${this.inhabited ? "ccRock=mix(ccRock,vec3(.54,.55,.48),.22)*1.05;" : ""}
        baseColor.rgb = baseColor.rgb * max(0.0, 1.0 - ccWeights.r - ccWeights.g)
                      + ccGrass * ccWeights.r + ccRock * ccWeights.g;
      `,
      // Restrained local mineral bounce keeps shaded rock readable. It follows
      // the continuous rock mask, never brightens grass/court or legacy worlds.
      CUSTOM_FRAGMENT_BEFORE_FOG: this.inhabited ? `color.rgb += baseColor.rgb * ccMask.g * vec3(.14,.17,.16);` : "",
    };
  }
}

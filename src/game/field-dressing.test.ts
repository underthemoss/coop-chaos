import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapDefinition } from '../content/maps';

const mock = vi.hoisted(() => ({ load: vi.fn(), textureDispose: vi.fn() }));
vi.mock('@babylonjs/core/Loading/sceneLoader', () => ({ ImportMeshAsync: mock.load }));
vi.mock('@babylonjs/core/Materials/Textures/texture', () => ({
  Texture: class { dispose = mock.textureDispose; },
}));
import { dressFieldValley } from './field-dressing';

describe('field dressing attempt ownership', () => {
  beforeEach(()=>vi.clearAllMocks());
  it('disposes zero-placement sources instead of rendering ordinary meshes at the origin',async()=>{
    const meshes:{setEnabled:ReturnType<typeof vi.fn>;dispose:ReturnType<typeof vi.fn>}[]=[];
    mock.load.mockImplementation(async()=>{
      const mesh={setEnabled:vi.fn(),dispose:vi.fn()};meshes.push(mesh);
      return {meshes:[mesh],animationGroups:[]};
    });
    const map={id:'inhabited-valley',width:2,depth:2,terrain:{seed:1,rocks:[]}} as unknown as MapDefinition;
    const shadows={addShadowCaster:vi.fn()};
    await dressFieldValley(map,{isDisposed:false} as never,shadows as never);
    expect(meshes).toHaveLength(9);
    for(const mesh of meshes) {
      expect(mesh.setEnabled).toHaveBeenCalledExactlyOnceWith(false);
      expect(mesh.dispose).toHaveBeenCalledExactlyOnceWith(false,true);
    }
    expect(shadows.addShadowCaster).not.toHaveBeenCalled();
  });
  it('waits for late siblings and disposes all imported resources before rejecting', async () => {
    const meshes: { setEnabled: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = [];
    const groups: { dispose: ReturnType<typeof vi.fn> }[] = [];
    let finishLate!: () => void;
    const late = new Promise<void>(resolve => { finishLate = resolve; });
    mock.load.mockImplementation(async (url: string) => {
      if (url.includes('grove-shrub')) throw new Error('late shrub unavailable');
      if (url.includes('cattails')) await late;
      const mesh = { setEnabled: vi.fn(), dispose: vi.fn() }, group = { dispose: vi.fn() };
      meshes.push(mesh); groups.push(group);
      return { meshes: [mesh], animationGroups: [group] };
    });
    const map = { id: 'inhabited-valley', width: 2, depth: 2, terrain: { seed: 1, rocks: [] } } as unknown as MapDefinition;
    const attempt = dressFieldValley(map, { isDisposed: false } as never, {} as never);
    const rejection = expect(attempt).rejects.toThrow('late shrub unavailable');
    await Promise.resolve(); await Promise.resolve();
    expect(mock.textureDispose).not.toHaveBeenCalled();
    finishLate();
    await rejection;
    expect(meshes).toHaveLength(8);
    for (const mesh of meshes) {
      expect(mesh.setEnabled).toHaveBeenCalledExactlyOnceWith(false);
      expect(mesh.dispose).toHaveBeenCalledExactlyOnceWith(false, true);
    }
    for (const group of groups) expect(group.dispose).toHaveBeenCalledOnce();
    expect(mock.textureDispose).toHaveBeenCalledOnce();
  });
});

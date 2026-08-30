import type Phaser from 'phaser';
import { SoundEffects } from '../core/audio';

const controllers = new WeakMap<object, SoundEffects>();

/** One controller per game, shared across scene transitions. Phaser unlocks audio on touch. */
export function audioFor(scene: Phaser.Scene): SoundEffects {
  let audio = controllers.get(scene.sound);
  if (!audio) {
    const manager = scene.sound;
    const cache = scene.cache.audio;
    audio = new SoundEffects({
      play(key) {
        const id = `sfx_${key}`;
        if (manager.locked || !cache.exists(id) || manager.getAllPlaying().length >= 8) return false;
        return manager.play(id, { volume: 0.38 });
      },
      // manager.play auto-destroys on COMPLETE, but STOP never completes.
      // Destroy interrupted one-shots too, so pausing/muting cannot retain audio nodes.
      stopAll: () => manager.removeAll(),
    });
    controllers.set(manager, audio);
  }
  return audio;
}

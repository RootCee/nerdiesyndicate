// Authorized RootCee files are intentionally not bundled. Install them under
// assets/music/rootcee/ and add entries to ROOTS_TRACKS. Empty sources keep the
// venue silent while preserving playlists, transitions, volume, and event hooks.
export const ROOTS_TRACKS = Object.freeze([
  Object.freeze({ id: 'rootcee-track-01', title: 'Official RootCee Track 01', artist: 'RootCee', src: null }),
  Object.freeze({ id: 'rootcee-track-02', title: 'Official RootCee Track 02', artist: 'RootCee', src: null }),
]);
export const ROOTS_PLAYLISTS = Object.freeze({ regular: ROOTS_TRACKS.map((t) => t.id), event: [] });

export class RootsAudio {
  constructor({ tracks = ROOTS_TRACKS, volume = 0.55, transitionSeconds = 1.5 } = {}) {
    this.tracks = new Map(tracks.map((t) => [t.id, t])); this.playlist = [...ROOTS_PLAYLISTS.regular]; this.index = 0;
    this.volume = Math.max(0, Math.min(1, volume)); this.transitionSeconds = transitionSeconds; this.active = false; this.unlocked = false; this.audio = null; this.eventPlaylist = null;
  }
  setVolume(value) { this.volume = Math.max(0, Math.min(1, Number(value) || 0)); if (this.audio) this.audio.volume = this.volume; return this.volume; }
  setPlaylist(ids) { this.playlist = ids.filter((id) => this.tracks.has(id)); this.index = 0; if (this.active) this.playCurrent(); }
  scheduleEvent(ids) { this.eventPlaylist = ids.filter((id) => this.tracks.has(id)); }
  clearEvent() { this.eventPlaylist = null; }
  unlock() { this.unlocked = true; if (this.active) this.playCurrent(); }
  enter() { this.active = true; if (this.unlocked) this.playCurrent(); }
  exit() { this.active = false; if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; } }
  current() { const list = this.eventPlaylist?.length ? this.eventPlaylist : this.playlist; return this.tracks.get(list[this.index % Math.max(1, list.length)]) || null; }
  next() { const list = this.eventPlaylist?.length ? this.eventPlaylist : this.playlist; this.index = list.length ? (this.index + 1) % list.length : 0; return this.playCurrent(); }
  playCurrent() {
    const track = this.current(); if (!this.active || !this.unlocked || !track?.src || typeof Audio === 'undefined') return { playing: false, placeholder: true, track };
    if (this.audio?.dataset.track === track.id) return { playing: !this.audio.paused, track };
    const prior = this.audio, audio = new Audio(track.src); audio.dataset.track = track.id; audio.preload = 'metadata'; audio.loop = false; audio.volume = prior ? 0 : this.volume; audio.addEventListener('ended', () => this.next()); this.audio = audio;
    audio.play().catch(() => {});
    if (prior) { const started = performance.now(), duration = Math.max(100, this.transitionSeconds * 1000); const fade = (now) => { const k = Math.min(1, (now - started) / duration); prior.volume = this.volume * (1 - k); audio.volume = this.volume * k; if (k < 1) requestAnimationFrame(fade); else { prior.pause(); prior.src = ''; } }; requestAnimationFrame(fade); }
    return { playing: true, track };
  }
}

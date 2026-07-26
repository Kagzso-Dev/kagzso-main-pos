// ── Simple bell — Waiter dashboard (legacy, keep for backward compat) ─────────
export const playBellSound = (times = 1, volume = 1) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
        resume.then(() => {
            const ring = (offsetSec) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime + offsetSec);
                osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + offsetSec + 0.6);
                gain.gain.setValueAtTime(0.001, ctx.currentTime + offsetSec);
                gain.gain.exponentialRampToValueAtTime(0.8 * Math.max(0, Math.min(1, volume)), ctx.currentTime + offsetSec + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offsetSec + 1.2);
                osc.start(ctx.currentTime + offsetSec);
                osc.stop(ctx.currentTime + offsetSec + 1.3);
            };
            for (let i = 0; i < times; i++) ring(i * 1.4);
            setTimeout(() => ctx.close(), times * 1400 + 200);
        });
    } catch (e) {}
};

// ── Short single "ting" — used by all non-kitchen pages ──────────────────────
export const playTingSound = (volume = 1) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
        resume.then(() => {
            const vol = Math.max(0, Math.min(1, volume));
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.65 * vol, ctx.currentTime + 0.003);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
            setTimeout(() => ctx.close(), 700);
        });
    } catch (e) {}
};

// ── Temple bell — used by Kitchen dashboard only ──────────────────────────────
// Inharmonic partials from physical bell acoustics give the authentic resonance.
export const playTempleBellSound = (times = 1, volume = 1) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
        resume.then(() => {
            const vol = Math.max(0, Math.min(1, volume));
            const ring = (offsetSec) => {
                const fundamental = 520;
                const partials = [
                    { ratio: 1.000, gain: 0.80, decay: 5.0 },
                    { ratio: 2.756, gain: 0.50, decay: 4.0 },
                    { ratio: 5.404, gain: 0.30, decay: 3.0 },
                    { ratio: 8.933, gain: 0.15, decay: 2.0 },
                    { ratio: 13.35, gain: 0.08, decay: 1.2 },
                ];
                const compressor = ctx.createDynamicsCompressor();
                compressor.threshold.value = -18;
                compressor.knee.value = 6;
                compressor.ratio.value = 3;
                compressor.attack.value = 0.003;
                compressor.release.value = 0.25;
                compressor.connect(ctx.destination);
                const master = ctx.createGain();
                master.gain.value = 0.55 * vol;
                master.connect(compressor);
                partials.forEach(({ ratio, gain, decay }) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.connect(g);
                    g.connect(master);
                    osc.type = 'sine';
                    osc.frequency.value = fundamental * ratio;
                    const t0 = ctx.currentTime + offsetSec;
                    g.gain.setValueAtTime(0.0001, t0);
                    g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
                    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
                    osc.start(t0);
                    osc.stop(t0 + decay + 0.05);
                });
            };
            const gap = 2.8;
            for (let i = 0; i < times; i++) ring(i * gap);
            setTimeout(() => ctx.close(), times * gap * 1000 + 600);
        });
    } catch (e) {}
};

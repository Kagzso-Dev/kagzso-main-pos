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

// ── Sound catalogs for Admin Settings ─────────────────────────────────────────
export const KITCHEN_SOUNDS = [
    { id: 'chime',   value: 'chime',   label: 'Two-Tone Kitchen Chime' },
    { id: 'classic', value: 'classic', label: 'Classic Double Bell' },
    { id: 'ding',    value: 'ding',    label: 'Service Counter Ding' },
    { id: 'buzzer',  value: 'buzzer',  label: 'Rapid Alert Beep' },
];

export const WAITER_SOUNDS = [
    { id: 'ting',        value: 'ting',        label: 'Classic Ting' },
    { id: 'double-ting', value: 'double-ting', label: 'Double Ting' },
    { id: 'chime',       value: 'chime',       label: 'Soft Two-Note Chime' },
    { id: 'bell',        value: 'bell',        label: 'Service Bell' },
    { id: 'pop',         value: 'pop',         label: 'Crisp Notification Pop' },
];

// ── Configurable Kitchen Sound Player ─────────────────────────────────────────
export const playKitchenSound = (type, volume = 0.8) => {
    let resolvedType = type;
    if (!resolvedType || resolvedType === 'temple') {
        try {
            const cached = JSON.parse(localStorage.getItem('pos_sound_config') || 'null');
            if (cached?.kitchenSound && cached.kitchenSound !== 'temple') {
                resolvedType = cached.kitchenSound;
            }
        } catch {}
    }
    const vol = Math.max(0, Math.min(1, volume ?? 0.8));
    switch (resolvedType) {
        case 'classic':
            playBellSound(2, vol);
            break;
        case 'chime':
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
                resume.then(() => {
                    const notes = [
                        { freq: 659.25, start: 0,    dur: 0.45 },
                        { freq: 523.25, start: 0.35, dur: 0.75 },
                        { freq: 659.25, start: 1.25, dur: 0.45 },
                        { freq: 523.25, start: 1.60, dur: 0.75 },
                    ];
                    notes.forEach(({ freq, start, dur }) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = 'triangle';
                        const t0 = ctx.currentTime + start;
                        osc.frequency.setValueAtTime(freq, t0);
                        gain.gain.setValueAtTime(0.0001, t0);
                        gain.gain.linearRampToValueAtTime(0.75 * vol, t0 + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
                        osc.start(t0);
                        osc.stop(t0 + dur + 0.05);
                    });
                    setTimeout(() => ctx.close(), 2600);
                });
            } catch (e) {}
            break;
        case 'ding':
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
                resume.then(() => {
                    [0, 0.9].forEach((offset) => {
                        [1046.5, 2093].forEach((freq, idx) => {
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.type = 'sine';
                            const t0 = ctx.currentTime + offset;
                            osc.frequency.setValueAtTime(freq, t0);
                            gain.gain.setValueAtTime(0.0001, t0);
                            gain.gain.linearRampToValueAtTime((idx === 0 ? 0.7 : 0.25) * vol, t0 + 0.004);
                            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
                            osc.start(t0);
                            osc.stop(t0 + 0.85);
                        });
                    });
                    setTimeout(() => ctx.close(), 2000);
                });
            } catch (e) {}
            break;
        case 'buzzer':
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
                resume.then(() => {
                    [0, 0.22, 0.44].forEach((offset) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = 'square';
                        const t0 = ctx.currentTime + offset;
                        osc.frequency.setValueAtTime(880, t0);
                        gain.gain.setValueAtTime(0.0001, t0);
                        gain.gain.linearRampToValueAtTime(0.35 * vol, t0 + 0.005);
                        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
                        osc.start(t0);
                        osc.stop(t0 + 0.18);
                    });
                    setTimeout(() => ctx.close(), 900);
                });
            } catch (e) {}
            break;
        default:
            // Default to Two-Tone Kitchen Chime if no valid type is stored yet (never Temple Bell)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
                resume.then(() => {
                    const notes = [
                        { freq: 659.25, start: 0,    dur: 0.45 },
                        { freq: 523.25, start: 0.35, dur: 0.75 },
                        { freq: 659.25, start: 1.25, dur: 0.45 },
                        { freq: 523.25, start: 1.60, dur: 0.75 },
                    ];
                    notes.forEach(({ freq, start, dur }) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = 'triangle';
                        const t0 = ctx.currentTime + start;
                        osc.frequency.setValueAtTime(freq, t0);
                        gain.gain.setValueAtTime(0.0001, t0);
                        gain.gain.linearRampToValueAtTime(0.75 * vol, t0 + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
                        osc.start(t0);
                        osc.stop(t0 + dur + 0.05);
                    });
                    setTimeout(() => ctx.close(), 2600);
                });
            } catch (e) {}
            break;
    }
};

// ── Configurable Waiter Sound Player ──────────────────────────────────────────
export const playWaiterSound = (type, volume = 0.6) => {
    let resolvedType = type;
    if (!resolvedType) {
        try {
            const cached = JSON.parse(localStorage.getItem('pos_sound_config') || 'null');
            if (cached?.waiterSound) resolvedType = cached.waiterSound;
        } catch {}
    }
    const vol = Math.max(0, Math.min(1, volume ?? 0.6));
    switch (resolvedType) {
        case 'double-ting':
            playTingSound(vol);
            setTimeout(() => playTingSound(vol), 180);
            break;
        case 'chime':
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
                resume.then(() => {
                    [
                        { freq: 880,  start: 0,    dur: 0.25 },
                        { freq: 1318.5, start: 0.16, dur: 0.45 },
                    ].forEach(({ freq, start, dur }) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = 'sine';
                        const t0 = ctx.currentTime + start;
                        osc.frequency.setValueAtTime(freq, t0);
                        gain.gain.setValueAtTime(0.0001, t0);
                        gain.gain.linearRampToValueAtTime(0.6 * vol, t0 + 0.005);
                        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
                        osc.start(t0);
                        osc.stop(t0 + dur + 0.04);
                    });
                    setTimeout(() => ctx.close(), 800);
                });
            } catch (e) {}
            break;
        case 'bell':
            playBellSound(1, vol);
            break;
        case 'pop':
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
                resume.then(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(520, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1480, ctx.currentTime + 0.12);
                    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.65 * vol, ctx.currentTime + 0.005);
                    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.22);
                    setTimeout(() => ctx.close(), 400);
                });
            } catch (e) {}
            break;
        case 'ting':
        default:
            playTingSound(vol);
            break;
    }
};

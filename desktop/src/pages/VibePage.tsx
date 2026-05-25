import { useEffect, useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { usePlayerStore } from '../stores/player';

import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { MyScIcon } from '../lib/icons';

import { tickVibeLikeFlash } from '../lib/vibe-like-flash';
import { playRandomVibeTrack, prevVibeTrack, skipVibeTrack } from '../lib/vibe-playlist';

import { useVibeAnalyser } from './useVibeAnalyser';



const VERTEX = `

  attribute vec2 a_position;

  void main() {

    gl_Position = vec4(a_position, 0.0, 1.0);

  }

`;



const FRAGMENT = `

  precision highp float;

  uniform vec2 u_resolution;

  uniform float u_time;

  uniform float u_pulse;

  uniform float u_bass;

  uniform float u_energy;

  uniform float u_speed;

  uniform float u_rayGain;
  uniform float u_rhythm;
  uniform float u_likeFlash;

  uniform vec3 u_colCore;

  uniform vec3 u_colBody;

  uniform vec3 u_colRay;



  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }



  float noise(vec2 p) {

    vec2 i = floor(p);

    vec2 f = fract(p);

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(

      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),

      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),

      u.y

    );

  }



  float fbm(vec2 p) {

      float v = 0.0;

      v += noise(p) * 0.5000;

      v += noise(p * 2.0) * 0.2500;

      v += noise(p * 4.0) * 0.1250;

      return v;

  }

  float blob(vec2 p, vec2 c, vec2 s, float a) {
    vec2 q = p - c;
    q /= s;
    return a * exp(-dot(q, q));
  }

  float rblob(vec2 p, vec2 c, vec2 s, float a, float r) {
    vec2 q = p - c;
    float cs = cos(r);
    float sn = sin(r);
    q = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y);
    q /= s;
    return a * exp(-dot(q, q));
  }



  void main() {

    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    float t = u_time * 0.32;



    vec2 p = uv;



    float dist = length(p);

    float angle = atan(p.y, p.x);



    float beat = u_pulse;
    float rhythm = u_rhythm;
    float energy = u_energy;
    float motion = t * 1.7;
    vec2 drift = vec2(sin(motion * 0.73), cos(motion * 0.61)) * 0.005;
    vec2 q = p * 0.68 - drift;
    float qDist = length(q);
    float qAngle = atan(q.y, q.x);
    vec2 qDir = q / max(qDist, 0.001);
    float a = motion * 0.72;
    float morphA = 0.5 + 0.5 * sin(motion * 1.55 + sin(motion * 2.1) * 0.8);
    float morphB = 0.5 + 0.5 * sin(motion * 1.22 + 1.7 + sin(motion * 1.8) * 0.7);
    float morphC = 0.5 + 0.5 * sin(motion * 1.86 - 0.6 + cos(motion * 2.35) * 0.65);
    float magA = smoothstep(0.12, 0.9, 0.5 + 0.5 * sin(motion * 0.58 + 0.4));
    float magB = smoothstep(0.1, 0.88, 0.5 + 0.5 * sin(motion * 0.63 + 2.2));
    float magC = smoothstep(0.08, 0.9, 0.5 + 0.5 * sin(motion * 0.52 + 4.0));
    vec2 c0 = vec2(0.0, 0.0);
    vec2 c1 = vec2(0.9, 0.18) * mix(0.25, 0.1 + energy * 0.018, magA) + vec2(sin(motion * 2.45) * 0.028, sin(motion * 1.7) * 0.04);
    vec2 c2 = vec2(-0.32, 0.95) * mix(0.275, 0.12 + rhythm * 0.022, magB) + vec2(cos(motion * 1.2) * 0.04, sin(motion * 2.0) * 0.024);
    vec2 c3 = vec2(-0.82, -0.38) * mix(0.255, 0.11, magC) + vec2(sin(motion * 1.9) * 0.026, cos(motion * 1.45) * 0.04);
    vec2 c4 = vec2(0.28, -0.95) * (0.125 + morphB * 0.072) + vec2(sin(motion * 1.1) * 0.04, cos(motion * 2.15) * 0.025);
    vec2 c5 = vec2(-0.96, 0.1) * (0.105 + morphA * 0.064) + vec2(cos(motion * 2.05) * 0.024, sin(motion * 1.32 + 0.4) * 0.038);
    vec2 c6 = vec2(0.64, -0.62) * (0.142 + morphC * 0.072) + vec2(cos(motion * 1.58) * 0.038, sin(motion * 2.32) * 0.022);
    float field =
      rblob(q, c0, vec2(0.188 + energy * 0.018 + morphA * 0.05, 0.15 + rhythm * 0.014 + morphB * 0.046), 1.15, 0.08 * sin(motion * 0.5)) +
      rblob(q, c1, vec2(0.104 + morphB * 0.032, 0.06 + morphC * 0.02), mix(0.42, 0.9, magA), 0.42) +
      rblob(q, c2, vec2(0.07 + morphA * 0.024, 0.126 + morphC * 0.034), mix(0.4, 0.88, magB), -0.34) +
      rblob(q, c3, vec2(0.12 + morphC * 0.034, 0.066 + morphA * 0.024), mix(0.38, 0.82, magC), 0.62) +
      rblob(q, c4, vec2(0.074 + morphB * 0.028, 0.098 + morphA * 0.034), 0.62, -0.52) +
      rblob(q, c5, vec2(0.062 + morphC * 0.022, 0.078 + morphB * 0.028), 0.52, 0.72) +
      rblob(q, c6, vec2(0.096 + morphA * 0.032, 0.05 + morphC * 0.024), 0.54, -0.74);
    float noisyEdge = (fbm(vec2(qDir.x * 4.2 + qDir.y * 2.6 + motion * 1.55, qDist * 3.2 - motion * 1.2)) * 0.62 + fbm(vec2(qDir.y * 5.8 - qDir.x * 3.2 - motion * 1.8, qDist * 5.4 + motion)) * 0.38) * 0.46;
    float surface = field + noisyEdge - qDist * 0.22;
    float bodyMask = smoothstep(0.76, 1.05, surface);
    float aura = smoothstep(0.12, 0.7, surface);
    float shell = exp(-abs(surface - 0.9) * 2.7) * smoothstep(0.24, 0.95, surface);
    float sideFade = 1.0 - smoothstep(0.16, 0.46, abs(q.x));
    float beatLight = beat * (0.7 + sideFade * 0.45);
    float core = exp(-qDist * 18.0) * (0.14 + beatLight * 0.22);
    float rayNoise = fbm(vec2(qDir.x * 4.8 + qDir.y * 2.7 + motion * 1.0, qDir.y * 3.5 - qDir.x * 1.8 + motion * 0.42));
    float raySpike = pow(max(0.0, rayNoise - 0.4), 2.4);
    float dirA = atan(c2.y, c2.x);
    float dirB = atan(c3.y, c3.x);
    float dirC = atan(c4.y, c4.x);
    float thinNeedles =
      pow(max(0.0, cos(qAngle - dirA)), 72.0) * 0.72 +
      pow(max(0.0, cos(qAngle - dirB)), 64.0) * 0.62 +
      pow(max(0.0, cos(qAngle - dirC)), 58.0) * 0.48 +
      pow(max(0.0, cos(qAngle + dirA * 0.7)), 78.0) * 0.34;
    float softNeedles =
      pow(max(0.0, cos(qAngle - dirA)), 18.0) * 0.45 +
      pow(max(0.0, cos(qAngle - dirB)), 16.0) * 0.34 +
      pow(max(0.0, cos(qAngle - dirC)), 15.0) * 0.28;
    float rayGate = smoothstep(0.105, 0.165, qDist);
    float rayFade = exp(-max(0.0, qDist - 0.12) * (7.2 - energy * 0.8));
    float rayGlowFade = exp(-max(0.0, qDist - 0.1) * (4.4 - energy * 0.45));
    float fieldGlow = pow(max(0.0, surface), 1.1) * exp(-qDist * (3.4 - energy * 0.1));
    float rayLine = (raySpike * 0.22 + thinNeedles) * rayGate * rayFade;
    float rayGlow = (raySpike * 0.28 + softNeedles) * rayGate * rayGlowFade;
    float wormT = motion * 2.15;
    float wormPhaseA = fract(wormT * 0.09);
    float wormPhaseB = fract(wormT * 0.075 + 0.48);
    float wormLifeA = smoothstep(0.08, 0.28, wormPhaseA) * (1.0 - smoothstep(0.68, 0.95, wormPhaseA));
    float wormLifeB = smoothstep(0.12, 0.34, wormPhaseB) * (1.0 - smoothstep(0.72, 0.96, wormPhaseB));
    float wallA = mix(-0.24, 0.04, wormLifeA);
    float wallB = mix(0.22, -0.03, wormLifeB);
    float curve1 = wallA + sin(q.y * 8.0 + wormT * 1.2) * 0.056 + sin(q.y * 15.0 - wormT * 0.85) * 0.024;
    float curve2 = wallB + cos(q.x * 7.5 - wormT) * 0.052 + sin(q.x * 12.0 + wormT * 0.68) * 0.018;
    float ribbon =
      exp(-abs(q.x - curve1) * 38.0) * smoothstep(0.23, 0.02, abs(q.y)) * wormLifeA +
      exp(-abs(q.y - curve2) * 36.0) * smoothstep(0.22, 0.02, abs(q.x)) * wormLifeB;
    ribbon *= bodyMask;



    vec3 col = u_colBody * aura * 0.045;

    float flash = u_likeFlash;
    vec3 likeA = vec3(0.42, 0.72, 0.95);
    vec3 likeB = vec3(0.62, 0.88, 1.0);
    vec3 wormCol = vec3(1.0, 0.78, 0.96);

    vec3 rayCol = mix(u_colRay, likeA, flash * 0.42);
    col += rayCol * rayGlow * u_rayGain * (0.24 + rhythm * 0.08 + flash * 0.08);
    col += rayCol * rayLine * u_rayGain * (0.44 + rhythm * 0.14 + flash * 0.12);

    vec3 coreCol = mix(u_colCore, likeB, flash * 0.55);
    col += rayCol * shell * (0.34 + rhythm * 0.1);
    col += rayCol * fieldGlow * (0.035 + rhythm * 0.018);
    col += coreCol * core;
    col += rayCol * shell * beatLight * 0.22;
    col += wormCol * ribbon * (0.92 + beatLight * 0.05);

    col += u_colBody * exp(-qDist * 5.8) * 0.035;

    col = pow(col, vec3(0.8));

    gl_FragColor = vec4(col, 1.0);

  }

`;



const COLOR_THEMES = [

  { body: 'rgba(255,24,64,0.55)', ray: 'rgba(255,50,90,0.5)', rayCore: 'rgba(255,100,140,0.75)' },

  { body: 'rgba(255,110,24,0.52)', ray: 'rgba(255,120,32,0.48)', rayCore: 'rgba(255,170,60,0.72)' },

  { body: 'rgba(255,220,24,0.55)', ray: 'rgba(255,200,50,0.5)', rayCore: 'rgba(255,240,100,0.75)' },

  { body: 'rgba(24,200,255,0.55)', ray: 'rgba(50,180,255,0.5)', rayCore: 'rgba(100,220,255,0.75)' },

  { body: 'rgba(24,64,255,0.55)', ray: 'rgba(50,90,255,0.5)', rayCore: 'rgba(100,140,255,0.75)' },

  { body: 'rgba(160,80,255,0.5)', ray: 'rgba(170,90,255,0.45)', rayCore: 'rgba(200,140,255,0.7)' },

];



const TRACKS_PER_COLOR = 5;



function rgbaToRgb(str: string) {

  const m = str.match(/[\d.]+/g);

  if (!m) return [1, 0, 0];

  return [+m[0] / 255, +m[1] / 255, +m[2] / 255];

}



function compile(gl: WebGLRenderingContext, type: number, src: string) {

  const sh = gl.createShader(type);

  if (!sh) return null;

  gl.shaderSource(sh, src);

  gl.compileShader(sh);

  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {

    console.error(gl.getShaderInfoLog(sh));

    return null;

  }

  return sh;

}

export function VibePage() {

  const { t } = useTranslation();

  const { isPlaying, togglePlay } = usePlayerStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rafRef = useRef(0);

  const startedRef = useRef(false);



  const [colorIdx, setColorIdx] = useState(0);

  const theme = COLOR_THEMES[colorIdx];



  const smoothPulse = useRef(0);

  const smoothRhythm = useRef(0.12);

  const smoothEnergy = useRef(0.1);

  const timeAccum = useRef(0);

  const likeFlash = useRef(0);

  const trackCountRef = useRef(0);

  const lastUrnRef = useRef<string | null>(null);

  const themeRef = useRef(theme);



  themeRef.current = theme;



  const { getBeat } = useVibeAnalyser();

  const currentTrack = usePlayerStore((s) => s.currentTrack);



  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const state = usePlayerStore.getState();
    if (state.playbackContext?.kind === 'vibe' && state.currentTrack) return;
    playRandomVibeTrack().catch(console.error);
  }, []);



  useEffect(() => {

    if (!currentTrack?.urn) return;

    if (currentTrack.urn === lastUrnRef.current) return;

    lastUrnRef.current = currentTrack.urn;

    trackCountRef.current += 1;

    const idx = Math.floor((trackCountRef.current - 1) / TRACKS_PER_COLOR) % COLOR_THEMES.length;

    setColorIdx(idx);

  }, [currentTrack?.urn]);



  useEffect(() => {

    const canvas = canvasRef.current;

    if (!canvas) return;



    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });

    if (!gl) return;



    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);

    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);

    if (!vs || !fs) return;



    const program = gl.createProgram();

    if (!program) return;

    gl.attachShader(program, vs);

    gl.attachShader(program, fs);

    gl.linkProgram(program);



    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);



    const pos = gl.getAttribLocation(program, 'a_position');

    gl.enableVertexAttribArray(pos);

    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);



    const u = {

      res: gl.getUniformLocation(program, 'u_resolution'),

      time: gl.getUniformLocation(program, 'u_time'),

      pulse: gl.getUniformLocation(program, 'u_pulse'),

      bass: gl.getUniformLocation(program, 'u_bass'),

      energy: gl.getUniformLocation(program, 'u_energy'),

      speed: gl.getUniformLocation(program, 'u_speed'),

      rayGain: gl.getUniformLocation(program, 'u_rayGain'),

      rhythm: gl.getUniformLocation(program, 'u_rhythm'),

      likeFlash: gl.getUniformLocation(program, 'u_likeFlash'),

      colCore: gl.getUniformLocation(program, 'u_colCore'),

      colBody: gl.getUniformLocation(program, 'u_colBody'),

      colRay: gl.getUniformLocation(program, 'u_colRay'),

    };



    const resize = () => {

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = window.innerWidth * dpr;

      canvas.height = window.innerHeight * dpr;

      gl.viewport(0, 0, canvas.width, canvas.height);

    };

    resize();

    window.addEventListener('resize', resize);



    let last = performance.now();



    const loop = (now: number) => {

      const dt = Math.min(0.05, (now - last) / 1000);

      last = now;



      const active = usePlayerStore.getState().isPlaying;

      const { pulse, rhythm, energy } = getBeat();

      const pulseTarget = active ? pulse : 0;
      const pulseK = pulseTarget > smoothPulse.current ? 0.94 : 1 - Math.exp(-dt * 15);
      smoothPulse.current += (pulseTarget - smoothPulse.current) * pulseK;

      const targetRhythm = active ? Math.max(0.12, rhythm) : 0.08;
      const rhythmK = targetRhythm > smoothRhythm.current ? 1 - Math.exp(-dt * 18) : 1 - Math.exp(-dt * 7);
      smoothRhythm.current += (targetRhythm - smoothRhythm.current) * rhythmK;

      likeFlash.current = tickVibeLikeFlash(now);

      const targetEnergy = active ? energy : 0.1;
      smoothEnergy.current += (targetEnergy - smoothEnergy.current) * (1 - Math.exp(-dt * 6.5));
      const e = smoothEnergy.current;
      const speed = 0.78 + e * 0.22 + smoothRhythm.current * 0.14;
      const rayGain = 0.66 + smoothRhythm.current * 0.32 + smoothPulse.current * 0.32;



      timeAccum.current += dt * (active ? speed : 0.72);



      const th = themeRef.current;

      const body = rgbaToRgb(th.body);

      const ray = rgbaToRgb(th.ray);

      const hot = rgbaToRgb(th.rayCore);



      gl.useProgram(program);

      gl.uniform2f(u.res, canvas.width, canvas.height);

      gl.uniform1f(u.time, timeAccum.current);

      gl.uniform1f(u.pulse, smoothPulse.current);

      gl.uniform1f(u.bass, 0);

      gl.uniform1f(u.energy, e);

      gl.uniform1f(u.speed, speed);

      gl.uniform1f(u.rayGain, rayGain);

      gl.uniform1f(u.rhythm, smoothRhythm.current);

      gl.uniform1f(u.likeFlash, likeFlash.current);

      gl.uniform3f(u.colCore, hot[0] * 0.6, hot[1] * 0.6, hot[2] * 0.65);

      gl.uniform3f(u.colBody, body[0] * 1.2, body[1] * 0.35, body[2] * 0.45);

      gl.uniform3f(u.colRay, ray[0] * 1.6, ray[1] * 1.2, ray[2] * 1.3);

      gl.drawArrays(gl.TRIANGLES, 0, 6);



      rafRef.current = requestAnimationFrame(loop);

    };



    rafRef.current = requestAnimationFrame(loop);



    return () => {

      window.removeEventListener('resize', resize);

      cancelAnimationFrame(rafRef.current);

    };

  }, [getBeat]);



  return (

    <div className="relative w-full h-full bg-black overflow-hidden flex font-sans">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />



      <div className="relative z-10 flex w-full h-full flex-col items-center justify-center">

        <div className="mb-16 flex items-end justify-center gap-4">

          <h1 className="text-7xl font-black text-white tracking-tight drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">

            {t('mySc.titlePrefix')}

          </h1>

          <MyScIcon
            size={120}
            className="translate-y-8 shrink-0 text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]"
          />

        </div>



        <div className="flex items-center gap-6 pointer-events-auto">
          <button onClick={prevVibeTrack} className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer">

            <SkipBack size={24} fill="currentColor" />

          </button>

          <button

            onClick={togglePlay}

            className="w-20 h-20 flex items-center justify-center bg-white hover:scale-105 active:scale-95 text-black rounded-full transition-all shadow-[0_0_40px_rgba(255,255,255,0.25)] cursor-pointer"

          >

            {isPlaying ? (

              <Pause size={34} fill="currentColor" strokeWidth={0} />

            ) : (

              <Play size={34} fill="currentColor" strokeWidth={0} className="translate-x-[2px]" />

            )}

          </button>

          <button

            onClick={skipVibeTrack}

            className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"

          >

            <SkipForward size={24} fill="currentColor" />

          </button>

        </div>

      </div>

    </div>

  );

}




import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2, Radio, Activity } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

/* Always create a new GoogleGenAI instance right before making an API call */
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const LiveAudioPort: React.FC<{ themeColor: string }> = ({ themeColor }) => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Fix: Correctly initialize useRef with a Set<AudioBufferSourceNode> type and a new Set instance.
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  /* Custom base64 decoding implementation per guidelines */
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  /* Custom base64 encoding implementation per guidelines */
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  /* PCM audio decoding logic for raw streaming bytes per guidelines */
  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const toggleLink = async () => {
    if (connected) {
      sessionRef.current?.close();
      setConnected(false);
      return;
    }

    setLoading(true);
    try {
      const ai = getAi();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = outCtx;

      let nextStartTime = 0;

      /* Using sessionPromise and then() to handle session data streaming correctly without race conditions */
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setConnected(true);
            setLoading(false);
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              /* Use sessionPromise.then to ensure data is sent to a resolved session */
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
              nextStartTime = Math.max(nextStartTime, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outCtx,
                24000,
                1,
              );
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTime);
              nextStartTime = nextStartTime + audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            /* Handle model interruptions as per session setup example */
            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTime = 0;
            }
          },
          onclose: () => setConnected(false),
          onerror: (e) => {
            console.error("Live Error:", e);
            setLoading(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "You are YUR AI's voice core. Be helpful, concise, and professional."
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 space-y-8">
      <div className="relative">
        <div className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${connected ? 'scale-110' : 'scale-100'}`} style={{ borderColor: themeColor, boxShadow: connected ? `0 0 30px ${themeColor}44` : 'none' }}>
          {connected ? (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-1 bg-white animate-pulse" style={{ height: `${10 + Math.random() * 30}px`, animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
          ) : (
            <MicOff size={32} className="opacity-20" />
          )}
        </div>
        {connected && <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-emerald-500 animate-ping"></div>}
      </div>

      <div className="text-center">
        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] mb-2">{connected ? 'Vocal Link Active' : 'Voice Subsystem Offline'}</h3>
        <p className="text-[10px] opacity-40 max-w-xs">Direct neural-vocal bridge enabled via Gemini 2.5 Native Audio.</p>
      </div>

      <button 
        onClick={toggleLink}
        disabled={loading}
        className={`px-8 py-3 rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all ${connected ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500 text-white'}`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : connected ? <MicOff size={16}/> : <Mic size={16}/>}
        {connected ? 'Terminate Link' : 'Initialize Link'}
      </button>

      {connected && (
        <div className="w-full flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <Activity size={16} className="text-yellow-400" />
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-yellow-500 w-2/3 animate-[shimmer_2s_infinite]"></div>
          </div>
          <span className="text-[9px] font-mono opacity-40">SYNC: 99.8%</span>
        </div>
      )}
    </div>
  );
};

export default LiveAudioPort;
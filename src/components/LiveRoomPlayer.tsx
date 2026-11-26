"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";

interface LiveRoomPlayerProps {
  assessmentId: number;
  role: "STUDENT" | "JUDGE";
  localLabel: string;
  remoteLabel: string;
  onEndCall?: () => void;
}

export function LiveRoomPlayer({
  assessmentId,
  role,
  localLabel,
  remoteLabel,
  onEndCall,
}: LiveRoomPlayerProps) {
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [connState, setConnState] = useState<
    "connecting" | "waiting-peer" | "connected" | "error"
  >("connecting");
  const [transportMode, setTransportMode] = useState<"livekit-cloud" | "p2p-webrtc">(
    "p2p-webrtc"
  );
  const [statusNote, setStatusNote] = useState<string>("Initializing camera & room...");
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const lkRoomRef = useRef<Room | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const lastSeqRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const cleanup = useCallback(() => {
    void lkRoomRef.current?.disconnect();
    lkRoomRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
  }, []);

  const sendSignal = useCallback(
    async (
      type: "join" | "offer" | "answer" | "ice" | "leave",
      payload?: unknown
    ) => {
      await fetch("/api/livekit/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, role, type, payload }),
      });
    },
    [assessmentId, role]
  );

  const startConnection = useCallback(async () => {
    cleanup();
    setConnState("connecting");
    setRemoteHasVideo(false);
    setStatusNote("Authorizing private 1-to-1 room...");
    lastSeqRef.current = 0;

    try {
      const tkRes = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, role }),
      });
      const tk = await tkRes.json();
      if (!tkRes.ok) {
        setConnState("error");
        setStatusNote(tk.error || "Unable to authorize room.");
        return;
      }

      // Acquire local camera/mic
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setStatusNote("Camera unavailable; connected with microphone audio.");
        } catch {
          setStatusNote("No camera/mic permission; viewing remote feed only.");
        }
      }

      if (!isMountedRef.current) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }

      // Option A: LiveKit Cloud / Self-hosted server
      if (tk.configured && tk.url && tk.token) {
        setTransportMode("livekit-cloud");
        const room = new Room();
        lkRoomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current);
            setRemoteHasVideo(true);
            setConnState("connected");
            setStatusNote("LiveKit 1-to-1 stream active");
          } else if (track.kind === Track.Kind.Audio) {
            track.attach();
          }
        });
        room.on(RoomEvent.ParticipantDisconnected, () => {
          setRemoteHasVideo(false);
          setConnState("waiting-peer");
          setStatusNote(`Waiting for ${remoteLabel}...`);
        });
        await room.connect(tk.url, tk.token);
        await room.localParticipant.enableCameraAndMicrophone();
        setConnState("waiting-peer");
        setStatusNote(`Connected to LiveKit room · Waiting for ${remoteLabel}`);
        return;
      }

      // Option B: Built-in Peer-to-Peer WebRTC signaling across tabs/devices
      setTransportMode("p2p-webrtc");
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      if (stream) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      } else {
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.ontrack = (event) => {
        const incoming = event.streams[0];
        if (incoming) {
          incoming.getTracks().forEach((tr) => {
            if (!remoteStream.getTracks().some((x) => x.id === tr.id)) {
              remoteStream.addTrack(tr);
            }
          });
        } else {
          remoteStream.addTrack(event.track);
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setRemoteHasVideo(true);
        setConnState("connected");
        setStatusNote("1-to-1 Live WebRTC Video Active");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal("ice", event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnState("connected");
          setStatusNote("1-to-1 Live WebRTC Video Active");
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          setRemoteHasVideo(false);
          setConnState("waiting-peer");
          setStatusNote(`Peer disconnected. Waiting for ${remoteLabel}...`);
        }
      };

      await sendSignal("join");
      setConnState("waiting-peer");
      setStatusNote(`Room active · Waiting for ${remoteLabel} to join...`);

      // Judge proactively creates an offer if Student already joined or joins
      if (role === "JUDGE") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
      }
    } catch (err) {
      console.error("LiveRoom connection error:", err);
      setConnState("error");
      setStatusNote("Could not establish video connection. Click Reconnect.");
    }
  }, [assessmentId, cleanup, remoteLabel, role, sendSignal]);

  useEffect(() => {
    isMountedRef.current = true;
    void startConnection();
    return () => {
      isMountedRef.current = false;
      void sendSignal("leave").catch(() => {});
      cleanup();
    };
  }, [cleanup, sendSignal, startConnection]);

  // Poll signaling messages for peer-to-peer WebRTC
  useEffect(() => {
    if (transportMode !== "p2p-webrtc") return;
    const timer = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const res = await fetch(
          `/api/livekit/signal?assessmentId=${assessmentId}&since=${lastSeqRef.current}&role=${role}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.lastSeq === "number") {
          lastSeqRef.current = data.lastSeq;
        }
        for (const msg of data.messages || []) {
          if (msg.type === "join" && role === "JUDGE") {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            await sendSignal("offer", offer);
          } else if (msg.type === "offer" && role === "STUDENT") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal("answer", answer);
          } else if (msg.type === "answer" && role === "JUDGE") {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            }
          } else if (msg.type === "ice" && msg.payload) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
            } catch {}
          } else if (msg.type === "leave") {
            setRemoteHasVideo(false);
            setConnState("waiting-peer");
            setStatusNote(`${remoteLabel} left the room.`);
          }
        }
      } catch {}
    }, 900);

    return () => clearInterval(timer);
  }, [assessmentId, remoteLabel, role, sendSignal, transportMode]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    void lkRoomRef.current?.localParticipant.setMicrophoneEnabled(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    void lkRoomRef.current?.localParticipant.setCameraEnabled(next);
  };

  const handleEnd = async () => {
    await sendSignal("leave").catch(() => {});
    cleanup();
    onEndCall?.();
  };

  // Remote feed is prominent (especially for Judge watching the child recite!)
  return (
    <div className="bg-[#1c1c1c] rounded-[14px] p-4 sm:p-5 text-white space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full font-semibold ${
              connState === "connected"
                ? "bg-[#53be95]/20 text-[#53be95]"
                : connState === "error"
                ? "bg-[#db4b68]/25 text-[#ff8aa1]"
                : "bg-[#f0b64f]/20 text-[#f0b64f]"
            }`}
          >
            {statusNote}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white/85">
            <ShieldCheck className="w-3.5 h-3.5 text-[#53be95]" />
            Recording Disabled
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#53be95]">
          <Wifi className="w-4 h-4" />
          <span>{transportMode === "livekit-cloud" ? "LiveKit" : "WebRTC 1-to-1"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Remote Feed (Large: Child's Live Recitation for Judge, or Judge Feed for Student) */}
        <div className="md:col-span-8 aspect-video bg-black/70 rounded-[12px] overflow-hidden relative border border-white/15 flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteHasVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-[#f0b64f]" />
              </div>
              <div className="text-sm font-semibold text-white">{remoteLabel}</div>
              <p className="text-xs text-white/65 max-w-xs">
                {role === "JUDGE"
                  ? "Waiting for candidate to open their Live Assessment room (/assessment) and join."
                  : "Waiting for Judge video stream to connect."}
              </p>
            </div>
          )}
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/70 text-xs font-semibold">
            {remoteLabel}
          </span>
        </div>

        {/* Local Self-View */}
        <div className="md:col-span-4 aspect-video md:aspect-auto bg-black/60 rounded-[12px] overflow-hidden relative border border-white/15 flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/70 text-xs font-medium">
            You ({localLabel})
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={toggleMic}
          className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
            micOn ? "bg-white/15 hover:bg-white/25" : "bg-[#db4b68] text-white"
          }`}
        >
          {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          <span>{micOn ? "Mute Mic" : "Mic Off"}</span>
        </button>

        <button
          type="button"
          onClick={toggleCam}
          className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
            camOn ? "bg-white/15 hover:bg-white/25" : "bg-[#db4b68] text-white"
          }`}
        >
          {camOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
          <span>{camOn ? "Camera On" : "Camera Off"}</span>
        </button>

        <button
          type="button"
          onClick={() => void startConnection()}
          className="px-4 py-2 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reconnect</span>
        </button>

        {onEndCall && (
          <button
            type="button"
            onClick={handleEnd}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-[#db4b68] hover:bg-[#b8324e] text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Call</span>
          </button>
        )}
      </div>
    </div>
  );
}

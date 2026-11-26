import { AccessToken } from "livekit-server-sdk";

export interface LiveKitTokenResponse {
  configured: boolean;
  url: string | null;
  token: string | null;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  recordingDisabled: true;
  mode: "livekit-cloud" | "local-preview";
}

export async function createAssessmentRoomToken(params: {
  roomName: string;
  identity: string;
  name: string;
  role: "STUDENT" | "JUDGE";
}): Promise<LiveKitTokenResponse> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || null;

  if (!apiKey || !apiSecret || !wsUrl) {
    return {
      configured: false,
      url: null,
      token: null,
      roomName: params.roomName,
      participantIdentity: params.identity,
      participantName: params.name,
      recordingDisabled: true,
      mode: "local-preview",
    };
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: "2h",
    metadata: JSON.stringify({
      role: params.role,
      recordingDisabled: true,
    }),
  });

  // Explicit 1-to-1 grants; server-side Egress / recording is never enabled or permitted
  at.addGrant({
    room: params.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomRecord: false,
    roomAdmin: params.role === "JUDGE",
  });

  const token = await at.toJwt();
  return {
    configured: true,
    url: wsUrl,
    token,
    roomName: params.roomName,
    participantIdentity: params.identity,
    participantName: params.name,
    recordingDisabled: true,
    mode: "livekit-cloud",
  };
}

import type { RtcSignal } from './types';

type Peer = {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  pendingIce: RTCIceCandidateInit[];
  offerTimer?: ReturnType<typeof setTimeout>;
};

const OFFER_TIMEOUT = 10000;

export class VoiceChatManager {
  private peers = new Map<string, Peer>();
  private desired = new Set<string>();
  private localStream: MediaStream | null = null;
  private iceServers: RTCIceServer[] = [];
  private muted = false;
  private myUserId: string;
  private sendSignal: (toUserId: string, signal: RtcSignal) => void;
  private getIceServers: () => Promise<RTCIceServer[]>;

  constructor(
    myUserId: string,
    sendSignal: (toUserId: string, signal: RtcSignal) => void,
    getIceServers: () => Promise<RTCIceServer[]>,
  ) {
    this.myUserId = myUserId;
    this.sendSignal = sendSignal;
    this.getIceServers = getIceServers;
  }

  get joined(): boolean {
    return this.localStream !== null;
  }

  async join(): Promise<void> {
    if (this.localStream) return;
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      this.iceServers = await this.getIceServers();
    } catch (e) {
      console.error('Failed to fetch ICE servers, using none:', e);
      this.iceServers = [];
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  leave(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    for (const peerId of [...this.peers.keys()]) {
      this.closePeer(peerId);
    }
    this.desired.clear();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  private onVisibilityChange = () => {
    if (document.visibilityState !== 'visible' || !this.joined) return;
    this.restartConnections();
  };

  private async restartConnections(): Promise<void> {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track || track.readyState === 'ended') {
      try {
        this.localStream?.getTracks().forEach((t) => t.stop());
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.setMuted(this.muted);
      } catch (e) {
        console.error('Failed to reacquire microphone:', e);
        return;
      }
    }
    for (const peerId of [...this.peers.keys()]) {
      this.closePeer(peerId);
    }
    for (const peerId of this.desired) {
      this.createPeer(peerId, true);
    }
  }

  reconcile(inVoicePeerIds: string[]): void {
    this.desired = new Set(inVoicePeerIds);

    for (const peerId of [...this.peers.keys()]) {
      if (!this.desired.has(peerId)) this.closePeer(peerId);
    }

    if (!this.joined) return;

    for (const peerId of this.desired) {
      if (!this.peers.has(peerId) && this.myUserId < peerId) {
        this.createPeer(peerId, true);
      }
    }
  }

  async handleSignal(fromUserId: string, signal: RtcSignal): Promise<void> {
    if (!this.joined) return;
    try {
      if (signal.kind === 'offer') {
        if (this.peers.has(fromUserId)) this.closePeer(fromUserId);
        const peer = this.createPeer(fromUserId, false);
        await peer.pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.sendSignal(fromUserId, { kind: 'answer', sdp: answer.sdp! });
        await this.flushPendingIce(peer);
      } else if (signal.kind === 'answer') {
        const peer = this.peers.get(fromUserId);
        if (!peer) return;
        await peer.pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        await this.flushPendingIce(peer);
      } else if (signal.kind === 'ice') {
        const peer = this.peers.get(fromUserId);
        if (!peer) return;
        if (peer.pc.remoteDescription) {
          await peer.pc.addIceCandidate(signal.candidate);
        } else {
          peer.pendingIce.push(signal.candidate);
        }
      }
    } catch (e) {
      console.error('Failed to handle rtc signal:', e);
    }
  }

  private createPeer(peerId: string, initiator: boolean): Peer {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.setAttribute('playsinline', '');
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);

    const peer: Peer = { pc, audioEl, pendingIce: [] };
    this.peers.set(peerId, peer);

    this.localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal(peerId, { kind: 'ice', candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0];
      audioEl.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        this.closePeer(peerId);
        if (this.joined && this.desired.has(peerId) && this.myUserId < peerId) {
          this.createPeer(peerId, true);
        }
      }
    };

    if (initiator) {
      pc.createOffer()
        .then(async (offer) => {
          await pc.setLocalDescription(offer);
          this.sendSignal(peerId, { kind: 'offer', sdp: offer.sdp! });
        })
        .catch((e) => console.error('Failed to create offer:', e));
      peer.offerTimer = setTimeout(() => {
        if (pc.signalingState !== 'have-local-offer') return;
        this.closePeer(peerId);
        if (this.joined && this.desired.has(peerId)) {
          this.createPeer(peerId, true);
        }
      }, OFFER_TIMEOUT);
    }

    return peer;
  }

  private async flushPendingIce(peer: Peer): Promise<void> {
    const candidates = peer.pendingIce.splice(0);
    for (const candidate of candidates) {
      await peer.pc.addIceCandidate(candidate);
    }
  }

  private closePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    this.peers.delete(peerId);
    if (peer.offerTimer !== undefined) clearTimeout(peer.offerTimer);
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    peer.audioEl.srcObject = null;
    peer.audioEl.remove();
  }
}

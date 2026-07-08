import { useEffect, useRef, useState, useCallback } from 'react';
import type { LobbyState } from '../../president-client/types';

type Props = {
  lobbyState: LobbyState;
  lobbyUserId: string;
  onStart: () => void;
  onEndGame: () => void;
  onExitLobby: () => void;
  onReturnToGame: () => void;
  onQuitGame: () => void;
  onSendMessage: (text: string) => void;
  onKickUser: (targetUserId: string) => void;
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LobbyRoom({ lobbyState, lobbyUserId, onStart, onEndGame, onExitLobby, onReturnToGame, onQuitGame, onSendMessage, onKickUser }: Props) {
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?j=${lobbyState.lobbyId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [lobbyState.lobbyId]);

  const isHost = lobbyState.users.find((u) => u.id === lobbyUserId)?.isHost ?? false;

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lobbyState.messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSendMessage(text);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      background: '#2d6a2d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: isMobile ? '12px 12px 12px' : '20px 24px 24px',
      boxSizing: 'border-box',
      gap: '16px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '16px',
        width: '100%',
        maxWidth: '900px',
        flex: 1,
        minHeight: 0,
      }}>

        {/* Top/left panel — players + buttons */}
        <div style={{
          background: '#1e1e1e',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          ...(isMobile ? { width: '100%', flexShrink: 0 } : { width: '280px', flexShrink: 0 }),
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div>
            <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Lobby
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: '#fff', fontSize: '22px', fontFamily: 'monospace', letterSpacing: '4px', fontWeight: 'bold' }}>
                {lobbyState.lobbyId}
              </div>
              <button
                onClick={handleCopyLink}
                title="Copy invite link"
                className={`btn-copy-link${copied ? ' btn-copy-link--copied' : ''}`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '1px', background: '#333' }} />

          <div style={isMobile ? {} : { flex: 1 }}>
            <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Players ({lobbyState.users.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lobbyState.users.map((user) => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#27ae60',
                    flexShrink: 0,
                  }} />
                  <span style={{ color: user.isDisconnected ? '#666' : '#fff', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </span>
                  {user.isHost && (
                    <span style={{ color: '#f39c12', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Host
                    </span>
                  )}
                  {isHost && user.id !== lobbyUserId && (
                    <button
                      onClick={() => onKickUser(user.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        marginLeft: 'auto',
                        color: '#2980b9',
                        fontSize: '11px',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      kick
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: isMobile ? '0' : 'auto' }}>
              {lobbyState.status === 'in-game' && (
              <button
                onClick={onReturnToGame}
                className="btn btn-md btn-green"
              >
                RETURN TO GAME
              </button>
            )}
            {isHost && lobbyState.status !== 'in-game' && (
              <button
                onClick={onStart}
                disabled={lobbyState.users.length < 2}
                className="btn btn-md btn-red"
              >
                START GAME
              </button>
            )}
            {isHost && lobbyState.status === 'in-game' && (
              <button
                onClick={onEndGame}
                className="btn btn-md btn-red"
              >
                END GAME
              </button>
            )}
            {!isHost && lobbyState.status === 'in-game' && (
              <button
                onClick={onQuitGame}
                className="btn btn-md btn-red"
              >
                QUIT GAME
              </button>
            )}
            {lobbyState.status !== 'in-game' && (
              <button
                onClick={onExitLobby}
                className="btn btn-md btn-blue"
              >
                EXIT LOBBY
              </button>
            )}
          </div>
        </div>

        {/* Right panel — chat */}
        <div style={{
          background: '#1e1e1e',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 0,
        }}>
          <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Chat
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '16px',
            paddingRight: '4px',
          }}>
            {lobbyState.messages.map((msg) => (
              <div key={msg.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ color: '#3498db', fontSize: '13px', fontWeight: 'bold' }}>
                    {msg.userName}
                  </span>
                  <span style={{ color: '#555', fontSize: '11px' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div style={{ color: '#ddd', fontSize: '14px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              maxLength={300}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1.5px solid #444',
                background: '#2a2a2a',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className="btn btn-sm btn-blue btn-send"
            >
              SEND
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import LobbyTitle from './LobbyTitle';

type Props = {
  onJoinLobby: (name: string, lobbyId: string) => Promise<string | null>;
  onRejoinLobby: (lobbyId: string, userName: string) => void;
  onStartNewLobby: (name: string) => void;
};

export default function LobbyHome({ onJoinLobby, onRejoinLobby, onStartNewLobby }: Props) {
  const [name, setName] = useState(() => sessionStorage.getItem('userName') ?? '');
  const [lobbyId, setLobbyId] = useState(() => {
    const param = new URLSearchParams(window.location.search).get('lobbyId');
    return param ? param.toUpperCase().slice(0, 6) : '';
  });
  const [nameError, setNameError] = useState('');
  const [lobbyIdError, setLobbyIdError] = useState('');

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('lobbyId');
    if (param) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const validateName = (): boolean => {
    if (!name.trim()) {
      setNameError('Name is required.');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleJoin = async () => {
    const trimmedLobbyId = lobbyId.trim().toUpperCase();
    if (!trimmedLobbyId) {
      setLobbyIdError('Lobby ID is required.');
      return;
    }
    setLobbyIdError('');

    // If both the lobbyId and name match a stored session, rejoin directly.
    const trimmedName = name.trim();
    if (trimmedName && localStorage.getItem(`lobby-user-id-${trimmedLobbyId}-${trimmedName}`)) {
      onRejoinLobby(trimmedLobbyId, trimmedName);
      return;
    }

    if (!validateName()) return;
    const error = await onJoinLobby(name.trim(), trimmedLobbyId);
    if (error) setLobbyIdError(error);
  };

  const handleStartNew = () => {
    if (!validateName()) return;
    onStartNewLobby(name.trim());
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
      padding: '60px 16px 16px',
      gap: '20px',
      boxSizing: 'border-box',
    }}>
      <LobbyTitle />

      <div style={{
        background: '#1e1e1e',
        borderRadius: '12px',
        padding: '40px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '420px',
        boxSizing: 'border-box',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>

        {/* Name field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: '#ccc', fontSize: '14px' }}>Name</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              sessionStorage.setItem('userName', e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder="Enter your name"
            maxLength={32}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: nameError ? '1.5px solid #e74c3c' : '1.5px solid #444',
              background: '#2a2a2a',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
            }}
          />
          {nameError && (
            <span style={{ color: '#e74c3c', fontSize: '12px' }}>{nameError}</span>
          )}
        </div>

        {/* Join row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ color: '#ccc', fontSize: '14px' }}>Code</label>
              <input
                value={lobbyId}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
                  setLobbyId(val);
                  if (lobbyIdError) setLobbyIdError('');
                }}
                placeholder=""
                maxLength={6}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: lobbyIdError ? '1.5px solid #e74c3c' : '1.5px solid #444',
                  background: '#2a2a2a',
                  color: '#fff',
                  fontSize: '15px',
                  letterSpacing: '3px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleJoin}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#2980b9',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '900',
                letterSpacing: '1px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              JOIN LOBBY
            </button>
          </div>
          {lobbyIdError && (
            <span style={{ color: '#e74c3c', fontSize: '12px' }}>{lobbyIdError}</span>
          )}
        </div>

        {/* OR divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#444' }} />
          <span style={{ color: '#888', fontSize: '13px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#444' }} />
        </div>

        {/* Start New Lobby button */}
        <button
          onClick={handleStartNew}
          disabled={!!lobbyId}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: lobbyId ? '#777' : '#c0392b',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '900',
            letterSpacing: '1px',
            boxShadow: lobbyId ? 'none' : '0 4px 12px rgba(0,0,0,0.4)',
            cursor: lobbyId ? 'default' : 'pointer',
          }}
        >
          START NEW LOBBY
        </button>
      </div>
    </div>
  );
}

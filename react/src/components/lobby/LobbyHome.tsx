import { useState, useEffect } from 'react';
import LobbyTitle from './LobbyTitle';
import { joinLobby, startLobby } from '../../api/lobby';

type LobbyEntry = { lobbyId: string; userName: string; lobbyUserId: string };

type Props = {
  onLobbyEntered: (entry: LobbyEntry) => void;
};

export default function LobbyHome({ onLobbyEntered }: Props) {
  const [name, setName] = useState(() => sessionStorage.getItem('userName') ?? '');
  const [lobbyId, setLobbyId] = useState(() => {
    const param = new URLSearchParams(window.location.search).get('j');
    return param ? param.toUpperCase().slice(0, 6) : '';
  });
  const [nameError, setNameError] = useState('');
  const [lobbyIdError, setLobbyIdError] = useState('');

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('j');
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
    if (trimmedName) {
      const storedLobbyUserId = localStorage.getItem(`lobby-user-id-${trimmedLobbyId}-${trimmedName}`);
      if (storedLobbyUserId) {
        onLobbyEntered({ lobbyId: trimmedLobbyId, userName: trimmedName, lobbyUserId: storedLobbyUserId });
        return;
      }
    }

    if (!validateName()) return;
    const result = await joinLobby(trimmedLobbyId, trimmedName);
    if (result.error) {
      setLobbyIdError(result.error);
      return;
    }
    if (!result.lobbyUserId) {
      setLobbyIdError('Unknown error joining lobby.');
      return;
    }
    localStorage.setItem(`lobby-user-id-${trimmedLobbyId}-${trimmedName}`, result.lobbyUserId);
    onLobbyEntered({ lobbyId: trimmedLobbyId, userName: trimmedName, lobbyUserId: result.lobbyUserId });
  };

  const handleStartNew = async () => {
    if (!validateName()) return;
    const trimmedName = name.trim();
    const result = await startLobby(trimmedName);
    if (result.error || !result.lobbyId || !result.lobbyUserId) return;
    localStorage.setItem(`lobby-user-id-${result.lobbyId}-${trimmedName}`, result.lobbyUserId);
    onLobbyEntered({ lobbyId: result.lobbyId, userName: trimmedName, lobbyUserId: result.lobbyUserId });
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
              className="btn btn-sm btn-blue"
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
          className="btn btn-md btn-red"
        >
          START NEW LOBBY
        </button>
      </div>
    </div>
  );
}

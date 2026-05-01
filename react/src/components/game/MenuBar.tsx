type Props = {
  chatPreview: { name: string; text: string } | null;
  onReturnToLobby: () => void;
  onShowRules: () => void;
};

export default function MenuBar({ chatPreview, onReturnToLobby, onShowRules }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.35)', marginLeft: '-8px', marginRight: '-8px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px', flexShrink: 0, gap: '8px' }}>
      {chatPreview && (
        <div
          onClick={onReturnToLobby}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}
        >
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#3498db', whiteSpace: 'nowrap', flexShrink: 0 }}>{chatPreview.name}:</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chatPreview.text}</span>
        </div>
      )}
      <button
        onClick={onShowRules}
        className="btn-lobby-nav"
      >
        RULES
      </button>
      <button
        onClick={onReturnToLobby}
        className="btn-lobby-nav"
      >
        LOBBY
      </button>
    </div>
  );
}

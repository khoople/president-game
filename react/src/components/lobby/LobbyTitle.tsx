export default function LobbyTitle() {
  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{
        color: '#fff',
        margin: 0,
        fontSize: '72px',
        fontFamily: "'Barriecito', Arial, sans-serif",
        fontWeight: '400',
        letterSpacing: '2px',
      }}>
        {import.meta.env.VITE_APP_TITLE}
      </h1>
      <p style={{
        color: '#d4f0d4',
        margin: '6px 0 16px',
        fontSize: '16px',
      }}>
        {import.meta.env.VITE_APP_SUBTITLE}
      </p>
    </div>
  );
}

const MessageDisplay = ({ message }: { message: string | null }) => {
  if (!message) return null;

  return (
    <div style={{ background: '#222', color: 'white', border: '2px solid black', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.6)', padding: '14px 28px', fontSize: '15px', maxWidth: '90vw', wordBreak: 'break-word' }}>
      {message}
    </div>
  );
};

export default MessageDisplay;

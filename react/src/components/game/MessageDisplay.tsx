const MessageDisplay = ({ message }: { message: string | null }) => {
  if (!message) return null;

  return (
    <div style={{ color: 'white', fontSize: '15px', maxWidth: '90vw', wordBreak: 'break-word', textShadow: '0 1px 4px rgba(0,0,0,0.8)', marginBottom: '-8px', lineHeight: '1.2' }}>
      {message}
    </div>
  );
};

export default MessageDisplay;

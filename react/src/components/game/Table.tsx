interface TableProps {
  top?: React.ReactNode;
  centerLeft?: React.ReactNode;
  center?: React.ReactNode;
  bottom?: React.ReactNode;
}

const Table = ({ top, centerLeft, center, bottom }: TableProps) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#2d6a2d',
      borderRadius: '16px',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}>
        {top}
      </div>
      <div style={{
        position: 'absolute',
        top: '33%',
        left: '32px',
        transform: 'translateY(-50%)',
      }}>
        {centerLeft}
      </div>
      <div style={{
        position: 'absolute',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        {center}
      </div>
      <div style={{
        position: 'absolute',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}>
        {bottom}
      </div>
    </div>
  );
};

export default Table;

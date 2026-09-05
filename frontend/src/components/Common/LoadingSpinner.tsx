import { Spin } from 'antd';

interface LoadingSpinnerProps {
  tip?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ tip = 'Đang tải...', fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <span style={{ color: '#888' }}>{tip}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Spin tip={tip} />
    </div>
  );
}

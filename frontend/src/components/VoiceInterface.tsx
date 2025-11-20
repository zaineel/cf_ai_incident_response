import { useState, useRef } from 'react';

interface VoiceInterfaceProps {
  incidentId: string;
}

const VoiceInterface = ({ incidentId }: VoiceInterfaceProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Not connected');
  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/voice`);

    ws.onopen = () => {
      setIsConnected(true);
      setStatus('Connected');
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'transcription') {
        setTranscript(data.text);
        setStatus('Processing...');
      } else if (data.type === 'response') {
        setResponse(data.data.response);
        setStatus('Response received');
      } else if (data.type === 'error') {
        setStatus(`Error: ${data.message}`);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Connection error');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatus('Disconnected');
      wsRef.current = null;
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setStatus('Disconnected');
    }
  };

  const startRecording = async () => {
    setStatus('Voice recording not yet implemented - using text input instead');
    // In production, you would:
    // 1. Request microphone permission
    // 2. Start recording audio
    // 3. Send audio chunks to WebSocket
    // 4. Receive transcription and AI response
  };

  const sendTextMessage = () => {
    if (!wsRef.current || !transcript.trim()) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'text',
        message: transcript,
        incidentId,
      })
    );

    setStatus('Sending message...');
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Voice Interface</h2>

      <div
        style={{
          padding: '2rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              margin: '0 auto',
              borderRadius: '50%',
              backgroundColor: isRecording ? 'var(--error)' : isConnected ? 'var(--success)' : 'var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              transition: 'all 0.3s',
              cursor: 'pointer',
            }}
            onClick={isConnected ? startRecording : undefined}
          >
            {isRecording ? '🎤' : '🔊'}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{status}</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {!isConnected ? (
            <button className="button button-primary" onClick={connect}>
              Connect
            </button>
          ) : (
            <>
              <button className="button button-secondary" onClick={disconnect}>
                Disconnect
              </button>
              <button
                className="button button-primary"
                onClick={startRecording}
                disabled={isRecording}
              >
                {isRecording ? 'Recording...' : 'Start Recording'}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Test with Text Input</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="input"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Type a message to test the WebSocket connection..."
            disabled={!isConnected}
          />
          <button
            className="button button-primary"
            onClick={sendTextMessage}
            disabled={!isConnected || !transcript.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {response && (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--background)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--success)',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--primary)' }}>
            AI Response:
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{response}</div>
        </div>
      )}

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid var(--warning)',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--warning)' }}>
          Voice Processing - Coming Soon
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Full voice processing with Whisper (speech-to-text) and text-to-speech is not yet implemented.
          This interface demonstrates WebSocket connectivity. To enable voice:
        </p>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          <li>Implement browser MediaRecorder API for audio capture</li>
          <li>Send audio chunks to Workers via WebSocket</li>
          <li>Process with Whisper model: <code>@cf/openai/whisper</code></li>
          <li>Return AI response and optionally convert to speech</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceInterface;

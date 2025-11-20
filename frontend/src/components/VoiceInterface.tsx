import { useState, useRef, useEffect } from 'react';

interface VoiceInterfaceProps {
  incidentId: string;
}

const VoiceInterface = ({ incidentId }: VoiceInterfaceProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Not connected');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isRecording]);

  const connect = () => {
    const wsUrl = window.location.hostname === 'localhost'
      ? `ws://localhost:8787/api/voice`
      : `wss://cf-ai-incident-response.zaineel-s-mithani.workers.dev/api/voice`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setStatus('Connected - Ready to record');
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'processing') {
        setStatus(data.message);
      } else if (data.type === 'transcription') {
        setTranscript(data.text);
        setMessages(prev => [...prev, { role: 'user', content: data.text }]);
        setStatus('Transcription complete - Processing with AI...');
      } else if (data.type === 'response') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.response }]);
        setStatus('Response received - Ready for next recording');
      } else if (data.type === 'error') {
        setStatus(`Error: ${data.message}`);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Connection error - Please try reconnecting');
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
    if (!isConnected || !wsRef.current) {
      setStatus('Please connect first');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });

      // Use webm/opus for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Convert to base64 for sending
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'voice',
                audio: base64Audio,
                incidentId: incidentId,
              })
            );
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Recording... Click Stop when done');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus(`Microphone error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Processing audio...');
    }
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

  const clearMessages = () => {
    setMessages([]);
    setTranscript('');
  };

  return (
    <div style={{ maxWidth: '900px' }}>
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
              backgroundColor: isRecording
                ? 'var(--error)'
                : isConnected
                ? 'var(--success)'
                : 'var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              transition: 'all 0.3s',
              cursor: isConnected ? 'pointer' : 'default',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none',
            }}
            onClick={isConnected && !isRecording ? startRecording : undefined}
          >
            {isRecording ? '🎙️' : '🔊'}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {isConnected ? (isRecording ? 'Recording' : 'Connected') : 'Not Connected'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{status}</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isConnected ? (
            <button className="button button-primary" onClick={connect}>
              Connect
            </button>
          ) : (
            <>
              <button className="button button-secondary" onClick={disconnect}>
                Disconnect
              </button>
              {!isRecording ? (
                <button
                  className="button button-primary"
                  onClick={startRecording}
                >
                  🎤 Start Recording
                </button>
              ) : (
                <button
                  className="button button-primary"
                  onClick={stopRecording}
                  style={{ backgroundColor: 'var(--error)' }}
                >
                  ⏹️ Stop Recording
                </button>
              )}
              {messages.length > 0 && (
                <button className="button button-secondary" onClick={clearMessages}>
                  Clear History
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Conversation History */}
      {messages.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Conversation</h3>
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: 'var(--surface)',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: msg.role === 'user' ? 'var(--surface-light)' : 'var(--background)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${msg.role === 'user' ? 'var(--primary)' : 'var(--success)'}`,
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  {msg.role === 'user' ? '🎤 You (Voice)' : '🤖 AI Assistant'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{msg.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Input Fallback */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Text Input (Fallback)</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          You can also type a message and send it through the WebSocket connection:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="input"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Type a message to test the WebSocket connection..."
            disabled={!isConnected}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
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

      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--success)',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--success)' }}>
          ✅ Voice Processing Now Active!
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Full speech-to-text with Whisper is now implemented.
        </p>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          <li>Click "Connect" to establish WebSocket connection</li>
          <li>Click "Start Recording" or the microphone icon</li>
          <li>Speak your message about the incident</li>
          <li>Click "Stop Recording" when finished</li>
          <li>Audio is transcribed using Whisper model</li>
          <li>AI analyzes your question and provides response</li>
        </ul>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceInterface;

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface IncidentChatProps {
  incidentId: string;
}

const IncidentChat = ({ incidentId }: IncidentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load conversation history when incident changes
    loadHistory();
  }, [incidentId]);

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Show me the incident summary and current status.',
          incidentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.history) {
          setMessages(data.history);
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          incidentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove the user message if the request failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    'What is the root cause of this incident?',
    'What are the immediate remediation steps?',
    'What systems are affected?',
    'How can we prevent this in the future?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)' }}>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '1rem' }}>
              No messages yet. Start by asking about the incident or use a quick prompt below.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  className="button button-secondary"
                  onClick={() => setInput(prompt)}
                  style={{ fontSize: '0.875rem' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: message.role === 'user' ? 'var(--surface-light)' : 'var(--background)',
              borderRadius: '8px',
              borderLeft: `3px solid ${message.role === 'user' ? 'var(--primary)' : 'var(--success)'}`,
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              {message.role === 'user' ? 'You' : 'AI Assistant'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{message.content}</div>
            {message.timestamp && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: '8px',
              borderLeft: '3px solid var(--success)',
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              AI Assistant
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="loading" />
              <span style={{ color: 'var(--text-secondary)' }}>Analyzing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <textarea
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about the incident, request analysis, or get remediation steps... (Shift+Enter for new line)"
          style={{
            flex: 1,
            minHeight: '60px',
            resize: 'vertical',
          }}
        />
        <button
          className="button button-primary"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ alignSelf: 'flex-end' }}
        >
          Send
        </button>
      </div>

      {messages.length === 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Quick Prompts:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="button button-secondary"
                onClick={() => setInput(prompt)}
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentChat;

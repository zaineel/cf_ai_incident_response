import { useState } from 'react';

interface NewIncidentFormProps {
  onIncidentCreated: (incidentId: string) => void;
}

const NewIncidentForm = ({ onIncidentCreated }: NewIncidentFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [affectedSystems, setAffectedSystems] = useState('');
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/incident', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || undefined,
          description,
          severity,
          affectedSystems: affectedSystems
            ? affectedSystems.split(',').map((s) => s.trim())
            : undefined,
          logs: logs || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create incident');
      }

      const data = await response.json();
      onIncidentCreated(data.incidentId);

      // Reset form
      setTitle('');
      setDescription('');
      setSeverity('high');
      setAffectedSystems('');
      setLogs('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Report New Incident</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Title (Optional)
          </label>
          <input
            id="title"
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., API Gateway Timeout Errors"
          />
        </div>

        <div>
          <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Description <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <textarea
            id="description"
            className="input textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what's happening, what systems are affected, and any error messages you're seeing..."
            required
          />
        </div>

        <div>
          <label htmlFor="severity" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Severity <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <select
            id="severity"
            className="input"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            required
          >
            <option value="low">Low - Minor impact, can wait</option>
            <option value="medium">Medium - Noticeable impact, needs attention</option>
            <option value="high">High - Significant impact, urgent</option>
            <option value="critical">Critical - Major outage, immediate action required</option>
          </select>
        </div>

        <div>
          <label htmlFor="affectedSystems" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Affected Systems (Optional)
          </label>
          <input
            id="affectedSystems"
            type="text"
            className="input"
            value={affectedSystems}
            onChange={(e) => setAffectedSystems(e.target.value)}
            placeholder="e.g., API Gateway, Database, Workers (comma-separated)"
          />
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
            Comma-separated list of affected systems
          </small>
        </div>

        <div>
          <label htmlFor="logs" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Error Logs (Optional)
          </label>
          <textarea
            id="logs"
            className="input textarea"
            value={logs}
            onChange={(e) => setLogs(e.target.value)}
            placeholder="Paste relevant error logs, stack traces, or monitoring alerts here..."
            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="button button-primary" disabled={loading || !description}>
          {loading ? (
            <>
              <span className="loading" style={{ marginRight: '0.5rem' }} />
              Creating Incident...
            </>
          ) : (
            'Create Incident'
          )}
        </button>
      </form>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>What happens next?</h3>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
          <li>AI will perform initial analysis of your incident</li>
          <li>Root cause analysis will be generated automatically</li>
          <li>Remediation steps will be suggested</li>
          <li>You can chat with the AI for further assistance</li>
          <li>Use voice interface for hands-free operation during critical incidents</li>
        </ul>
      </div>
    </div>
  );
};

export default NewIncidentForm;

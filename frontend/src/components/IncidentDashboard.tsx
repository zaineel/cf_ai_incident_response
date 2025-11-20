import { useState, useEffect } from 'react';

interface TimelineEvent {
  timestamp: number;
  type: 'detection' | 'analysis' | 'action' | 'update' | 'resolution';
  description: string;
  data?: any;
}

interface IncidentData {
  incidentId: string;
  status: 'investigating' | 'identified' | 'mitigating' | 'resolved' | 'monitoring';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedSystems: string[];
  startTime: number;
  endTime?: number;
  rootCause?: string;
  remediationSteps?: string[];
  timeline: TimelineEvent[];
}

interface IncidentDashboardProps {
  incidentId: string;
}

const IncidentDashboard = ({ incidentId }: IncidentDashboardProps) => {
  const [incident, setIncident] = useState<IncidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadIncident();
    const interval = setInterval(loadIncident, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [incidentId]);

  const loadIncident = async () => {
    try {
      const response = await fetch(`/api/incident/${incidentId}`);

      if (!response.ok) {
        throw new Error('Failed to load incident');
      }

      const data = await response.json();
      setIncident(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading incident data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!incident) {
    return <div className="error-message">Incident not found</div>;
  }

  const duration = incident.endTime
    ? incident.endTime - incident.startTime
    : Date.now() - incident.startTime;
  const durationMinutes = Math.floor(duration / 60000);
  const durationHours = Math.floor(durationMinutes / 60);
  const durationDisplay =
    durationHours > 0
      ? `${durationHours}h ${durationMinutes % 60}m`
      : `${durationMinutes}m`;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Incident ID
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{incident.incidentId}</div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Status
          </div>
          <span className={`status-badge status-${incident.status}`}>{incident.status}</span>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Severity
          </div>
          <span className={`severity-badge severity-${incident.severity}`}>{incident.severity}</span>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Duration
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{durationDisplay}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Incident Details</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Title
            </div>
            <div>{incident.title}</div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Description
            </div>
            <div>{incident.description}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Started
            </div>
            <div>{new Date(incident.startTime).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Affected Systems</h3>
          {incident.affectedSystems.length > 0 ? (
            <ul style={{ paddingLeft: '1.25rem' }}>
              {incident.affectedSystems.map((system, idx) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }}>
                  {system}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>No systems specified</div>
          )}
        </div>
      </div>

      {incident.rootCause && (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--surface)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            borderLeft: '3px solid var(--warning)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--warning)' }}>
            Root Cause
          </h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{incident.rootCause}</div>
        </div>
      )}

      {incident.remediationSteps && incident.remediationSteps.length > 0 && (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--surface)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            borderLeft: '3px solid var(--success)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--success)' }}>
            Remediation Steps
          </h3>
          <ol style={{ paddingLeft: '1.5rem' }}>
            {incident.remediationSteps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: '0.75rem' }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Timeline</h3>
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          {incident.timeline.length > 0 ? (
            incident.timeline.map((event, idx) => (
              <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-2rem',
                    top: '0.25rem',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor:
                      event.type === 'detection'
                        ? 'var(--error)'
                        : event.type === 'analysis'
                        ? 'var(--warning)'
                        : event.type === 'action'
                        ? 'var(--primary)'
                        : event.type === 'resolution'
                        ? 'var(--success)'
                        : 'var(--text-secondary)',
                  }}
                />
                {idx < incident.timeline.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.55rem',
                      top: '1rem',
                      bottom: '-1.5rem',
                      width: '2px',
                      backgroundColor: 'var(--border)',
                    }}
                  />
                )}
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                <div>{event.description}</div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>No timeline events yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDashboard;

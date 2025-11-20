import { useState } from 'react';
import IncidentChat from './components/IncidentChat';
import VoiceInterface from './components/VoiceInterface';
import IncidentDashboard from './components/IncidentDashboard';
import NewIncidentForm from './components/NewIncidentForm';

type Tab = 'chat' | 'voice' | 'dashboard' | 'new';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [currentIncidentId, setCurrentIncidentId] = useState<string>('');

  const handleIncidentCreated = (incidentId: string) => {
    setCurrentIncidentId(incidentId);
    setActiveTab('chat');
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Cloudflare AI Incident Response</h1>
          <p className="header-subtitle">
            Powered by Llama 3.3 · Durable Objects · Workflows
          </p>
        </div>
        {currentIncidentId && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Active Incident: <code>{currentIncidentId}</code>
          </div>
        )}
      </header>

      <main className="main-content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            New Incident
          </button>
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            disabled={!currentIncidentId}
          >
            Chat Interface
          </button>
          <button
            className={`tab ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
            disabled={!currentIncidentId}
          >
            Voice Interface
          </button>
          <button
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            disabled={!currentIncidentId}
          >
            Dashboard
          </button>
        </div>

        {activeTab === 'new' && (
          <NewIncidentForm onIncidentCreated={handleIncidentCreated} />
        )}

        {activeTab === 'chat' && currentIncidentId && (
          <IncidentChat incidentId={currentIncidentId} />
        )}

        {activeTab === 'voice' && currentIncidentId && (
          <VoiceInterface incidentId={currentIncidentId} />
        )}

        {activeTab === 'dashboard' && currentIncidentId && (
          <IncidentDashboard incidentId={currentIncidentId} />
        )}
      </main>
    </div>
  );
}

export default App;

import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Lock, Stethoscope, Building2, BarChart3, Server, AlertCircle } from 'lucide-react';

const HOSPITAL_OPTIONS = [
  { id: 'metro_general', name: 'Metro General Hospital (MGH - Node #1)', shortName: 'Metro General' },
  { id: 'st_jude', name: 'St. Jude Medical Center (SJM - Node #2)', shortName: 'St. Jude' },
  { id: 'city_health', name: 'City Health Institute (CHI - Node #3)', shortName: 'City Health' },
  { id: 'university_research', name: 'University Research Hospital (URH - Node #4)', shortName: 'Univ Research' },
  { id: 'all', name: 'Global Consortium Federation Hub', shortName: 'Global Consortium' }
];

export const LoginView = ({ onLoginSuccess }) => {
  const { loginUser, switchRole } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('metro_general');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isGlobalSelected = selectedHospital === 'all';
  const selectedHospitalObj = HOSPITAL_OPTIONS.find(h => h.id === selectedHospital) || HOSPITAL_OPTIONS[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Role enforcement based on selected node:
    const lowerEmail = email.toLowerCase().trim();
    const isCoordinatorInput = lowerEmail.includes('coordinator') || lowerEmail.includes('researcher') || lowerEmail.includes('rostova');
    const isDoctorInput = lowerEmail.includes('doctor') || lowerEmail.includes('jenkins') || lowerEmail.includes('vance');
    const isAdminInput = lowerEmail.includes('admin') || lowerEmail.includes('vance');

    if (!isGlobalSelected && isCoordinatorInput) {
      setError('Research Coordinator access requires selecting "Global Consortium Federation Hub" above.');
      return;
    }

    if (isGlobalSelected && (isDoctorInput || isAdminInput)) {
      setError('Doctor and Hospital Administrator roles require selecting a specific hospital node above.');
      return;
    }

    setLoading(true);
    try {
      await loginUser(email, password, selectedHospital);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError('Invalid credentials. Please verify your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    switchRole(role, selectedHospital);
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div style={{ maxWidth: '580px', margin: '2.5rem auto', padding: '1rem' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.45rem', letterSpacing: '-0.02em' }}>
          Clinical AI Access Portal
        </h1>
        <p style={{ fontSize: '0.94rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
          Authorized access to decentralized cardiovascular disease prediction, on-premise local model training, and privacy-preserving federated aggregation.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="glass-panel" style={{ borderTop: '4px solid var(--primary-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={17} color="var(--primary-blue)" /> Institutional Sign-In
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Server size={13} color="#10b981" /> 4 Nodes Connected
          </span>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.84rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.15rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Hospital Facility / Node Affiliation
            </label>
            <select
              className="form-select"
              value={selectedHospital}
              onChange={(e) => {
                setSelectedHospital(e.target.value);
                setError('');
              }}
              style={{ width: '100%', fontWeight: 600 }}
            >
              {HOSPITAL_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.15rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Institutional Email or Username
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter email or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.35rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.92rem', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? 'Authenticating Credentials...' : 'Authenticate & Enter Gateway'}
          </button>
        </form>

        {/* ROLE QUICK ACCESS BELOW THE LOGINS (Gated strictly by Node Selection) */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sign-In for {selectedHospitalObj.shortName}:
          </div>

          {!isGlobalSelected ? (
            /* Hospital Node Selected: Allow Doctor and Hospital Admin ONLY */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="quick-login-btn"
                  style={{ flex: 1, padding: '0.65rem 0.85rem', justifyContent: 'center' }}
                  onClick={() => handleQuickLogin('doctor')}
                  title={`Sign in as Doctor for ${selectedHospitalObj.shortName}`}
                >
                  <Stethoscope size={15} color="var(--emerald-accent)" />
                  <span>Doctor ({selectedHospitalObj.shortName})</span>
                </button>

                <button
                  type="button"
                  className="quick-login-btn"
                  style={{ flex: 1, padding: '0.65rem 0.85rem', justifyContent: 'center' }}
                  onClick={() => handleQuickLogin('admin')}
                  title={`Sign in as Hospital Administrator for ${selectedHospitalObj.shortName}`}
                >
                  <Building2 size={15} color="var(--primary-blue)" />
                  <span>Hospital Admin</span>
                </button>
              </div>
            </div>
          ) : (
            /* Global Consortium Selected: Allow Research Coordinator ONLY */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="quick-login-btn"
                style={{ width: '100%', padding: '0.65rem 0.85rem', justifyContent: 'center' }}
                onClick={() => handleQuickLogin('researcher')}
                title="Sign in as Research Coordinator for Global Consortium"
              >
                <BarChart3 size={15} color="var(--purple-accent)" />
                <span>Research Coordinator (Global Federation Hub)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

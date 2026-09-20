import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Activity, ShieldCheck, Lock, LogOut, UserCheck } from 'lucide-react';

export const MasterTitleHeader = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="master-title-header">
      <div className="master-title-inner">
        {/* Left: Branding & Full Project Title */}
        <div className="master-brand-box">
          <div className="master-logo-orb">
            <Activity size={26} />
          </div>
          <div className="master-brand-titles">
            <div className="master-brand-h1">
              <span>FEDHEALTH AI</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: 300 }}>|</span>
              <span className="master-title-accent">
                Privacy-Preserving Federated Healthcare Diagnosis Platform
              </span>
            </div>
          </div>
        </div>

        {/* Right: Authentication Profile or Secure Portal Status */}
        <div className="master-title-status">

          {user ? (
            <div className="user-profile-badge" style={{ marginLeft: '0.5rem' }}>
              <UserCheck size={16} color="var(--emerald-accent)" />
              <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{user.full_name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {user.hospital_node === 'all' ? 'Consortium Hub' : user.hospital_node}
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout from Platform"
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', marginLeft: '0.4rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
              <Lock size={14} color="var(--emerald-accent)" />
              <span>Secure Clinical Gateway</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

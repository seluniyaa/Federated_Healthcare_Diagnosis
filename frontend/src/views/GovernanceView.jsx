import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, Lock, FileText, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export const GovernanceView = () => {
  const [nodes, setNodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/consortium/nodes').then(res => res.json()),
      fetch('/api/consortium/logs?limit=30').then(res => res.json())
    ]).then(([nodesData, logsData]) => {
      setNodes(nodesData);
      setLogs(logsData);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck color="var(--emerald-accent)" size={28} />
            Consortium Governance & Security Audit Trail
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Federated Healthcare Consortium SLAs, TLS 1.3 certificate endpoints, differential privacy budget quotas, and digital signature verification logs.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          Refresh Governance Log
        </button>
      </div>

      {/* Consortium Node Agreements Grid */}
      <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Participating Hospital Node SLAs & Encryption Endpoints</h3>
      
      <div className="grid-4">
        {nodes.map((node) => (
          <div
            key={node.node_id}
            className="glass-panel"
            style={{ borderTop: `4px solid ${node.color}`, padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Server size={22} color={node.color} />
              <span className="role-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.68rem' }}>
                <CheckCircle2 size={10} style={{ marginRight: '3px' }} /> TLS 1.3 Active
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff', margin: '0.75rem 0 0.2rem 0' }}>
              {node.hospital_name}
            </div>
            <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{node.ip_endpoint}</div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>TLS Fingerprint:</span>
                <div className="mono" style={{ color: 'var(--cyan-accent)', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                  {node.tls_fingerprint}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Local EHR Records:</span>
                <span className="mono" style={{ color: '#fff', fontWeight: 700 }}>{node.sample_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>DP Epsilon Limit:</span>
                <span className="mono" style={{ color: 'var(--purple-accent)', fontWeight: 700 }}>
                  {node.epsilon_budget_spent} / {node.epsilon_budget_max}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security & Privacy Audit Trail Table */}
      <div className="glass-panel">
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText color="var(--primary-blue)" size={18} />
          Real-Time Consortium Security & Privacy Audit Trail Log
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.65rem' }}>Log ID</th>
              <th style={{ padding: '0.65rem' }}>Event Type</th>
              <th style={{ padding: '0.65rem' }}>Severity</th>
              <th style={{ padding: '0.65rem' }}>Source Node</th>
              <th style={{ padding: '0.65rem' }}>User Email</th>
              <th style={{ padding: '0.65rem' }}>Audit Event Details</th>
              <th style={{ padding: '0.65rem' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="mono" style={{ padding: '0.65rem', color: 'var(--text-dim)' }}>#{log.id}</td>
                <td style={{ padding: '0.65rem' }}>
                  <span className="mono" style={{ color: '#fff', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                    {log.event_type}
                  </span>
                </td>
                <td style={{ padding: '0.65rem' }}>
                  <span
                    className="role-pill"
                    style={{
                      background: log.severity === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : log.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: log.severity === 'SUCCESS' ? '#10b981' : log.severity === 'WARNING' ? '#f59e0b' : '#60a5fa'
                    }}
                  >
                    {log.severity}
                  </span>
                </td>
                <td style={{ padding: '0.65rem', color: 'var(--text-muted)' }}>{log.source_node}</td>
                <td style={{ padding: '0.65rem', color: 'var(--text-muted)' }}>{log.user_email}</td>
                <td style={{ padding: '0.65rem', color: '#fff' }}>{log.details}</td>
                <td className="mono" style={{ padding: '0.65rem', color: 'var(--text-dim)', fontSize: '0.76rem' }}>{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

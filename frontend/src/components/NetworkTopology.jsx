import React from 'react';
import { ShieldCheck, Server, Building2, Lock, ArrowUpRight, Cpu } from 'lucide-react';

export const NetworkTopology = ({ topologyData }) => {
  if (!topologyData) return null;

  const { central_aggregator, hospital_nodes } = topologyData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Privacy Guarantee Banner */}
      <div className="privacy-banner">
        <ShieldCheck size={28} color="var(--emerald-accent)" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.2rem' }}>
            Zero Raw Patient Data Transfer Standard (HIPAA/GDPR Compliant Architecture)
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Each hospital site trains its local model partition independently. Only mathematical weight gradients (W_k) with calibrated Laplace Differential Privacy noise (&epsilon;) are transmitted across the federated network.
          </p>
        </div>
      </div>

      {/* Interactive Topology Graph */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu color="var(--primary-blue)" size={20} />
          Federated Learning Multi-Node Topology
        </h3>

        {/* Central Aggregator Card */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
          <div
            className="glass-panel pulse-node"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
              borderColor: 'var(--primary-blue)',
              width: '320px',
              textAlign: 'center',
              padding: '1.25rem'
            }}
          >
            <Server size={32} color="var(--primary-blue)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{central_aggregator.name}</div>
            <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.5rem 0' }}>
              {central_aggregator.ip}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span className="role-pill" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                FedAvg Active
              </span>
              <span className="role-pill" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                &epsilon; = {central_aggregator.privacy_epsilon_spent} / {central_aggregator.max_epsilon}
              </span>
            </div>
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="grid-4">
          {hospital_nodes.map((node) => (
            <div
              key={node.id}
              className="glass-panel glass-panel-interactive"
              style={{
                borderTop: `4px solid ${node.color}`,
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Building2 size={24} color={node.color} />
                <span className="role-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.68rem' }}>
                  <Lock size={10} style={{ marginRight: '3px' }} /> Local Data
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff', margin: '0.75rem 0 0.2rem 0' }}>
                {node.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{node.location}</div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Local Patients:</span>
                  <span className="mono" style={{ fontWeight: 700, color: '#fff' }}>{node.sample_count} samples</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Local Accuracy:</span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--emerald-accent)' }}>{node.local_accuracy}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payload Sent:</span>
                  <span className="mono" style={{ color: 'var(--primary-blue)' }}>Weight Vector (W_k)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

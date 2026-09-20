import React, { useState, useEffect } from 'react';
import { NetworkTopology } from '../components/NetworkTopology';

export const TopologyView = () => {
  const [topologyData, setTopologyData] = useState(null);

  useEffect(() => {
    fetch('/api/topology')
      .then(res => res.json())
      .then(data => setTopologyData(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Federated Network & Data Privacy Architecture Visualizer
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Real-time visual demonstration of multi-hospital node isolation, differential privacy guarantees, and weight parameter aggregation.
          </p>
        </div>
      </div>

      <NetworkTopology topologyData={topologyData} />
    </div>
  );
};

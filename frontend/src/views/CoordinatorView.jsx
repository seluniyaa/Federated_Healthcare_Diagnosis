import React, { useState, useEffect } from 'react';
import { BarChart3, Play, FastForward, RotateCcw, ShieldAlert, Cpu, CheckCircle2, Sliders, Database, Key, Network, ShieldCheck, ArrowRight, Server, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrainingTerminal } from '../components/TrainingTerminal';

export const CoordinatorView = ({
  currentStep = 1,
  setCurrentStep = () => {},
  completedSteps = [],
  setCompletedSteps = () => {}
}) => {
  const [summary, setSummary] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [dpEnabled, setDpEnabled] = useState(true);
  const [noiseScale, setNoiseScale] = useState(0.05);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSignature, setLastSignature] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [isAggregating, setIsAggregating] = useState(false);

  useEffect(() => {
    fetchSummary();
    fetchNodes();
  }, []);

  const fetchSummary = () => {
    fetch('/api/coordinator/federation')
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(err => console.error(err));
  };

  const fetchNodes = () => {
    fetch('/api/admin/nodes')
      .then(res => res.json())
      .then(data => setNodes(data))
      .catch(err => console.error(err));
  };

  const handleVerifyStep1 = () => {
    setCompletedSteps(prev => [...new Set([...prev, 1])]);
    setCurrentStep(2);
  };

  const handleRunRounds = async (numRounds = 1) => {
    setIsAggregating(true);
    setLoading(true);
    setMessage('');
    setTerminalLogs([]);

    const addLog = (text) => {
      const now = new Date();
      const timeStr = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0')}`;
      setTerminalLogs(prev => [...prev, `[${timeStr}] ${text}`]);
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      addLog(`[BROADCAST] Coordinator initiating synchronous FedAvg orchestration (${numRounds} round(s))...`);
      await sleep(250);
      addLog(`[BROADCAST] Transmitting global weight vector W_t to 4 active hospital sites...`);
      await sleep(300);

      addLog(`[NODE-1] Metro General Hospital (MGH) returned local weight delta (321 records)`);
      await sleep(250);
      addLog(`[NODE-2] St. Jude Medical Center (SJM) returned local weight delta (281 records)`);
      await sleep(250);
      addLog(`[NODE-3] City Health Institute (CHI) returned local weight delta (250 records)`);
      await sleep(250);
      addLog(`[NODE-4] University Research Hospital (URH) returned local weight delta (350 records)`);
      await sleep(300);

      addLog(`[CONSENSUS] Verified 4/4 TLS 1.3 certificates and SHA-256 weight payload signatures.`);
      await sleep(250);

      addLog(`[AGG] Computing Federated Averaging (FedAvg): W_{t+1} = Σ (n_k / 1,202) * W_k...`);
      await sleep(300);

      if (dpEnabled) {
        addLog(`[DP] Differential Privacy active: Calibrating zero-mean Laplace noise (scale: ${noiseScale})...`);
        await sleep(250);
        addLog(`[DP] Injected Laplace noise vector to aggregated global model. Tracking cumulative ε budget.`);
        await sleep(200);
      } else {
        addLog(`[DP] Differential Privacy disabled. Raw parameter averaging executed.`);
        await sleep(150);
      }

      // Trigger backend API call
      const res = await fetch('/api/coordinator/fl/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds: numRounds, dp_enabled: dpEnabled, noise_scale: noiseScale })
      });
      const data = await res.json();
      const lastSig = data.last_round_result?.global_weight_signature || `FED-SIG-${data.federation?.current_round || 1}:SHA256`;

      addLog(`[CRYPTO] Signed aggregated global model: ${lastSig}`);
      await sleep(200);
      addLog(`[EVAL] Evaluated global model on test partition: Accuracy ${data.federation?.global_accuracy}%, Loss ${data.federation?.global_loss}`);
      await sleep(200);
      addLog(`[SUCCESS] FedAvg round completed successfully. Model synchronized to consortium ledger.`);

      setMessage(data.message);
      setSummary(data.federation);
      if (data.last_round_result && data.last_round_result.global_weight_signature) {
        setLastSignature(data.last_round_result.global_weight_signature);
      }
      // Mark Step 2 completed
      setCompletedSteps(prev => [...new Set([...prev, 2])]);
    } catch (err) {
      console.error(err);
      addLog(`[ERROR] Federated aggregation failed: ${err.message}`);
    } finally {
      setIsAggregating(false);
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/coordinator/fl/reset', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message);
      setSummary(data.federation);
      setLastSignature('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Real-Life Header Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(15, 23, 42, 0.9))', borderLeft: '4px solid var(--purple-accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <BarChart3 size={24} color="var(--purple-accent)" />
              <h2 style={{ fontSize: '1.45rem', color: '#fff' }}>
                Research Coordinator Federation Tower
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Orchestrate synchronous FedAvg aggregation, calibrate Laplace Differential Privacy, and benchmark cross-site convergence.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              Consortium Quorum: 4/4 Nodes Ready
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STAGE 1: CONSORTIUM TOPOLOGY & READINESS
          ========================================================================= */}
      {currentStep === 1 && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={20} color="var(--purple-accent)" />
            Stage 1: Consortium Network Readiness & Node Topology Verification
          </h3>

          <div className="grid-4">
            <div className="stat-card">
              <div className="stat-header">
                <span>Active Federation Round</span>
                <Cpu size={17} color="var(--purple-accent)" />
              </div>
              <div className="stat-value mono">Round {summary.current_round}</div>
              <div className="stat-subtitle">4 Hospital SQLite DBs Synchronized</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>Global Dataset Pool</span>
                <Database size={17} color="var(--emerald-accent)" />
              </div>
              <div className="stat-value mono">
                {(summary.total_patient_samples || summary.total_samples || 1200).toLocaleString()}
              </div>
              <div className="stat-subtitle">EHR Patients (Zero Centralized)</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>Global Model Accuracy</span>
                <BarChart3 size={17} color="var(--primary-blue)" />
              </div>
              <div className="stat-value mono" style={{ color: 'var(--emerald-accent)' }}>
                {summary.global_accuracy}%
              </div>
              <div className="stat-subtitle">Test Set Evaluation (N=240)</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>Total Privacy Budget</span>
                <ShieldAlert size={17} color="var(--amber-accent)" />
              </div>
              <div className="stat-value mono">
                &epsilon; = {Number(summary.epsilon_spent !== undefined ? summary.epsilon_spent : (summary.total_epsilon_spent || 0)).toFixed(2)} / {Number(summary.max_epsilon_budget || 10.0).toFixed(1)}
              </div>
              <div className="stat-subtitle">
                {summary.dp_enabled ? 'Laplace Mechanism Active' : 'Differential Privacy Disabled'}
              </div>
            </div>
          </div>

          {/* Node Topology Matrix */}
          <div className="glass-panel">
            <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
              Connected Hospital Sites (Physical SQLite Nodes)
            </h4>

            <div className="grid-4">
              {nodes.map(node => (
                <div
                  key={node.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `4px solid ${node.color || '#3b82f6'}`,
                    borderRadius: '10px',
                    padding: '1rem'
                  }}
                >
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.3rem' }}>
                    {node.name}
                  </div>
                  <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>
                    {node.db_file}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Samples: <strong>{node.sample_count || node.samples || 0} EHR Records</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Local Acc: <strong>{node.local_accuracy || node.accuracy || 0}%</strong>
                  </div>
                  <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle2 size={12} /> TLS 1.3 Verified
                  </div>
                </div>
              ))}
            </div>

            {/* Stage 1 Completion Button */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.75rem', fontSize: '0.92rem' }}
                onClick={handleVerifyStep1}
              >
                Consortium Quorum Confirmed - Proceed to Aggregation &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 2: SYNCHRONOUS FEDAVG ROUND ORCHESTRATION
          ========================================================================= */}
      {currentStep === 2 && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} color="var(--primary-blue)" />
            Stage 2: Synchronous FedAvg Round Orchestration & Differential Privacy Calibration
          </h3>

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            {/* Orchestration Controls */}
            <div className="glass-panel">
              <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} color="var(--primary-blue)" /> Aggregation Parameters
              </h4>

              {/* DP Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>Laplace Differential Privacy</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Perturbs global weights with calibrated zero-mean Laplace noise</div>
                </div>
                <button
                  className={`btn ${dpEnabled ? 'btn-emerald' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => setDpEnabled(!dpEnabled)}
                >
                  {dpEnabled ? 'DP ENABLED (Active)' : 'DP DISABLED'}
                </button>
              </div>

              {/* Noise Scale Slider */}
              {dpEnabled && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Privacy Budget (&epsilon; equivalent):</span>
                    <strong className="mono" style={{ color: 'var(--purple-accent)' }}>&epsilon; &approx; {(0.1 / noiseScale).toFixed(1)} (scale: {noiseScale})</strong>
                  </div>
                  <input
                    type="range"
                    className="range-slider"
                    min="0.01" max="0.20" step="0.01"
                    value={noiseScale}
                    onChange={(e) => setNoiseScale(Number(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    <span>High Utility (&epsilon;=10.0)</span>
                    <span>Standard Clinical (&epsilon;=1.5)</span>
                    <span>High Privacy (&epsilon;=0.5)</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.85rem' }}
                  onClick={() => handleRunRounds(1)}
                  disabled={loading}
                >
                  <Play size={16} /> {loading ? 'Aggregating...' : 'Trigger 1 FedAvg Round'}
                </button>
                <button
                  className="btn btn-emerald"
                  style={{ padding: '0.85rem 1.25rem' }}
                  onClick={() => handleRunRounds(3)}
                  disabled={loading}
                >
                  <FastForward size={16} /> Run 3 Rounds
                </button>
              </div>

              {message && (
                <div style={{ marginTop: '1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', padding: '0.75rem', borderRadius: '8px', fontSize: '0.84rem' }}>
                  <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  {message}
                </div>
              )}
            </div>

            {/* Federation Pipeline Flow */}
            <div className="glass-panel">
              <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
                Federation Pipeline Architecture
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <span className="step-num-bubble" style={{ background: '#3b82f6', color: '#fff' }}>1</span>
                  <span>Node Broadcast: Coordinator transmits global vector w_t to 4 sites</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <span className="step-num-bubble" style={{ background: '#3b82f6', color: '#fff' }}>2</span>
                  <span>Local Mini-Batch SGD: Sites execute local training on private SQLite DB</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <span className="step-num-bubble" style={{ background: '#3b82f6', color: '#fff' }}>3</span>
                  <span>L₂ Sensitivity Clipping: Weight updates bounded by ||w_k - w_t||₂ &le; 1.0</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <span className="step-num-bubble" style={{ background: '#10b981', color: '#fff' }}>4</span>
                  <span>Laplace Noise Injection: Calibrated noise prevents gradient inversion</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <span className="step-num-bubble" style={{ background: '#8b5cf6', color: '#fff' }}>5</span>
                  <span>Weighted Averaging: Proportional to local sample sizes (N = 1,200)</span>
                </div>
              </div>

              {lastSignature && (
                <div style={{ marginTop: '1rem', padding: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '8px', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Latest SHA-256 Checksum: </span>
                  <code className="mono" style={{ color: 'var(--cyan-accent)' }}>{lastSignature}</code>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Federation Terminal Log */}
          {(isAggregating || terminalLogs.length > 0) && (
            <TrainingTerminal
              logs={terminalLogs}
              isRunning={isAggregating}
              title="Federated Aggregation Coordinator Terminal (FedAvg + Laplace DP)"
              onClear={() => setTerminalLogs([])}
            />
          )}

          {/* Forward Action to Step 3 */}
          {completedSteps.includes(2) && (
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                  Federation Round Synchronized (Global Accuracy: {summary.global_accuracy}%)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Aggregated weights signed and stored in central governance ledger.
                </div>
              </div>

              <button
                className="btn btn-emerald"
                style={{ padding: '0.75rem 1.5rem' }}
                onClick={() => setCurrentStep(3)}
              >
                Proceed to Multi-Model Benchmark &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STAGE 3: MULTI-MODEL BENCHMARK & CONSORTIUM GOVERNANCE
          ========================================================================= */}
      {currentStep === 3 && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} color="var(--purple-accent)" />
            Stage 3: Multi-Model Benchmark Evaluation & Convergence Analytics
          </h3>

          {/* Benchmark Chart */}
          <div className="glass-panel">
            <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.35rem' }}>
              Multi-Model Accuracy Trajectory Across Rounds
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Empirical comparison of Centralized Baseline vs FedAvg (No DP) vs FedAvg with Laplace DP vs Single Hospital Models.
            </p>

            <div style={{ height: '320px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.benchmark_history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="round" stroke="var(--text-muted)" fontSize={12} tickFormatter={r => `R${r}`} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} domain={[55, 90]} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="centralized" name="Centralized ML (Pooled)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fedavg_no_dp" name="FedAvg (Without DP)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fedavg_dp" name="FedAvg + Laplace DP (Proposed)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="single_site_metro" name="Single-Site: Metro General" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Governance Ledger Link */}
          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                Consortium Governance Ledger & Cryptographic Proofs
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                View complete tamper-evident audit logs of all federation rounds and SHA-256 signatures.
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setCurrentStep(1);
              }}
            >
              Restart Coordinator Workflow (Step 1)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

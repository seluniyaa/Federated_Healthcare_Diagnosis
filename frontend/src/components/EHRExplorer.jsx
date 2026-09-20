import React, { useState, useEffect } from 'react';
import { Database, Search, ArrowRight, UserCheck, Activity, ShieldCheck, Lock, RefreshCw } from 'lucide-react';

export const EHRExplorer = ({
  currentNodeId = 'metro_general',
  onSelectPatientRecord,
  allowSelection = false,
  refreshTrigger = 0
}) => {
  const [records, setRecords] = useState([]);
  const [dbFile, setDbFile] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(currentNodeId);

  useEffect(() => {
    setSelectedNode(currentNodeId);
    fetchEHRRecords(currentNodeId);
  }, [currentNodeId, refreshTrigger]);

  const fetchEHRRecords = async (nodeId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/ehr-records?node_id=${nodeId}&limit=15`);
      const data = await res.json();
      setRecords(data.records);
      setDbFile(data.db_file);
      setTotalRecords(data.total_records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeChange = (e) => {
    const newNode = e.target.value;
    setSelectedNode(newNode);
    fetchEHRRecords(newNode);
  };

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database color="var(--primary-blue)" size={20} />
            Hospital EHR Patient Database Explorer
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Direct read access to local SQLite file <span className="mono" style={{ color: 'var(--primary-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{dbFile || `${selectedNode}.db`}</span> ({totalRecords} records stored on-premise).
          </p>
        </div>

        {/* Database Status / Selector */}
        {allowSelection ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hospital Node:</span>
            <select className="form-select" value={selectedNode} onChange={handleNodeChange} style={{ fontSize: '0.85rem' }}>
              <option value="metro_general">Metro General Hospital (metro_general.db)</option>
              <option value="st_jude">St. Jude Medical Center (st_jude.db)</option>
              <option value="city_health">City Health Institute (city_health.db)</option>
              <option value="university_research">University Research Hospital (university_research.db)</option>
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="mono" style={{ fontSize: '0.8rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.28)', padding: '0.35rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={12} color="#3b82f6" /> {dbFile || `${selectedNode}.db`} (Locked to Login)
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => fetchEHRRecords(selectedNode)}
              disabled={loading}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Refresh records from local database"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.6rem' }}>Patient Record ID</th>
              <th style={{ padding: '0.6rem' }}>HIPAA Hash</th>
              <th style={{ padding: '0.6rem' }}>Age / Sex</th>
              <th style={{ padding: '0.6rem' }}>Chest Pain</th>
              <th style={{ padding: '0.6rem' }}>BP / Chol</th>
              <th style={{ padding: '0.6rem' }}>Max HR</th>
              <th style={{ padding: '0.6rem' }}>ST Dep.</th>
              <th style={{ padding: '0.6rem' }}>Troponin</th>
              <th style={{ padding: '0.6rem' }}>Admission Date</th>
              <th style={{ padding: '0.6rem' }}>Diagnosis Target</th>
              <th style={{ padding: '0.6rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading local SQLite database records...
                </td>
              </tr>
            ) : records.map((rec) => (
              <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="mono" style={{ padding: '0.6rem', color: '#fff', fontWeight: 600 }}>{rec.patient_id}</td>
                <td className="mono" style={{ padding: '0.6rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>{rec.anonymized_hash}</td>
                <td style={{ padding: '0.6rem', color: '#fff' }}>{rec.age} y / {rec.sex}</td>
                <td style={{ padding: '0.6rem', color: 'var(--text-muted)' }}>Type {rec.cp}</td>
                <td className="mono" style={{ padding: '0.6rem', color: '#fff' }}>{rec.trestbps} / {rec.chol}</td>
                <td className="mono" style={{ padding: '0.6rem', color: 'var(--text-muted)' }}>{rec.thalach} bpm</td>
                <td className="mono" style={{ padding: '0.6rem', color: rec.oldpeak > 1.0 ? 'var(--amber-accent)' : 'var(--text-muted)' }}>{rec.oldpeak} mm</td>
                <td className="mono" style={{ padding: '0.6rem', color: rec.troponin_level > 0.04 ? 'var(--red-accent)' : 'var(--emerald-accent)' }}>
                  {rec.troponin_level} ng/mL
                </td>
                <td className="mono" style={{ padding: '0.6rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>{rec.admission_date}</td>
                <td style={{ padding: '0.6rem' }}>
                  <span className="role-pill" style={{ background: rec.diagnosis_target === 1 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: rec.diagnosis_target === 1 ? '#ef4444' : '#10b981' }}>
                    {rec.diagnosis_label}
                  </span>
                </td>
                <td style={{ padding: '0.6rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                    onClick={() => onSelectPatientRecord && onSelectPatientRecord(rec)}
                  >
                    Load Case <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

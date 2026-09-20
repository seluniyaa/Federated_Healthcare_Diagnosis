import React, { useState, useEffect } from 'react';
import { Stethoscope, AlertTriangle, CheckCircle, Activity, FileText, Sparkles, RefreshCw, Database, ArrowRight, ShieldCheck, HeartPulse, CheckCircle2, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { XAIBarChart } from '../components/XAIBarChart';
import { EHRExplorer } from '../components/EHRExplorer';

const getNodePrefix = (nodeId) => {
  switch(nodeId) {
    case 'st_jude': return 'SJH';
    case 'city_health': return 'CHM';
    case 'university_research': return 'UMC';
    case 'metro_general':
    default: return 'MGH';
  }
};

const generatePatientId = (nodeId) => {
  const prefix = getNodePrefix(nodeId);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-2026-${rand}`;
};

export const DoctorView = ({
  currentStep = 1,
  setCurrentStep = () => {},
  completedSteps = [],
  setCompletedSteps = () => {}
}) => {
  const { user } = useAuth();
  const hospitalNode = user?.hospital_node || 'metro_general';
  const hospitalName = user?.hospital_name || 'Metro General Hospital';
  const doctorName = user?.full_name || 'Attending Physician';
  const dbFile = `${hospitalNode}.db`;

  const [formData, setFormData] = useState({
    patient_id: generatePatientId(hospitalNode),
    hospital_node: hospitalNode,
    age: 63,
    sex: 1,
    cp: 3,
    trestbps: 145,
    chol: 250,
    fbs: 1,
    restecg: 0,
    thalach: 150,
    exang: 0,
    oldpeak: 2.3,
    slope: 0,
    ca: 0,
    thal: 1
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [biomarkersConfirmed, setBiomarkersConfirmed] = useState(false);

  // Sync hospitalNode if user changes or loads
  useEffect(() => {
    if (hospitalNode && formData.hospital_node !== hospitalNode) {
      setFormData(prev => ({
        ...prev,
        hospital_node: hospitalNode,
        patient_id: generatePatientId(hospitalNode)
      }));
    }
  }, [hospitalNode]);

  // Auto-run analysis when stepping to Step 2 if not already done
  useEffect(() => {
    if (currentStep === 2 && !result && !loading) {
      handleAnalyze();
    }
  }, [currentStep]);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Calibrated 3 to 5 second delay for realistic clinical risk evaluation
      const delayMs = Math.floor(3000 + Math.random() * 2000);
      const [res] = await Promise.all([
        fetch('/api/doctor/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            hospital_node: hospitalNode
          })
        }),
        new Promise(resolve => setTimeout(resolve, delayMs))
      ]);
      const data = await res.json();
      if (data && data.feature_attributions) {
        data.feature_attributions = data.feature_attributions.filter(
          item => item.feature !== 'sex' && !item.label.toLowerCase().includes('sex')
        );
      }
      setResult(data);
      // Mark Step 2 completed
      setCompletedSteps(prev => [...new Set([...prev, 2])]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBiomarkers = () => {
    setBiomarkersConfirmed(true);
    // Mark Step 1 completed
    setCompletedSteps(prev => [...new Set([...prev, 1])]);
    // Advance to Step 2
    setCurrentStep(2);
  };

  const handleLoadRecordFromEHR = (record) => {
    setFormData({
      patient_id: record.patient_id,
      hospital_node: hospitalNode,
      age: record.age,
      sex: record.sex_num !== undefined ? record.sex_num : (record.sex === 'Male' ? 1 : 0),
      cp: record.cp,
      trestbps: record.trestbps,
      chol: record.chol,
      fbs: record.fbs,
      restecg: record.restecg,
      thalach: record.thalach,
      exang: record.exang,
      oldpeak: record.oldpeak,
      slope: record.slope,
      ca: record.ca,
      thal: record.thal
    });
    setBiomarkersConfirmed(false);
  };

  const applyPreset = (type) => {
    const prefix = getNodePrefix(hospitalNode);
    if (type === 'high') {
      setFormData({
        patient_id: `${prefix}-2026-CRIT-${Math.floor(10 + Math.random() * 89)}`,
        hospital_node: hospitalNode,
        age: 67, sex: 1, cp: 3, trestbps: 165, chol: 295, fbs: 1, restecg: 2, thalach: 112, exang: 1, oldpeak: 3.4, slope: 0, ca: 2, thal: 3
      });
    } else if (type === 'moderate') {
      setFormData({
        patient_id: `${prefix}-2026-MOD-${Math.floor(10 + Math.random() * 89)}`,
        hospital_node: hospitalNode,
        age: 54, sex: 1, cp: 1, trestbps: 138, chol: 238, fbs: 0, restecg: 1, thalach: 145, exang: 0, oldpeak: 1.2, slope: 1, ca: 1, thal: 2
      });
    } else if (type === 'low') {
      setFormData({
        patient_id: `${prefix}-2026-LOW-${Math.floor(10 + Math.random() * 89)}`,
        hospital_node: hospitalNode,
        age: 36, sex: 0, cp: 0, trestbps: 116, chol: 178, fbs: 0, restecg: 0, thalach: 178, exang: 0, oldpeak: 0.0, slope: 2, ca: 0, thal: 1
      });
    }
    setBiomarkersConfirmed(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Real-Life Clinical Header Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.9))', borderLeft: '4px solid var(--emerald-accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <Stethoscope size={24} color="var(--emerald-accent)" />
              <h2 style={{ fontSize: '1.45rem', color: '#fff' }}>
                Clinician Diagnostic & Decision-Support Workspace
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hospital Facility: <strong style={{ color: '#fff' }}>{hospitalName}</strong> | Attending Clinician: <strong style={{ color: 'var(--emerald-accent)' }}>{doctorName}</strong> | Database: <code className="mono">{dbFile}</code> <span style={{ color: 'var(--emerald-accent)', marginLeft: '0.5rem' }}>● On-Premise Locked</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Clinical Case Presets:</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem' }} onClick={() => applyPreset('high')}>
                Critical Case
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem' }} onClick={() => applyPreset('moderate')}>
                Moderate Case
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem' }} onClick={() => applyPreset('low')}>
                Normal Baseline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STAGE 1: PATIENT INTAKE & BIOMARKER VERIFICATION
          ========================================================================= */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* EHR Browser Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HeartPulse size={20} color="var(--emerald-accent)" />
              Stage 1: Patient Clinical Intake & Biomarker Review
            </h3>

            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
              onClick={() => setShowExplorer(!showExplorer)}
            >
              <Database size={15} color="var(--primary-blue)" />
              {showExplorer ? 'Hide EHR Database' : `Load from Hospital EHR Database (${dbFile})`}
            </button>
          </div>

          {showExplorer && (
            <EHRExplorer
              currentNodeId={hospitalNode}
              allowSelection={false}
              onSelectPatientRecord={handleLoadRecordFromEHR}
              selectedPatientId={formData.patient_id}
              refreshTrigger={result?.intake_sync?.node_sample_count}
            />
          )}

          {/* Form Input Matrix */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient ID:</span>
                <span className="mono" style={{ fontSize: '1.05rem', color: 'var(--emerald-accent)', fontWeight: 700 }}>
                  {formData.patient_id}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      patient_id: generatePatientId(hospitalNode)
                    }));
                    setBiomarkersConfirmed(false);
                  }}
                  title="Generate a new patient identifier for fresh intake"
                >
                  <PlusCircle size={13} /> New Intake Case
                </button>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                13 Cardiovascular Diagnostic Covariates (HL7 / FHIR Format) &bull; Auto-Sync to {dbFile}
              </span>
            </div>

            <div className="grid-3" style={{ gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Patient Age (years)</label>
                <input
                  type="number"
                  className="form-input"
                  min="18" max="100"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Biological Sex</label>
                <select
                  className="form-select"
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: Number(e.target.value) })}
                >
                  <option value={1}>Male (1)</option>
                  <option value={0}>Female (0)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chest Pain Category</label>
                <select
                  className="form-select"
                  value={formData.cp}
                  onChange={(e) => setFormData({ ...formData, cp: Number(e.target.value) })}
                >
                  <option value={0}>0: Typical Angina</option>
                  <option value={1}>1: Atypical Angina</option>
                  <option value={2}>2: Non-anginal Discomfort</option>
                  <option value={3}>3: Asymptomatic Ischemia</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Resting Blood Pressure: <span className="mono" style={{ color: '#fff' }}>{formData.trestbps} mm Hg</span>
                </label>
                <input
                  type="range"
                  className="range-slider"
                  min="90" max="200"
                  value={formData.trestbps}
                  onChange={(e) => setFormData({ ...formData, trestbps: Number(e.target.value) })}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Normal: 90-120 | Stage 1 HTN: 130-139 | Crisis: 180+</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Serum Cholesterol: <span className="mono" style={{ color: '#fff' }}>{formData.chol} mg/dl</span>
                </label>
                <input
                  type="range"
                  className="range-slider"
                  min="120" max="500"
                  value={formData.chol}
                  onChange={(e) => setFormData({ ...formData, chol: Number(e.target.value) })}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Desirable: &lt;200 | Borderline: 200-239 | High: 240+</span>
              </div>

              <div className="form-group">
                <label className="form-label">Fasting Blood Sugar (&gt; 120 mg/dl)</label>
                <select
                  className="form-select"
                  value={formData.fbs}
                  onChange={(e) => setFormData({ ...formData, fbs: Number(e.target.value) })}
                >
                  <option value={0}>False: Normal (&le; 120 mg/dl)</option>
                  <option value={1}>True: Elevated Diabetic Risk (&gt; 120 mg/dl)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resting Electrocardiography</label>
                <select
                  className="form-select"
                  value={formData.restecg}
                  onChange={(e) => setFormData({ ...formData, restecg: Number(e.target.value) })}
                >
                  <option value={0}>0: Normal Sinus Rhythm</option>
                  <option value={1}>1: ST-T Wave Abnormality</option>
                  <option value={2}>2: Left Ventricular Hypertrophy</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Max Exercise Heart Rate: <span className="mono" style={{ color: '#fff' }}>{formData.thalach} bpm</span>
                </label>
                <input
                  type="range"
                  className="range-slider"
                  min="70" max="210"
                  value={formData.thalach}
                  onChange={(e) => setFormData({ ...formData, thalach: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Exercise-Induced Angina</label>
                <select
                  className="form-select"
                  value={formData.exang}
                  onChange={(e) => setFormData({ ...formData, exang: Number(e.target.value) })}
                >
                  <option value={0}>No (0)</option>
                  <option value={1}>Yes (1)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  ST Depression (oldpeak): <span className="mono" style={{ color: '#fff' }}>{formData.oldpeak} mm</span>
                </label>
                <input
                  type="range"
                  className="range-slider"
                  min="0.0" max="6.0" step="0.1"
                  value={formData.oldpeak}
                  onChange={(e) => setFormData({ ...formData, oldpeak: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Peak Exercise ST Slope</label>
                <select
                  className="form-select"
                  value={formData.slope}
                  onChange={(e) => setFormData({ ...formData, slope: Number(e.target.value) })}
                >
                  <option value={0}>0: Upsloping (Normal)</option>
                  <option value={1}>1: Flat (Ischemic)</option>
                  <option value={2}>2: Downsloping (Severe Ischemia)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Major Vessels Colored (Fluoroscopy)</label>
                <select
                  className="form-select"
                  value={formData.ca}
                  onChange={(e) => setFormData({ ...formData, ca: Number(e.target.value) })}
                >
                  <option value={0}>0 Vessels Stenosed</option>
                  <option value={1}>1 Vessel Stenosed</option>
                  <option value={2}>2 Vessels Stenosed</option>
                  <option value={3}>3 Vessels Stenosed</option>
                </select>
              </div>
            </div>

            {/* Stage 1 Completion Button */}
            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-emerald"
                style={{ padding: '0.8rem 1.75rem', fontSize: '0.95rem' }}
                onClick={handleConfirmBiomarkers}
              >
                <CheckCircle2 size={18} /> Confirm Patient Biomarkers & Advance to AI Diagnosis &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 2: AI RISK STRATIFICATION & INFERENCE
          ========================================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="var(--primary-blue)" />
            Stage 2: Federated AI Diagnostic Inference & Risk Stratification
          </h3>

          {/* Live Sync Badge */}
          {result?.intake_sync && (
            <div className="glass-panel" style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '4px solid var(--emerald-accent)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={20} color="var(--emerald-accent)" />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#fff' }}>
                    Live EHR Database Synchronized ({dbFile})
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Patient <code>{formData.patient_id}</code> stored into {hospitalName} on-premise SQLite records. Institutional cohort: <strong>{result.intake_sync.node_sample_count} records</strong> (Global Federation: {result.intake_sync.total_federation_samples}). Synchronized across Doctor, Admin, and Coordinator views.
                  </div>
                </div>
              </div>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--emerald-accent)', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                SQLite Active
              </span>
            </div>
          )}

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            {/* Patient Snapshot */}
            <div className="glass-panel">
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Patient Case Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>Patient ID: <strong className="mono" style={{ color: '#fff' }}>{formData.patient_id}</strong></div>
                <div>Age / Sex: <strong style={{ color: '#fff' }}>{formData.age} yrs / {formData.sex === 1 ? 'Male' : 'Female'}</strong></div>
                <div>Blood Pressure: <strong style={{ color: '#fff' }}>{formData.trestbps} mm Hg</strong></div>
                <div>Cholesterol: <strong style={{ color: '#fff' }}>{formData.chol} mg/dl</strong></div>
                <div>ST Depression: <strong style={{ color: '#fff' }}>{formData.oldpeak} mm</strong></div>
                <div>Fluoroscopy Vessels: <strong style={{ color: '#fff' }}>{formData.ca}</strong></div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  <Sparkles size={16} /> {loading ? 'Running Federated Model Inference...' : 'Re-Run Clinical AI Inference'}
                </button>
              </div>
            </div>

            {/* Diagnostic Assessment Gauge */}
            <div>
              {result ? (
                <div className="glass-panel" style={{ textAlign: 'center', borderTop: `4px solid ${result.risk_color}` }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Calculated Cardiovascular Disease Risk
                  </div>

                  <div
                    className="risk-circle"
                    style={{
                      margin: '1rem auto',
                      color: result.risk_color,
                      borderColor: result.risk_color
                    }}
                  >
                    <span className="risk-circle-score mono">{result.risk_score_pct}%</span>
                    <span className="risk-circle-label">{result.risk_category}</span>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <span className={`badge-triage ${result.risk_score_pct >= 65 ? 'critical' : result.risk_score_pct >= 35 ? 'moderate' : 'normal'}`}>
                      {result.risk_score_pct >= 65 ? 'URGENT: Cardiac Specialist Review' : result.risk_score_pct >= 35 ? 'MODERATE: Diagnostic Stress Test' : 'LOW RISK: Routine Monitoring'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {result.recommendation}
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <Activity size={36} color="var(--primary-blue)" className="pulse-node" style={{ marginBottom: '0.75rem' }} />
                  <div style={{ color: '#fff', fontWeight: 600 }}>Analyzing Case Against Global Model...</div>
                </div>
              )}
            </div>
          </div>

          {/* Forward Action to Step 3 */}
          {result && (
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                  Inference Complete ({result.risk_score_pct}% Probability)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Model output is mathematically validated with Laplace Differential Privacy (&epsilon;=1.5).
                </div>
              </div>

              <button
                className="btn btn-emerald"
                style={{ padding: '0.75rem 1.5rem' }}
                onClick={() => setCurrentStep(3)}
              >
                Proceed to Explainable AI & Attributions &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STAGE 3: EXPLAINABLE AI & CLINICAL REPORT
          ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--purple-accent)" />
              Stage 3: Explainable AI (SHAP) Biomarker Breakdown & Clinical Report
            </h3>
          </div>

          {result && (
            <>
              {/* Live Sync Badge in Stage 3 */}
              {result?.intake_sync && (
                <div className="glass-panel" style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '4px solid var(--emerald-accent)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CheckCircle2 size={18} color="var(--emerald-accent)" />
                    <span style={{ fontSize: '0.82rem', color: '#fff' }}>
                      Diagnostic record for <strong>{formData.patient_id}</strong> committed to <code>{dbFile}</code> ({result.intake_sync.node_sample_count} patient cases active).
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--emerald-accent)' }}>
                    Consortium Synced
                  </span>
                </div>
              )}

              {/* SHAP Waterfall / Feature Attributions */}
              <XAIBarChart
                attributions={result.feature_attributions}
                referenceAnalysis={result.reference_analysis}
                riskScorePct={result.risk_score_pct}
                baseProbPct={result.base_probability_pct}
                recommendation={result.recommendation}
                riskColor={result.risk_color}
              />

              {/* Formal Clinical Consultation Summary Note */}
              <div className="glass-panel" style={{ borderLeft: '4px solid var(--primary-blue)' }}>
                <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} color="var(--primary-blue)" /> Formal Clinical Consultation Summary
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                  <div><strong>Patient Identifier:</strong> {formData.patient_id}</div>
                  <div><strong>Diagnostic Risk:</strong> {result.risk_score_pct}% ({result.risk_category})</div>
                  <div><strong>Attending Physician:</strong> {doctorName}</div>
                  <div><strong>Institutional Facility:</strong> {hospitalName} ({dbFile})</div>
                  <div><strong>Model Version:</strong> Federated Averaging (Laplace DP &epsilon;=1.5)</div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1rem' }}>
                  <strong>Diagnostic Recommendation:</strong> {result.recommendation} Top risk contributors include <strong>{result.feature_attributions?.[0]?.label || 'Clinical biomarkers'}</strong> and <strong>{result.feature_attributions?.[1]?.label || 'vitals'}</strong>. This electronic assessment was generated locally without sharing raw patient data outside {hospitalName} custody.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setCurrentStep(1);
                      setBiomarkersConfirmed(false);
                      setResult(null);
                      setFormData(prev => ({
                        ...prev,
                        patient_id: generatePatientId(hospitalNode)
                      }));
                    }}
                  >
                    Start New Patient Intake
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

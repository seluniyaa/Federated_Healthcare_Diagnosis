import React from 'react';
import { AlertCircle, CheckCircle2, Info, Activity, FileText, Stethoscope } from 'lucide-react';

export const XAIBarChart = ({ attributions, referenceAnalysis, riskScorePct, baseProbPct, recommendation, riskColor }) => {
  if (!attributions || attributions.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
      {/* SHAP Feature Contribution Waterfall */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
              <Info color="var(--primary-blue)" size={20} />
              Explainable AI (SHAP Feature Attribution Breakdown)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              SHAP linear log-odds contribution analysis. Baseline Population Risk: <span className="mono" style={{ color: '#fff' }}>{baseProbPct}%</span> &rarr; Evaluated Patient Risk: <span className="mono" style={{ color: riskColor, fontWeight: 700 }}>{riskScorePct}%</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {attributions.map((item, idx) => {
            const isIncreases = item.direction === 'increases_risk';
            const maxImpact = 25;
            const widthPct = Math.min(Math.abs(item.impact_score) / maxImpact * 100, 100);

            return (
              <div key={idx} className="xai-item">
                <div className="xai-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                    {isIncreases ? (
                      <AlertCircle size={15} color="var(--red-accent)" />
                    ) : (
                      <CheckCircle2 size={15} color="var(--emerald-accent)" />
                    )}
                    {item.label}
                    <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      val: {item.value}
                    </span>
                  </span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: isIncreases ? 'var(--red-accent)' : 'var(--emerald-accent)' }}>
                    {isIncreases ? `+${item.impact_score}% Risk` : `${item.impact_score}% Risk`}
                  </span>
                </div>

                <div className="xai-bar-track">
                  <div
                    className={`xai-bar-fill ${isIncreases ? 'fill-red' : 'fill-green'}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.1rem' }}>
                  {item.rationale}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical Reference Range & Laboratory Matrix */}
      {referenceAnalysis && referenceAnalysis.length > 0 && (
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="var(--cyan-accent)" size={18} />
            Clinical Reference Threshold Matrix
          </h3>

          <div className="grid-3" style={{ gap: '1rem' }}>
            {referenceAnalysis.map((ref, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: `1px solid ${ref.is_abnormal ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                  borderRadius: '10px',
                  padding: '0.85rem'
                }}
              >
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{ref.label}</div>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>
                  {ref.patient_value}
                </div>
                <span
                  className="role-pill"
                  style={{
                    background: ref.is_abnormal ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: ref.is_abnormal ? '#ef4444' : '#10b981',
                    fontSize: '0.72rem'
                  }}
                >
                  {ref.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACC/AHA Treatment Guidelines Action Plan */}
      <div
        className="glass-panel"
        style={{
          borderColor: riskColor,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))'
        }}
      >
        <h3 style={{ fontSize: '1.1rem', color: riskColor, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Stethoscope size={20} />
          ACC/AHA Clinical Decision Support Recommendation Plan
        </h3>
        <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: '1.6' }}>
          {recommendation}
        </p>
      </div>
    </div>
  );
};

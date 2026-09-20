import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Stethoscope, Building2, BarChart3, ShieldCheck, Network, CheckCircle2, Lock } from 'lucide-react';

const ROLE_WORKFLOW_STEPS = {
  doctor: [
    { id: 1, title: '1. Patient Biomarkers', desc: 'Input or load EHR patient record' },
    { id: 2, title: '2. AI Risk Stratification', desc: 'Execute federated diagnostic model' },
    { id: 3, title: '3. Explainable AI & Report', desc: 'Inspect SHAP attributions & report' }
  ],
  admin: [
    { id: 1, title: '1. Node Telemetry & DB', desc: 'Verify local SQLite EHR records' },
    { id: 2, title: '2. On-Premise SGD Training', desc: 'Execute local SGD epoch on node DB' },
    { id: 3, title: '3. Privacy Quota & Audit', desc: 'Verify DP budget & SHA-256 hash' }
  ],
  researcher: [
    { id: 1, title: '1. Consortium Topology', desc: 'Verify 4 hospital nodes & quorum' },
    { id: 2, title: '2. Synchronous FedAvg', desc: 'Execute aggregation with Laplace DP' },
    { id: 3, title: '3. Multi-Model Benchmark', desc: 'Compare FedAvg vs Single Site vs Central' }
  ]
};

export const MasterNavHeader = ({
  activeTab,
  setActiveTab,
  currentStep,
  setCurrentStep,
  completedSteps
}) => {
  const { user } = useContext(AuthContext);

  const activeRole = user?.role || 'doctor';
  const steps = ROLE_WORKFLOW_STEPS[activeRole] || ROLE_WORKFLOW_STEPS.doctor;

  const isStepUnlocked = (stepId) => {
    if (stepId === 1) return true;
    for (let s = 1; s < stepId; s++) {
      if (!completedSteps.includes(s)) return false;
    }
    return true;
  };

  const handleStepClick = (stepId) => {
    if (isStepUnlocked(stepId)) {
      setCurrentStep(stepId);
    }
  };

  return (
    <nav className="master-nav-header">
      <div className="master-nav-inner">
        {user ? (
          /* LOGGED IN: ONLY SHOW NAVIGATION BASED ON THE LOGGED-IN ROLE */
          <>
            {/* Left: Role-Specific Primary Workspace Nav */}
            <div className="nav-role-tabs">
              {user.role === 'doctor' && (
                <button
                  className={`nav-tab ${activeTab === 'doctor' ? 'active' : ''}`}
                  onClick={() => setActiveTab('doctor')}
                  title="Clinician Diagnostic Intake & SHAP Explainability"
                >
                  <Stethoscope size={15} color="var(--emerald-accent)" />
                  <span>Doctor Workspace ({user.hospital_name || 'Hospital Node'})</span>
                </button>
              )}

              {user.role === 'admin' && (
                <button
                  className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                  title="Hospital Node Telemetry & Local SGD Training"
                >
                  <Building2 size={15} color="var(--primary-blue)" />
                  <span>Admin Dashboard ({user.hospital_name || 'Hospital Node'})</span>
                </button>
              )}

              {user.role === 'researcher' && (
                <button
                  className={`nav-tab ${activeTab === 'researcher' ? 'active' : ''}`}
                  onClick={() => setActiveTab('researcher')}
                  title="Consortium Federation & FedAvg Orchestration"
                >
                  <BarChart3 size={15} color="var(--purple-accent)" />
                  <span>Coordinator Tower (Consortium Hub)</span>
                </button>
              )}

              {/* Role-Scoped Secondary Utilities (Hidden for Doctor to preserve pure clinical focus) */}
              {user.role === 'admin' && (
                <>
                  <div style={{ height: '22px', width: '1px', background: 'var(--border-color)', margin: '0 0.4rem' }}></div>
                  <button
                    className={`nav-tab ${activeTab === 'governance' ? 'active' : ''}`}
                    onClick={() => setActiveTab(activeTab === 'governance' ? user.role : 'governance')}
                    title="Cryptographic Audit Ledger & Compliance"
                  >
                    <ShieldCheck size={15} />
                    <span>Governance Audit</span>
                  </button>
                </>
              )}

              {user.role === 'researcher' && (
                <>
                  <div style={{ height: '22px', width: '1px', background: 'var(--border-color)', margin: '0 0.4rem' }}></div>
                  <button
                    className={`nav-tab ${activeTab === 'governance' ? 'active' : ''}`}
                    onClick={() => setActiveTab(activeTab === 'governance' ? user.role : 'governance')}
                    title="Cryptographic Audit Ledger & Compliance"
                  >
                    <ShieldCheck size={15} />
                    <span>Governance Ledger</span>
                  </button>

                  <button
                    className={`nav-tab ${activeTab === 'topology' ? 'active' : ''}`}
                    onClick={() => setActiveTab(activeTab === 'topology' ? user.role : 'topology')}
                    title="Hospital Network Map & Endpoints"
                  >
                    <Network size={15} />
                    <span>Consortium Topology</span>
                  </button>
                </>
              )}
            </div>

            {/* Right: Guided Forward-Only Stepper for Logged-In Role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Workflow:
              </span>

              <div className="workflow-steps-track" style={{ maxWidth: '480px' }}>
                {steps.map((step) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isActive = currentStep === step.id;
                  const isUnlocked = isStepUnlocked(step.id);

                  let statusClass = 'locked';
                  if (isActive) statusClass = 'active';
                  else if (isCompleted) statusClass = 'completed';

                  return (
                    <button
                      key={step.id}
                      className={`workflow-step-pill ${statusClass}`}
                      onClick={() => handleStepClick(step.id)}
                      disabled={!isUnlocked}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      title={!isUnlocked ? `Complete previous step to unlock.` : step.desc}
                    >
                      <div className="step-num-bubble" style={{ width: 18, height: 18, fontSize: '0.68rem' }}>
                        {isCompleted ? <CheckCircle2 size={12} /> : step.id}
                      </div>
                      <span>{step.title}</span>
                      {!isUnlocked && <Lock size={11} color="var(--text-dim)" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* LOGGED OUT (Login Screen Nav Bar): Clean Portal Bar with No Unwanted Taglines */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Authorized Clinical & Research AI Access Gateway
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
              Select facility below to sign in to institutional nodes
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

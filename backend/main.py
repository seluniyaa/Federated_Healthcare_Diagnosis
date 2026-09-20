import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from database import (
    ensure_db_dirs,
    get_node_db_path,
    get_central_db_path,
    get_db_connection,
    sync_doctor_patient_intake,
    log_audit_event,
    HOSPITAL_NODES_CONFIG
)
from federated_engine import (
    FederatedModel,
    federated_averaging,
    explain_prediction_shap,
    compute_sha256_signature,
    FEATURE_NAMES,
    INITIAL_WEIGHTS,
    INITIAL_BIAS
)
from auth import (
    authenticate_user,
    create_access_token,
    verify_access_token,
    HOSPITAL_DISPLAY_NAMES,
    PHYSICIAN_NAMES
)

app = FastAPI(
    title="Privacy-Preserving Federated Healthcare Diagnosis Platform",
    description="Decentralized multi-hospital clinical AI platform powered by FedAvg, Laplace Differential Privacy, and SHAP Explainability.",
    version="3.0.0"
)

# Enable CORS for local React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event: ensure database directories and files exist
@app.on_event("startup")
def startup_event():
    ensure_db_dirs()
    central_path = get_central_db_path()
    if not central_path.exists():
        from init_real_databases import build_all_databases
        build_all_databases()

# =========================================================================
# MODELS / SCHEMAS
# =========================================================================

class LoginRequest(BaseModel):
    email: str
    password: str
    hospital_node: str = "metro_general"

class PatientPredictRequest(BaseModel):
    patient_id: Optional[str] = None
    hospital_node: str = "metro_general"
    age: int = Field(63, ge=18, le=105)
    sex: int = Field(1, ge=0, le=1)
    cp: int = Field(3, ge=0, le=3)
    trestbps: int = Field(145, ge=80, le=240)
    chol: int = Field(250, ge=100, le=600)
    fbs: int = Field(1, ge=0, le=1)
    restecg: int = Field(0, ge=0, le=2)
    thalach: int = Field(150, ge=60, le=230)
    exang: int = Field(0, ge=0, le=1)
    oldpeak: float = Field(2.3, ge=0.0, le=8.0)
    slope: int = Field(0, ge=0, le=2)
    ca: int = Field(0, ge=0, le=3)
    thal: int = Field(1, ge=1, le=3)

class NodeTrainRequest(BaseModel):
    node_id: str = "metro_general"
    epochs: int = Field(20, ge=1, le=100)
    lr: float = Field(0.05, ge=0.001, le=1.0)

class FedAvgRoundRequest(BaseModel):
    rounds: int = Field(1, ge=1, le=10)
    dp_enabled: bool = True
    noise_scale: float = Field(0.05, ge=0.001, le=0.5)

# Helper: load current global model from central federation DB
def get_global_model_from_db() -> FederatedModel:
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    row = conn.execute("SELECT weights_json FROM federation_state WHERE id = 1").fetchone()
    conn.close()
    
    if row and row["weights_json"]:
        try:
            data = json.loads(row["weights_json"])
            return FederatedModel.from_dict(data)
        except Exception:
            pass
    return FederatedModel()

# Helper: get test cohort from central DB
def get_test_cohort_from_db() -> Tuple[np.ndarray, np.ndarray]:
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    rows = conn.execute("SELECT * FROM test_cohort").fetchall()
    conn.close()
    
    if not rows:
        from data_generator import generate_holdout_test_cohort
        test_records = generate_holdout_test_cohort(240)
        X = np.array([[r[feat] for feat in FEATURE_NAMES] for r in test_records], dtype=np.float64)
        y = np.array([r["diagnosis"] for r in test_records], dtype=np.float64)
        return X, y

    X = np.array([[row[feat] for feat in FEATURE_NAMES] for row in rows], dtype=np.float64)
    y = np.array([row["diagnosis"] for row in rows], dtype=np.float64)
    return X, y

# =========================================================================
# ROOT & HEALTH CHECK
# =========================================================================

@app.get("/")
def root_status():
    return {
        "status": "online",
        "system": "Privacy-Preserving Federated Healthcare Diagnosis Platform",
        "architecture": "Decentralized Physical SQLite Edge Nodes + Central FedAvg Hub",
        "version": "3.0.0",
        "privacy": "Laplace Differential Privacy (epsilon=1.5)",
        "security": "SHA-256 Signed Weight Verification",
        "xai": "Shapley Additive Explanations (Linear SHAP)"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# =========================================================================
# AUTHENTICATION
# =========================================================================

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = authenticate_user(req.email, req.password, req.hospital_node)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid institutional credentials or facility affiliation.")
    
    token = create_access_token(user)
    return {"user": user, "token": token}

# =========================================================================
# DOCTOR CLINICAL WORKSPACE ENDPOINTS
# =========================================================================

@app.post("/api/doctor/predict")
def predict_diagnosis(req: PatientPredictRequest):
    """
    Executes clinical AI risk prediction, generates linear SHAP feature attributions,
    and atomically persists the intake case directly into that hospital's local SQLite database.
    """
    node_id = req.hospital_node
    if node_id not in HOSPITAL_NODES_CONFIG:
        node_id = "metro_general"

    global_model = get_global_model_from_db()
    req_dict = req.dict()
    
    # 1. Compute explainable prediction with SHAP attributions
    xai_result = explain_prediction_shap(global_model, req_dict)
    
    # 2. Binary predicted diagnosis for clinical EHR records
    predicted_diagnosis = 1 if xai_result["risk_score_pct"] >= 50.0 else 0
    
    # 3. Dynamic On-Premise EHR Write-Synchronization
    doctor_name = PHYSICIAN_NAMES.get(node_id, "Attending Clinician")
    sync_result = sync_doctor_patient_intake(
        hospital_node=node_id,
        doctor_name=doctor_name,
        patient_data=req_dict,
        predicted_diagnosis=predicted_diagnosis
    )

    xai_result["intake_sync"] = sync_result
    return xai_result

@app.get("/api/doctor/ehr-records")
def get_ehr_records(node_id: str = Query("metro_general"), limit: int = Query(15)):
    """
    Queries on-premise SQLite records sorted by id DESC so newly intaken patients appear first.
    """
    node_db_path = get_node_db_path(node_id)
    if not node_db_path.exists():
        raise HTTPException(status_code=404, detail=f"Database for node '{node_id}' not found.")

    conn = get_db_connection(node_db_path)
    total_count = conn.execute("SELECT COUNT(*) FROM ehr_records").fetchone()[0]
    
    rows = conn.execute(
        "SELECT * FROM ehr_records ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()

    records = []
    for r in rows:
        records.append({
            "id": r["id"],
            "patient_id": r["patient_id"],
            "anonymized_hash": r["anonymized_hash"],
            "doctor_name": r["doctor_name"],
            "age": r["age"],
            "sex": "Male" if r["sex"] == 1 else "Female",
            "sex_num": r["sex"],
            "cp": r["cp"],
            "trestbps": r["trestbps"],
            "chol": r["chol"],
            "fbs": r["fbs"],
            "restecg": r["restecg"],
            "thalach": r["thalach"],
            "exang": r["exang"],
            "oldpeak": r["oldpeak"],
            "slope": r["slope"],
            "ca": r["ca"],
            "thal": r["thal"],
            "troponin_level": r["troponin_level"],
            "admission_date": r["admission_date"],
            "diagnosis_target": r["diagnosis"],
            "diagnosis_label": "Cardiac Event (1)" if r["diagnosis"] == 1 else "Negative / Control (0)"
        })

    db_filename = HOSPITAL_NODES_CONFIG.get(node_id, {}).get("db_file", f"{node_id}.db")
    return {
        "records": records,
        "db_file": db_filename,
        "total_records": total_count
    }

# =========================================================================
# HOSPITAL ADMINISTRATOR ENDPOINTS
# =========================================================================

@app.get("/api/admin/nodes")
def get_admin_nodes():
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    rows = conn.execute("SELECT * FROM consortium_nodes ORDER BY id ASC").fetchall()
    conn.close()

    nodes = []
    for r in rows:
        nodes.append({
            "id": r["id"],
            "name": r["name"],
            "db_file": r["db_file"],
            "samples": r["sample_count"],
            "sample_count": r["sample_count"],
            "accuracy": r["local_accuracy"],
            "local_accuracy": r["local_accuracy"],
            "loss": r["local_loss"],
            "color": r["color"],
            "ip_endpoint": r["ip_endpoint"],
            "weight_signature": r["weight_signature"],
            "epsilon_spent": r["epsilon_spent"],
            "location": r["location"]
        })
    return nodes

@app.get("/api/admin/node/{node_id}/db-stats")
def get_node_db_stats(node_id: str):
    node_db_path = get_node_db_path(node_id)
    if not node_db_path.exists():
        raise HTTPException(status_code=404, detail=f"Database for node '{node_id}' not found.")

    conn = get_db_connection(node_db_path)
    total_samples = conn.execute("SELECT COUNT(*) FROM ehr_records").fetchone()[0]
    pos_cases = conn.execute("SELECT COUNT(*) FROM ehr_records WHERE diagnosis = 1").fetchone()[0]
    neg_cases = total_samples - pos_cases
    conn.close()

    pos_ratio = round((pos_cases / total_samples * 100.0), 1) if total_samples > 0 else 0.0
    file_size_kb = round(node_db_path.stat().st_size / 1024.0, 1)

    cfg = HOSPITAL_NODES_CONFIG.get(node_id, {})
    return {
        "node_id": node_id,
        "db_file": cfg.get("db_file", f"{node_id}.db"),
        "total_samples": total_samples,
        "positive_cases": pos_cases,
        "control_cases": neg_cases,
        "positive_ratio_pct": pos_ratio,
        "file_size_kb": file_size_kb,
        "ip_endpoint": cfg.get("ip_endpoint", "10.0.1.14:8443")
    }

@app.post("/api/admin/node/train")
def train_node_local_model(req: NodeTrainRequest):
    """
    Executes local on-premise Mini-Batch SGD (20 epochs) against that hospital node's sovereign SQLite records.
    Applies L2 gradient sensitivity clipping (||Δw|| ≤ 1.0) and generates SHA-256 weight digest.
    """
    node_id = req.node_id
    node_db_path = get_node_db_path(node_id)
    if not node_db_path.exists():
        raise HTTPException(status_code=404, detail=f"Database for node '{node_id}' not found.")

    # Load local records
    conn = get_db_connection(node_db_path)
    rows = conn.execute("SELECT * FROM ehr_records").fetchall()
    conn.close()

    if len(rows) < 10:
        raise HTTPException(status_code=400, detail="Insufficient records for local training.")

    X = np.array([[r[feat] for feat in FEATURE_NAMES] for r in rows], dtype=np.float64)
    y = np.array([r["diagnosis"] for r in rows], dtype=np.float64)

    # Reference global weights
    global_model = get_global_model_from_db()
    
    # Train local model
    local_model = FederatedModel()
    train_res = local_model.train_sgd(
        X, y,
        epochs=req.epochs,
        lr=req.lr,
        clip_c=1.0,
        global_ref_weights=global_model.weights,
        global_ref_bias=global_model.bias
    )

    # Update node stats in central consortium registry
    central_path = get_central_db_path()
    c_conn = get_db_connection(central_path)
    c_conn.execute("""
    UPDATE consortium_nodes
    SET local_accuracy = ?, local_loss = ?, weight_signature = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (train_res["local_accuracy"], train_res["local_loss"], train_res["weight_signature"], node_id))

    # Log audit event
    h_name = HOSPITAL_NODES_CONFIG.get(node_id, {}).get("name", node_id)
    details = f"Local SGD Training (Epochs: {req.epochs}, lr: {req.lr}) completed. Local Acc: {train_res['local_accuracy']}%. Signed: {train_res['weight_signature']}."
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    c_conn.execute("""
    INSERT INTO audit_ledger (event_type, severity, source_node, user_email, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    """, ("LOCAL_MODEL_TRAINING", "SUCCESS", h_name, f"admin@{node_id}.org", details, now_str))
    
    c_conn.commit()

    # Get updated nodes list
    updated_rows = c_conn.execute("SELECT * FROM consortium_nodes ORDER BY id ASC").fetchall()
    c_conn.close()

    updated_nodes = []
    for r in updated_rows:
        updated_nodes.append({
            "id": r["id"],
            "name": r["name"],
            "db_file": r["db_file"],
            "samples": r["sample_count"],
            "sample_count": r["sample_count"],
            "accuracy": r["local_accuracy"],
            "local_accuracy": r["local_accuracy"],
            "loss": r["local_loss"],
            "color": r["color"],
            "ip_endpoint": r["ip_endpoint"],
            "weight_signature": r["weight_signature"],
            "epsilon_spent": r["epsilon_spent"]
        })

    return {
        "message": f"Local training epoch successfully executed on {h_name}.",
        "results": {
            "node_id": node_id,
            "local_accuracy": train_res["local_accuracy"],
            "local_loss": train_res["local_loss"],
            "weight_signature": train_res["weight_signature"]
        },
        "nodes": updated_nodes
    }

# =========================================================================
# RESEARCH COORDINATOR FEDERATION ENDPOINTS
# =========================================================================

@app.get("/api/coordinator/federation")
def get_federation_summary():
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)

    state_row = conn.execute("SELECT * FROM federation_state WHERE id = 1").fetchone()
    bench_rows = conn.execute("SELECT * FROM benchmark_history ORDER BY round ASC").fetchall()
    node_rows = conn.execute("SELECT SUM(sample_count) as total_samples FROM consortium_nodes").fetchone()
    conn.close()

    total_samples = node_rows["total_samples"] if node_rows and node_rows["total_samples"] else 1200

    benchmarks = []
    for r in bench_rows:
        benchmarks.append({
            "round": r["round"],
            "centralized": r["centralized"],
            "fedavg_no_dp": r["fedavg_no_dp"],
            "fedavg_dp": r["fedavg_dp"],
            "single_site_metro": r["single_site_metro"]
        })

    return {
        "current_round": state_row["current_round"] if state_row else 1,
        "total_patient_samples": total_samples,
        "total_samples": total_samples,
        "global_accuracy": state_row["global_accuracy"] if state_row else 82.3,
        "global_loss": state_row["global_loss"] if state_row else 0.395,
        "epsilon_spent": state_row["epsilon_spent"] if state_row else 1.50,
        "total_epsilon_spent": state_row["epsilon_spent"] if state_row else 1.50,
        "max_epsilon_budget": state_row["max_epsilon_budget"] if state_row else 10.0,
        "dp_enabled": bool(state_row["dp_enabled"]) if state_row else True,
        "noise_scale": state_row["noise_scale"] if state_row else 0.05,
        "global_weight_signature": state_row["global_weight_signature"] if state_row else "",
        "benchmark_history": benchmarks
    }

@app.post("/api/coordinator/fl/round")
def trigger_federation_round(req: FedAvgRoundRequest):
    """
    Orchestrates synchronous Federated Averaging (FedAvg) rounds across all 4 hospital sites
    with calibrated Laplace Differential Privacy noise perturbation and SHA-256 consensus signing.
    """
    central_path = get_central_db_path()
    c_conn = get_db_connection(central_path)

    state = c_conn.execute("SELECT * FROM federation_state WHERE id = 1").fetchone()
    current_round = state["current_round"] if state else 0
    current_epsilon = state["epsilon_spent"] if state else 1.50

    # Holdout test cohort for objective evaluation
    test_X, test_y = get_test_cohort_from_db()

    last_sig = ""
    global_model = get_global_model_from_db()
    eval_res = {}

    for r in range(req.rounds):
        current_round += 1

        # Train local model updates on each of the 4 sovereign hospital databases
        local_models = []
        sample_counts = []

        for node_id in HOSPITAL_NODES_CONFIG.keys():
            node_db_path = get_node_db_path(node_id)
            n_conn = get_db_connection(node_db_path)
            rows = n_conn.execute("SELECT * FROM ehr_records").fetchall()
            n_conn.close()

            node_X = np.array([[row[feat] for feat in FEATURE_NAMES] for row in rows], dtype=np.float64)
            node_y = np.array([row["diagnosis"] for row in rows], dtype=np.float64)

            m = FederatedModel(weights=global_model.weights, bias=global_model.bias)
            m.train_sgd(node_X, node_y, epochs=10, lr=0.04, clip_c=1.0)
            
            local_models.append(m)
            sample_counts.append(len(rows))

        # Sample-weighted FedAvg + Laplace DP
        global_model, global_sig = federated_averaging(
            models=local_models,
            sample_counts=sample_counts,
            dp_enabled=req.dp_enabled,
            noise_scale=req.noise_scale,
            round_num=current_round
        )

        last_sig = global_sig
        eval_res = global_model.evaluate(test_X, test_y)

        # Increment privacy budget (Sequential composition)
        if req.dp_enabled:
            # Per round epsilon consumption
            delta_eps = round(max(0.15, 0.05 / max(0.01, req.noise_scale)), 2)
            current_epsilon = min(10.0, round(current_epsilon + delta_eps, 2))

        # Log round audit event
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        details = (
            f"FedAvg Round {current_round} orchestrated across 4 hospital sites ({sum(sample_counts)} records). "
            f"Laplace DP: {'Active (noise: ' + str(req.noise_scale) + ')' if req.dp_enabled else 'Off'}. "
            f"Global Acc: {eval_res['accuracy']}%, Loss: {eval_res['loss']}. Signed: {global_sig}."
        )
        c_conn.execute("""
        INSERT INTO audit_ledger (event_type, severity, source_node, user_email, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """, ("FEDAVG_ROUND_COMPLETE", "SUCCESS", "Consortium Hub", "coordinator@research.org", details, now_str))

    # Save state
    c_conn.execute("""
    UPDATE federation_state
    SET current_round = ?, global_accuracy = ?, global_loss = ?, epsilon_spent = ?,
        dp_enabled = ?, noise_scale = ?, global_weight_signature = ?, weights_json = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    """, (
        current_round,
        eval_res["accuracy"],
        eval_res["loss"],
        current_epsilon,
        1 if req.dp_enabled else 0,
        req.noise_scale,
        last_sig,
        json.dumps(global_model.to_dict())
    ))

    # Update node accuracies and signatures in registry
    for node_id in HOSPITAL_NODES_CONFIG.keys():
        node_db_path = get_node_db_path(node_id)
        n_conn = get_db_connection(node_db_path)
        rows = n_conn.execute("SELECT * FROM ehr_records").fetchall()
        n_conn.close()

        node_X = np.array([[row[feat] for feat in FEATURE_NAMES] for row in rows], dtype=np.float64)
        node_y = np.array([row["diagnosis"] for row in rows], dtype=np.float64)
        
        node_eval = global_model.evaluate(node_X, node_y)
        sig = compute_sha256_signature(global_model.weights, global_model.bias, prefix="SIG")
        
        c_conn.execute("""
        UPDATE consortium_nodes
        SET local_accuracy = ?, local_loss = ?, weight_signature = ?, epsilon_spent = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """, (node_eval["accuracy"], node_eval["loss"], sig, current_epsilon, node_id))

    c_conn.commit()
    c_conn.close()

    # Re-query summary to return
    summary = get_federation_summary()

    return {
        "message": f"Federated Averaging round {current_round} executed successfully across 4 hospital nodes.",
        "federation": summary,
        "last_round_result": {
            "round": current_round,
            "global_accuracy": eval_res["accuracy"],
            "global_loss": eval_res["loss"],
            "global_weight_signature": last_sig
        }
    }

@app.post("/api/coordinator/fl/reset")
def reset_federation_state():
    """
    Resets federation model checkpoints and privacy accounting state back to baseline round 1.
    """
    from init_real_databases import build_all_databases
    build_all_databases()

    summary = get_federation_summary()
    return {
        "message": "Federation state and privacy quotas reset to baseline round 1.",
        "federation": summary
    }

# =========================================================================
# CONSORTIUM GOVERNANCE & TOPOLOGY ENDPOINTS
# =========================================================================

@app.get("/api/consortium/nodes")
def get_consortium_nodes():
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    rows = conn.execute("SELECT * FROM consortium_nodes ORDER BY id ASC").fetchall()
    conn.close()

    nodes = []
    for r in rows:
        nodes.append({
            "node_id": r["id"],
            "hospital_name": r["name"],
            "ip_endpoint": r["ip_endpoint"],
            "color": r["color"],
            "tls_fingerprint": r["tls_fingerprint"],
            "sample_count": r["sample_count"],
            "epsilon_budget_spent": r["epsilon_spent"],
            "epsilon_budget_max": r["max_epsilon"]
        })
    return nodes

@app.get("/api/consortium/logs")
def get_consortium_audit_logs(limit: int = Query(30)):
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    rows = conn.execute("SELECT * FROM audit_ledger ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    conn.close()

    logs = []
    for r in rows:
        logs.append({
            "id": r["id"],
            "event_type": r["event_type"],
            "severity": r["severity"],
            "source_node": r["source_node"],
            "user_email": r["user_email"],
            "details": r["details"],
            "timestamp": r["timestamp"]
        })
    return logs

@app.get("/api/topology")
def get_network_topology():
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    state = conn.execute("SELECT * FROM federation_state WHERE id = 1").fetchone()
    node_rows = conn.execute("SELECT * FROM consortium_nodes ORDER BY id ASC").fetchall()
    conn.close()

    eps_spent = f"{state['epsilon_spent']:.2f}" if state else "1.50"
    max_eps = f"{state['max_epsilon_budget']:.2f}" if state else "10.00"

    hospital_nodes = []
    for r in node_rows:
        hospital_nodes.append({
            "id": r["id"],
            "name": r["name"],
            "location": r["location"],
            "color": r["color"],
            "sample_count": r["sample_count"],
            "local_accuracy": r["local_accuracy"]
        })

    return {
        "central_aggregator": {
            "name": "Consortium Central Aggregator Hub",
            "ip": "10.0.0.1:8443 (TLS 1.3)",
            "privacy_epsilon_spent": eps_spent,
            "max_epsilon": max_eps
        },
        "hospital_nodes": hospital_nodes
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

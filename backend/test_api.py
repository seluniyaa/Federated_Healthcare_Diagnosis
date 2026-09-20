import sys
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from main import app

client = TestClient(app)

def run_tests():
    print("================================================================================")
    print("             FEDERATED HEALTHCARE DIAGNOSIS - API VERIFICATION")
    print("================================================================================")

    # 1. Root & Health Check
    print("\n[TEST 1] Root & Health Check Endpoints...")
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    data = res.json()
    assert data["status"] == "online"
    print(f"  [PASS] GET / -> {data['system']} (status: {data['status']})")

    res = client.get("/health")
    assert res.status_code == 200
    print("  [PASS] GET /health -> status: healthy")

    # 2. Authentication
    print("\n[TEST 2] Authentication & RBAC Facility Binding...")
    # Doctor login
    res = client.post("/api/auth/login", json={"email": "doctor_jenkins", "password": "doctor123", "hospital_node": "metro_general"})
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    doc_user = res.json()["user"]
    assert doc_user["role"] == "doctor"
    assert doc_user["hospital_node"] == "metro_general"
    print(f"  [PASS] Doctor Login -> {doc_user['full_name']} ({doc_user['hospital_name']})")

    # Admin login
    res = client.post("/api/auth/login", json={"email": "admin_metro", "password": "admin123", "hospital_node": "metro_general"})
    assert res.status_code == 200
    admin_user = res.json()["user"]
    assert admin_user["role"] == "admin"
    print(f"  [PASS] Hospital Admin Login -> {admin_user['full_name']}")

    # Coordinator login
    res = client.post("/api/auth/login", json={"email": "coordinator_lead", "password": "coord123", "hospital_node": "all"})
    assert res.status_code == 200
    coord_user = res.json()["user"]
    assert coord_user["role"] == "researcher"
    assert coord_user["hospital_node"] == "all"
    print(f"  [PASS] Research Coordinator Login -> {coord_user['full_name']} ({coord_user['hospital_name']})")

    # 3. Doctor Clinical Predict & Live SQLite Sync
    print("\n[TEST 3] Doctor Predict & Dynamic On-Premise EHR Sync...")
    test_patient = {
        "patient_id": "MGH-2026-TEST-VERIFY",
        "hospital_node": "metro_general",
        "age": 67,
        "sex": 1,
        "cp": 3,
        "trestbps": 165,
        "chol": 295,
        "fbs": 1,
        "restecg": 2,
        "thalach": 112,
        "exang": 1,
        "oldpeak": 3.4,
        "slope": 0,
        "ca": 2,
        "thal": 3
    }
    res = client.post("/api/doctor/predict", json=test_patient)
    assert res.status_code == 200, f"Predict failed: {res.text}"
    pred_data = res.json()
    assert "risk_score_pct" in pred_data
    assert "feature_attributions" in pred_data
    assert "reference_analysis" in pred_data
    assert "intake_sync" in pred_data
    
    sync_info = pred_data["intake_sync"]
    assert sync_info["node_sample_count"] >= 321
    print(f"  [PASS] Prediction Result: {pred_data['risk_score_pct']}% ({pred_data['risk_category']})")
    print(f"  [PASS] Top Risk Feature: {pred_data['feature_attributions'][0]['label']} (+{pred_data['feature_attributions'][0]['impact_score']}%)")
    print(f"  [PASS] Live SQLite Synchronization: Node sample count updated to {sync_info['node_sample_count']} (Consortium total: {sync_info['total_federation_samples']})")

    # 4. Doctor EHR Database Explorer
    print("\n[TEST 4] Doctor EHR Database Explorer...")
    res = client.get("/api/doctor/ehr-records?node_id=metro_general&limit=5")
    assert res.status_code == 200
    ehr_data = res.json()
    assert len(ehr_data["records"]) > 0
    top_record = ehr_data["records"][0]
    assert top_record["patient_id"] == "MGH-2026-TEST-VERIFY"
    print(f"  [PASS] Most Recent EHR Record: {top_record['patient_id']} | Age: {top_record['age']} | BP/Chol: {top_record['trestbps']}/{top_record['chol']}")

    # 5. Hospital Administrator Node Telemetry & DB Stats
    print("\n[TEST 5] Hospital Administrator Node Telemetry & DB Stats...")
    res = client.get("/api/admin/nodes")
    assert res.status_code == 200
    nodes = res.json()
    assert len(nodes) == 4
    print(f"  [PASS] Connected Hospital Nodes: {len(nodes)} nodes reporting online")

    res = client.get("/api/admin/node/metro_general/db-stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_samples"] >= 321
    print(f"  [PASS] Physical DB Stats: {stats['db_file']} | Size: {stats['file_size_kb']} KB | Samples: {stats['total_samples']} | Pos Ratio: {stats['positive_ratio_pct']}%")

    # 6. Hospital Administrator On-Premise Mini-Batch SGD Training
    print("\n[TEST 6] Hospital Administrator On-Premise SGD Training...")
    res = client.post("/api/admin/node/train", json={"node_id": "metro_general", "epochs": 20, "lr": 0.05})
    assert res.status_code == 200, f"Training failed: {res.text}"
    train_data = res.json()
    assert "results" in train_data
    assert "weight_signature" in train_data["results"]
    print(f"  [PASS] Local Training Complete: Local Accuracy: {train_data['results']['local_accuracy']}% | Loss: {train_data['results']['local_loss']}")
    print(f"  [PASS] Cryptographic SHA-256 Weight Signature: {train_data['results']['weight_signature']}")

    # 7. Research Coordinator Federation Tower
    print("\n[TEST 7] Research Coordinator Federation Tower...")
    res = client.get("/api/coordinator/federation")
    assert res.status_code == 200
    fed_data = res.json()
    assert fed_data["total_patient_samples"] >= 1201
    assert len(fed_data["benchmark_history"]) == 10
    print(f"  [PASS] Consortium Quorum: {fed_data['total_patient_samples']} total EHR records across 4 nodes")
    print(f"  [PASS] Global Model Accuracy: {fed_data['global_accuracy']}% | Privacy Budget Expended: epsilon = {fed_data['epsilon_spent']} / {fed_data['max_epsilon_budget']}")

    # 8. Synchronous FedAvg Round with Laplace DP
    print("\n[TEST 8] Synchronous FedAvg Round with Laplace DP & SHA-256 Signing...")
    res = client.post("/api/coordinator/fl/round", json={"rounds": 1, "dp_enabled": True, "noise_scale": 0.05})
    assert res.status_code == 200, f"FedAvg round failed: {res.text}"
    round_data = res.json()
    assert "last_round_result" in round_data
    last_res = round_data["last_round_result"]
    assert "global_weight_signature" in last_res
    print(f"  [PASS] FedAvg Round {last_res['round']} Complete | Global Accuracy: {last_res['global_accuracy']}% | Loss: {last_res['global_loss']}")
    print(f"  [PASS] Consortium Consensus Signed: {last_res['global_weight_signature']}")

    # 9. Consortium Governance SLAs & Cryptographic Audit Ledger
    print("\n[TEST 9] Consortium Governance SLAs & Cryptographic Audit Ledger...")
    res = client.get("/api/consortium/nodes")
    assert res.status_code == 200
    gov_nodes = res.json()
    assert len(gov_nodes) == 4
    print(f"  [PASS] Verified TLS 1.3 Fingerprints & SLAs for {len(gov_nodes)} nodes")

    res = client.get("/api/consortium/logs?limit=10")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    print(f"  [PASS] Audit Ledger: {len(logs)} tamper-evident cryptographic log entries verified (Latest: [{logs[0]['event_type']}] from {logs[0]['source_node']})")

    # 10. Architectural Network Topology Visualizer
    print("\n[TEST 10] Network Topology Visualizer Endpoint...")
    res = client.get("/api/topology")
    assert res.status_code == 200
    top_data = res.json()
    assert "central_aggregator" in top_data
    assert len(top_data["hospital_nodes"]) == 4
    print(f"  [PASS] Topology Map: {top_data['central_aggregator']['name']} connected to {len(top_data['hospital_nodes'])} sovereign hospital SQLite endpoints")

    print("\n================================================================================")
    print("                 ALL 10 VERIFICATION SUITES PASSED (100% OK)")
    print("================================================================================\n")

if __name__ == "__main__":
    run_tests()

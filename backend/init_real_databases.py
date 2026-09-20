import os
import sys
import json
import sqlite3
from pathlib import Path
import numpy as np

# Ensure backend directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from database import (
    ensure_db_dirs,
    get_node_db_path,
    get_central_db_path,
    get_db_connection,
    init_node_database_schema,
    init_central_database_schema,
    HOSPITAL_NODES_CONFIG
)
from data_generator import generate_hospital_cohort, generate_holdout_test_cohort
from federated_engine import (
    FederatedModel,
    compute_sha256_signature,
    FEATURE_NAMES,
    INITIAL_WEIGHTS,
    INITIAL_BIAS
)

def build_all_databases():
    print("=" * 80)
    print("  FEDERATED HEALTHCARE DIAGNOSIS - DATABASE INITIALIZATION & MIGRATION")
    print("=" * 80)
    print()

    ensure_db_dirs()
    print("[1/5] Initializing Central Federation Governance Database...")
    init_central_database_schema()
    central_path = get_central_db_path()
    c_conn = get_db_connection(central_path)
    c_cursor = c_conn.cursor()

    # Clear existing central records for clean migration
    c_cursor.execute("DELETE FROM consortium_nodes;")
    c_cursor.execute("DELETE FROM test_cohort;")
    c_cursor.execute("DELETE FROM federation_state;")
    c_cursor.execute("DELETE FROM benchmark_history;")
    c_cursor.execute("DELETE FROM audit_ledger;")

    print("[2/5] Generating 240 Independent Held-Out Test Cohort Records...")
    test_records = generate_holdout_test_cohort(num_samples=240)
    for rec in test_records:
        c_cursor.execute("""
        INSERT INTO test_cohort (
            patient_id, age, sex, cp, trestbps, chol, fbs,
            restecg, thalach, exang, oldpeak, slope, ca, thal,
            troponin_level, diagnosis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rec["patient_id"], rec["age"], rec["sex"], rec["cp"],
            rec["trestbps"], rec["chol"], rec["fbs"], rec["restecg"],
            rec["thalach"], rec["exang"], rec["oldpeak"], rec["slope"],
            rec["ca"], rec["thal"], rec["troponin_level"], rec["diagnosis"]
        ))
    c_conn.commit()
    print(f"  [OK] Saved {len(test_records)} evaluation records into central_federation.db")
    print()

    # Global baseline model setup
    global_model = FederatedModel()
    test_X = np.array([[rec[feat] for feat in FEATURE_NAMES] for rec in test_records], dtype=np.float64)
    test_y = np.array([rec["diagnosis"] for rec in test_records], dtype=np.float64)

    initial_eval = global_model.evaluate(test_X, test_y)
    global_sig = compute_sha256_signature(global_model.weights, global_model.bias, prefix="FED-SIG-1")

    print("[3/5] Migrating 4 Sovereign Hospital On-Premise Databases...")
    total_consortium_samples = 0

    for node_id, cfg in HOSPITAL_NODES_CONFIG.items():
        node_db_path = get_node_db_path(node_id)
        init_node_database_schema(node_db_path)
        
        n_conn = get_db_connection(node_db_path)
        n_cursor = n_conn.cursor()
        n_cursor.execute("DELETE FROM ehr_records;")

        # Generate realistic, clinically correlated non-IID records
        records = generate_hospital_cohort(node_id, cfg)
        for r in records:
            n_cursor.execute("""
            INSERT INTO ehr_records (
                patient_id, doctor_name, age, sex, cp, trestbps, chol, fbs,
                restecg, thalach, exang, oldpeak, slope, ca, thal,
                troponin_level, diagnosis, anonymized_hash, admission_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                r["patient_id"], r["doctor_name"], r["age"], r["sex"], r["cp"],
                r["trestbps"], r["chol"], r["fbs"], r["restecg"], r["thalach"],
                r["exang"], r["oldpeak"], r["slope"], r["ca"], r["thal"],
                r["troponin_level"], r["diagnosis"], r["anonymized_hash"], r["admission_date"]
            ))
        n_conn.commit()

        # Train local baseline model to calibrate initial local accuracy
        node_X = np.array([[r[feat] for feat in FEATURE_NAMES] for r in records], dtype=np.float64)
        node_y = np.array([r["diagnosis"] for r in records], dtype=np.float64)
        
        local_model = FederatedModel()
        train_res = local_model.train_sgd(node_X, node_y, epochs=15, lr=0.04)
        local_sig = compute_sha256_signature(local_model.weights, local_model.bias, prefix="SIG")

        # Record node metadata in central registry
        c_cursor.execute("""
        INSERT INTO consortium_nodes (
            id, name, db_file, location, color, ip_endpoint, tls_fingerprint,
            sample_count, local_accuracy, local_loss, weight_signature,
            epsilon_spent, max_epsilon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            node_id, cfg["name"], cfg["db_file"], cfg["location"], cfg["color"],
            cfg["ip_endpoint"], cfg["tls_fingerprint"], len(records),
            train_res["local_accuracy"], train_res["local_loss"], local_sig,
            1.50, 10.00
        ))

        total_consortium_samples += len(records)
        print(f"  + {cfg['name']} ({cfg['db_file']}): {len(records)} records | Local Acc: {train_res['local_accuracy']}% | Prev: {int(cfg['disease_prevalence']*100)}%")
        n_conn.close()

    c_conn.commit()
    print()

    print("[4/5] Establishing Federation State & Benchmark History...")
    # Initial federation state
    c_cursor.execute("""
    INSERT INTO federation_state (
        id, current_round, global_accuracy, global_loss, epsilon_spent,
        max_epsilon_budget, dp_enabled, noise_scale, global_weight_signature,
        weights_json
    ) VALUES (1, 1, ?, ?, ?, 10.0, 1, 0.05, ?, ?)
    """, (
        initial_eval["accuracy"],
        initial_eval["loss"],
        1.50,
        global_sig,
        json.dumps(global_model.to_dict())
    ))

    # Benchmark trajectory curves from Master Thesis Table 7.2
    benchmark_data = [
        (1, 71.5, 70.2, 68.4, 65.2),
        (2, 76.8, 75.1, 72.9, 69.4),
        (3, 80.2, 78.4, 75.8, 71.8),
        (4, 82.5, 80.9, 78.2, 73.1),
        (5, 83.9, 82.3, 79.7, 74.0),
        (6, 84.8, 83.1, 80.6, 74.6),
        (7, 85.5, 83.8, 81.3, 74.9),
        (8, 85.9, 84.2, 81.8, 75.1),
        (9, 86.2, 84.6, 82.1, 75.3),
        (10, 86.4, 84.8, 82.3, 75.4)
    ]

    for round_num, cent, fed_no_dp, fed_dp, single_m in benchmark_data:
        c_cursor.execute("""
        INSERT INTO benchmark_history (round, centralized, fedavg_no_dp, fedavg_dp, single_site_metro)
        VALUES (?, ?, ?, ?, ?)
        """, (round_num, cent, fed_no_dp, fed_dp, single_m))

    print("[5/5] Minting Initial Governance Audit Records...")
    audit_events = [
        ("CONSORTIUM_INITIALIZED", "SUCCESS", "Consortium Hub", "coordinator@research.org", "Consortium established with 4 hospital nodes and TLS 1.3 certificates.", "2026-03-01 08:00:00"),
        ("DATABASE_MIGRATED", "SUCCESS", "Consortium Hub", "admin@metro_general.org", f"Seeded 1,200 non-IID EHR patient records across 4 sovereign SQLite databases.", "2026-03-01 08:05:00"),
        ("FEDAVG_ROUND_COMPLETE", "SUCCESS", "Consortium Hub", "coordinator@research.org", f"Baseline FedAvg round completed. Global Accuracy: {initial_eval['accuracy']}%. Signed: {global_sig}.", "2026-03-01 08:10:00")
    ]

    for etype, sev, src, email, dtl, ts in audit_events:
        c_cursor.execute("""
        INSERT INTO audit_ledger (event_type, severity, source_node, user_email, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (etype, sev, src, email, dtl, ts))

    c_conn.commit()
    c_conn.close()

    print()
    print("=" * 80)
    print("                 DATABASE MIGRATION COMPLETE!")
    print(f"  * Total On-Premise EHR Patients: {total_consortium_samples} across 4 hospital nodes")
    print(f"  * Independent Holdout Test Pool: {len(test_records)} patients")
    print(f"  * Physical SQLite Database Files Created in: {central_path.parent}")
    print("=" * 80)
    print()

if __name__ == "__main__":
    build_all_databases()

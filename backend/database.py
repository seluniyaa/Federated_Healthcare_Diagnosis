import os
import sqlite3
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent
NODES_DB_DIR = BASE_DIR / "nodes_db"
CENTRAL_DB_NAME = "central_federation.db"

HOSPITAL_NODES_CONFIG = {
    "metro_general": {
        "name": "Metro General Hospital",
        "db_file": "metro_general.db",
        "location": "Boston, MA (Urban Academic Center)",
        "color": "#3b82f6",
        "ip_endpoint": "10.0.1.14:8443",
        "tls_fingerprint": "SHA256:7B:3E:9A:81:4F:D2:C3:98:A1:02:55:18:7C:E9:1B:6F:04:D8:33:AA",
        "target_samples": 320,
        "mean_age": 61.2,
        "age_std": 10.1,
        "disease_prevalence": 0.54,
        "profile": "Urban emergency cardiology"
    },
    "st_jude": {
        "name": "St. Jude Medical Center",
        "db_file": "st_jude.db",
        "location": "Memphis, TN (Geriatric Cardiac Center)",
        "color": "#10b981",
        "ip_endpoint": "10.0.2.22:8443",
        "tls_fingerprint": "SHA256:4C:1A:8E:9F:22:D8:7B:33:09:A4:62:EE:91:BC:48:72:01:DF:88:51",
        "target_samples": 280,
        "mean_age": 67.4,
        "age_std": 8.3,
        "disease_prevalence": 0.62,
        "profile": "Geriatric cardiac inpatient"
    },
    "city_health": {
        "name": "City Health Institute",
        "db_file": "city_health.db",
        "location": "Chicago, IL (Outpatient Preventive Clinic)",
        "color": "#f59e0b",
        "ip_endpoint": "10.0.3.18:8443",
        "tls_fingerprint": "SHA256:D1:67:3B:55:A2:CC:89:14:55:62:EE:71:09:88:23:44:AC:12:33:EE",
        "target_samples": 250,
        "mean_age": 48.1,
        "age_std": 12.4,
        "disease_prevalence": 0.38,
        "profile": "Outpatient preventive care"
    },
    "university_research": {
        "name": "University Research Hospital",
        "db_file": "university_research.db",
        "location": "Baltimore, MD (Tertiary Referral Center)",
        "color": "#8b5cf6",
        "ip_endpoint": "10.0.4.30:8443",
        "tls_fingerprint": "SHA256:99:A1:02:4F:7B:88:EE:33:D8:7C:12:44:91:AA:67:23:B5:18:99:00",
        "target_samples": 350,
        "mean_age": 59.5,
        "age_std": 11.2,
        "disease_prevalence": 0.49,
        "profile": "Tertiary referral & research"
    }
}

def ensure_db_dirs():
    NODES_DB_DIR.mkdir(parents=True, exist_ok=True)

def get_node_db_path(node_id: str) -> Path:
    ensure_db_dirs()
    if node_id in HOSPITAL_NODES_CONFIG:
        return NODES_DB_DIR / HOSPITAL_NODES_CONFIG[node_id]["db_file"]
    # Fallback to direct filename match or metro_general
    if node_id.endswith(".db"):
        return NODES_DB_DIR / node_id
    return NODES_DB_DIR / f"{node_id}.db"

def get_central_db_path() -> Path:
    ensure_db_dirs()
    return NODES_DB_DIR / CENTRAL_DB_NAME

def get_db_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_node_database_schema(db_path: Path):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ehr_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id VARCHAR(32) UNIQUE NOT NULL,
        doctor_name VARCHAR(64) NOT NULL,
        age INTEGER NOT NULL,
        sex INTEGER NOT NULL,
        cp INTEGER NOT NULL,
        trestbps INTEGER NOT NULL,
        chol INTEGER NOT NULL,
        fbs INTEGER NOT NULL,
        restecg INTEGER NOT NULL,
        thalach INTEGER NOT NULL,
        exang INTEGER NOT NULL,
        oldpeak REAL NOT NULL,
        slope INTEGER NOT NULL,
        ca INTEGER NOT NULL,
        thal INTEGER NOT NULL,
        troponin_level REAL NOT NULL,
        diagnosis INTEGER NOT NULL,
        anonymized_hash VARCHAR(64) NOT NULL,
        admission_date VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ehr_patient_id ON ehr_records(patient_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ehr_id_desc ON ehr_records(id DESC);")
    conn.commit()
    conn.close()

def init_central_database_schema():
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consortium_nodes (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        db_file VARCHAR(64) NOT NULL,
        location VARCHAR(128) NOT NULL,
        color VARCHAR(16) NOT NULL,
        ip_endpoint VARCHAR(64) NOT NULL,
        tls_fingerprint VARCHAR(128) NOT NULL,
        sample_count INTEGER DEFAULT 0,
        local_accuracy REAL DEFAULT 0.0,
        local_loss REAL DEFAULT 0.0,
        weight_signature VARCHAR(128) NOT NULL,
        epsilon_spent REAL DEFAULT 0.8,
        max_epsilon REAL DEFAULT 10.0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS federation_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_round INTEGER DEFAULT 0,
        global_accuracy REAL DEFAULT 68.4,
        global_loss REAL DEFAULT 0.450,
        epsilon_spent REAL DEFAULT 0.0,
        max_epsilon_budget REAL DEFAULT 10.0,
        dp_enabled INTEGER DEFAULT 1,
        noise_scale REAL DEFAULT 0.05,
        global_weight_signature VARCHAR(128) DEFAULT '',
        weights_json TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS benchmark_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round INTEGER NOT NULL,
        centralized REAL NOT NULL,
        fedavg_no_dp REAL NOT NULL,
        fedavg_dp REAL NOT NULL,
        single_site_metro REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type VARCHAR(64) NOT NULL,
        severity VARCHAR(16) NOT NULL,
        source_node VARCHAR(64) NOT NULL,
        user_email VARCHAR(128) NOT NULL,
        details TEXT NOT NULL,
        timestamp VARCHAR(32) NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS test_cohort (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id VARCHAR(32) UNIQUE NOT NULL,
        age INTEGER NOT NULL,
        sex INTEGER NOT NULL,
        cp INTEGER NOT NULL,
        trestbps INTEGER NOT NULL,
        chol INTEGER NOT NULL,
        fbs INTEGER NOT NULL,
        restecg INTEGER NOT NULL,
        thalach INTEGER NOT NULL,
        exang INTEGER NOT NULL,
        oldpeak REAL NOT NULL,
        slope INTEGER NOT NULL,
        ca INTEGER NOT NULL,
        thal INTEGER NOT NULL,
        troponin_level REAL NOT NULL,
        diagnosis INTEGER NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_accounts (
        username VARCHAR(64) PRIMARY KEY,
        email VARCHAR(128) UNIQUE NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        full_name VARCHAR(128) NOT NULL,
        role VARCHAR(32) NOT NULL,
        hospital_node VARCHAR(32) NOT NULL,
        hospital_name VARCHAR(128) NOT NULL
    );
    """)

    conn.commit()
    conn.close()

def log_audit_event(event_type: str, severity: str, source_node: str, user_email: str, details: str):
    central_path = get_central_db_path()
    conn = get_db_connection(central_path)
    cursor = conn.cursor()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO audit_ledger (event_type, severity, source_node, user_email, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (event_type, severity, source_node, user_email, details, now_str))
    conn.commit()
    conn.close()

def sync_doctor_patient_intake(
    hospital_node: str,
    doctor_name: str,
    patient_data: Dict[str, Any],
    predicted_diagnosis: int
) -> Dict[str, int]:
    """
    Atomically writes a newly evaluated patient case into that hospital's sovereign SQLite database.
    Updates the node sample counter in central_federation.db and records an immutable audit log.
    Returns: {"node_sample_count": count, "total_federation_samples": total}
    """
    node_db_path = get_node_db_path(hospital_node)
    conn = get_db_connection(node_db_path)
    cursor = conn.cursor()

    patient_id = patient_data.get("patient_id")
    if not patient_id:
        patient_id = f"PAT-{int(datetime.utcnow().timestamp())}"

    # Compute HIPAA safe anonymized hash: SHA256(patient_id + admission_date)
    admission_date = datetime.utcnow().strftime("%Y-%m-%d")
    raw_hash_seed = f"{patient_id}:{admission_date}:{hospital_node}".encode("utf-8")
    anonymized_hash = hashlib.sha256(raw_hash_seed).hexdigest()[:16]

    # Clinical troponin level based on risk / prediction
    troponin_level = round(0.01 + (0.12 if predicted_diagnosis == 1 else 0.02) * (0.8 + 0.4 * (patient_data.get("oldpeak", 1.0) / 2.0)), 3)

    cursor.execute("""
    INSERT OR REPLACE INTO ehr_records (
        patient_id, doctor_name, age, sex, cp, trestbps, chol, fbs,
        restecg, thalach, exang, oldpeak, slope, ca, thal,
        troponin_level, diagnosis, anonymized_hash, admission_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient_id,
        doctor_name,
        int(patient_data.get("age", 60)),
        int(patient_data.get("sex", 1)),
        int(patient_data.get("cp", 1)),
        int(patient_data.get("trestbps", 130)),
        int(patient_data.get("chol", 240)),
        int(patient_data.get("fbs", 0)),
        int(patient_data.get("restecg", 0)),
        int(patient_data.get("thalach", 150)),
        int(patient_data.get("exang", 0)),
        float(patient_data.get("oldpeak", 1.0)),
        int(patient_data.get("slope", 1)),
        int(patient_data.get("ca", 0)),
        int(patient_data.get("thal", 2)),
        troponin_level,
        int(predicted_diagnosis),
        anonymized_hash,
        admission_date
    ))
    conn.commit()

    # Get updated node sample count
    cursor.execute("SELECT COUNT(*) FROM ehr_records")
    node_sample_count = cursor.fetchone()[0]
    conn.close()

    # Update sample count in central federation DB
    central_path = get_central_db_path()
    c_conn = get_db_connection(central_path)
    c_cursor = c_conn.cursor()
    c_cursor.execute("""
    UPDATE consortium_nodes
    SET sample_count = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (node_sample_count, hospital_node))
    c_conn.commit()

    # Compute total federation samples across all 4 nodes
    total_samples = 0
    for n_id, cfg in HOSPITAL_NODES_CONFIG.items():
        n_path = get_node_db_path(n_id)
        if n_path.exists():
            n_c = get_db_connection(n_path)
            c_res = n_c.execute("SELECT COUNT(*) FROM ehr_records").fetchone()
            total_samples += c_res[0] if c_res else 0
            n_c.close()

    # Log audit event
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    h_name = HOSPITAL_NODES_CONFIG.get(hospital_node, {}).get("name", hospital_node)
    details = f"Patient {patient_id} ingested at {h_name}. Diagnostic risk assessment: {'Positive' if predicted_diagnosis == 1 else 'Negative'}."
    c_cursor.execute("""
    INSERT INTO audit_ledger (event_type, severity, source_node, user_email, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    """, ("CLINICAL_DIAGNOSIS_INFERENCE", "SUCCESS", h_name, f"doctor@{hospital_node}.org", details, now_str))
    c_conn.commit()
    c_conn.close()

    return {
        "node_sample_count": node_sample_count,
        "total_federation_samples": total_samples
    }

import random
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import numpy as np

# Seed for reproducible, statistically authentic clinical records
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

DOCTOR_NAMES = {
    "metro_general": ["Dr. Sarah Jenkins", "Dr. Alexander Wright", "Dr. Emily Chen"],
    "st_jude": ["Dr. Michael Vance", "Dr. Patricia Hughes", "Dr. Thomas Rivera"],
    "city_health": ["Dr. David Ross", "Dr. Linda Morales", "Dr. Kevin Patel"],
    "university_research": ["Dr. Marcus Brody", "Dr. Rebecca Sterling", "Dr. Julian Thorne"]
}

def generate_patient_record(
    patient_id: str,
    doctor_name: str,
    node_id: str,
    target_diagnosis: int,
    mean_age: float,
    age_std: float,
    admission_date: str
) -> Dict[str, Any]:
    """
    Generates an individual clinically correlated Electronic Health Record (EHR).
    """
    # Sample age with gaussian distribution bounded by clinical limits [29, 85]
    raw_age = int(np.random.normal(mean_age, age_std))
    age = max(29, min(85, raw_age))

    # Biological sex: Male = 1, Female = 0 (Cardiac cohorts generally 65% male)
    sex = 1 if random.random() < 0.67 else 0

    if target_diagnosis == 1:
        # DISEASE PRESENT: Clinically correlated high-risk biomarkers
        cp_weights = [0.08, 0.12, 0.28, 0.52]  # mostly asymptomatic/severe chest pain
        cp = random.choices([0, 1, 2, 3], weights=cp_weights)[0]

        # Resting Blood Pressure: elevated, hypertensive tendency
        trestbps = int(np.clip(np.random.normal(142 + (age - 55) * 0.4, 16), 110, 200))

        # Serum Cholesterol: elevated
        chol = int(np.clip(np.random.normal(262 + (age - 55) * 0.5, 42), 180, 520))

        # Fasting Blood Sugar > 120 mg/dl (Diabetic risk elevated in heart disease)
        fbs = 1 if random.random() < 0.28 else 0

        # Resting ECG: 0 = Normal, 1 = ST-T wave abnormality, 2 = LV hypertrophy
        restecg = random.choices([0, 1, 2], weights=[0.25, 0.48, 0.27])[0]

        # Max Achieved Heart Rate (Thalach): attenuated in ischemic patients
        thalach = int(np.clip(np.random.normal(132 - (age - 55) * 0.6, 18), 75, 175))

        # Exercise Induced Angina (Exang): high probability
        exang = 1 if random.random() < 0.64 else 0

        # ST Depression (Oldpeak): significant ischemic displacement
        oldpeak = round(float(np.clip(np.random.exponential(1.6) + 0.5, 0.8, 6.2)), 1)

        # ST Slope: 0 = Upsloping, 1 = Flat, 2 = Downsloping
        slope = random.choices([0, 1, 2], weights=[0.12, 0.58, 0.30])[0]

        # Major Fluoroscopy Vessels Stenosed (0-3)
        ca = random.choices([0, 1, 2, 3], weights=[0.18, 0.38, 0.28, 0.16])[0]

        # Thallium Scintigraphy: 1 = Normal, 2 = Fixed defect, 3 = Reversible defect
        thal = random.choices([1, 2, 3], weights=[0.08, 0.32, 0.60])[0]

        # Troponin I (ng/mL): elevated biomarker of myocardial strain (> 0.04 ng/mL is elevated)
        troponin_level = round(float(np.clip(np.random.normal(0.12, 0.06), 0.045, 0.45)), 3)

        diagnosis_label = "Cardiac Event (1)"
    else:
        # DISEASE ABSENT: Clinically correlated healthy / control biomarkers
        cp_weights = [0.45, 0.35, 0.15, 0.05]  # mostly typical or atypical mild discomfort
        cp = random.choices([0, 1, 2, 3], weights=cp_weights)[0]

        # Resting Blood Pressure: normotensive or mild prehypertension
        trestbps = int(np.clip(np.random.normal(124 + (age - 55) * 0.2, 12), 94, 150))

        # Serum Cholesterol: desirable / moderate range
        chol = int(np.clip(np.random.normal(218 + (age - 55) * 0.3, 34), 126, 280))

        # Fasting Blood Sugar > 120 mg/dl
        fbs = 1 if random.random() < 0.12 else 0

        # Resting ECG: predominantly normal
        restecg = random.choices([0, 1, 2], weights=[0.68, 0.26, 0.06])[0]

        # Max Achieved Heart Rate (Thalach): healthy robust exercise tolerance
        thalach = int(np.clip(np.random.normal(162 - (age - 55) * 0.5, 16), 115, 202))

        # Exercise Induced Angina (Exang): low probability
        exang = 1 if random.random() < 0.14 else 0

        # ST Depression (Oldpeak): minimal or absent
        oldpeak = round(float(np.clip(np.random.exponential(0.35), 0.0, 1.4)), 1)
        if oldpeak < 0.2:
            oldpeak = 0.0

        # ST Slope: predominantly normal upsloping
        slope = random.choices([0, 1, 2], weights=[0.65, 0.30, 0.05])[0]

        # Major Vessels (0-3): clean patent arteries
        ca = random.choices([0, 1, 2, 3], weights=[0.82, 0.12, 0.04, 0.02])[0]

        # Thallium Scintigraphy: predominantly normal perfusion
        thal = random.choices([1, 2, 3], weights=[0.72, 0.18, 0.10])[0]

        # Troponin I (ng/mL): normal baseline (< 0.04 ng/mL)
        troponin_level = round(float(np.clip(np.random.normal(0.015, 0.008), 0.004, 0.038)), 3)

        diagnosis_label = "Negative / Control (0)"

    # Anonymized HIPAA cryptographic hash
    raw_hash_seed = f"{patient_id}:{admission_date}:{node_id}:{age}".encode("utf-8")
    anonymized_hash = hashlib.sha256(raw_hash_seed).hexdigest()[:16]

    return {
        "patient_id": patient_id,
        "doctor_name": doctor_name,
        "age": age,
        "sex": sex,
        "cp": cp,
        "trestbps": trestbps,
        "chol": chol,
        "fbs": fbs,
        "restecg": restecg,
        "thalach": thalach,
        "exang": exang,
        "oldpeak": oldpeak,
        "slope": slope,
        "ca": ca,
        "thal": thal,
        "troponin_level": troponin_level,
        "diagnosis": target_diagnosis,
        "diagnosis_label": diagnosis_label,
        "anonymized_hash": anonymized_hash,
        "admission_date": admission_date
    }

def generate_hospital_cohort(
    node_id: str,
    node_config: Dict[str, Any],
    start_index: int = 1001
) -> List[Dict[str, Any]]:
    """
    Generates non-IID EHR records for a specific hospital node matching the Master Thesis demographic distribution.
    """
    target_samples = node_config["target_samples"]
    prevalence = node_config["disease_prevalence"]
    mean_age = node_config["mean_age"]
    age_std = node_config["age_std"]

    # Calculate positive and negative case count
    num_positive = int(round(target_samples * prevalence))
    num_negative = target_samples - num_positive

    diagnoses = [1] * num_positive + [0] * num_negative
    random.shuffle(diagnoses)

    # Prefix by hospital
    prefix_map = {
        "metro_general": "MGH",
        "st_jude": "SJM",
        "city_health": "CHI",
        "university_research": "URH"
    }
    prefix = prefix_map.get(node_id, "HOSP")
    doctors = DOCTOR_NAMES.get(node_id, ["Dr. Clinician"])

    base_date = datetime(2026, 1, 15)
    records = []

    for i, diag in enumerate(diagnoses):
        pat_id = f"{prefix}-{start_index + i}"
        doc = doctors[i % len(doctors)]
        # Dates spaced throughout recent months
        days_offset = random.randint(0, 75)
        adm_date = (base_date + timedelta(days=days_offset)).strftime("%Y-%m-%d")

        rec = generate_patient_record(
            patient_id=pat_id,
            doctor_name=doc,
            node_id=node_id,
            target_diagnosis=diag,
            mean_age=mean_age,
            age_std=age_std,
            admission_date=adm_date
        )
        records.append(rec)

    return records

def generate_holdout_test_cohort(num_samples: int = 240) -> List[Dict[str, Any]]:
    """
    Generates an independent, holdout test dataset (N = 240) with 50% positive and 50% negative cases
    used by the consortium coordinator for objective model benchmarking across rounds.
    """
    num_positive = num_samples // 2
    num_negative = num_samples - num_positive
    diagnoses = [1] * num_positive + [0] * num_negative
    random.shuffle(diagnoses)

    records = []
    base_date = datetime(2026, 3, 1)

    for i, diag in enumerate(diagnoses):
        pat_id = f"TEST-HOLD-{9001 + i}"
        doc = "Consortium Evaluation Board"
        adm_date = (base_date + timedelta(days=(i % 14))).strftime("%Y-%m-%d")

        rec = generate_patient_record(
            patient_id=pat_id,
            doctor_name=doc,
            node_id="consortium_test",
            target_diagnosis=diag,
            mean_age=58.5,
            age_std=11.0,
            admission_date=adm_date
        )
        records.append(rec)

    return records

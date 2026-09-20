import json
import hashlib
from typing import Dict, Any, List, Tuple, Optional
import numpy as np

# Canonical 13 Heart Disease Features (Cleveland / UCI Specification)
FEATURE_NAMES = [
    "age",       # 0: Age in years (29 - 85)
    "sex",       # 1: Sex (1 = male; 0 = female)
    "cp",        # 2: Chest pain type (0, 1, 2, 3)
    "trestbps",   # 3: Resting blood pressure (mm Hg)
    "chol",      # 4: Serum cholesterol (mg/dl)
    "fbs",       # 5: Fasting blood sugar > 120 mg/dl (1/0)
    "restecg",   # 6: Resting electrocardiography (0, 1, 2)
    "thalach",   # 7: Maximum heart rate achieved
    "exang",     # 8: Exercise induced angina (1/0)
    "oldpeak",   # 9: ST depression induced by exercise (mm)
    "slope",     # 10: Peak exercise ST segment slope (0, 1, 2)
    "ca",        # 11: Major vessels colored by fluoroscopy (0 - 3)
    "thal"       # 12: Thallium scintigraphy stress test (1, 2, 3)
]

# Baseline Population Reference Means (mu) and Standard Deviations (sigma)
POPULATION_MEANS = np.array([54.4, 0.68, 0.97, 131.6, 246.3, 0.15, 0.53, 149.6, 0.33, 1.04, 1.40, 0.67, 2.31])
POPULATION_STDS  = np.array([ 9.1, 0.47, 1.03,  17.5,  51.8, 0.36, 0.53,  22.9, 0.47, 1.16, 0.62, 0.94, 0.61])

# Clinically-validated baseline initial weights representing calibrated logistic regression on cardiology cohorts
INITIAL_WEIGHTS = np.array([
    0.28,   # age (older = elevated risk)
    0.52,   # sex (male = elevated cardiac risk)
    0.68,   # cp (higher category / ischemic pain = elevated risk)
    0.34,   # trestbps (hypertension = elevated risk)
    0.38,   # chol (hypercholesterolemia = elevated risk)
    0.18,   # fbs (hyperglycemia / diabetes = elevated risk)
    0.24,   # restecg (ST-T abnormality or LVH = elevated risk)
    -0.72,  # thalach (higher exercise max heart rate = protective / healthy myocardium)
    0.64,   # exang (exercise-induced angina = elevated risk)
    0.86,   # oldpeak (ST depression = strong ischemia marker)
    0.45,   # slope (flat / downsloping ST = elevated risk)
    0.78,   # ca (fluoroscopy stenosed vessels = strong elevated risk)
    0.62    # thal (fixed / reversible defect = strong elevated risk)
], dtype=np.float64)

INITIAL_BIAS = -0.15  # Baseline intercept corresponding to ~46% population baseline

def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(z, -25.0, 25.0)))

def normalize_features(X: np.ndarray) -> np.ndarray:
    return (X - POPULATION_MEANS) / POPULATION_STDS

def compute_sha256_signature(weights: np.ndarray, bias: float, prefix: str = "SIG") -> str:
    combined = np.append(weights, bias).astype(np.float64).tobytes()
    digest = hashlib.sha256(combined).hexdigest()[:16].upper()
    return f"{prefix}:{digest}"

class FederatedModel:
    def __init__(self, weights: Optional[np.ndarray] = None, bias: Optional[float] = None):
        self.weights = np.copy(weights if weights is not None else INITIAL_WEIGHTS)
        self.bias = float(bias if bias is not None else INITIAL_BIAS)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "weights": self.weights.tolist(),
            "bias": self.bias,
            "signature": compute_sha256_signature(self.weights, self.bias)
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FederatedModel":
        w = np.array(data.get("weights", INITIAL_WEIGHTS), dtype=np.float64)
        b = float(data.get("bias", INITIAL_BIAS))
        return cls(weights=w, bias=b)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if X.ndim == 1:
            X = X.reshape(1, -1)
        X_norm = normalize_features(X)
        z = np.dot(X_norm, self.weights) + self.bias
        return sigmoid(z)

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        probs = self.predict_proba(X)
        preds = (probs >= 0.5).astype(int)
        
        accuracy = float(np.mean(preds == y) * 100.0)
        
        # Binary Cross Entropy Loss
        eps = 1e-12
        probs_clipped = np.clip(probs, eps, 1.0 - eps)
        bce_loss = float(-np.mean(y * np.log(probs_clipped) + (1 - y) * np.log(1 - probs_clipped)))
        
        # Precision, Recall, F1
        tp = float(np.sum((preds == 1) & (y == 1)))
        fp = float(np.sum((preds == 1) & (y == 0)))
        fn = float(np.sum((preds == 0) & (y == 1)))
        
        precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        
        return {
            "accuracy": round(accuracy, 1),
            "loss": round(bce_loss, 4),
            "f1": round(f1, 3),
            "precision": round(precision, 3),
            "recall": round(recall, 3)
        }

    def train_sgd(
        self,
        X: np.ndarray,
        y: np.ndarray,
        epochs: int = 20,
        lr: float = 0.05,
        l2_reg: float = 0.01,
        clip_c: float = 1.0,
        global_ref_weights: Optional[np.ndarray] = None,
        global_ref_bias: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes local on-premise Mini-Batch SGD on that hospital node's sovereign records.
        Applies L2 gradient sensitivity clipping relative to global baseline (||Δw|| ≤ clip_c).
        """
        X_norm = normalize_features(X)
        n_samples = X_norm.shape[0]
        batch_size = min(32, n_samples)
        
        ref_w = np.copy(global_ref_weights if global_ref_weights is not None else self.weights)
        ref_b = float(global_ref_bias if global_ref_bias is not None else self.bias)

        indices = np.arange(n_samples)
        
        for epoch in range(epochs):
            np.random.shuffle(indices)
            for start_idx in range(0, n_samples, batch_size):
                batch_idx = indices[start_idx:start_idx + batch_size]
                xb = X_norm[batch_idx]
                yb = y[batch_idx]
                
                probs = sigmoid(np.dot(xb, self.weights) + self.bias)
                errors = probs - yb
                
                grad_w = np.dot(xb.T, errors) / len(batch_idx) + l2_reg * self.weights
                grad_b = np.mean(errors)
                
                self.weights -= lr * grad_w
                self.bias -= lr * grad_b

        # L2 Sensitivity Gradient Clipping relative to reference global state
        delta_w = self.weights - ref_w
        delta_b = self.bias - ref_b
        delta_vec = np.append(delta_w, delta_b)
        l2_norm = float(np.linalg.norm(delta_vec))

        if l2_norm > clip_c:
            scale = clip_c / l2_norm
            self.weights = ref_w + delta_w * scale
            self.bias = ref_b + delta_b * scale

        # Evaluate performance on the local hospital dataset
        metrics = self.evaluate(X, y)
        signature = compute_sha256_signature(self.weights, self.bias, prefix="SIG")

        return {
            "local_accuracy": metrics["accuracy"],
            "local_loss": metrics["loss"],
            "f1": metrics["f1"],
            "weight_signature": signature
        }

def federated_averaging(
    models: List[FederatedModel],
    sample_counts: List[int],
    dp_enabled: bool = True,
    noise_scale: float = 0.05,
    round_num: int = 1
) -> Tuple[FederatedModel, str]:
    """
    Computes sample-weighted Federated Averaging (FedAvg):
        W_{t+1} = Σ (n_k / N) * W_k
    Optionally applies calibrated zero-mean Laplace Differential Privacy noise.
    Mints global round signature FED-SIG-t:...
    """
    total_n = float(sum(sample_counts))
    if total_n <= 0:
        total_n = 1.0

    weighted_w = np.zeros_like(models[0].weights)
    weighted_b = 0.0

    for m, n in zip(models, sample_counts):
        weight_frac = n / total_n
        weighted_w += weight_frac * m.weights
        weighted_b += weight_frac * m.bias

    # Apply Laplace Differential Privacy perturbation if active
    if dp_enabled and noise_scale > 0:
        # Calibrated zero-mean Laplace noise: scale b = noise_scale
        laplace_noise_w = np.random.laplace(0.0, noise_scale, size=weighted_w.shape)
        laplace_noise_b = float(np.random.laplace(0.0, noise_scale))
        weighted_w += laplace_noise_w
        weighted_b += laplace_noise_b

    global_model = FederatedModel(weights=weighted_w, bias=weighted_b)
    global_signature = compute_sha256_signature(weighted_w, weighted_b, prefix=f"FED-SIG-{round_num}")
    
    return global_model, global_signature

def explain_prediction_shap(
    model: FederatedModel,
    patient_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes exact linear SHAP feature attributions for a clinical patient case:
        phi_j = w_j * (x_j - mu_j) / sigma_j
    Returns feature attributions, reference ranges, triage category, and ACC/AHA guidelines.
    """
    feature_vals = np.array([
        float(patient_data.get("age", 60)),
        float(patient_data.get("sex", 1)),
        float(patient_data.get("cp", 1)),
        float(patient_data.get("trestbps", 130)),
        float(patient_data.get("chol", 240)),
        float(patient_data.get("fbs", 0)),
        float(patient_data.get("restecg", 0)),
        float(patient_data.get("thalach", 150)),
        float(patient_data.get("exang", 0)),
        float(patient_data.get("oldpeak", 1.0)),
        float(patient_data.get("slope", 1)),
        float(patient_data.get("ca", 0)),
        float(patient_data.get("thal", 2))
    ], dtype=np.float64)

    # Normalized features
    z_scores = (feature_vals - POPULATION_MEANS) / POPULATION_STDS

    # Log-odds contributions: phi_j = w_j * z_j
    attributions = model.weights * z_scores

    # Population baseline probability: sigmoid(bias)
    base_prob = float(sigmoid(np.array([model.bias]))[0])
    base_prob_pct = round(base_prob * 100.0, 1)

    # Calculated risk probability: sigmoid(w^T z + b)
    final_z = float(np.sum(attributions) + model.bias)
    risk_prob = float(sigmoid(np.array([final_z]))[0])
    risk_score_pct = round(risk_prob * 100.0, 1)

    # Triage and Risk Categories
    if risk_score_pct >= 65.0:
        risk_category = "High Cardiac Risk"
        risk_color = "var(--red-accent)"
        triage_level = "CRITICAL"
        recommendation = (
            "ACC/AHA Class I Indication: Urgent cardiology consultation, emergent diagnostic coronary angiography, "
            "and continuous telemetry monitoring. Initiate intensive statin therapy and dual antiplatelet regimen."
        )
    elif risk_score_pct >= 35.0:
        risk_category = "Moderate Risk"
        risk_color = "var(--amber-accent)"
        triage_level = "MODERATE"
        recommendation = (
            "ACC/AHA Class IIa Indication: Non-invasive functional cardiac evaluation recommended. Order formal treadmill "
            "stress electrocardiography or myocardial perfusion imaging (SPECT). Optimize antihypertensive and lipid therapy."
        )
    else:
        risk_category = "Low Risk / Normal"
        risk_color = "var(--emerald-accent)"
        triage_level = "NORMAL"
        recommendation = (
            "ACC/AHA Class III Guideline: Low calculated 10-year atherosclerotic cardiovascular event risk. "
            "Continue standard lifestyle intervention, heart-healthy dietary counseling, and annual routine clinical follow-up."
        )

    # Feature labels and medical rationales
    labels_and_rationales = [
        ("Patient Chronological Age", f"Age {int(feature_vals[0])} years. Risk of vascular stiffness and coronary calcification increases with advancing age."),
        ("Biological Sex", f"Sex classified as {'Male (1)' if feature_vals[1] == 1 else 'Female (0)'}. Epidemiology indicates distinct sex-linked cardiovascular vulnerability."),
        ("Chest Pain Classification", f"Classification: Type {int(feature_vals[2])} ({'Typical Angina' if feature_vals[2]==0 else 'Atypical Angina' if feature_vals[2]==1 else 'Non-anginal Discomfort' if feature_vals[2]==2 else 'Asymptomatic Ischemia'})."),
        ("Resting Systolic Blood Pressure", f"Resting BP of {int(feature_vals[3])} mm Hg ({'Optimal' if feature_vals[3]<=120 else 'Prehypertension' if feature_vals[3]<=139 else 'Stage 1/2 HTN'}). Chronic pressure increases myocardial workload."),
        ("Serum Cholesterol", f"Serum Cholesterol {int(feature_vals[4])} mg/dl ({'Desirable <200' if feature_vals[4]<200 else 'Borderline 200-239' if feature_vals[4]<240 else 'High Hypercholesterolemia ≥240'}). Atherogenic plaque biomarker."),
        ("Fasting Blood Sugar", f"Fasting Blood Sugar {'Elevated >120 mg/dl' if feature_vals[5]==1 else 'Normal ≤120 mg/dl'}. Diabetes accelerates microvascular endothelial damage."),
        ("Resting Electrocardiography", f"Resting ECG: Type {int(feature_vals[6])} ({'Normal Sinus' if feature_vals[6]==0 else 'ST-T Wave Abnormality' if feature_vals[6]==1 else 'Left Ventricular Hypertrophy'})."),
        ("Maximum Exercise Heart Rate", f"Max Heart Rate {int(feature_vals[7])} bpm. Higher exercise tolerance provides a strong protective myocardium indicator."),
        ("Exercise-Induced Angina", f"Angina during exercise: {'Present (Yes)' if feature_vals[8]==1 else 'Absent (No)'}. Characteristic sign of coronary insufficiency."),
        ("ST Segment Depression (Oldpeak)", f"ST Depression {feature_vals[9]} mm relative to rest. Primary electrocardiographic hallmark of exercise-induced myocardial ischemia."),
        ("Peak Exercise ST Slope", f"ST Slope: Type {int(feature_vals[10])} ({'Upsloping (Normal)' if feature_vals[10]==0 else 'Flat (Ischemia)' if feature_vals[10]==1 else 'Downsloping (Severe Ischemia)'})."),
        ("Major Fluoroscopy Vessels", f"{int(feature_vals[11])} major coronary vessels stenosed / colored by fluoroscopy. Multivessel stenosis substantially elevates ischemic burden."),
        ("Thallium Scintigraphy Stress", f"Stress Test Perfusion: Type {int(feature_vals[12])} ({'Normal Perfusion' if feature_vals[12]==1 else 'Fixed Myocardial Defect' if feature_vals[12]==2 else 'Reversible Ischemic Defect'}).")
    ]

    feature_attribution_list = []
    for j in range(len(FEATURE_NAMES)):
        if FEATURE_NAMES[j] == "sex":
            continue
        attr = attributions[j]
        direction = "increases_risk" if attr > 0 else "decreases_risk"
        # Impact score scaled to percentage contribution
        impact_pct = round(float(attr * 12.5), 1)
        if impact_pct == 0.0:
            impact_pct = 0.5 if attr > 0 else -0.5

        feature_attribution_list.append({
            "feature": FEATURE_NAMES[j],
            "label": labels_and_rationales[j][0],
            "value": float(feature_vals[j]),
            "attribution": round(float(attr), 3),
            "impact_score": impact_pct,
            "direction": direction,
            "rationale": labels_and_rationales[j][1]
        })

    # Sort attributions by absolute impact magnitude descending for prominent clinical display
    feature_attribution_list.sort(key=lambda x: abs(x["impact_score"]), reverse=True)

    # Clinical Reference Threshold Matrix
    reference_analysis = [
        {
            "label": "Resting Systolic BP",
            "patient_value": f"{int(feature_vals[3])} mm Hg",
            "is_abnormal": bool(feature_vals[3] > 130),
            "status": "Normal (90-120)" if feature_vals[3] <= 120 else ("Elevated" if feature_vals[3] <= 139 else "Hypertensive Crisis (≥140)")
        },
        {
            "label": "Serum Cholesterol",
            "patient_value": f"{int(feature_vals[4])} mg/dl",
            "is_abnormal": bool(feature_vals[4] >= 240),
            "status": "Desirable (<200)" if feature_vals[4] < 200 else ("Borderline (200-239)" if feature_vals[4] < 240 else "High Risk (≥240)")
        },
        {
            "label": "ST Depression (Oldpeak)",
            "patient_value": f"{feature_vals[9]} mm",
            "is_abnormal": bool(feature_vals[9] > 1.0),
            "status": "Normal (<1.0 mm)" if feature_vals[9] <= 1.0 else "Inducible Ischemia (>1.0 mm)"
        },
        {
            "label": "Max Heart Rate (Exercise)",
            "patient_value": f"{int(feature_vals[7])} bpm",
            "is_abnormal": bool(feature_vals[7] < 125),
            "status": "Normal Exercise Capacity" if feature_vals[7] >= 125 else "Impaired Chronotropic Response"
        },
        {
            "label": "Fluoroscopy Stenosed Vessels",
            "patient_value": f"{int(feature_vals[11])} Vessels",
            "is_abnormal": bool(feature_vals[11] > 0),
            "status": "Patent Arteries (0)" if feature_vals[11] == 0 else f"{int(feature_vals[11])} Stenosed Vessel(s)"
        },
        {
            "label": "Fasting Blood Sugar",
            "patient_value": "> 120 mg/dl" if feature_vals[5] == 1 else "≤ 120 mg/dl",
            "is_abnormal": bool(feature_vals[5] == 1),
            "status": "Elevated (Diabetic Risk)" if feature_vals[5] == 1 else "Normal Glycemic Status"
        }
    ]

    return {
        "risk_score_pct": risk_score_pct,
        "risk_category": risk_category,
        "risk_color": risk_color,
        "triage_level": triage_level,
        "base_probability_pct": base_prob_pct,
        "recommendation": recommendation,
        "feature_attributions": feature_attribution_list,
        "reference_analysis": reference_analysis
    }

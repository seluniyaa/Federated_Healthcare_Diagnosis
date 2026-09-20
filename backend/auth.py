import time
import base64
import hmac
import hashlib
import json
from typing import Dict, Any, Optional

SECRET_KEY = "federated-healthcare-consortium-secret-key-2026-v3"
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days

PRESET_USERS = {
    "doctor_jenkins": {
        "email": "doctor@metro_general.org",
        "password": "doctor123",
        "full_name": "Dr. Sarah Jenkins",
        "role": "doctor",
        "hospital_node": "metro_general",
        "hospital_name": "Metro General Hospital"
    },
    "doctor_vance": {
        "email": "doctor@st_jude.org",
        "password": "doctor123",
        "full_name": "Dr. Michael Vance",
        "role": "doctor",
        "hospital_node": "st_jude",
        "hospital_name": "St. Jude Medical Center"
    },
    "doctor_ross": {
        "email": "doctor@city_health.org",
        "password": "doctor123",
        "full_name": "Dr. David Ross",
        "role": "doctor",
        "hospital_node": "city_health",
        "hospital_name": "City Health Institute"
    },
    "doctor_brody": {
        "email": "doctor@university_research.org",
        "password": "doctor123",
        "full_name": "Dr. Marcus Brody",
        "role": "doctor",
        "hospital_node": "university_research",
        "hospital_name": "University Research Hospital"
    },
    "admin_metro": {
        "email": "admin@metro_general.org",
        "password": "admin123",
        "full_name": "Admin (Metro General Hospital)",
        "role": "admin",
        "hospital_node": "metro_general",
        "hospital_name": "Metro General Hospital"
    },
    "admin_stjude": {
        "email": "admin@st_jude.org",
        "password": "admin123",
        "full_name": "Admin (St. Jude Medical Center)",
        "role": "admin",
        "hospital_node": "st_jude",
        "hospital_name": "St. Jude Medical Center"
    },
    "admin_cityhealth": {
        "email": "admin@city_health.org",
        "password": "admin123",
        "full_name": "Admin (City Health Institute)",
        "role": "admin",
        "hospital_node": "city_health",
        "hospital_name": "City Health Institute"
    },
    "admin_univ": {
        "email": "admin@university_research.org",
        "password": "admin123",
        "full_name": "Admin (University Research Hospital)",
        "role": "admin",
        "hospital_node": "university_research",
        "hospital_name": "University Research Hospital"
    },
    "coordinator_lead": {
        "email": "coordinator@research.org",
        "password": "coord123",
        "full_name": "Dr. Elena Rostova",
        "role": "researcher",
        "hospital_node": "all",
        "hospital_name": "Consortium Governance Hub"
    }
}

HOSPITAL_DISPLAY_NAMES = {
    "metro_general": "Metro General Hospital",
    "st_jude": "St. Jude Medical Center",
    "city_health": "City Health Institute",
    "university_research": "University Research Hospital",
    "all": "Global Consortium Federation Hub"
}

PHYSICIAN_NAMES = {
    "metro_general": "Dr. Sarah Jenkins",
    "st_jude": "Dr. Michael Vance",
    "city_health": "Dr. David Ross",
    "university_research": "Dr. Marcus Brody"
}

def create_access_token(user_data: Dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_data["email"],
        "role": user_data["role"],
        "hospital_node": user_data["hospital_node"],
        "full_name": user_data["full_name"],
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS
    }
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig_b64 + "==")
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
            
        payload_json = base64.urlsafe_b64decode(payload_b64 + "==").decode()
        payload = json.loads(payload_json)
        
        if payload.get("exp", 0) < int(time.time()):
            return None
            
        return payload
    except Exception:
        return None

def authenticate_user(identifier: str, password: str, hospital_node: str = "metro_general") -> Optional[Dict[str, Any]]:
    clean_id = identifier.lower().strip()
    
    # Check exact preset usernames or emails
    matched_user = None
    for uname, udata in PRESET_USERS.items():
        if clean_id == uname or clean_id == udata["email"].lower():
            if password == udata["password"]:
                matched_user = udata.copy()
                break

    # If not matched directly, check intuitive role prefixes
    if not matched_user:
        if ("coordinator" in clean_id or "researcher" in clean_id or "rostova" in clean_id) and password in ["coord123", "coordinator123", "password", "admin123"]:
            matched_user = PRESET_USERS["coordinator_lead"].copy()
        elif "admin" in clean_id and password in ["admin123", "password"]:
            matched_user = {
                "email": f"admin@{hospital_node}.org",
                "full_name": f"Admin ({HOSPITAL_DISPLAY_NAMES.get(hospital_node, hospital_node)})",
                "role": "admin",
                "hospital_node": hospital_node,
                "hospital_name": HOSPITAL_DISPLAY_NAMES.get(hospital_node, "Local Hospital")
            }
        elif ("doctor" in clean_id or "jenkins" in clean_id or "vance" in clean_id) and password in ["doctor123", "password"]:
            matched_user = {
                "email": f"doctor@{hospital_node}.org",
                "full_name": PHYSICIAN_NAMES.get(hospital_node, "Attending Physician"),
                "role": "doctor",
                "hospital_node": hospital_node,
                "hospital_name": HOSPITAL_DISPLAY_NAMES.get(hospital_node, "Local Hospital")
            }

    if matched_user:
        # If user is logging into a specific hospital node, bind their session to it
        if matched_user["role"] != "researcher" and hospital_node != "all":
            matched_user["hospital_node"] = hospital_node
            matched_user["hospital_name"] = HOSPITAL_DISPLAY_NAMES.get(hospital_node, matched_user["hospital_name"])
            if matched_user["role"] == "doctor":
                matched_user["full_name"] = PHYSICIAN_NAMES.get(hospital_node, matched_user["full_name"])
        elif matched_user["role"] == "researcher":
            matched_user["hospital_node"] = "all"
            matched_user["hospital_name"] = "Consortium Governance Hub"

    return matched_user

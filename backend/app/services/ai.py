# ============================================================
# MineSafe AI — AI Risk Assessment & Inference Engine
# ============================================================
# Python implementation of the geotechnical multi-indicator risk evaluation logic.
# Evaluates 5 key surface indicators against location-specific node thresholds:
#   1. Tilt (degrees)
#   2. Displacement (mm)
#   3. Vibration (%)
#   4. Crack Detection (boolean)
#   5. Relative Movement (mm)

import math
from typing import Dict, Any, List, Tuple


def evaluate_thresholds(readings: Dict[str, Any], thresholds: Dict[str, Any]) -> Dict[str, bool]:
    """
    Evaluate raw sensor readings against node thresholds.
    Returns a dict mapping indicator name to boolean (True = abnormal/exceeded).
    """
    return {
        "tilt": readings["tilt"] > thresholds["thr_tilt"],
        "displacement": readings["displacement"] > thresholds["thr_displacement"],
        "vibration": readings["vibration"] > thresholds["thr_vibration"],
        "crack": bool(readings.get("crack_detected", False)) and bool(thresholds.get("thr_crack", True)),
        "relative_movement": readings["relative_movement"] > thresholds["thr_relative_movement"],
    }


def calculate_risk_level(status: Dict[str, bool]) -> str:
    """
    Determine risk level ('L0'|'L1'|'L2'|'L3') based on abnormal count:
      - L0 (NORMAL): 0 abnormal indicators
      - L1 (WATCH): 1-2 abnormal indicators
      - L2 (WARNING): 3-4 abnormal indicators
      - L3 (CRITICAL): ALL 5 indicators abnormal
    """
    abnormal_count = sum(1 for is_abnormal in status.values() if is_abnormal)
    if abnormal_count == 5:
        return "L3"
    elif abnormal_count >= 3:
        return "L2"
    elif abnormal_count >= 1:
        return "L1"
    return "L0"


def calculate_risk_score(readings: Dict[str, Any], thresholds: Dict[str, Any], status: Dict[str, bool]) -> int:
    """
    Calculate composite risk probability score (0-100%).
    Considers abnormal count, exceedance percentages, and peak severity.
    """
    abnormal_count = sum(1 for is_abnormal in status.values() if is_abnormal)
    if abnormal_count == 0:
        # Base low noise for normal operational state
        return max(5, int(readings.get("displacement", 0) * 2 + readings.get("tilt", 0) * 10))

    severities = []

    if status["tilt"] and thresholds["thr_tilt"] > 0:
        sev = min(((readings["tilt"] / thresholds["thr_tilt"]) - 1.0) * 100.0, 100.0)
        severities.append(max(sev, 10.0))

    if status["displacement"] and thresholds["thr_displacement"] > 0:
        sev = min(((readings["displacement"] / thresholds["thr_displacement"]) - 1.0) * 100.0, 100.0)
        severities.append(max(sev, 10.0))

    if status["vibration"] and thresholds["thr_vibration"] > 0:
        sev = min(((readings["vibration"] / thresholds["thr_vibration"]) - 1.0) * 100.0, 100.0)
        severities.append(max(sev, 10.0))

    if status["crack"]:
        severities.append(80.0)  # Crack detection is binary and severe

    if status["relative_movement"] and thresholds["thr_relative_movement"] > 0:
        sev = min(((readings["relative_movement"] / thresholds["thr_relative_movement"]) - 1.0) * 100.0, 100.0)
        severities.append(max(sev, 10.0))

    count_factor = (abnormal_count / 5.0) * 100.0
    avg_severity = sum(severities) / len(severities) if severities else 0.0
    max_severity = max(severities) if severities else 0.0

    score = (count_factor * 0.40) + (avg_severity * 0.35) + (max_severity * 0.25)
    return min(max(round(score), 15), 100)


def calculate_ai_confidence(status: Dict[str, bool]) -> int:
    """Calculate model confidence score (75-98%)."""
    abnormal_count = sum(1 for is_abnormal in status.values() if is_abnormal)
    base = 96 - (abnormal_count * 2)
    return max(75, min(base, 98))


def calculate_predicted_deformation(risk_level: str, current_displacement: float) -> Tuple[float, str]:
    """
    Return predicted deformation (mm) and trend based on current risk level.
    """
    if risk_level == "L3":
        pred = round(current_displacement + 12.0, 1)
        trend = "Rapidly Increasing"
    elif risk_level == "L2":
        pred = round(current_displacement + 5.5, 1)
        trend = "Increasing"
    elif risk_level == "L1":
        pred = round(current_displacement + 2.0, 1)
        trend = "Slowly Increasing"
    else:
        pred = round(max(0.2, current_displacement * 0.1), 1)
        trend = "Stable"
    return pred, trend


def calculate_risk_metrics(readings: Dict[str, Any], thresholds: Dict[str, Any]) -> Dict[str, Any]:
    """
    Master function to compute all derived risk & AI fields for a new sensor reading.

    Args:
        readings: dict with tilt, displacement, vibration, crack_detected, relative_movement
        thresholds: dict with thr_tilt, thr_displacement, thr_vibration, thr_crack, thr_relative_movement

    Returns dict containing:
        - risk_level ('L0'|'L1'|'L2'|'L3')
        - risk_score (0-100)
        - ai_confidence (0-100)
        - predicted_deformation (mm)
        - prediction_horizon (6 hours)
        - trend ('Stable'|'Slowly Increasing'|etc.)
        - status (dict of boolean flags)
    """
    status = evaluate_thresholds(readings, thresholds)
    risk_level = calculate_risk_level(status)
    risk_score = calculate_risk_score(readings, thresholds, status)
    ai_confidence = calculate_ai_confidence(status)
    predicted_deformation, trend = calculate_predicted_deformation(risk_level, readings.get("displacement", 0.0))

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "ai_confidence": ai_confidence,
        "predicted_deformation": predicted_deformation,
        "prediction_horizon": 6,
        "trend": trend,
        "status": status,
    }


def get_contributing_factors(readings: Dict[str, Any], thresholds: Dict[str, Any], status: Dict[str, bool]) -> List[Dict[str, str]]:
    """Build structured contributing factors list for UI display."""
    return [
        {
            "indicator": "Tilt",
            "status": "abnormal" if status["tilt"] else "normal",
            "description": "Tilt exceeded local threshold" if status["tilt"] else "Tilt within normal range",
            "value": f"{readings['tilt']:.2f}°",
            "threshold": f"{thresholds['thr_tilt']:.2f}°",
        },
        {
            "indicator": "Displacement",
            "status": "abnormal" if status["displacement"] else "normal",
            "description": "Displacement elevated / increasing" if status["displacement"] else "Displacement within normal range",
            "value": f"{readings['displacement']:.1f} mm",
            "threshold": f"{thresholds['thr_displacement']:.1f} mm",
        },
        {
            "indicator": "Vibration",
            "status": "abnormal" if status["vibration"] else "normal",
            "description": "Abnormal ground vibration detected" if status["vibration"] else "Vibration within normal range",
            "value": f"{readings['vibration']:.0f}%",
            "threshold": f"{thresholds['thr_vibration']:.0f}%",
        },
        {
            "indicator": "Crack Detection",
            "status": "abnormal" if status["crack"] else "normal",
            "description": "Crack sensor detected a surface fracture" if status["crack"] else "No crack detected",
            "value": "Detected" if readings.get("crack_detected") else "None",
            "threshold": "Detection",
        },
        {
            "indicator": "Relative Movement",
            "status": "abnormal" if status["relative_movement"] else "normal",
            "description": "Relative movement exceeded spatial threshold" if status["relative_movement"] else "Relative movement within normal range",
            "value": f"{readings['relative_movement']:.1f} mm",
            "threshold": f"{thresholds['thr_relative_movement']:.1f} mm",
        },
    ]


def get_recommended_actions(node_id: str, risk_level: str, status: Dict[str, bool]) -> List[str]:
    """Generate recommended safety actions based on risk level and active anomalies."""
    actions = []
    if risk_level == "L0":
        actions.append("Continue routine monitoring.")
    elif risk_level == "L1":
        actions.append("Increase monitoring frequency for affected indicators.")
        if status["tilt"]:
            actions.append(f"Monitor tilt readings at {node_id}.")
        if status["displacement"]:
            actions.append(f"Track displacement trends near {node_id}.")
        actions.append("No immediate safety action required.")
    elif risk_level == "L2":
        actions.append(f"Inspect surface deformation near {node_id}.")
        actions.append("Notify designated mine safety personnel.")
        if status["crack"]:
            actions.append("Investigate crack detection area.")
        actions.append("Review access restrictions for the affected monitoring zone.")
        actions.append("Prepare for possible escalation.")
    elif risk_level == "L3":
        actions.append(f"Restrict access to the affected monitoring zone near {node_id}.")
        actions.append(f"Inspect surface deformation near {node_id} immediately.")
        actions.append("Notify designated mine safety personnel.")
        actions.append("Prepare personnel movement toward an approved safe/refuge location if required.")
        actions.append("Review and activate emergency response procedures.")
    return actions


def get_anomaly_explanation(node_id: str, readings: Dict[str, Any], thresholds: Dict[str, Any], status: Dict[str, bool], trend: str) -> str:
    """Generate human-readable text explanation of the AI risk assessment."""
    abnormal_count = sum(1 for is_abnormal in status.values() if is_abnormal)
    if abnormal_count == 0:
        return "All monitored indicators are within normal thresholds. No significant deformation pattern detected."

    parts = []
    if abnormal_count == 5:
        parts.append("All five monitored indicators show abnormal readings.")
    else:
        parts.append(f"{abnormal_count} of 5 monitored indicators show abnormal readings.")

    if status["tilt"] and thresholds["thr_tilt"] > 0:
        exceedance = round(((readings["tilt"] / thresholds["thr_tilt"]) - 1.0) * 100.0)
        parts.append(f"Tilt exceeds local threshold by {exceedance}%.")

    if status["displacement"]:
        parts.append(f"Displacement is elevated at {readings['displacement']:.1f} mm.")

    if status["vibration"]:
        parts.append("Abnormal ground vibration detected.")

    if status["crack"]:
        parts.append("Crack sensor has detected surface cracking.")

    if status["relative_movement"]:
        parts.append(f"Relative movement between nodes exceeds threshold at {readings['relative_movement']:.1f} mm.")

    if trend in ["Rapidly Increasing", "Increasing"]:
        parts.append(f"Trend is {trend.lower()}, suggesting worsening geotechnical conditions.")

    return " ".join(parts)


def build_ai_risk_assessment(
    node_id: str,
    readings: Dict[str, Any],
    thresholds: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Build complete AIRiskAssessment dictionary response for GET /nodes/{node_id}/ai-assessment.
    """
    metrics = calculate_risk_metrics(readings, thresholds)
    status = metrics["status"]
    factors = get_contributing_factors(readings, thresholds, status)
    actions = get_recommended_actions(node_id, metrics["risk_level"], status)
    explanation = get_anomaly_explanation(node_id, readings, thresholds, status, metrics["trend"])

    return {
        "node_id": node_id,
        "risk_score": metrics["risk_score"],
        "confidence": metrics["ai_confidence"],
        "predicted_deformation": metrics["predicted_deformation"],
        "prediction_horizon": metrics["prediction_horizon"],
        "trend": metrics["trend"],
        "contributing_factors": factors,
        "recommended_actions": actions,
        "explanation": explanation,
    }

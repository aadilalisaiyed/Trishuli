# ============================================================
# MineSafe AI — Report Schemas
# ============================================================

from datetime import datetime
import json
from typing import Any, ClassVar, List
from pydantic import BaseModel, Field, model_validator

from app.schemas.alert import AlertOut


class DateRange(BaseModel):
    start: datetime
    end: datetime


class ReportSection(BaseModel):
    id: str
    label: str
    enabled: bool


class ReportConfig(BaseModel):
    mine: str = "Prototype Mine"
    date_range: DateRange
    node_scope: List[str] = Field(default=["ALL"])
    region: str = ""
    sections: List[ReportSection] = Field(default_factory=list)

    default_labels: ClassVar[dict[str, str]] = {
        "executive-summary": "Executive Summary",
        "risk-overview": "Risk Overview",
        "affected-zones": "Affected Zones",
        "sensor-statistics": "Sensor Statistics",
        "major-alerts": "Major Alerts",
        "ai-predictions": "AI Predictions",
        "node-health": "Node Health",
        "trend-analysis": "Trend Analysis",
        "recommended-actions": "Recommended Actions",
    }

    @model_validator(mode="before")
    @classmethod
    def normalize_sections(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = json.loads(value)
        if not isinstance(value, dict):
            return value

        sections = value.get("sections", [])
        if isinstance(sections, str):
            sections = json.loads(sections)
        if sections is None:
            sections = []

        normalized = []
        for section in sections:
            if isinstance(section, str):
                normalized.append({
                    "id": section,
                    "label": cls.default_labels.get(section, section.replace("-", " ").title()),
                    "enabled": True,
                })
            elif isinstance(section, dict):
                section = dict(section)
                section.setdefault(
                    "label",
                    cls.default_labels.get(
                        section.get("id", ""),
                        str(section.get("id", "")).replace("-", " ").title(),
                    ),
                )
                section.setdefault("enabled", True)
                normalized.append(section)
            else:
                normalized.append(section)

        value = dict(value)
        value["sections"] = normalized
        return value

    @property
    def enabled_section_ids(self) -> set[str]:
        return {section.id for section in self.sections if section.enabled}


class NodeStatistic(BaseModel):
    node_id: str
    avg_tilt: float
    max_displacement: float
    peak_vibration: float
    crack_events: int
    avg_risk_score: float


class AIPredictionStat(BaseModel):
    node_id: str
    avg_prediction_accuracy: float
    avg_confidence: float
    predicted_deformation: float


class RiskOverview(BaseModel):
    overall_risk: str
    l0_percentage: float
    l1_percentage: float
    l2_percentage: float
    l3_percentage: float


class ReportDataOut(BaseModel):
    config: ReportConfig
    generated_at: datetime
    summary: str
    risk_overview: RiskOverview
    node_statistics: List[NodeStatistic]
    alerts: List[AlertOut]
    ai_predictions: List[AIPredictionStat]

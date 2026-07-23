from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(
    title="MHSHMS AI Service",
    description="AI Microservice for Military Hospital Smart Healthcare Management System",
    version="1.0.0"
)

class SymptomRequest(BaseModel):
    symptoms: List[str]
    age: int
    gender: str

class SymptomResponse(BaseModel):
    department: str
    confidence: float
    urgency: str # e.g. "LOW", "MEDIUM", "HIGH", "EMERGENCY"
    explanation: str

class DoctorRecRequest(BaseModel):
    department: str
    symptoms: List[str]

class DoctorRecResponse(BaseModel):
    doctorId: str
    doctorName: str
    matchScore: float
    reason: str

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "AI Recommendation Engine"}

@app.post("/api/v1/ai/triage", response_model=SymptomResponse)
def symptom_triage(request: SymptomRequest):
    # Simulated symptoms to department mapping
    symptoms_str = " ".join([s.lower() for s in request.symptoms])
    
    department = "General Medicine"
    confidence = 0.65
    urgency = "MEDIUM"
    explanation = "Based on symptoms, a general evaluation is recommended."

    if any(k in symptoms_str for k in ["chest pain", "heart", "palpitation"]):
        department = "Cardiology"
        confidence = 0.95
        urgency = "EMERGENCY"
        explanation = "Chest pain and cardiovascular symptoms require immediate evaluation by Cardiology."
    elif any(k in symptoms_str for k in ["fracture", "bone", "knee pain", "joint", "back pain"]):
        department = "Orthopedics"
        confidence = 0.88
        urgency = "MEDIUM"
        explanation = "Joint/bone symptoms point toward musculoskeletal issues. Orthopedics consultation advised."
    elif any(k in symptoms_str for k in ["skin", "rash", "itch"]):
        department = "Dermatology"
        confidence = 0.90
        urgency = "LOW"
        explanation = "Skin lesions and rashes are evaluated by Dermatology."
    elif any(k in symptoms_str for k in ["ear", "nose", "throat", "tonsil", "hearing"]):
        department = "ENT"
        confidence = 0.92
        urgency = "LOW"
        explanation = "Symptoms localizing to ear, nose, or throat point to ENT."

    return SymptomResponse(
        department=department,
        confidence=confidence,
        urgency=urgency,
        explanation=explanation
    )

@app.post("/api/v1/ai/recommend-doctor", response_model=List[DoctorRecResponse])
def recommend_doctor(request: DoctorRecRequest):
    # Simulated doctor recommendations
    if request.department.lower() == "cardiology":
        return [
            DoctorRecResponse(doctorId="doc-cardio-1", doctorName="Col. Dr. A. K. Sharma", matchScore=0.98, reason="Senior Cardiologist with 22 years experience, available in 15 mins."),
            DoctorRecResponse(doctorId="doc-cardio-2", doctorName="Lt. Col. Dr. Meera Sen", matchScore=0.85, reason="Available for walk-in, 12 mins average waiting time.")
        ]
    elif request.department.lower() == "orthopedics":
        return [
            DoctorRecResponse(doctorId="doc-ortho-1", doctorName="Maj. Dr. Vikram Dev", matchScore=0.94, reason="Specialist in sports injury, average queue time: 8 mins."),
            DoctorRecResponse(doctorId="doc-ortho-2", doctorName="Col. Dr. R. K. Iyer", matchScore=0.88, reason="HOD Orthopedics, requires advanced appointment booking.")
        ]
    else:
        return [
            DoctorRecResponse(doctorId="doc-gen-1", doctorName="Lt. Col. Dr. Rajesh Verma", matchScore=0.90, reason="General Medicine specialist, immediate availability.")
        ]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

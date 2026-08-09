import os
import asyncio
from typing import Literal
from pydantic import Field
from pymongo import MongoClient
from datetime import datetime, timezone


from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types


# Load environment variables
load_dotenv()

# Get Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured in .env")

# Create Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)


# Create FastAPI app
app = FastAPI(
    title="TrapVeil API",
    description="AI-powered Digital Decision Firewall",
    version="1.0.0"
)
# MongoDB connection
MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://localhost:27017"
)

MONGODB_DB = os.getenv(
    "MONGODB_DB",
    "trapveil_db"
)

mongo_client = MongoClient(MONGODB_URI)

database = mongo_client[MONGODB_DB]

scan_collection = database["scan_history"]

try:
    mongo_client.admin.command("ping")
    print("MongoDB connected successfully!")
except Exception as e:
    print(f"MongoDB connection failed: {e}")


# Allow React frontend to communicate with FastAPI
# Supports localhost during development and LAN access from phones/other laptops.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"https?://("
        r"localhost|127\.0\.0\.1|"
        r"10\.(?:[0-9]{1,3}\.){2}[0-9]{1,3}|"
        r"192\.168\.(?:[0-9]{1,3}\.)[0-9]{1,3}|"
        r"172\.(?:1[6-9]|2[0-9]|3[0-1])\.(?:[0-9]{1,3}\.)[0-9]{1,3}"
        r")(?::[0-9]+)?"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request model
class MessageRequest(BaseModel):
    message: str

class Threat(BaseModel):
    name: str = Field(
        description="Name of the detected threat."
    )

    severity: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ] = Field(
        description="Severity of the detected threat."
    )

    evidence: str = Field(
        description="Exact phrase or behavior from the message that supports the finding."
    )


class TrapVeilReport(BaseModel):
    riskScore: int = Field(
        description="Overall risk score from 0 to 100. 0 is safest and 100 is most dangerous."
    )

    decision: Literal[
        "PROCEED",
        "REVIEW",
        "STOP"
    ] = Field(
        description="Recommended user action."
    )

    category: Literal[
    "SAFE",
    "SUSPICIOUS",
    "SCAM",
    "PHISHING",
    "JOB_SCAM",
    "PAYMENT_SCAM",
    "INVESTMENT_SCAM",
    "IMPERSONATION",
    "DARK_PATTERN",
    "SUBSCRIPTION_TRAP",
    "CHECKOUT_TRAP",
    "OTHER"
]= Field(
        description="Primary category of the detected risk."
    )

    summary: str = Field(
        description="Short explanation of the overall assessment."
    )

    threats: list[Threat] = Field(
        description="Specific suspicious signals detected in the message."
    )

    financialImpact: str = Field(
        description="Potential financial impact, or 'None identified' if not applicable."
    )

    privacyImpact: str = Field(
        description="Potential privacy or personal-data impact, or 'None identified'."
    )

    explanation: str = Field(
        description="Clear explanation of why the message received this risk assessment."
    )

    recommendation: str = Field(
        description="Specific safety advice for the user."
    )

@app.get("/")
def root():
    return {
        "message": "TrapVeil API is running!",
        "status": "online"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TrapVeil Backend"
    }


@app.post("/api/test-ai")
def test_ai(request: MessageRequest):

    if not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    prompt = f"""
You are TrapVeil AI, an AI-powered digital safety assistant.

Analyze the following digital message and determine whether it
contains signs of scams, phishing, manipulation, fraudulent offers,
or suspicious financial requests.

Message:
{request.message}

Give a concise safety analysis.
Explain the main warning signs if any are present.
"""

    try:

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

        return {
            "success": True,
            "analysis": response.text
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )

@app.post("/api/analyze/message")
def analyze_message(request: MessageRequest):

    if not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    prompt = f"""
You are TrapVeil, an AI-powered Digital Decision Firewall.

Your job is to analyze a digital message and identify potential
scams, phishing, fraud, manipulation, financial risks, privacy risks,
or other deceptive behavior.

IMPORTANT RULES:

1. Analyze the actual message evidence.
2. Do NOT automatically call something a scam.
3. If the message appears legitimate, use a low risk score.
4. Do not invent facts that are not present.
5. Risk score must be between 0 and 100.
6. Use:
   - PROCEED for low risk
   - REVIEW for uncertain or moderate risk
   - STOP for high or critical risk
7. Identify concrete warning signs.
8. Quote short evidence phrases from the provided message.
9. If there is no financial impact, say "None identified".
10. If there is no privacy impact, say "None identified".
11. Give practical safety advice.

Analyze this message:

---

{request.message}

---
"""

    try:

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": TrapVeilReport
            }
        )

        report = TrapVeilReport.model_validate_json(
            response.text
        )

        # Keep risk score between 0 and 100
        report.riskScore = max(
            0,
            min(100, report.riskScore)
        )

        # Prepare MongoDB document
        scan_document = {
            "type": "message",
            "input": request.message,
            "riskScore": report.riskScore,
            "decision": report.decision,
            "category": report.category,
            "summary": report.summary,
            "threats": [
                threat.model_dump()
                for threat in report.threats
            ],
            "financialImpact": report.financialImpact,
            "privacyImpact": report.privacyImpact,
            "explanation": report.explanation,
            "recommendation": report.recommendation,
            "createdAt": datetime.now(timezone.utc)
        }

        # Store scan in MongoDB
        scan_collection.insert_one(scan_document)

        # Return result to React frontend
        return {
            "success": True,
            "report": report.model_dump()
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"TrapVeil analysis failed: {str(e)}"
        )

@app.post("/api/analyze/image")
async def analyze_image(file: UploadFile = File(...)):

    # Allowed image types
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG, PNG, or WEBP image."
        )

    # Read image
    image_bytes = await file.read()

    # Prevent extremely large uploads
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image must be smaller than 10 MB."
        )

    prompt = """
You are TrapVeil Vision, an AI-powered digital safety
and deception detection system.

Analyze this screenshot carefully.

The screenshot may contain:

- A website
- Checkout page
- Subscription page
- Advertisement
- Job offer
- Payment page
- Login page
- Shopping page
- Popup
- Mobile application screen
- Social media message
- Financial offer

Your task is to identify deceptive or risky design patterns.

Look specifically for:

1. Dark patterns
2. Hidden fees
3. Subscription traps
4. Auto-renewal
5. Preselected options
6. Misleading buttons
7. Fake urgency
8. Countdown pressure
9. Hidden cancellation difficulty
10. Suspicious payment requests
11. Phishing indicators
12. Fake discounts
13. Manipulative wording
14. Privacy risks
15. Requests for sensitive information
16. Suspicious links or domains
17. Unusual financial commitments

IMPORTANT:

- Only identify risks supported by visible evidence.
- Do not invent information that cannot be seen.
- If something is uncertain, explain that it is uncertain.
- Quote short visible text as evidence when possible.
- A legitimate design should NOT automatically be classified as malicious.
- Distinguish between a scam and a dark pattern.
- Consider the financial and privacy consequences.
- Give practical advice to the user.

Analyze the screenshot and produce the structured TrapVeil report.
"""

    try:

        # Convert uploaded image into Gemini image input
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=file.content_type
        )

        # Send image to Gemini Vision
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                image_part,
                prompt
            ],
            config={
                "response_mime_type": "application/json",
                "response_schema": TrapVeilReport
            }
        )

        # Convert Gemini response into TrapVeil report
        report = TrapVeilReport.model_validate_json(
            response.text
        )

        # Keep risk score between 0 and 100
        report.riskScore = max(
            0,
            min(100, report.riskScore)
        )

        # Prepare MongoDB document
        scan_document = {
            "type": "image",
            "filename": file.filename,
            "contentType": file.content_type,
            "fileSize": len(image_bytes),
            "riskScore": report.riskScore,
            "decision": report.decision,
            "category": report.category,
            "summary": report.summary,
            "threats": [
                threat.model_dump()
                for threat in report.threats
            ],
            "financialImpact": report.financialImpact,
            "privacyImpact": report.privacyImpact,
            "explanation": report.explanation,
            "recommendation": report.recommendation,
            "createdAt": datetime.now(timezone.utc)
        }

        # Save image analysis result to MongoDB
        scan_collection.insert_one(scan_document)

        # Return result to frontend
        return {
            "success": True,
            "filename": file.filename,
            "report": report.model_dump()
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"TrapVeil vision analysis failed: {str(e)}"
        )
    
@app.get("/api/history")
def get_scan_history():

    try:

        scans = list(
            scan_collection.find(
                {},
                {
                    "_id": 1,
                    "type": 1,
                    "input": 1,
                    "filename": 1,
                    "riskScore": 1,
                    "decision": 1,
                    "category": 1,
                    "summary": 1,
                    "createdAt": 1
                }
            ).sort(
                "createdAt",
                -1
            )
        )

        history = []

        for scan in scans:

            history.append({
                "id": str(scan["_id"]),
                "type": scan.get("type"),
                "input": scan.get("input"),
                "filename": scan.get("filename"),
                "riskScore": scan.get("riskScore"),
                "decision": scan.get("decision"),
                "category": scan.get("category"),
                "summary": scan.get("summary"),
                "createdAt": scan.get("createdAt").isoformat()
                if scan.get("createdAt")
                else None
            })

        return {
            "success": True,
            "count": len(history),
            "history": history
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve scan history: {str(e)}"
        )

# =========================================================
# DASHBOARD ANALYTICS
# =========================================================

@app.get("/api/dashboard")
def get_dashboard():

    try:
        # ---------------------------------------------------------
        # 1. BASIC OVERVIEW
        # ---------------------------------------------------------

        total_scans = scan_collection.count_documents({})

        proceed_scans = scan_collection.count_documents({
            "decision": "PROCEED"
        })

        review_scans = scan_collection.count_documents({
            "decision": "REVIEW"
        })

        stop_scans = scan_collection.count_documents({
            "decision": "STOP"
        })

        message_scans = scan_collection.count_documents({
            "type": "message"
        })

        image_scans = scan_collection.count_documents({
            "type": "image"
        })

        # ---------------------------------------------------------
        # 2. RISK ANALYTICS
        # ---------------------------------------------------------

        risk_result = list(
            scan_collection.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "averageRisk": {"$avg": "$riskScore"},
                        "highestRisk": {"$max": "$riskScore"},
                        "lowestRisk": {"$min": "$riskScore"}
                    }
                }
            ])
        )

        average_risk = 0
        highest_risk = 0
        lowest_risk = 0

        if risk_result:
            average_risk = round(
                risk_result[0].get("averageRisk") or 0
            )
            highest_risk = risk_result[0].get("highestRisk") or 0
            lowest_risk = risk_result[0].get("lowestRisk") or 0

        # ---------------------------------------------------------
        # 3. THREAT ANALYTICS
        # ---------------------------------------------------------

        threat_result = list(
            scan_collection.aggregate([
                {
                    "$unwind": {
                        "path": "$threats",
                        "preserveNullAndEmptyArrays": False
                    }
                },
                {
                    "$group": {
                        "_id": "$threats.severity",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {
                        "count": -1
                    }
                }
            ])
        )

        threat_severity = {
            "LOW": 0,
            "MEDIUM": 0,
            "HIGH": 0,
            "CRITICAL": 0
        }

        total_threats = 0

        for item in threat_result:
            severity = item.get("_id")
            count = item.get("count", 0)

            if severity in threat_severity:
                threat_severity[severity] = count

            total_threats += count

        # ---------------------------------------------------------
        # 4. CATEGORY ANALYTICS
        # ---------------------------------------------------------

        category_result = list(
            scan_collection.aggregate([
                {
                    "$group": {
                        "_id": "$category",
                        "count": {"$sum": 1},
                        "averageRisk": {"$avg": "$riskScore"}
                    }
                },
                {
                    "$sort": {
                        "count": -1
                    }
                },
                {
                    "$limit": 10
                }
            ])
        )

        categories = []

        for item in category_result:
            if item.get("_id"):
                categories.append({
                    "category": item["_id"],
                    "count": item.get("count", 0),
                    "averageRisk": round(
                        item.get("averageRisk") or 0
                    )
                })

        # ---------------------------------------------------------
        # 5. SCANNER TYPE ANALYTICS
        # ---------------------------------------------------------

        type_result = list(
            scan_collection.aggregate([
                {
                    "$group": {
                        "_id": "$type",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {
                        "count": -1
                    }
                }
            ])
        )

        scanner_types = {
            "message": 0,
            "image": 0
        }

        for item in type_result:
            scan_type = item.get("_id")

            if scan_type in scanner_types:
                scanner_types[scan_type] = item.get("count", 0)

        # ---------------------------------------------------------
        # 6. DAILY SCAN TREND — LAST 7 DAYS
        # ---------------------------------------------------------

        daily_result = list(
            scan_collection.aggregate([
                {
                    "$match": {
                        "createdAt": {
                            "$type": "date"
                        }
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$createdAt"
                            }
                        },
                        "scans": {"$sum": 1},
                        "averageRisk": {"$avg": "$riskScore"},
                        "stop": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$decision", "STOP"]},
                                    1,
                                    0
                                ]
                            }
                        },
                        "review": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$decision", "REVIEW"]},
                                    1,
                                    0
                                ]
                            }
                        },
                        "proceed": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$decision", "PROCEED"]},
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    "$sort": {
                        "_id": -1
                    }
                },
                {
                    "$limit": 7
                },
                {
                    "$sort": {
                        "_id": 1
                    }
                }
            ])
        )

        daily_trend = [
            {
                "date": item["_id"],
                "scans": item.get("scans", 0),
                "averageRisk": round(
                    item.get("averageRisk") or 0
                ),
                "proceed": item.get("proceed", 0),
                "review": item.get("review", 0),
                "stop": item.get("stop", 0)
            }
            for item in daily_result
        ]

        # ---------------------------------------------------------
        # 7. RECENT SCANS
        # ---------------------------------------------------------

        recent_documents = list(
            scan_collection.find(
                {},
                {
                    "_id": 1,
                    "type": 1,
                    "input": 1,
                    "filename": 1,
                    "riskScore": 1,
                    "decision": 1,
                    "category": 1,
                    "summary": 1,
                    "createdAt": 1
                }
            )
            .sort("createdAt", -1)
            .limit(10)
        )

        recent_scans = []

        for scan in recent_documents:

            recent_scans.append({
                "id": str(scan["_id"]),
                "type": scan.get("type"),
                "input": scan.get("input"),
                "filename": scan.get("filename"),
                "riskScore": scan.get("riskScore", 0),
                "decision": scan.get("decision"),
                "category": scan.get("category"),
                "summary": scan.get("summary"),
                "createdAt": (
                    scan.get("createdAt").isoformat()
                    if scan.get("createdAt")
                    else None
                )
            })

        # ---------------------------------------------------------
        # 8. HIGH-RISK RECENT SCANS
        # ---------------------------------------------------------

        high_risk_documents = list(
            scan_collection.find(
                {
                    "riskScore": {
                        "$gte": 70
                    }
                },
                {
                    "_id": 1,
                    "type": 1,
                    "input": 1,
                    "filename": 1,
                    "riskScore": 1,
                    "decision": 1,
                    "category": 1,
                    "summary": 1,
                    "createdAt": 1
                }
            )
            .sort(
                [
                    ("riskScore", -1),
                    ("createdAt", -1)
                ]
            )
            .limit(5)
        )

        high_risk_scans = []

        for scan in high_risk_documents:

            high_risk_scans.append({
                "id": str(scan["_id"]),
                "type": scan.get("type"),
                "input": scan.get("input"),
                "filename": scan.get("filename"),
                "riskScore": scan.get("riskScore", 0),
                "decision": scan.get("decision"),
                "category": scan.get("category"),
                "summary": scan.get("summary"),
                "createdAt": (
                    scan.get("createdAt").isoformat()
                    if scan.get("createdAt")
                    else None
                )
            })

        # ---------------------------------------------------------
        # 9. FINANCIAL / PRIVACY IMPACT ANALYTICS
        # ---------------------------------------------------------

        financial_risk_count = scan_collection.count_documents({
            "financialImpact": {
                "$nin": [
                    None,
                    "",
                    "None identified"
                ]
            }
        })

        privacy_risk_count = scan_collection.count_documents({
            "privacyImpact": {
                "$nin": [
                    None,
                    "",
                    "None identified"
                ]
            }
        })

        # ---------------------------------------------------------
        # 10. DASHBOARD RESPONSE
        # ---------------------------------------------------------

        return {
            "success": True,

            "overview": {
                "totalScans": total_scans,
                "safeScans": proceed_scans,
                "reviewScans": review_scans,
                "dangerousScans": stop_scans,
                "averageRisk": average_risk,
                "highestRisk": highest_risk,
                "lowestRisk": lowest_risk,
                "totalThreats": total_threats,
                "financialRiskScans": financial_risk_count,
                "privacyRiskScans": privacy_risk_count
            },

            "riskDistribution": {
                "proceed": proceed_scans,
                "review": review_scans,
                "stop": stop_scans
            },

            "scannerTypes": scanner_types,

            "threatSeverity": threat_severity,

            "categories": categories,

            "dailyTrend": daily_trend,

            "recentScans": recent_scans,

            "highRiskScans": high_risk_scans
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate dashboard analytics: {str(e)}"
        )
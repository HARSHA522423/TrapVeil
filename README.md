# 🛡️ TrapVeil

### AI-Powered Digital Decision Firewall

> **Detect digital deception before it becomes a bad decision.**

TrapVeil is an AI-powered digital safety platform designed to help users identify **scams, phishing attempts, deceptive interfaces, subscription traps, suspicious payment requests, manipulation techniques, and other digital threats** before taking action.

It analyzes both **text-based messages** and **screenshots/images**, evaluates the potential risk, and provides an easy-to-understand safety decision:

**🟢 PROCEED | 🟡 REVIEW | 🔴 STOP**

---

## 🚨 The Problem

The internet has become an essential part of everyday life, but digital deception has become increasingly sophisticated.

Users regularly encounter:

- 🎣 Phishing messages
- 💳 Fake payment requests
- 🏦 Banking scams
- 💼 Fake job offers
- 📈 Investment scams
- 🔐 Credential-stealing attempts
- 🎁 Fake rewards and offers
- ⏳ Fake urgency and countdowns
- 💰 Hidden charges
- 🔄 Subscription traps
- 🖥️ Deceptive website interfaces
- 🔗 Suspicious links and domains
- 🧠 Manipulative messages

The problem is that many attacks do not look obviously malicious.

A message may look legitimate.

A website may look professional.

A payment page may look trustworthy.

A subscription may advertise a "free trial".

But hidden inside these experiences can be deceptive patterns designed to make users act quickly without understanding the consequences.

### The key question:

> **"Can this digital content be trusted, and what should I do next?"**

---

# 💡 Our Solution

TrapVeil acts as an **AI-powered Digital Decision Firewall** between the user and potentially risky digital content.

Instead of simply saying:

> ❌ "This is a scam."

TrapVeil analyzes the available evidence and provides:

- Risk Score
- Safety Decision
- Threat Category
- Detected Warning Signs
- Evidence
- Financial Impact
- Privacy Impact
- Explanation
- Recommended Action

This allows users to make **informed digital decisions** instead of blindly trusting or ignoring suspicious content.

---

# ⚡ How TrapVeil Works

```text
              USER
                │
                ▼
      ┌───────────────────┐
      │   Digital Content │
      │                   │
      │ Message / Image   │
      └─────────┬─────────┘
                │
                ▼
      ┌───────────────────┐
      │   TrapVeil API    │
      │      FastAPI      │
      └─────────┬─────────┘
                │
                ▼
      ┌───────────────────┐
      │    Gemini AI      │
      │                   │
      │ Threat Analysis   │
      └─────────┬─────────┘
                │
                ▼
      ┌───────────────────┐
      │ Risk Evaluation   │
      │                   │
      │ Score + Category  │
      │ Threats + Advice  │
      └─────────┬─────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
 ┌──────────────┐  ┌───────────────┐
 │   MongoDB    │  │ React Frontend│
 │    Atlas     │  │   Dashboard   │
 └──────────────┘  └───────────────┘

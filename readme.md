# Trust Lens 
**Multilingual Fraud Message Analyzer for Southeast Asia**

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://huveewomg.github.io/trust-lens/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![SEA-LION](https://img.shields.io/badge/Model-SEA--LION%2027B-orange)](https://www.aisingapore.org/aiproducts/sea-lion/)
[![GCP](https://img.shields.io/badge/Hosted%20on-Google%20Cloud-blue)](https://cloud.google.com)

## 🚨 The Problem

In Southeast Asia, digital users face a relentless barrage of **multilingual scam messages** across SMS, chat, and email platforms. These sophisticated attacks range from:
- 🎁 Fake prize notifications
- 🏛️ Government agency impersonations  
- 💰 Urgent financial threats
- 🔗 Malicious shortened links
- 📱 SIM swap social engineering

**Current solutions fail because:**
- Static keyword filters can't adapt to evolving tactics
- Generic spam filters lack regional context
- Users get no explanation of *why* a message is dangerous
- Language barriers prevent effective protection

## 💡 Our Solution: Trust Lens

Trust Lens is a **web-based, multilingual fraud analyzer** that combines rapid rule-based detection with advanced language understanding powered by **SEA-LION v4 27B**, specifically fine-tuned for Southeast Asian contexts.

### 🎯 Key Features

- **🌍 Multilingual Support**: Analyzes messages in multiple SEA languages
- **⚡ Real-time Analysis**: Instant risk assessment and explanation
- **📱  Mobile Friendly Webpage**: Responsive Webpage
- **🧠 SEA-LION Powered**: Leverages state-of-the-art SEA-focused LLM
- **📊 Smart Scoring**: 0-100 risk score with confidence levels  
- **🔍 Detailed Breakdown**: Highlights suspicious elements with explanations
- **💡 Actionable Advice**: Provides clear safety recommendations
- **🔗 Technical Validation**: WHOIS lookups, domain reputation checks
- **🎯 Scam Categorization**: Identifies specific threat types

### 🛠️ Technical Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Frontend    │    │     FastAPI      │    │   Google Cloud  │
│  (HTML/CSS/JS)  │───>│     Backend      │───>│    Vertex AI    │
│                 │    │    (Railway)     │    │(SEA-LION v4 27B)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Tech Stack:**
- **Backend**: FastAPI with Python 3.12
- **AI Model**: SEA-LION v4 27B Model via Google Cloud Vertex AI
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Hosting**: Railway
- **Region**: asia-southeast1 (Singapore)

### 🧪 How It Works

1. **Input Processing**: User submits suspicious message text
2. **SEA-LION Analysis**: Deep language understanding and context evaluation
3. **Risk Assessment**: Generates numerical score (0-100) and confidence level
4. **Explanation Generation**: Provides annotated text highlighting issues
5. **Concise Summary**: Suggests the intent of the message

## 🌏 Southeast Asia Impact

**Addresses Regional Challenges:**
- **Language Diversity**: Works across major SEA languages
- **Cultural Context**: Understands regional scam patterns
- **Mobile-First**: Optimized for smartphone usage patterns
- **Low Bandwidth**: Efficient processing for varying network conditions

**Target Users:**
- Individual consumers protecting personal communications
- Small businesses validating vendor messages
- Educational institutions teaching digital literacy
- Elder care services protecting vulnerable populations

## 🚀 Quick Start for Developers

### Prerequisites
- Python 3.12+
- Google Cloud account with Vertex AI enabled
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/huveewomg/trust-lens.git
   cd trust-lens/my-fastapi-app
   ```

2. **Set up environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure Google Cloud**
   ```bash
   # Set your GCP credentials
   export PROJECT_ID="your-project-id"
   export ENDPOINT_ID="your-vertex-ai-endpoint"
   export LOCATION="asia-southeast1"
   ```

4. **Run the application**
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Access the application**
   - API: `http://127.0.0.1:8000`
   - Frontend: `https://huveewomg.github.io/trust-lens/`

### 🐳 Docker Deployment

```bash
docker build -t trust-lens .
docker run -p 8000:8000 \
  -e PROJECT_ID="your-project-id" \
  -e ENDPOINT_ID="your-endpoint-id" \
  -e LOCATION="asia-southeast1" \
  trust-lens
```

## 🔬 Technical Deep Dive

### SEA-LION Model Implementation
Our system uses the **SEA-LION v4 27B Instruct** model hosted on Google Cloud Vertex AI, specifically configured for:

- **System Instructions**: Structured JSON output for consistent parsing
- **Temperature**: 0.2 for reliable, deterministic analysis  
- **Regional Deployment**: asia-southeast1 for optimal latency
- **Token Optimization**: Efficient prompting for cost-effective operation

### Security Features
- **Domain Validation**: Real-time WHOIS and reputation checks
- **URL Expansion**: Resolves shortened links to reveal true destinations  
- **Pattern Recognition**: Detects common social engineering tactics
- **Confidence Scoring**: Provides reliability metrics for each assessment

## 🌟 Demo & Results

**🔗 Live Demo**: [trust-lens.demo](https://huveewomg.github.io/trust-lens/)


## 🚀 Future Roadmap

- **🏢 Enterprise API**: Bulk message analysis for organizations
- **📊 Threat Intelligence**: Community-driven scam pattern database
- **🌐 More Languages**: Expand beyond current SEA language support


## 🙏 Acknowledgments
- **AI Singapore** for the SEA-LION model and organizing the hackathon
- **Google Cloud** for Vertex AI infrastructure  
- **AngelHack** for being the Hackathon Partner and providing support

---

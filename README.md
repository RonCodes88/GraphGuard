# GraphGuard - A10 Networks Hackathon Winner

## Agentic AI Network Security Simulation & Visualization Platform

![AI Agents](https://img.shields.io/badge/AI-Agents-blue) ![Network Attack Simulation](https://img.shields.io/badge/Network-Attack%20Simulation-red)
---

## 🎯 Project Overview

GraphGuard is an AI agent-based network traffic and threat simulation platform that detects and mitigates network attacks in real time. It employs six autonomous AI agents, integrates the CIC DDoS 2019 dataset (431k+ labeled flows), and supports NetFlow v5 for following industry standards. The system combines real-world traffic modeling with interactive 3D threat visualization.

---


https://github.com/user-attachments/assets/28c1085a-884e-44d3-be04-db9389a85942
<img width="1496" height="897" alt="image" src="https://github.com/user-attachments/assets/97faf14d-3d7b-4fc5-a8bf-b3a95025b4b8" />
<img width="1493" height="890" alt="image" src="https://github.com/user-attachments/assets/4e2f4442-2dab-4828-942b-45957d94bd34" />
<img width="1495" height="893" alt="image" src="https://github.com/user-attachments/assets/621ddce1-6dbf-40ec-ba10-91d96373e011" />
<img width="1502" height="898" alt="image" src="https://github.com/user-attachments/assets/ec8e5b64-aaee-49a9-8637-66fb6363b7b2" />



## 🚀 Key Features

### 🎯 **Autonomous AI Agent System**
- **DetectorAgent**: Real-time threat detection using heavy-hitter algorithms and graph anomaly analysis
- **InvestigatorAgent**: Deep-dive attack analysis with attack type classification
- **JudgeAgent**: AI-powered decision making with confidence scoring
- **MitigatorAgent**: Automated response recommendations and threat blocking
- **MonitorAgent**: Network health monitoring and trend analysis
- **OrchestratorAgent**: Multi-agent coordination and workflow management

### 🌐 **Advanced Network Visualization**
- **3D Interactive Globe**: Real-time network topology with geographic context
- **Dynamic Node Graphs**: Force-directed layouts showing attack relationships
- **Attack Incident Mapping**: Geographic hotspots showing attack origins and targets
- **Real-Time Streaming**: Live network traffic simulation with WebSocket updates
- **Cross-Border Attack Visualization**: Shows how attacks span multiple countries

### 📊 **Real Attack Data**
Integrates CIC DDoS 2019 dataset (431k+ labeled flows) with NetFlow v5 export support. Covers 12 attack types including DDoS-DNS, SYN-Flood, and Port-Scan with GeoIP mapping and temporal analysis.

### 🔍 **Intelligent Detection**
Combines signature matching, anomaly detection, and statistical analysis with explainable AI reasoning. Provides confidence scoring and threat level classification (LOW/MEDIUM/HIGH/CRITICAL).

---

## 🛠️ Tech Stack

### **Backend (AI & Data Processing)**
- **Python 3.13** - Core programming language
- **FastAPI** - Modern, high-performance web framework
- **LangGraph** - Multi-agent AI workflow orchestration
- **LangChain** - AI agent framework with OpenAI integration
- **Pandas** - Data processing and analysis
- **PyArrow** - High-performance data serialization
- **Uvicorn** - ASGI server for production deployment

### **Frontend (Visualization & UI)**
- **Next.js 15** - React framework with App Router and Turbopack
- **TypeScript** - Type-safe development
- **Three.js** - 3D graphics and WebGL rendering
- **D3.js** - Data visualization and force-directed graphs
- **React Flow** - Interactive node-based diagrams
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management

### **Data & AI Infrastructure**
- **CIC DDoS 2019** - Peer-reviewed cybersecurity dataset
- **NetFlow v5** - Industry-standard network flow export
- **OpenAI GPT-4** - AI reasoning and decision making
- **WebSocket** - Real-time bidirectional communication
- **GeoIP** - IP geolocation services

---

## 🎮 Quick Start

### Prerequisites
- **Python 3.13+**
- **Node.js 18+**
- **npm/yarn**
- **OpenAI API Key** (for AI agents)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/a10hacks.git
cd a10hacks
```

### 2. Backend Setup
   ```bash
   cd backend

# Create and activate virtual environment
python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
   pip install -r requirements.txt

# Set up environment variables
cp env.example .env
# Add your OpenAI API key to .env

# Download CIC DDoS 2019 dataset (optional, falls back to synthetic data)
# See backend/data/README.md for download instructions

# Start the backend server
   python main.py
   ```
   Backend will be running at `http://localhost:8000`

### 3. Frontend Setup
   ```bash
   cd frontend

# Install dependencies
   npm install

# Start the development server
   npm run dev
   ```
   Frontend will be running at `http://localhost:3000`

---

## 🔬 Research Applications

This platform serves multiple research and educational purposes:

- **Attack Pattern Analysis**: Research into DDoS attack methodologies and trends
- **AI Agent Validation**: Testing multi-agent systems in cybersecurity scenarios
- **Network Security Research**: Analysis of real-world attack datasets
- **Geographic Threat Analysis**: Understanding global cyber threat landscapes

---

## 🚀 Future Enhancements

- **Machine Learning Integration**: Deep learning models for advanced threat detection
- **Real-Time Data Feeds**: Integration with live network monitoring systems
- **Mobile App**: Native iOS/Android applications
- **Cloud Deployment**: AWS/Azure deployment with auto-scaling
- **Advanced Analytics**: Machine learning-powered threat prediction
- **API Expansion**: RESTful APIs for third-party integrations

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

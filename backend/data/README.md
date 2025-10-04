# CIC DDoS 2019 Dataset Setup

## Download Instructions

1. **Official Source (Recommended)**
   - Visit: https://www.unb.ca/cic/datasets/ddos-2019.html
   - Download: CSV files from http://cicresearch.ca//CICDataset/CICDDoS2019/

2. **Kaggle Alternative**
   - Visit: https://www.kaggle.com/datasets/rodrigorosasilva/cic-ddos2019-30gb-full-dataset-csv-files
   - Download the full 30GB dataset
   - Requires Kaggle account

## Dataset Structure

After downloading, place files (CSV or Parquet) in `backend/data/raw/`:

### Option A: Parquet Files (Recommended - Kaggle)
```
backend/data/raw/
├── DNS-testing.parquet
├── LDAP-testing.parquet
├── LDAP-training.parquet
├── MSSQL-testing.parquet
├── MSSQL-training.parquet
├── NTP-testing.parquet
├── NetBIOS-testing.parquet
├── NetBIOS-training.parquet
├── Portmap-training.parquet
├── SNMP-testing.parquet
├── Syn-testing.parquet
├── Syn-training.parquet
├── TFTP-testing.parquet
├── UDP-testing.parquet
├── UDP-training.parquet
├── UDPLag-testing.parquet
└── UDPLag-training.parquet
```

### Option B: CSV Files (Official Source)
```
backend/data/raw/
├── 01-12/                  # Training day files
│   ├── DrDoS_DNS.csv
│   ├── DrDoS_LDAP.csv
│   ├── DrDoS_MSSQL.csv
│   └── ... (other attack types)
└── 03-11/                  # Testing day files
    ├── LDAP.csv
    ├── MSSQL.csv
    └── ... (other attack types)
```

**Note**: The preprocessor automatically detects and handles both CSV and Parquet formats.

## Dataset Features (80+ columns)

Key features from CICFlowMeter-V3:
- Flow identifiers: Flow ID, Source IP, Destination IP, Source Port, Destination Port, Protocol
- Packet statistics: Total Fwd Packets, Total Bwd Packets, Packet Length Stats
- Timing features: Flow Duration, IAT (Inter-Arrival Time) statistics
- TCP flags: FIN, SYN, RST, PSH, ACK, URG counts
- Label: Attack type or BENIGN

## Quick Start with Sample Data

If you want to test with a smaller sample first:
1. Download just 1-2 CSV files (e.g., DrDoS_DNS.csv)
2. Place in `backend/data/raw/`
3. The preprocessing pipeline will detect and process available files

## Data Processing

After download, run:
```bash
python -m agents.data_preprocessor
```

This will:
- Parse CSV files
- Extract relevant features
- Map IPs to geolocations
- Convert to efficient Parquet format
- Store in `backend/data/processed/`

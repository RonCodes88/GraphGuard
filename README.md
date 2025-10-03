# A10Hacks

Full-stack web application with Next.js frontend and FastAPI backend.

## Project Structure

```
a10hacks/
├── backend/          # FastAPI backend
│   ├── venv/        # Python virtual environment
│   ├── main.py      # Main API application
│   └── requirements.txt
└── frontend/        # Next.js frontend
    ├── src/
    └── package.json
```

## Quick Start

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Activate virtual environment:
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the server:
   ```bash
   python main.py
   ```
   
   Backend will be running at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   
   Frontend will be running at `http://localhost:3000`

## Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **Uvicorn** - ASGI server
- **Python 3.x** - Programming language

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React** - UI library

## API Documentation

Once the backend is running, view the interactive API docs at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

The backend and frontend are configured to work together:
- Frontend runs on port 3000
- Backend runs on port 8000
- CORS is configured to allow frontend requests to backend

See individual README files in `backend/` and `frontend/` directories for more details.

# FlowChat (Klymo Chat)

A privacy-focused, anonymous chat application with gender verification and real-time messaging.

## Project Structure

The repository is divided into three main components:

1.  **Frontend**: React application (Vite).
2.  **Backend**: Node.js/Express server with Socket.IO for chat.
3.  **Fastapi**: Python/FastAPI service for video/image gender verification.

## Technology Stack

### Frontend (`/Frontend`)
-   **Framework**: React (Vite)
-   **Language**: TypeScript
-   **Key Libraries**: `face-api.js` (Client-side AI), `@google/genai`
-   **Configuration**: Defaults to Port 3000 (See Known Issues)

### Backend (`/Backend`)
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Real-time**: Socket.IO
-   **Database**: Redis (and Mongoose/MongoDB code is present)
-   **Configuration**: Defaults to Port 3000

### Verification Service (`/Fastapi`)
-   **Framework**: FastAPI
-   **Language**: Python
-   **AI Models**: Transformers (`rizvandwiki/gender-classification`), OpenCV, PIL
-   **Configuration**: Defaults to Port 8000
-   **Endpoints**:
    -   `POST /verify`: Accepts image/video, returns verification result.

## Architecture & Flow (Inferred)

1.  **User Interface**: Users interact with the React Frontend.
2.  **Verification**: The frontend attempts to verify gender via `face-api.js` (client-side) or by sending a request to the backend.
    -   *Note*: Current code points to `localhost:3000/api/verify`, but the Verification Service is on port 8000.
3.  **Chat**: Once verified/onboarded, users connect to the Node.js backend via Socket.IO for matchmaking and chatting.

## Known Issues

-   **Port Conflict**: Both the Frontend (`vite.config.ts`) and Backend (`server.ts`) are configured to use Port **3000**. This will cause a startup failure if both are run simultaneously.
-   **API Endpoint Mismatch**: `Frontend/services/verificationService.ts` sends requests to `http://localhost:3000/api/verify`. However, the Python Verification Service runs on port **8000** (`/verify`). The Node Backend (port 3000) does not appear to have an `/api/verify` route (it has an onboarding route at `/`).

## Setup Instructions (Draft)

1.  **FastAPI**:
    ```bash
    cd Fastapi
    pip install -r requirements.txt
    python main.py
    ```
2.  **Backend**:
    ```bash
    cd Backend
    npm install
    # Fix port in .env or server.ts to avoid 3000 if running frontend
    npm run dev
    ```
3.  **Frontend**:
    ```bash
    cd Frontend
    npm install
    npm run dev
    ```

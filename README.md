# **AI Assisted Realtime IDE**

Here is the web app: [https://ai-ide-jofv.onrender.com](https://ai-ide-jofv.onrender.com)

---

## 📝 Introduction

This is an Integrated Development Environment (IDE) that supports multiple users joining a room to work on the same piece of code collaboratively. Users can edit, run, and compile code simultaneously in real time.

It offers AI assistance to review code for optimizations, improve readability, and detect potential errors. The platform supports multiple programming languages to facilitate diverse development needs.

--- 

## 🚀 Features

### 🧑‍💻 **Real-Time Collaboration**
Multiple users can join a shared code room and collaborate live via WebSockets.

### 💡 **AI Code Review**
Integrated Gemini API to analyze and suggest best practices, optimizations, and improvements.

### ⚙️ **Multi-Language Code Execution**
Supports real-time code execution in C++, Python, Java, and JavaScript using the Piston API.

### 📡 **Room Management with Socket.IO**
Users can join/leave rooms and sync code edits with real-time accuracy.

### 🌐 **Modern Tech Stack**
Built with a clean and responsive UI, and a scalable backend for a seamless experience.



---


## 🏗️ High-Level Architecture

- Clients are connected to the backend via WebSockets.
- API services are used to connect to Gemini (AI review) and Piston Online Judge (code execution).

<img width="1090" height="606" alt="Screenshot 2025-07-14 at 9 58 26 AM" src="https://github.com/user-attachments/assets/0a7c3674-0c23-4325-b6c8-3a875ecb4d91" />


---

## 🚀 Step-by-Step Guide to Use

**Step 1:**  
Go to the website and create a room. Copy the Room ID and share it with your friends so they can join the session.

<img width="1440" height="789" alt="Screenshot 2025-07-14 at 8 08 01 AM" src="https://github.com/user-attachments/assets/78f71717-5b12-4da1-87a8-93d3e4c7c6f2" />

**Step 2:**  
Edit, run, brainstorm, and collaborate together simultaneously and seamlessly. Write code, run test cases, and get quick results via the Piston online judge.


<img width="2872" height="1580" alt="image" src="https://github.com/user-attachments/assets/1b3d4c4d-3ac7-43e3-b2bd-b3ec93a763f7" />

**Step 3:**  
Use AI assistance to speed up debugging, optimize your code, improve readability, and follow best practices.

<img width="1422" height="788" alt="Screenshot 2025-07-14 at 9 32 23 AM" src="https://github.com/user-attachments/assets/0ff39af5-7adf-4edc-8123-2bdd12187260" />

---


## 🛠️ Tech Stack

| Layer         | Technologies                                      |
|---------------|---------------------------------------------------|
| **Frontend**  | React, Vite, Socket.IO client, Monaco editor      |
| **Backend**   | Node.js (ESM), Express, Socket.IO, Axios          |
| **AI & Judge**| [Gemini API](https://ai.google.dev/), [Piston API](https://github.com/engineer-man/piston) |
| **Utilities** | dotenv, Nodemon (dev)                             |

---

## 🧪 How It Works

1. User joins a room via a unique **Room ID**.
2. The code editor is synced across users using **Socket.IO**.
3. Code can be written and executed instantly via the **Piston API**.
4. An **AI Review** can be triggered using the **Gemini API** to receive feedback on code quality, structure, and optimizations.

---

## 🔧 Getting Started (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/86pushkar24/AI-assisted-realtime_IDE.git
```

### 2. Install Dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd ../backend
npm install
```

### 3. Configure Environment

Create a `.env` file in the project root (same folder as `package.json`):
```env
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-1.5-flash
PING_URL=https://your-render-domain.onrender.com
KEEPALIVE_INTERVAL_MS=30000
PISTON_API_URL=https://emkc.org/api/v2/piston/execute
PORT=5001
```

> On Render you’ll set the same variables in the dashboard. Leave `PING_URL` empty until after the first deploy, then update it to your Render URL and redeploy. The `.env` file is git-ignored so secrets stay out of the repo, so every fresh clone needs to recreate it before running the app.

### 4. Run the Servers

**Start Backend:**
```bash
npm start
```

This uses the root `package.json` start script (`node backend/index.js`) and serves the built frontend from `frontend/dist`.

**During development**, you can run the frontend separately:
```bash
cd frontend
npm run dev
```
Visit `http://localhost:5173` to work with hot reload, while the backend runs on `http://localhost:5001`.

---

## 📦 Folder Structure

```
.
├── backend
│   └── index.js
├── frontend
│   ├── dist/
│   └── src/
├── index.js
├── package.json
├── .env (local only, git-ignored)
└── README.md
```

---

## 📈 Deployment Notes

- Render Build Command: `npm install && npm run build`
- Render Start Command: `npm start`
- Make sure `frontend/src/App.jsx` points Socket.IO to the deployed backend URL or uses a `VITE_SOCKET_SERVER_URL`.
- After Render assigns the production URL, update `PING_URL` in the environment variables and trigger a redeploy so the keep-alive ping uses the live domain.

---

## 📈 Future Improvements

- Enhance AI reviews to support **multiple suggestions with scoring**.
- Add **user authentication** and **room persistence**.
- Implement better **concurrency control** for large groups.
- Integrate **audio chat feature** for real-time verbal collaboration in a room.

---

## 👨‍💻 Author

**Pushkar Gupta**  
B.Tech CSE @ APJ Abdul Kalam Technical University  
guptapushkar86@gmail.com | [LinkedIn](https://www.linkedin.com/in/86pushkar24/) | [Codeforces](https://codeforces.com/profile/86.pushkar.24/) | [Codechef](https://www.codechef.com/users/stormerbee) 







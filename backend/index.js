import express from 'express';                    // Web framework for Node.js
import http from 'http';                         // Built-in HTTP module to create server
import { Server } from 'socket.io';              // WebSocket library for real-time communication
import path from 'path';                         // Built-in path utilities for file system operations
import axios from 'axios';                       // HTTP client for making API requests
import cors from 'cors';                         // Middleware for handling Cross-Origin Resource Sharing
import dotenv from 'dotenv'                      // Load environment variables from .env file
dotenv.config();                                 // Initialize dotenv to read environment variables
import { GoogleGenerativeAI } from "@google/generative-ai"; // Google's Gemini AI SDK

// Create Express application instance
const app = express();

// Configuration for auto-reload mechanism (keeps server alive on Render)
const keepAliveUrl = process.env.PING_URL;            // Optional URL to ping for keep-alive
const keepAliveInterval = Number(process.env.KEEPALIVE_INTERVAL_MS || 30000); // Ping interval

/**
 * Function to prevent server from sleeping on free hosting platforms
 * Makes a GET request to the server URL to keep it active
 */
function reloadWebsite() {
    if (!keepAliveUrl) return;                        // Skip if no keep-alive URL configured
    axios
        .get(keepAliveUrl)                            // Send GET request to the server
        .then(() => {
            console.log("website reloaded");          // Log successful ping
        })
        .catch((error) => {
            console.error(`Error : ${error.message}`); // Log any errors during ping
        });
}

// Set up automatic server pinging when keep-alive URL is available
if (keepAliveUrl) setInterval(reloadWebsite, keepAliveInterval);

// Create HTTP server using Express app
const server = http.createServer(app);

// In-memory data structures for managing rooms and users
const rooms = new Map();                         // Map: roomId → Set of userNames
const roomData = new Map();                      // Map: roomId → {code, language}

// Initialize Socket.IO server with CORS configuration
const io = new Server(server, {
    cors: {
        origin: '*',                             // Allow requests from any origin
        methods: ['GET', 'POST'],                // Allow GET and POST methods
        credentials: true                        // Allow credentials in requests
    }
});

// Google Gemini AI configuration
const apiKey = process.env.GEMINI_API_KEY;              // Load Gemini key from env
const genAI = new GoogleGenerativeAI(apiKey);    // Initialize Gemini AI client

// Default versions for supported programming languages
const defaultVersions = {
    cpp: "10.2.0",              // C++ compiler version
    python3: "3.10.0",          // Python interpreter version
    javascript: "18.15.0",      // Node.js runtime version
    java: "15.0.2"              // Java compiler version
};

/**
 * Function to detect programming language based on code content
 * Uses pattern matching to identify language-specific syntax
 * @param {string} code - The source code to analyze
 * @returns {string} - Detected language name
 */
function detectLang(code) {
    if (code.includes("#include")) return "C++";           // C++ header includes
    if (code.includes("def ") || code.includes("print(")) return "Python"; // Python functions
    if (code.includes("function") || code.includes("console.")) return "JavaScript"; // JS syntax
    if (code.includes("public class") || code.includes("System.out")) return "Java"; // Java syntax
    return "code";                                          // Default fallback
}

// Handle new WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Track current user's room and username
    let currentRoom = null;
    let currentUser = null;

    /**
     * Handle user joining a room
     * Manages room membership and synchronizes existing code/language
     */
    socket.on("join", ({ roomId, userName }) => {
        // Leave previous room if user was in another room
        if (currentRoom) {
            socket.leave(currentRoom);                       // Remove from socket room
            rooms.get(currentRoom).delete(currentUser);     // Remove from user list
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom))); // Update user list
        }

        // Set new room and user information
        currentRoom = roomId;
        currentUser = userName;

        // Join the new room
        socket.join(roomId);                                 // Add socket to room

        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());                    // Create new user set for room
        }
        rooms.get(roomId).add(userName);                     // Add user to room
        io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId))); // Broadcast updated user list

        // Send existing room data to newly joined user
        const roomInfo = roomData.get(roomId);
        if (roomInfo?.code) {
            socket.emit("codeUpdate", roomInfo.code);        // Send current code
        }
        if (roomInfo?.language) {
            socket.emit("languageUpdate", roomInfo.language); // Send current language
        }
    });

    /**
     * Handle real-time code changes
     * Broadcasts code updates to all users in the room except sender
     */
    socket.on("codeChange", ({ roomId, code }) => {
        socket.to(roomId).emit("codeUpdate", code);          // Broadcast to others in room

        // Store code in room data for persistence
        if (!roomData.has(roomId)) roomData.set(roomId, {}); // Initialize room data
        roomData.get(roomId).code = code;                    // Save current code
    });

    /**
     * Handle explicit room leaving
     * Cleans up user from room and updates user list
     */
    socket.on("leaveRoom", () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).delete(currentUser);      // Remove user from room
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom))); // Update user list
            socket.leave(currentRoom);                       // Remove socket from room
            currentRoom = null;                              // Clear current room
            currentUser = null;                              // Clear current user
        }
        console.log('A user disconnected');
    })

    /**
     * Handle typing indicators
     * Shows other users when someone is actively typing
     */
    socket.on("typing", (roomId, userName) => {
        socket.to(roomId).emit("userTyping", userName);      // Broadcast typing status
    })

    /**
     * Handle programming language changes
     * Synchronizes language selection across all users in room
     */
    socket.on("languageChange", ({ roomId, language }) => {
        io.to(roomId).emit("languageUpdate", language);     // Broadcast language change

        // Store language in room data
        if (!roomData.has(roomId)) roomData.set(roomId, {}); // Initialize room data
        roomData.get(roomId).language = language;            // Save current language
    });

    /**
     * Handle code compilation and execution
     * Uses Piston API to run code in various programming languages
     */
    socket.on("compileCode", async ({ code, roomId, language, version, stdin }) => {
        if (rooms.has(roomId)) {                                 // Verify room exists
            console.log("CHECK2");
            const room = rooms.get(roomId);

            // Convert language aliases to Piston API format
            const actualLang = (language === "cpp") ? "c++" :    // Convert cpp to c++
                (language === "python3") ? "python" : // Convert python3 to python
                    language;                             // Use language as-is

            // Use default version if wildcard (*) is provided
            const actualVersion = (version === "*") ? defaultVersions[language] : version;

            try {
                // Make API request to Piston for code execution
                const pistonApiUrl = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston/execute";
                const response = await axios.post(pistonApiUrl, {
                    language: actualLang,                        // Programming language
                    version: actualVersion,                      // Language version
                    files: [{ content: code }],                  // Source code files
                    stdin: stdin || ""                           // Standard input (optional)
                });
                socket.emit("codeResponse", response.data);      // Send execution result to requester only
            } catch (error) {
                // Send error response if execution fails
                socket.emit("codeResponse", {
                    run: {
                        output: `Error: ${error.response?.data?.message || error.message}` // Format error message
                    }
                });
            }
        }
    });

    /**
     * Handle AI code review requests
     * Uses Google Gemini AI to analyze and review code
     */
    socket.on("getAIReview", async ({ roomId, code }) => {
        try {
            // Initialize Gemini AI model
            const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

            // Create prompt for AI code review
            const prompt = `
            You're an expert code reviewer of the language "${detectLang(code)}" and love to give code suggestions. 
            Generate a brief review of the code "${code}".
            Format clearly with headings.
            Give the response in proper format so that it comes in bulets
            `;

            // Generate AI review
            const result = await model.generateContent(prompt);  // Send prompt to AI
            const response = result.response;                    // Extract response
            const text = response.text();                        // Get text content

            // Broadcast AI review to all users in room
            io.to(roomId).emit("AIReview", text);
        }
        catch {
            // Send error message if AI review fails
            io.to(roomId).emit("AIReview", "Unable to review currently please try later");
        }
    })

    /**
     * Handle user disconnection
     * Cleans up user data when socket connection is lost
     */
    socket.on("disconnect", () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).delete(currentUser);      // Remove user from room
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom))); // Update user list
        }
        console.log('A user disconnected');
    })
});

// Server configuration
const PORT = process.env.PORT || 5001;                      // Use environment PORT or default 5001
const __dirname = path.resolve();                           // Get current directory path

// Serve static files from frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route to serve React app for any unmatched routes (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html')); // Serve index.html for all routes
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);       // Log server start
});

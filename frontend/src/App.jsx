import "./App.css"; // Application-specific styles
import io from "socket.io-client"; // WebSocket client library for real-time communication
import { useEffect, useState } from "react"; // React hooks for state management and side effects
import Editor from "@monaco-editor/react"; // Monaco Editor component for code editing
import Markdown from "react-markdown"; // Component to render markdown content

// Initialize WebSocket connection to the backend server
const socket = io("https://ai-assisted-realtime-ide.onrender.com/");

const App = () => {
  // State variables for managing application functionality
  const [joined, setJoined] = useState(false); // Track if user has joined a room
  const [roomId, setRoomId] = useState(""); // Current room identifier
  const [userName, setUserName] = useState(""); // Current user's display name
  const [language, setLanguage] = useState("cpp"); // Selected programming language
  const [code, setCode] = useState("// start coding here..."); // Current code content
  const [copySuccess, setCopySuccess] = useState(""); // Message for copy operation feedback
  const [users, setUsers] = useState([]); // Array of users currently in the room
  const [typing, setTyping] = useState(""); // Display typing indicator message
  const [outPut, setOutput] = useState(""); // Code execution output
  const [input, setInput] = useState(""); // User input for code execution
  const [version, setVersion] = useState("*"); // Programming language version
  const [isRev, setIsRev] = useState(false); // Track AI review request status
  // State for controlling modal visibility and content
  const [isModalOpen, setIsModalOpen] = useState(false); // Control modal display
  const [modalMessage, setModalMessage] = useState(""); // Content to display in modal

  /**
   * useEffect hook to set up WebSocket event listeners
   * Handles real-time updates from the server
   */
  useEffect(() => {
    // Listen for user list updates when users join/leave the room
    socket.on("userJoined", (users) => {
      setUsers(users); // Update local users array
    });

    // Listen for code changes from other users in the room
    socket.on("codeUpdate", (newCode) => {
      setCode(newCode); // Update local code state
    });

    // Listen for typing indicators from other users
    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 10)} is typing...`); // Display typing status (truncated username)
      setTimeout(() => setTyping(""), 2000); // Clear typing indicator after 2 seconds
    });

    // Listen for programming language changes from other users
    socket.on("languageUpdate", (newLanguage) => {
      console.log(newLanguage);
      setLanguage(newLanguage); // Update local language selection
    });

    // Listen for code execution results from the server
    socket.on("codeResponse", (response) => {
      setOutput(response.run.output); // Display execution output
    });

    // Listen for AI review responses from the server
    socket.on("AIReview", (message) => {
      console.log("AI Review:", message);
      setModalMessage(message); // Set AI review content
      setIsModalOpen(true); // Open modal to display review
      setIsRev(false); // Reset AI review loading state
    });

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
      socket.off("AIReview");
    };
  }, []);

  /**
   * useEffect hook to handle browser window close/refresh events
   * Ensures proper cleanup when user leaves unexpectedly
   */
  useEffect(() => {
    // Function to handle browser tab/window closing
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom"); // Notify server of user leaving
    };

    // Add event listener for browser unload events
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup event listener when component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  /**
   * Function to join a room with the provided room ID and username
   * Validates input and emits join event to server
   */
  const JoinRoom = () => {
    if (roomId && userName) {
      // Validate both fields are filled
      socket.emit("join", { roomId, userName }); // Send join request to server
      setJoined(true); // Update UI to show editor interface
    }
  };

  /**
   * Function to leave the current room and reset application state
   * Emits leave event and resets all local state variables
   */
  const leaveRoom = () => {
    socket.emit("leaveRoom"); // Notify server of leaving
    setJoined(false); // Return to join screen
    setRoomId(""); // Clear room ID
    setUserName(""); // Clear username
    setCode("//start coding here..."); // Reset code content
    setLanguage("cpp"); // Reset language to default
  };

  /**
   * Function to generate a random 6-digit room ID
   * Creates unique identifier for new rooms
   * @returns {string} - 6-digit random room ID
   */
  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generate random number between 100000-999999
  };

  /**
   * Function to create a new room with auto-generated ID
   * Sets the room ID state with a new random identifier
   */
  const handleCreateRoom = () => {
    const newRoomId = generateRoomId(); // Generate new room ID
    setRoomId(newRoomId); // Set the generated ID in state
  };

  /**
   * Function to copy room ID to clipboard
   * Provides user feedback on successful copy operation
   */
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId); // Copy room ID to system clipboard
    setCopySuccess("Copied!"); // Show success message
    setTimeout(() => {
      setCopySuccess(""); // Clear success message after 2 seconds
    }, 2000);
  };

  /**
   * Function to handle code editor changes
   * Updates local state and broadcasts changes to other users
   * @param {string} newCode - Updated code content from editor
   */
  const handleCodeChange = (newCode) => {
    setCode(newCode); // Update local code state
    socket.emit("codeChange", { roomId, code: newCode }); // Broadcast code change to room
    socket.emit("typing", roomId, userName); // Send typing indicator to other users
  };

  /**
   * Function to handle programming language selection changes
   * Updates local state and synchronizes with other users
   * @param {Event} e - Select element change event
   */
  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value; // Extract selected language value
    setLanguage(newLanguage); // Update local language state
    socket.emit("languageChange", { roomId, language: newLanguage }); // Broadcast language change
  };

  /**
   * Function to execute the current code
   * Sends code, language, and input to server for compilation/execution
   */
  const runCode = () => {
    socket.emit("compileCode", {
      code, // Current code content
      roomId, // Current room ID
      language, // Selected programming language
      version, // Language version
      stdin: input, // User input for program execution
    });
  };

  /**
   * Function to request AI code review
   * Sets loading state and sends current code to AI for analysis
   */
  const AIreview = () => {
    setIsRev(true); // Set loading state for AI review
    socket.emit("getAIReview", {
      roomId, // Current room ID
      code, // Current code to review
    });
  };

  /**
   * Function to close the AI review modal
   * Resets modal state variables to hide the modal
   */
  const closeModal = () => {
    setIsModalOpen(false); // Hide the modal
    setModalMessage(""); // Clear modal content
  };

  // Render join screen if user hasn't joined a room yet
  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          {/* Input field for room ID */}
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)} // Update room ID state on input change
          />
          {/* Input field for username */}
          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)} // Update username state on input change
          />
          {/* Button to create a new room with auto-generated ID */}
          <button onClick={handleCreateRoom} style={{ marginBottom: "10px" }}>
            Create Room
          </button>
          {/* Button to join existing room */}
          <button onClick={JoinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  // Render main editor interface when user has joined a room
  return (
    <div className="editor-container">
      {/* Left sidebar with room information and controls */}
      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room: {roomId}</h2>
          {/* Button to copy room ID for sharing */}
          <button onClick={copyRoomId} className="copy-button">
            Copy Id
          </button>
          {/* Success message display for copy operation */}
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>

        {/* Display list of users currently in the room */}
        <h3>Users in Room:</h3>
        <ul>
          {users.map((user, index) => (
            <li key={index}>{user}</li> // Render each user as list item
          ))}
        </ul>

        {/* Display typing indicator */}
        <p className="typing-indicator">{typing}</p>

        {/* Language selection dropdown */}
        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="cpp">C++</option>
          <option value="javascript">JavaScript</option>
          <option value="python3">Python</option>
          <option value="java">Java</option>
        </select>

        {/* Button to leave current room */}
        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>

        {/* Button to request AI code review with loading state */}
        <button
          className="ai-review-button"
          onClick={AIreview}
          disabled={isRev} // Disable button during review process
        >
          {!isRev ? "AI Review" : "isReviewing..."}{" "}
          {/* Dynamic button text based on state */}
        </button>
      </div>

      {/* Main panel containing code editor and execution interface */}
      <div className="main-panel">
        {/* Code editor wrapper */}
        <div className="editor-wrapper">
          <Editor
            height="100%" // Full height of container
            defaultLanguage={language} // Initial language setting
            language={language} // Current language for syntax highlighting
            value={code} // Current code content
            onChange={handleCodeChange} // Handler for code changes
            theme="vs-dark" // Dark theme for editor
            options={{
              minimap: { enabled: false }, // Disable minimap for cleaner interface
              fontSize: 14, // Set font size for readability
            }}
          />
        </div>

        {/* Bottom panel with output console and input area */}
        <div className="bottom-panel">
          {/* Output console to display code execution results */}
          <textarea
            className="output-console"
            value={outPut} // Display execution output
            readOnly // Prevent user editing of output
            placeholder="Output will be displayed here..."
          />

          {/* Input section for code execution */}
          <div className="input-wrapper">
            {/* Text area for user input to programs */}
            <textarea
              className="input-box"
              placeholder="Input goes here..."
              value={input}
              onChange={(e) => setInput(e.target.value)} // Update input state on change
            />
            {/* Button to execute current code */}
            <button className="execute-btn" onClick={runCode}>
              Execute
            </button>
          </div>
        </div>
      </div>

      {/* Modal overlay for displaying AI review results */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>AI Review</h2>
            {/* Display AI review content as formatted markdown */}
            <pre>
              <Markdown>{modalMessage}</Markdown>
            </pre>
            <div className="modal-actions">
              {/* Button to close the modal */}
              <button onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

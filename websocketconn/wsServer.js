// const WebSocket = require("ws");

// // Map of user_id -> [{ ws, SessionId, login_version }]
// const activeConnections = new Map();
// console.log("WebSocket server module loaded");

// function setupWebSocket(server) {
//   const wss = new WebSocket.Server({ server });

//   wss.on("connection", (ws) => {
//     console.log("New WS connection");

//     ws.on("message", (msg) => {
//       try {
//         const data = JSON.parse(msg);
//         console.log("WS message received:", data);

//         if (data.type === "REGISTER" && data.UserID && data.SessionId) {
//           const { UserID, SessionId, Loginversion } = data;
//           const entry = { ws, SessionId, login_version: Loginversion };

//           // --- Step 0: Clean disconnected sessions ---
//           const existingSessions = (activeConnections.get(UserID) || []).filter(
//             (e) => e.ws.readyState === WebSocket.OPEN
//           );
//           activeConnections.set(UserID, existingSessions);

//           // --- Step 1: Check if reconnecting with same session ---
//           const sameSession = existingSessions.find(
//             (e) => e.SessionId === SessionId && e.login_version === Loginversion
//           );

//           if (sameSession) {
//             console.log(`User ${UserID} reconnected with same session`);
//             ws._UserID = UserID;
//             ws._SessionId = SessionId;
//             ws._Loginversion = Loginversion;

//             ws.send(
//               JSON.stringify({
//                 type: "REGISTERED_SUCCESS",
//                 message: "Session reconnected successfully",
//               })
//             );
//             return;
//           }

//           // --- Step 2: Check if another active session exists ---
//           if (existingSessions.length > 0) {
//             ws.send(
//               JSON.stringify({
//                 type: "LOGOUT_CONFIRMATION",
//                 message:
//                   "You are already logged in on another device. Do you want to log out the other session?",
//               })
//             );
//             ws._pendingRegistration = entry; // store temporarily
//             return;
//           }

//           // --- Step 3: No existing sessions → register immediately ---
//           activeConnections.set(UserID, [entry]);
//           ws._UserID = UserID;
//           ws._SessionId = SessionId;
//           ws._Loginversion = Loginversion;

//           console.log(`Registered WS for user ${UserID}, session ${SessionId}`);

//           ws.send(
//             JSON.stringify({
//               type: "REGISTERED_SUCCESS",
//               message: "Session registered successfully",
//             })
//           );
//         }

//         // --- Step 4: CONFIRM_LOGOUT ---
//         if (data.type === "CONFIRM_LOGOUT" && data.UserID) {
//           const UserID = data.UserID;
//           const confirm = data.confirm;

//           if (confirm) {
//             // Force logout old sessions
//             if (activeConnections.has(UserID)) {
//               activeConnections.get(UserID).forEach(({ ws: oldWs }) => {
//                 if (oldWs.readyState === WebSocket.OPEN) {
//                   oldWs.send(JSON.stringify({ type: "FORCE_LOGOUT" }));
//                   oldWs.close();
//                 }
//               });
//             }

//             // Register pending session
//             if (ws._pendingRegistration) {
//               activeConnections.set(UserID, [ws._pendingRegistration]);
//               const { SessionId, login_version } = ws._pendingRegistration;
//               ws._UserID = UserID;
//               ws._SessionId = SessionId;
//               ws._Loginversion = login_version;
//               delete ws._pendingRegistration;

//               ws.send(
//                 JSON.stringify({
//                   type: "REGISTERED_SUCCESS",
//                   message: "Session registered after logout confirmation",
//                 })
//               );
//             }
//           } else {
//             // Cancelled → keep first device active
//             if (ws._pendingRegistration) {
//               ws.send(JSON.stringify({ type: "CANCELLED_LOGOUT" }));
//               ws.close();
//               delete ws._pendingRegistration;
//             }
//           }
//         }
//       } catch (err) {
//         console.error("WS message error:", err);
//       }
//     });

//     ws.on("close", () => {
//       const userId = ws._UserID;
//       if (userId && activeConnections.has(userId)) {
//         activeConnections.set(
//           userId,
//           activeConnections.get(userId).filter((e) => e.ws !== ws)
//         );
//         console.log(`WS disconnected for user ${userId}`);
//       }
//     });

//     ws.on("error", (err) => {
//       console.error("WebSocket error:", err);
//     });
//   });

//   console.log("WebSocket server is running");
// }

// module.exports = { setupWebSocket, activeConnections };




const WebSocket = require("ws");

// Map of user_id -> [{ ws, SessionId, login_version }]
const activeConnections = new Map();
console.log("WebSocket server module loaded");

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("New WS connection");

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);
        console.log("WS message received:", data);

        // Registration
        if (data.type === "REGISTER" && data.UserID && data.SessionId) {
          const { UserID, SessionId, Loginversion } = data;
          const entry = { ws, SessionId, login_version: Loginversion };

          if (activeConnections.has(UserID) && activeConnections.get(UserID).length > 0) {
            // There is already an active session → ask user
            ws.send(
              JSON.stringify({
                type: "LOGOUT_CONFIRMATION",
                message:
                  "You are already logged in on another device. Do you want to log out the other session?",
              })
            );
            ws._pendingRegistration = entry; // store info temporarily
            return; // Wait for user confirmation
          }

          // No existing session → register immediately
          activeConnections.set(UserID, [entry]);
          ws._UserID = UserID;
          ws._SessionId = SessionId;
          ws._Loginversion = Loginversion;

          console.log(
            `Registered WS for user ${UserID}, session ${SessionId}`
          );

          // ✅ Tell frontend to continue login → navigate
          ws.send(
            JSON.stringify({
              type: "REGISTERED_SUCCESS",
              message: "Session registered successfully",
            })
          );
        }

        // Confirm logout
        if (data.type === "CONFIRM_LOGOUT" && data.UserID) {
          const UserID = data.UserID;
          const confirm = data.confirm; // true/false from frontend

          if (confirm) {
            // User confirmed → logout old device(s)
            if (activeConnections.has(UserID)) {
              activeConnections.get(UserID).forEach(({ ws: oldWs }) => {
                if (oldWs.readyState === WebSocket.OPEN) {
                  oldWs.send(JSON.stringify({ type: "FORCE_LOGOUT" }));
                  oldWs.close();
                }
              });
            }

            // Register new session
            if (ws._pendingRegistration) {
              activeConnections.set(UserID, [ws._pendingRegistration]);
              const { SessionId, login_version } = ws._pendingRegistration;
              ws._UserID = UserID;
              ws._SessionId = SessionId;
              ws._Loginversion = login_version;
              delete ws._pendingRegistration;

              console.log(
                `Old session logged out. New WS registered for user ${UserID}`
              );

              // ✅ Notify second device it can proceed
              ws.send(
                JSON.stringify({
                  type: "REGISTERED_SUCCESS",
                  message: "Session registered after logout confirmation",
                })
              );
            }
          } else {
            // User cancelled → second device stays on login, first device remains active
            if (ws._pendingRegistration) {
              ws.send(JSON.stringify({ type: "CANCELLED_LOGOUT" }));
              ws.close();
              delete ws._pendingRegistration;
              console.log(
                `Second device cancelled login. First device stays active for user ${UserID}`
              );
            }
          }
          
        }
      if (data.type === "LOGOUT" && data.UserID && data.SessionId) {
            const { UserID, SessionId, Loginversion } = data;

            if (activeConnections.has(UserID)) {
              const remaining = activeConnections
                .get(UserID)
                .filter(
                  (c) =>
                    !(
                      c.SessionId === SessionId &&
                      c.login_version === Loginversion
                    )
                );

              if (remaining.length === 0) {
                activeConnections.delete(UserID);
              } else {
                activeConnections.set(UserID, remaining);
              }
            }

  console.log(`User ${UserID} logged out (cleaned WS session)`);
  ws.close();
  return;
}
      } catch (err) {
        console.error("WS message error:", err);
      }
    });

    ws.on("close", () => {
      const userId = ws._UserID;
      if (userId && activeConnections.has(userId)) {
        activeConnections.set(
          userId,
          activeConnections.get(userId).filter((e) => e.ws !== ws)
        );
        console.log(`WS disconnected for user ${userId}`);
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

  console.log("WebSocket server is running");
}

// Optional: notify logout manually
function notifyLogout(userId, skipSessionId = null, skipLoginVersion = null) {
  if (!activeConnections.has(userId)) return;

  activeConnections.get(userId).forEach(({ ws, SessionId, login_version }) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (
        (skipSessionId && SessionId === skipSessionId) &&
        (skipLoginVersion && login_version === skipLoginVersion)
      )
        return;

      ws.send(JSON.stringify({ type: "FORCE_LOGOUT" }));
      ws.close();
    }
  });

  activeConnections.set(
    userId,
    activeConnections
      .get(userId)
      .filter(
        (e) =>
          (skipSessionId && e.SessionId === skipSessionId) &&
          (skipLoginVersion && e.login_version === skipLoginVersion)
      )
  );
}

module.exports = { setupWebSocket, notifyLogout, activeConnections };


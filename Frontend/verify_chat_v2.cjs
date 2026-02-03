
const io = require("socket.io-client");
const { randomUUID } = require("crypto");

class TestUser {
    constructor(name, gender, preference) {
        this.name = name;
        this.gender = gender;
        this.preference = preference;
        this.deviceId = randomUUID();
        this.socket = null;
        this.roomId = null;
    }

    connect() {
        this.socket = io("http://127.0.0.1:5000", {
            auth: { deviceId: this.deviceId },
            transports: ["websocket"],
        });

        this.socket.on("connect", () => {
            console.log(`[${this.name}] Connected (${this.gender} -> ${this.preference})`);
            this.joinQueue();
        });

        this.socket.on("match:found", (data) => {
            console.log(`✅ [${this.name}] MATCHED! Room: ${data.roomId}`);
            this.roomId = data.roomId;

            // Simulate sending a message after 1s
            setTimeout(() => {
                this.socket.emit("chat:message", { roomId: this.roomId, text: `Hello from ${this.name}` });
            }, 1000);
        });

        this.socket.on("chat:message", (data) => {
            // Don't log own messages (we fixed that bug already)
            if (data.senderId !== this.deviceId) {
                console.log(`📩 [${this.name}] RECEIVED: "${data.text}" from ${data.senderId}`);
            }
        });

        this.socket.on("chat:ended", () => {
            console.log(`🛑 [${this.name}] Chat Ended (Partner left).`);
        });
    }

    joinQueue() {
        this.socket.emit("queue:enter", {
            gender: this.gender,
            preference: this.preference
        });
    }

    leaveChat() {
        if (this.roomId) {
            console.log(`[${this.name}] Leaving Chat...`);
            this.socket.emit("chat:leave", { roomId: this.roomId });
            this.roomId = null;
        }
    }
}

// Scenario: 
// Pair 1: Male->Female + Female->Male (Should Match)
// Pair 2: Female->Female + Female->Female (Should Match)

const userA = new TestUser("Alice", "female", "male");
const userB = new TestUser("Bob", "male", "female");
const userC = new TestUser("Carol", "female", "female");
const userD = new TestUser("Diana", "female", "female"); // Matching C

// Start Test
console.log("--- Starting 4-User Intent Test ---");

userA.connect();
setTimeout(() => userB.connect(), 500);
setTimeout(() => userC.connect(), 1000);
setTimeout(() => userD.connect(), 1500);

// Disconnection Test: Bob leaves after 3s
setTimeout(() => {
    if (userB.roomId) {
        userB.leaveChat();
    }
}, 4000);

// Keep alive
setInterval(() => { }, 10000);

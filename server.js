const http = require("http");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const url = require("url");
const bcrypt = require("bcryptjs");

const mongoUrl = "mongodb://localhost:27017";
const client = new MongoClient(mongoUrl);
const dbName = "student";
const cname = "login";


async function registerUser(userData) {
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(cname);


        const existingUser = await collection.findOne({ email: userData.email });
        if (existingUser) {
            return "User already exists! Please login.";
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;


        await collection.insertOne(userData);
        return `User registered successfully! Name: ${userData.name}, Email: ${userData.email}`;
    } finally {
        await client.close();
    }
}


async function loginUser(email, password, res) {
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(cname);

        const user = await collection.findOne({ email: email });
        if (user && await bcrypt.compare(password, user.password)) {
            console.log("Login Successful for:", user.name);

    
            const filePath = path.join(__dirname, "home.html");
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    res.end("Internal Server Error");
                } else {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(data);
                }
            });
        } else {
            res.writeHead(401, { "Content-Type": "text/plain" });
            res.end("Invalid email or password!");
        }
    } finally {
        await client.close();
    }
}


const server = http.createServer(async (req, res) => {
    if (req.method === "GET") {
        const query = url.parse(req.url, true).query;
        const operation = query.operation;

        switch (operation) {
            case "register":
                const message = await registerUser(query);
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end(message);
                break;
            case "login":
                await loginUser(query.email, query.password, res);
                break;
            default:
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Invalid operation!");
        }
    } else {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method Not Allowed");
    }
});


server.listen(3001, () => console.log("Server is running on http://localhost:3000"));

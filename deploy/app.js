// Startup file for cPanel's "Setup Node.js App". cPanel (Passenger) runs this file; it just starts the
// Next.js server that was built into this folder. Passenger supplies the port/socket itself.
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

require("./server.js");

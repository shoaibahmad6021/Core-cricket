import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const hostIndex = args.indexOf("--host");
const portIndex = args.indexOf("--port");
const hostname = hostIndex >= 0 ? args[hostIndex + 1] : "0.0.0.0";
const port = portIndex >= 0 ? args[portIndex + 1] : "3000";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", hostname, "--port", port], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));

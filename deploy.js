const ftp = require("basic-ftp");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        let host = process.env.FTP_HOST;
        const user = process.env.FTP_USER;
        const password = process.env.FTP_PASSWORD;

        if (!host || !user || !password) {
            console.error("Missing FTP credentials in .env.local. Please make sure FTP_HOST, FTP_USER, and FTP_PASSWORD are defined.");
            process.exit(1);
        }

        // Sanitize Hostname (strip protocols and trailing slashes)
        host = host.replace(/^(ftp:\/\/|ftps:\/\/|https:\/\/|http:\/\/)/i, '').split('/')[0];

        console.log(`Connecting to FTP host: ${host}`);
        await client.access({
            host,
            user,
            password,
            secure: false
        });
        console.log("Connected successfully!");

        console.log("Uploading static build from 'out' to 'htdocs' on FTP...");
        await client.uploadFromDir(path.join(__dirname, "out"), "htdocs");
        console.log("Deployment completed successfully!");
    } catch (err) {
        console.error("Deployment failed:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();

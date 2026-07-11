const ftp = require("basic-ftp");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

async function deleteDefaults() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        let host = process.env.FTP_HOST;
        const user = process.env.FTP_USER;
        const password = process.env.FTP_PASSWORD;

        if (!host || !user || !password) {
            console.error("Missing FTP credentials in .env.local.");
            process.exit(1);
        }

        host = host.replace(/^(ftp:\/\/|ftps:\/\/|https:\/\/|http:\/\/)/i, '').split('/')[0];

        await client.access({
            host,
            user,
            password,
            secure: false
        });
        console.log("Connected successfully!");

        const filesToDelete = [
            "htdocs/index2.html",
            "htdocs/index.php",
            "htdocs/files for your website should be uploaded here!"
        ];

        for (const file of filesToDelete) {
            try {
                console.log(`Deleting remote file: ${file}`);
                await client.remove(file);
                console.log(`Successfully deleted: ${file}`);
            } catch (err) {
                console.warn(`Failed to delete ${file} (it might not exist):`, err.message);
            }
        }
        console.log("Cleanup completed!");
    } catch (err) {
        console.error("Cleanup failed:", err);
    } finally {
        client.close();
    }
}

deleteDefaults();

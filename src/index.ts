import { addonBuilder, Args, ContentType, serveHTTP } from "stremio-addon-sdk-next";
import { handleMetaRequest } from "./handlers/metaHandler";
import { handleCatalogRequest } from "./handlers/catalogHandler";
import manifest from "./manifest";
import dotenv from "dotenv";
import { closeDBClient, getDBClient } from "./repository";
import { closeCacheClient, getCacheClient } from "./cache";
import { initializeContext } from "./context";

dotenv.config();

// Initialize context and start the addon server
initializeContext().then(() => {
    const builder = new addonBuilder(manifest);

    // Catalog Handler
    builder.defineCatalogHandler(async (args: Args) => {
        console.log("CatalogHandler args:", args);
        await getDBClient();
        try {
            return await handleCatalogRequest(args);
        } catch (error) {
            console.error("Error in CatalogHandler:", error);
            return { metas: [] };
        } finally {
            await closeDBClient();  // Close DB connection after each request
            await closeCacheClient();  // Close Cache connection
        }
    });

    // Meta Handler
    builder.defineMetaHandler(async (args: { type: ContentType, id: string }) => {
        await getDBClient();
        try {
            return { meta: await handleMetaRequest(args) };
        } catch (error) {
            console.error("Error in MetaHandler:", error);
            return { meta: {} as any };
        } finally {
            await closeDBClient();  // Close DB connection after each request
            await closeCacheClient();  // Close Cache connection
        }
    });

    // Serve HTTP on the specified port
    const port = Number(process.env.PORT) || 3000;
    serveHTTP(builder.getInterface(), { port: port });
    console.log(`🚀 Addon is running on http://localhost:${port}`);
}).catch((error) => {
    console.error('Failed to initialize context:', error);
    process.exit(1);
});

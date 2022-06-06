import { downloadAllFile, makeFolderIfNotExist } from "./download";
import parsedArgv from "./argv";
import { getAllFileUrlList } from "./scraper";

async function run() {
    const {
        "root-url": baseUrl = "c-site-url",
        output: outputPath = "./output/",
        "max-folder-depth": maxFolderDepth = 15,
        "max-pool-size": maxPoolSize = 15,
        "request-delay": requestDelay = 150,
        "max-retry-count": maxRetryCount = 5,
    } = parsedArgv;

    makeFolderIfNotExist(outputPath);

    const fileDataList = await getAllFileUrlList({ baseUrl, maxFolderDepth, maxPoolSize, maxRetryCount });

    await downloadAllFile({
        basePath: outputPath,
        fileDataList,
        maxPoolSize,
        delay: requestDelay,
        maxRetryCount
    });
}

run();
import { createWriteStream, promises as fs } from "fs";
import { promisify } from "util";
import * as stream from "stream";
import axios from "axios";
import { hashbasedPool } from "./fetch";
import { Data } from "./interface";
import { formatSize, formatTime } from "./util";

export async function makeFolderIfNotExist(path: string) {
    try {
        const folderStat = await fs.stat(path);
        if (folderStat.isDirectory()) {
            return;
        }
    } catch (e) {
        // 
    }

    await fs.mkdir(path);
}

const finished = promisify(stream.finished);

async function downloadFile(basePath: string, { name, url, parentFolder }: Data) {
    const folderPath = basePath + "/" + parentFolder

    await makeFolderIfNotExist(folderPath);

    const decodedName = decodeURI(name);

    const fileFullPath = `${folderPath}/${decodedName}`;

    try {
        const oldFile = await fs.stat(fileFullPath);

        if (oldFile.isFile()) {
            return;
        }
    } catch (e) {
        // 
    }

    const tempFullPath = `${folderPath}/_downloading_${decodedName}_${Math.random().toString(36).substring(2)}`;

    const writer = createWriteStream(tempFullPath);

    await axios({
        method: "get",
        url: `${url}/${name}`,
        responseType: "stream",
    }).then(response => {
        response.data.pipe(writer);
        return finished(writer);
    });

    await fs.rename(tempFullPath, fileFullPath);
}

interface DownloadAllFileProps {
    basePath: string,
    fileDataList: Data[],
    maxPoolSize: number,
    delay: number,
    maxRetryCount: number
}

export async function downloadAllFile({ basePath, fileDataList, maxPoolSize, delay, maxRetryCount }: DownloadAllFileProps) {
    const startTime = Date.now();

    const totalFileSize = fileDataList.reduce((totalSize, file) => totalSize + file.size, 0);

    const { failedIdList } = await hashbasedPool({
        maxPoolSize,
        itemList: fileDataList,
        runFunction: item => downloadFile(basePath, item),
        logger: ({ totalCount, successIdList, failedIdList }) => {
            const successCount = successIdList.length;
            const failedCount = failedIdList.length;

            const timeDiff = Date.now() - startTime;

            const downloadedSize = fileDataList.map(({ size }) => size).filter((_value, index) => successIdList.includes(index)).reduce((totalSize, size) => totalSize + size, 0);
            const downloadSpeed = downloadedSize / (timeDiff / 1000);

            const estimatedTime = formatTime(Math.floor((totalFileSize - downloadedSize) / downloadSpeed));

            const fileLog = `${successCount}/${totalCount}, failed: ${failedCount}`;
            const sizeLog = `${formatSize(downloadedSize)}/${formatSize(totalFileSize)}, ${formatSize(downloadSpeed)}/s, estimated: ${estimatedTime}`;

            process.stdout.clearLine(1);
            process.stdout.write(`downloading files ${fileLog}, ${sizeLog}...\r`);
        },
        // delay,
        maxRetryCount,
    });

    process.stdout.clearLine(1);
    process.stdout.write(`downloading files success: ${fileDataList.length - failedIdList.length}/${fileDataList.length}, failed: ${failedIdList.length}... done!\r\n`);
}

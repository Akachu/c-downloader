import { hashbasedPool } from "./fetch";
import { Data, DataListAndUrl } from "./interface";
import { getParsedDataFromURL } from "./data";

interface GetAllFileUrlListProps {
    baseUrl: string,
    maxFolderDepth: number,
    maxPoolSize: number,
    maxRetryCount: number,
}

export async function getAllFileUrlList({ baseUrl, maxFolderDepth, maxPoolSize, maxRetryCount }: GetAllFileUrlListProps) {
    process.stdout.write("scraping root folder... \r");
    const { dataList } = await getParsedDataFromURL(baseUrl, "__internal_root__");
    process.stdout.write("scraping root folder... done!\r\n");

    let fileDataList = dataList.filter(data => data.type === "FILE");

    let folderList = dataList.filter(data => data.type === "FOLDER");

    let folderDepth = 0;

    while (folderDepth < maxFolderDepth) {

        const { successResultList } = await hashbasedPool<Data, DataListAndUrl>({
            itemList: folderList,
            maxPoolSize,
            maxRetryCount,
            runFunction: ({ url, name }) => getParsedDataFromURL(`${url}/${name}`, name),
            logger: (({ totalCount, successIdList, failedIdList }) => {
                const successCount = successIdList.length;
                const failedCount = failedIdList.length;

                process.stdout.clearLine(1);
                process.stdout.write(`scraping deep folder ${folderDepth + 1}/${maxFolderDepth}, success: ${successCount}/${totalCount}, error: ${failedCount}...\r`);
            })
        });

        const newDataList = successResultList.reduce<Data[]>((prev, result) => [...prev, ...result.dataList], []);

        folderList = newDataList.filter(data => data.type === "FOLDER");

        fileDataList = [...fileDataList, ...newDataList.filter(data => data.type === "FILE")];

        folderDepth++;
    }

    process.stdout.clearLine(1);
    process.stdout.write(`scraping deep folder, found: ${fileDataList.length}... done!\r\n`);

    return fileDataList;
}

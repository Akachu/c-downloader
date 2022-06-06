import axios from "axios";
import { RawData, Data, DataListAndUrl } from "./interface";
import { calculateSize } from "./util";

const RAW_DATA_REGEXP = /(?<=rawData \= \").*(?=\")/;


function decodeAndParseRawData(rawData: string): RawData[] {
    const decodedData = Buffer.from(rawData, "base64").toString("utf-8");

    return JSON.parse(decodedData);

}

function findRawData(html: any) {
    const matchedRawData = html.match(RAW_DATA_REGEXP);

    if (!matchedRawData || !matchedRawData[0] || !matchedRawData[0].length) {
        throw Error("failed to find raw data");
    }

    return matchedRawData[0];
}

export async function getParsedDataFromURL(url: string, name: string): Promise<DataListAndUrl> {
    const response = await axios.get(url);

    const html = response.data;

    const rawData = findRawData(html);

    return {
        dataList: decodeAndParseRawData(rawData).map(({
            name: fileName,
            size,
            "@type": dataType
        }) => ({
            name: (fileName),
            size: calculateSize(size),
            type: dataType === "folder" ? "FOLDER" : "FILE",
            url,
            parentFolder: decodeURI(name)
        })), url, name: decodeURI(name)
    };
}

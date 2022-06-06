
export interface RawData {
    "name": string,
    "size": string
    "date": string,
    "@time": string,
    "@type": string
}

export interface Data {
    name: string;
    size: number;
    type: "FILE" | "FOLDER"
    url: string;
    parentFolder: string;
}

export interface DataListAndUrl {
    url: string;
    dataList: Data[]
    name: string;
}

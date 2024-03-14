import AxiosInstance from "../../../server/axios.server";

const IndexerUrl = "https://server.atomicalmarket.com/mainnet/v1";

export const getCollectionHolders = async (collection: string, limit = 100) => {
  const resp = await AxiosInstance.get<{
    holderList: {
      percent: number;
      address: string;
      holding: number;
      count: number;
    }[];
    holderCount: number;
  }>(`${IndexerUrl}/token/holders/collection_${collection}`, {
    params: {
      limit,
      offset: 0,
    },
    headers: {
      "User-Agent": "atomicalmarket",
    },
  });

  return resp.data;
};

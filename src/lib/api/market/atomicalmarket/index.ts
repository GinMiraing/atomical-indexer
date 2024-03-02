import AxiosInstance from "../../../server/axios.server";

const IndexerUrl = "https://server.atomicalmarket.com/mainnet/v1";
const MarketUrl = "https://server.atomicalmarket.com/market/v1";

export const getTokenHolders = async (token: string, limit = 100) => {
  const resp = await AxiosInstance.get<{
    holderList: {
      percent: number;
      address: string;
      holding: number;
      count: number;
    }[];
    holderCount: number;
  }>(`${IndexerUrl}/token/holders/token_${token}`, {
    params: {
      limit,
      offset: 0,
    },
  });

  return resp.data;
};

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
  });

  return resp.data;
};

export const getTokenStatsInAtomicalMarket = async (token: string) => {
  const resp = await AxiosInstance.get<{
    totalListed: number;
    totalVolume: number;
    sales24Hour: number;
    volume7Days: number;
    floorPrice: number;
    volume24Hour: number;
    sales7Days: number;
  }>(`${MarketUrl}/token/stats`, {
    params: {
      ticker: token,
    },
  });

  return resp.data;
};

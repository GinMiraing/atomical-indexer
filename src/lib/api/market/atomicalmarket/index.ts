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
    headers: {
      "User-Agent": "atomicalmarket",
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
    headers: {
      "User-Agent": "atomicalmarket",
    },
  });

  return resp.data;
};

export const getTokenStatsInAtomicalMarket = async (token: string) => {
  const resp = await AxiosInstance.get<{
    totalListed: number;
    volumeTotal: number;
    sales1Day: number;
    volume7Days: number;
    floorPrice: number;
    volume1Day: number;
    sales7Days: number;
  }>(`${MarketUrl}/token/stats`, {
    params: {
      ticker: token,
    },
    headers: {
      "User-Agent": "atomicalmarket",
    },
  });

  return resp.data;
};

export const getOrderHistoryInAtomicalMarket = async (
  token: string,
  limit: number,
  offset: number,
) => {
  const resp = await AxiosInstance.get<{
    result: {
      bid_id: string;
      price_sats: string;
      seller_address: string;
      buyer_address: string;
      date: number;
      atomical_content: {
        Ticker: string;
        Amount: number;
      };
      txId: string | null;
    }[];
  }>(`${MarketUrl}/token/history`, {
    params: {
      limit,
      offset,
      Event: "sold",
      ticker: token,
    },
    headers: {
      "User-Agent": "atomicalmarket",
    },
  });

  return resp.data.result;
};

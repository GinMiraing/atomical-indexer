import AxiosInstance from "../../../server/axios.server";

const BaseUrl = "https://bitatom.io/api/trpc";

export const getTokenStatsInBitatom = async (token: string) => {
  const resp = await AxiosInstance.get<{
    result: {
      data: {
        json: {
          floorPrice: number;
          listings: number;
          sells_24h: number;
          market_cap: number;
          volume_24h: number;
          volume_7d: number;
          volume_total: number;
        };
      };
    };
  }>(`${BaseUrl}/token.getToken`, {
    params: {
      input: JSON.stringify({ json: { ticker: token } }),
    },
  });

  return resp.data.result.data.json;
};

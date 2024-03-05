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

export const getOrderHistory = async (token: string, page: number) => {
  const resp = await AxiosInstance.get<{
    result: {
      data: {
        json: {
          items: {
            id: string;
            atom_utxo: {
              txid: string;
              value: number;
              vout: number;
              location: string;
            };
            price: number;
            unit_price: number;
            seller: {
              address: string;
              receive_address: string;
            };
            created_at: number;
            updated_at: number;
            buyer: {
              address: string;
            };
            fee_rate: number;
            buy_txid: string;
            buying_address?: string;
          }[];
        };
      };
    };
  }>(`${BaseUrl}/listing.queryTokenHistories`, {
    params: {
      input: JSON.stringify({
        json: {
          ticker: token,
          page,
          pageSize: 20,
          states: ["sold"],
          address: null,
        },
      }),
    },
  });

  return resp.data.result.data.json.items;
};

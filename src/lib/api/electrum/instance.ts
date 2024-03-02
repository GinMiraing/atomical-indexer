import AxiosInstance from "../../server/axios.server";
import {
  AtomicalUnionResponse,
  ElectrumApiInterface,
  FTResponse,
} from "./interface";

export class ElectrumApi implements ElectrumApiInterface {
  private isOpenFlag = false;
  private endpoints: string[] = [];

  private constructor(
    private baseUrl: string,
    private usePost = true,
  ) {
    this.initEndpoints(baseUrl);
    this.resetConnection();
  }

  private initEndpoints(baseUrl: string) {
    this.endpoints = baseUrl.split(",");
  }

  public async resetConnection() {
    this.isOpenFlag = false;
  }

  static createClient(url: string, usePost = true) {
    return new ElectrumApi(url, usePost);
  }

  public async open(): Promise<any> {
    return new Promise((resolve) => {
      if (this.isOpenFlag) {
        resolve(true);
        return;
      }
      this.isOpenFlag = true;
      resolve(true);
    });
  }

  public isOpen(): boolean {
    return this.isOpenFlag;
  }

  public async close(): Promise<any> {
    this.isOpenFlag = false;
    return Promise.resolve(true);
  }

  public async call(method: string, params: any) {
    for (const baseUrl of this.endpoints) {
      try {
        const url = `${baseUrl}/${method}`;
        const options = {
          method: this.usePost ? "post" : "get",
          url: url,
          ...(this.usePost ? { data: { params } } : { params: params }),
        };

        const response = await AxiosInstance(options);
        return response.data.response;
      } catch (error) {
        console.log(`Error using endpoint ${baseUrl}:`, error);
      }
    }

    throw new Error("All endpoints failed");
  }

  public atomicalsGet(atomicalAliasOrId: string | number): Promise<{
    result: AtomicalUnionResponse;
  }> {
    return this.call("blockchain.atomicals.get", [atomicalAliasOrId]);
  }

  public atomicalsGetState(
    atomicalAliasOrId: string | number,
    verbose: boolean,
  ): Promise<{
    global: {
      atomical_count: number;
    };
    result: AtomicalUnionResponse;
  }> {
    return this.call("blockchain.atomicals.get_state", [
      atomicalAliasOrId,
      verbose ? 1 : 0,
    ]);
  }

  public atomicalsGetFtInfo(atomicalAliasOrId: string | number): Promise<{
    result: FTResponse;
  }> {
    return this.call("blockchain.atomicals.get_ft_info", [atomicalAliasOrId]);
  }

  public atomicalsGetStateHistory(
    atomicalAliasOrId: string | number,
  ): Promise<any> {
    return this.call("blockchain.atomicals.get_state_history", [
      atomicalAliasOrId,
    ]);
  }

  public atomicalsGetEventHistory(
    atomicalAliasOrId: string | number,
  ): Promise<any> {
    return this.call("blockchain.atomicals.get_events", [atomicalAliasOrId]);
  }

  public atomicalsGetTxHistory(
    atomicalAliasOrId: string | number,
  ): Promise<any> {
    return this.call("blockchain.atomicals.get_tx_history", [
      atomicalAliasOrId,
    ]);
  }

  public atomicalsList(
    limit: number,
    offset: number,
    asc = false,
  ): Promise<{
    result: AtomicalUnionResponse[];
  }> {
    return this.call("blockchain.atomicals.list", [limit, offset, asc ? 1 : 0]);
  }

  public atomicalsGetRealmInfo(
    realmOrSubRealm: string,
    verbose?: boolean,
  ): Promise<any> {
    return this.call("blockchain.atomicals.get_realm_info", [
      realmOrSubRealm,
      verbose ? 1 : 0,
    ]);
  }

  public atomicalsGetByRealm(realm: string): Promise<any> {
    return this.call("blockchain.atomicals.get_by_realm", [realm]);
  }

  public atomicalsGetByTicker(ticker: string): Promise<any> {
    return this.call("blockchain.atomicals.get_by_ticker", [ticker]);
  }

  public atomicalsGetByContainer(container: string): Promise<{
    result: {
      status: string;
      candidate_atomical_id: string;
      atomical_id: string;
    };
  }> {
    return this.call("blockchain.atomicals.get_by_container", [container]);
  }

  public atomicalsGetContainerItems(
    container: string,
    limit: number,
    offset: number,
  ): Promise<any> {
    return this.call("blockchain.atomicals.get_container_items", [
      container,
      limit,
      offset,
    ]);
  }

  public atomicalsGetByContainerItem(
    container: string,
    itemName: string,
  ): Promise<any> {
    return this.call("blockchain.atomicals.get_by_container_item", [
      container,
      itemName,
    ]);
  }
}

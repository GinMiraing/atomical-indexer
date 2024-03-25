export enum AtomicalSubtype {
  REALM = "realm",
  REQUEST_REALM = "request_realm",
  CONTAINER = "container",
  REQUEST_CONTAINER = "request_container",
  SUBREALM = "subrealm",
  REQUEST_SUBREALM = "request_subrealm",
  DMITEM = "dmitem",
  REQUEST_DMITEM = "request_dmitem",
}

export interface BaseAtomicalResponse {
  atomical_id: string;
  atomical_number: number;
  atomical_ref: string;
  type: "FT" | "NFT";
  subtype: string;
  mint_info: {
    args: {
      time: number;
    };
  };
  state?: {
    latest: {
      [key: string]: any;
    };
  };
}

export interface FTResponse extends BaseAtomicalResponse {
  $mint_mode: "fixed" | "perpetual";
  $max_supply: number;
  $mint_height: number;
  $mint_amount: number;
  $max_mints: number;
  $mint_bitworkc?: string;
  $mint_bitworkr?: string;
  $request_ticker_status: {
    status: string;
  };
  $request_ticker: string;
  mint_data: {
    fields: {
      [key: string]: any;
    };
  };
  dft_info?: {
    mint_count: number;
    mint_bitworkc_current?: string;
    mint_bitworkr_current?: string;
  };
  location_summary?: {
    unique_holders: number;
    circulating_supply: number;
  };
}

export interface DMITEMResponse extends BaseAtomicalResponse {
  $request_dmitem: string;
  $parent_container: string;
  $parent_container_name: string;
  $request_dmitem_status: {
    status: string;
  };
  mint_data: {
    fields: {
      [key: string]: any;
    };
  };
  location_info: {
    index: number;
    location: string;
    script: string;
    scripthash: string;
    tx_num: number;
    txid: string;
    value: number;
  }[];
}

export interface REALMResponse extends BaseAtomicalResponse {
  $request_realm: string;
  $request_realm_status: {
    status: string;
  };
  location_info: {
    index: number;
    location: string;
    script: string;
    scripthash: string;
    tx_num: number;
    txid: string;
    value: number;
  }[];
}

export interface CONTAINERResponse extends BaseAtomicalResponse {
  $request_container: string;
  $request_container_status: {
    status: string;
  };
  $container_dmint_status?: {
    dmint: {
      items: number;
    };
  };
}

export interface SubRealmResponse extends BaseAtomicalResponse {
  $request_subrealm: string;
  $parent_realm: string;
  $request_full_realm_name: string;
  $request_subrealm_status: {
    status: string;
  };
  mint_data: {
    fields: {
      args: {
        parent_realm: string;
      };
    };
  };
}

export type AtomicalUnionResponse =
  | FTResponse
  | DMITEMResponse
  | REALMResponse
  | CONTAINERResponse
  | SubRealmResponse;

export interface ElectrumApiInterface {
  close: () => Promise<void>;
  open: () => Promise<void>;
  resetConnection: () => Promise<void>;
  isOpen: () => boolean;
  // Atomicals API
  atomicalsGet: (atomicalAliasOrId: string | number) => Promise<any>;

  atomicalsGetState: (
    atomicalAliasOrId: string | number,
    verbose: boolean,
  ) => Promise<any>;
  atomicalsGetStateHistory: (
    atomicalAliasOrId: string | number,
  ) => Promise<any>;
  atomicalsGetEventHistory: (
    atomicalAliasOrId: string | number,
  ) => Promise<any>;
  atomicalsGetTxHistory: (atomicalAliasOrId: string | number) => Promise<any>;
  atomicalsList: (limit: number, offset: number, asc: boolean) => Promise<any>;

  atomicalsGetByContainerItem: (
    container: string,
    item: string,
  ) => Promise<any>;
  atomicalsGetByRealm: (realm: string) => Promise<any>;
  atomicalsGetByTicker: (ticker: string) => Promise<any>;
  atomicalsGetByContainer: (container: string) => Promise<any>;

  atomicalsGetFtInfo: (atomicalAliasOrId: string | number) => Promise<any>;
  atomicalsGetRealmInfo: (
    realmOrSubRealm: string,
    verbose?: boolean,
  ) => Promise<any>;
  atomicalsGetContainerItems: (
    container: string,
    limit: number,
    offset: number,
  ) => Promise<any>;
}

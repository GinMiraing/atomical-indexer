import { ElectrumApi } from "./instance";

const electrumClient = ElectrumApi.createClient(
  "https://ep.atomicalmarket.com/proxy",
);

export default electrumClient;

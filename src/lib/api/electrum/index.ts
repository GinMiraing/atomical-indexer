import { ElectrumApi } from "./instance";

const electrumClient = ElectrumApi.createClient("https://ep.wizz.cash/proxy");

export default electrumClient;

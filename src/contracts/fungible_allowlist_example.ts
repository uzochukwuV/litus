import * as Client from "../../packages/fungible_allowlist_example/dist/index";
import { rpcUrl } from "./util";

export default new Client.Client({
  networkPassphrase: "Standalone Network ; February 2017",
  contractId: "CBS6FFTNH63ZJGXP2EKD5ONCIKW4H4VIFX7EK3SQIKS7Q4GNYEXEWFBX",
  rpcUrl,
  allowHttp: true,
  publicKey: undefined,
});

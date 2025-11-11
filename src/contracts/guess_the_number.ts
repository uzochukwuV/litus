import * as Client from "../../packages/guess_the_number/dist/index";
import { rpcUrl } from "./util";

export default new Client.Client({
  networkPassphrase: "Standalone Network ; February 2017",
  contractId: "CARLZRJBORA5RZQKNB5C436LTD2AGHCGR4QZ3CWXQSWPUTJWBFCFQCD2",
  rpcUrl,
  allowHttp: true,
  publicKey: undefined,
});

import * as Client from "../../packages/nft_enumerable_example/dist/index";
import { rpcUrl } from "./util";

export default new Client.Client({
  networkPassphrase: "Standalone Network ; February 2017",
  contractId: "CDEUWOHOC274IIJRQILVYGRZBSJ42TOMCU3LTRRZ3RN7TGQ5GV3TKW3I",
  rpcUrl,
  allowHttp: true,
  publicKey: undefined,
});

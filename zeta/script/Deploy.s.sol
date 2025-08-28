// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {UniversalNFT} from "../src/UniversalNFT.sol";

contract ZetaChainUniversalNFTScript is Script {
    UniversalNFT public nft;

    function setUp() public {}

    function run() public {
       
        address initialOwner = vm.envOr("INITIAL_OWNER", msg.sender);
        string memory name = vm.envOr("NFT_NAME", string("ZetaChain Universal NFT"));
        string memory symbol = vm.envOr("NFT_SYMBOL", string("ZCNFT"));

        address payable gateway = payable(vm.envAddress("GATEWAY"));
        uint256 gasLimit = vm.envUint("GAS_LIMIT");
        address router = vm.envAddress("UNISWAP_ROUTER");

        vm.startBroadcast();

        nft = new UniversalNFT();
        nft.initialize(initialOwner, name, symbol, gateway, gasLimit, router);

        console.log("Deployed ZetaChainUniversalNFT at:", address(nft));

        vm.stopBroadcast();
    }
}

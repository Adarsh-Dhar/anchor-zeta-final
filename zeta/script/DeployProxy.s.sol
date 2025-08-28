// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {UniversalNFT} from "../src/UniversalNFT.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ZetaChainUniversalNFTProxyScript is Script {
    UniversalNFT public implementation;
    ERC1967Proxy public proxy;
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

        // Deploy the implementation contract
        implementation = new UniversalNFT();
        console.log("Deployed UniversalNFT implementation at:", address(implementation));
        
        // Deploy the proxy contract
        bytes memory initData = abi.encodeWithSelector(
            UniversalNFT.initialize.selector,
            initialOwner,
            name,
            symbol,
            gateway,
            gasLimit,
            router
        );
        
        proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("Deployed ERC1967Proxy at:", address(proxy));
        
        // Create a reference to the proxy as UniversalNFT
        nft = UniversalNFT(payable(address(proxy)));
        
        console.log("Contract deployment completed!");
        console.log("Implementation:", address(implementation));
        console.log("Proxy:", address(proxy));
        console.log("Use the proxy address:", address(proxy));
        console.log("Initial Owner:", initialOwner);
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Gateway:", gateway);
        console.log("Gas Limit:", gasLimit);
        console.log("Uniswap Router:", router);

        vm.stopBroadcast();
    }
}

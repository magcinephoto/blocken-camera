// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TimestampNFT} from "../src/TimestampNFT.sol";
import {BlockenCameraNFT} from "../src/BlockenCameraNFT.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        TimestampNFT nft = new TimestampNFT();
        BlockenCameraNFT blockenNFT = new BlockenCameraNFT();

        console2.log("TimestampNFT deployed to:", address(nft));
        console2.log("BlockenCameraNFT deployed to:", address(blockenNFT));
        console2.log("Deployer:", msg.sender);
        console2.log("Block number:", block.number);

        vm.stopBroadcast();
    }
}



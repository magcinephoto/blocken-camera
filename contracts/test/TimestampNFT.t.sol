// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TimestampNFT} from "../src/TimestampNFT.sol";

contract TimestampNFTTest is Test {
    TimestampNFT public nft;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        nft = new TimestampNFT();
    }

    function testDeployment() public view {
        assertEq(nft.name(), "Timestamp NFT");
        assertEq(nft.symbol(), "TNFT");
        assertEq(nft.owner(), owner);
        assertEq(nft.getCurrentTokenId(), 0);
    }

    function testMint() public {
        vm.prank(user1);
        uint256 tokenId = nft.mint();

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.getCurrentTokenId(), 1);
        assertTrue(nft.tokenTimestamps(0) > 0);
    }

    function testMultipleMints() public {
        vm.prank(user1);
        nft.mint();

        vm.prank(user1);
        nft.mint();

        vm.prank(user2);
        nft.mint();

        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.ownerOf(2), user2);
        assertEq(nft.getCurrentTokenId(), 3);
    }

    function testTokenURI() public {
        vm.prank(user1);
        nft.mint();

        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 0);
        assertTrue(
            keccak256(bytes(uri)) != keccak256(bytes(""))
        );
    }

    function testTokenURIForNonExistentToken() public {
        vm.expectRevert("Token does not exist");
        nft.tokenURI(999);
    }

    function testNFTMintedEvent() public {
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit TimestampNFT.NFTMinted(user1, 0, block.timestamp);
        nft.mint();
    }
}


